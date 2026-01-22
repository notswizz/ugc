import Stripe from 'stripe';
import admin, { adminDb } from '@/lib/firebase/admin';
import { calculateTrustScore } from '@/lib/trustScore/calculator';
import { getBalance } from './balance';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16' as any,
    })
  : null;

// Trust score threshold for instant withdrawals (debit card)
// Creators with trust score >= 50 get instant withdrawals
// Below 50 get ACH (2-3 business days)
export const INSTANT_WITHDRAWAL_TRUST_SCORE_THRESHOLD = 50;

export interface WithdrawalRequest {
  creatorId: string;
  amount: number; // in dollars
  destination: 'instant' | 'ach'; // Will be determined by trust score, but can be forced
}

export interface WithdrawalResult {
  success: boolean;
  withdrawalId?: string;
  method: 'instant' | 'ach';
  estimatedArrival?: string;
  error?: string;
}

/**
 * Check if creator is eligible for instant withdrawal
 */
export function canUseInstantWithdrawal(trustScore: number): boolean {
  return trustScore >= INSTANT_WITHDRAWAL_TRUST_SCORE_THRESHOLD;
}

/**
 * Process withdrawal for creator
 */
export async function processWithdrawal(request: WithdrawalRequest): Promise<WithdrawalResult> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  const { creatorId, amount } = request;

  // Validate amount
  if (amount <= 0) {
    throw new Error('Withdrawal amount must be positive');
  }

  if (amount < 1) {
    throw new Error('Minimum withdrawal amount is $1.00');
  }

  // Get creator data
  const creatorDoc = await adminDb.collection('creators').doc(creatorId).get();
  if (!creatorDoc.exists) {
    throw new Error('Creator not found');
  }

  const creatorData = creatorDoc.data();
  const creator = creatorData as any;

  // Check balance
  const balance = await getBalance(creatorId, 'creator');
  if (balance < amount) {
    throw new Error(`Insufficient balance. Available: $${balance.toFixed(2)}, Requested: $${amount.toFixed(2)}`);
  }

  // Calculate trust score
  const trustScore = calculateTrustScore(creator);
  const canUseInstant = canUseInstantWithdrawal(trustScore);

  // Determine withdrawal method
  const method = request.destination === 'instant' && canUseInstant ? 'instant' : 'ach';

  // Verify Stripe setup
  if (method === 'instant') {
    // For instant, we need a Stripe Connect account with verified identity
    const connectAccountId = creator.stripe?.connectAccountId;
    if (!connectAccountId) {
      throw new Error('Stripe Connect account required for instant withdrawals. Please complete onboarding.');
    }

    // Check if account is verified (required for instant payouts)
    try {
      const account = await stripe.accounts.retrieve(connectAccountId);
      if (account.details_submitted !== true) {
        throw new Error('Stripe Connect account not fully verified. Please complete verification.');
      }

      // Check if Identity verification is complete
      // For instant withdrawals, we need verified identity
      if (!creator.stripe?.identityVerified) {
        // Check if there's a verification session in progress
        const identityVerificationId = creator.stripe?.identityVerificationId;
        if (identityVerificationId) {
          try {
            const verification = await stripe.identity.verificationSessions.retrieve(identityVerificationId);
            if (verification.status === 'verified') {
              // Update creator document if verification just completed
              await adminDb!.collection('creators').doc(creatorId).update({
                'stripe.identityVerified': true,
                'stripe.identityVerifiedAt': admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            } else {
              throw new Error('Identity verification incomplete. Please complete verification to use instant withdrawals.');
            }
          } catch (error: any) {
            if (error.message.includes('incomplete')) {
              throw error;
            }
            throw new Error('Identity verification required. Please complete verification to use instant withdrawals.');
          }
        } else {
          throw new Error('Identity verification required. Please complete verification to use instant withdrawals.');
        }
      }
    } catch (error: any) {
      if (error.message.includes('verification required')) {
        throw error;
      }
      throw new Error(`Stripe account verification failed: ${error.message}`);
    }
  }

  // For ACH, we need bank account details
  if (method === 'ach') {
    const bankAccount = creator.stripe?.bankAccount;
    if (!bankAccount || !bankAccount.accountId) {
      throw new Error('Bank account required for ACH withdrawals. Please add a bank account.');
    }
  }

  // Create withdrawal record
  const withdrawalData: any = {
    creatorId,
    amount,
    method,
    status: 'pending',
    trustScore,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  let withdrawalId: string;
  let estimatedArrival: string;

  try {
    if (method === 'instant') {
      // Instant withdrawal via Stripe (debit card)
      const connectAccountId = creator.stripe.connectAccountId;
      const amountCents = Math.round(amount * 100);

      // Check account status and capabilities
      const account = await stripe.accounts.retrieve(connectAccountId);
      
      // Check if account is fully set up
      if (!account.details_submitted) {
        throw new Error('Your Stripe Connect account setup is incomplete. Please complete all required steps in your Stripe Connect onboarding and try again.');
      }

      // Check if transfers capability exists
      const transfersStatus = account.capabilities?.transfers;
      
      // Allow transfers if status is 'active' or 'pending'
      if (transfersStatus === 'active') {
        // Great! Continue with transfer
      } else if (transfersStatus === 'pending') {
        // Pending is OK - Stripe might still allow the transfer
        // Continue and let Stripe API tell us if it fails
      } else if (!transfersStatus || transfersStatus === 'inactive') {
        // Try to request transfers capability
        try {
          const updatedAccount = await stripe.accounts.update(connectAccountId, {
            capabilities: {
              transfers: { requested: true },
            },
          });
          
          // Check if it became active or pending
          const newStatus = updatedAccount.capabilities?.transfers;
          if (newStatus === 'active' || newStatus === 'pending') {
            // Great! Continue with transfer
          } else {
            // Provide helpful error with next steps
            throw new Error('Transfers capability is not yet active. Please: 1) Complete all required verification steps in your Stripe Connect dashboard, 2) Ensure identity verification is complete, 3) Wait a few minutes after completing setup, then try again. If the issue persists, check your Stripe Connect dashboard for any pending requirements.');
          }
        } catch (updateError: any) {
          // Check if it's a specific error we can handle
          if (updateError.message?.includes('already enabled') || updateError.message?.includes('active') || updateError.message?.includes('pending')) {
            // Capability might have been enabled, continue
          } else {
            throw new Error(`Unable to enable transfers. Please complete your Stripe Connect onboarding, including identity verification and all required business information. Then wait a few minutes before trying again. Error: ${updateError.message}`);
          }
        }
      }

      // Create transfer to Connect account (instant payout)
      let transfer;
      try {
        transfer = await stripe.transfers.create({
          amount: amountCents,
          currency: 'usd',
          destination: connectAccountId,
          metadata: {
            type: 'withdrawal',
            creatorId,
            method: 'instant',
          },
        });
      } catch (transferError: any) {
        // Provide helpful error messages for common issues
        if (transferError.message?.includes('stripe_balance.stripe_transfers') || 
            transferError.message?.includes('transfers')) {
          throw new Error('Transfers are not yet enabled on your account. Please complete all verification steps in your Stripe Connect dashboard, then wait a few minutes before trying again.');
        }
        if (transferError.code === 'account_invalid') {
          throw new Error('Your Stripe Connect account is not fully set up. Please complete the onboarding process in Stripe and try again.');
        }
        throw transferError;
      }

      // Create instant payout (to debit card)
      // Note: Instant payouts go to the default external account (debit card)
      // The creator must have a debit card set up as their default payout method
      const payout = await stripe.payouts.create(
        {
          amount: amountCents,
          currency: 'usd',
          method: 'instant', // Instant payout to debit card
        },
        {
          stripeAccount: connectAccountId, // Use Connect account
        }
      );

      withdrawalData.stripe = {
        transferId: transfer.id,
        payoutId: payout.id,
      };
      withdrawalData.status = 'processing';
      estimatedArrival = 'Within minutes';

      // Deduct balance immediately (instant withdrawal)
      await deductBalance(creatorId, amount, 'Instant withdrawal via Stripe');
    } else {
      // ACH withdrawal (2-3 business days)
      const connectAccountId = creator.stripe?.connectAccountId;
      const bankAccountId = creator.stripe?.bankAccount?.accountId;

      if (!connectAccountId || !bankAccountId) {
        throw new Error('Bank account details required for ACH withdrawal');
      }

      const amountCents = Math.round(amount * 100);

      // Check account status and capabilities
      const account = await stripe.accounts.retrieve(connectAccountId);
      
      // Check if account is fully set up
      if (!account.details_submitted) {
        throw new Error('Your Stripe Connect account setup is incomplete. Please complete all required steps in your Stripe Connect onboarding and try again.');
      }

      // Check if transfers capability exists
      const transfersStatus = account.capabilities?.transfers;
      
      // Allow transfers if status is 'active' or 'pending'
      if (transfersStatus === 'active') {
        // Great! Continue with transfer
      } else if (transfersStatus === 'pending') {
        // Pending is OK - Stripe might still allow the transfer
        // Continue and let Stripe API tell us if it fails
      } else if (!transfersStatus || transfersStatus === 'inactive') {
        // Try to request transfers capability
        try {
          const updatedAccount = await stripe.accounts.update(connectAccountId, {
            capabilities: {
              transfers: { requested: true },
            },
          });
          
          // Check if it became active or pending
          const newStatus = updatedAccount.capabilities?.transfers;
          if (newStatus === 'active' || newStatus === 'pending') {
            // Great! Continue with transfer
          } else {
            // Provide helpful error with next steps
            throw new Error('Transfers capability is not yet active. Please: 1) Complete all required verification steps in your Stripe Connect dashboard, 2) Ensure identity verification is complete, 3) Wait a few minutes after completing setup, then try again. If the issue persists, check your Stripe Connect dashboard for any pending requirements.');
          }
        } catch (updateError: any) {
          // Check if it's a specific error we can handle
          if (updateError.message?.includes('already enabled') || updateError.message?.includes('active') || updateError.message?.includes('pending')) {
            // Capability might have been enabled, continue
          } else {
            throw new Error(`Unable to enable transfers. Please complete your Stripe Connect onboarding, including identity verification and all required business information. Then wait a few minutes before trying again. Error: ${updateError.message}`);
          }
        }
      }

      // Create transfer to Connect account
      let transfer;
      try {
        transfer = await stripe.transfers.create({
          amount: amountCents,
          currency: 'usd',
          destination: connectAccountId,
          metadata: {
            type: 'withdrawal',
            creatorId,
            method: 'ach',
          },
        });
      } catch (transferError: any) {
        // Provide helpful error messages for common issues
        if (transferError.message?.includes('stripe_balance.stripe_transfers') || 
            transferError.message?.includes('transfers')) {
          throw new Error('Transfers are not yet enabled on your account. Please complete all verification steps in your Stripe Connect dashboard, then wait a few minutes before trying again.');
        }
        if (transferError.code === 'account_invalid') {
          throw new Error('Your Stripe Connect account is not fully set up. Please complete the onboarding process in Stripe and try again.');
        }
        throw transferError;
      }

      // Create ACH payout (2-3 business days)
      const payout = await stripe.payouts.create(
        {
          amount: amountCents,
          currency: 'usd',
          method: 'standard', // Standard ACH payout
          destination: bankAccountId,
        },
        {
          stripeAccount: connectAccountId,
        }
      );

      withdrawalData.stripe = {
        transferId: transfer.id,
        payoutId: payout.id,
      };
      withdrawalData.status = 'pending';
      
      // Calculate estimated arrival (2-3 business days)
      const arrivalDate = new Date();
      arrivalDate.setDate(arrivalDate.getDate() + 2);
      estimatedArrival = `By ${arrivalDate.toLocaleDateString()}`;

      // Deduct balance immediately (withdrawal initiated)
      await deductBalance(creatorId, amount, 'ACH withdrawal via Stripe');
    }

    // Save withdrawal record
    const withdrawalRef = await adminDb.collection('withdrawals').add(withdrawalData);
    withdrawalId = withdrawalRef.id;

    return {
      success: true,
      withdrawalId,
      method,
      estimatedArrival,
    };
  } catch (error: any) {
    console.error('Withdrawal error:', error);
    
    // Save failed withdrawal record
    withdrawalData.status = 'failed';
    withdrawalData.error = error.message;
    const withdrawalRef = await adminDb.collection('withdrawals').add(withdrawalData);

    throw new Error(`Withdrawal failed: ${error.message}`);
  }
}

/**
 * Create Stripe Identity verification session
 */
async function createIdentityVerification(creatorId: string, connectAccountId: string): Promise<string> {
  if (!stripe) throw new Error('Stripe not configured');

  const verificationSession = await stripe.identity.verificationSessions.create({
    type: 'document',
    metadata: {
      creatorId,
      connectAccountId,
    },
  });

  // Store verification session ID in creator document
  await adminDb!.collection('creators').doc(creatorId).update({
    'stripe.identityVerificationId': verificationSession.id,
    'stripe.identityVerificationUrl': verificationSession.url,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return verificationSession.id;
}

/**
 * Deduct balance from creator account
 */
async function deductBalance(creatorId: string, amount: number, reason: string): Promise<void> {
  if (!adminDb) throw new Error('Firebase Admin not initialized');

  const result = await adminDb.runTransaction(async (transaction) => {
    const creatorRef = adminDb.collection('creators').doc(creatorId);
    const creatorDoc = await transaction.get(creatorRef);

    if (!creatorDoc.exists) {
      throw new Error('Creator not found');
    }

    const currentBalance = creatorDoc.data()?.balance || 0;
    if (currentBalance < amount) {
      throw new Error(`Insufficient balance. Current: $${currentBalance.toFixed(2)}, Required: $${amount.toFixed(2)}`);
    }

    const newBalance = currentBalance - amount;

    transaction.update(creatorRef, {
      balance: newBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { currentBalance, newBalance };
  });

  // Create balance transaction record (outside transaction to avoid conflicts)
  await adminDb.collection('balanceTransactions').add({
    userId: creatorId,
    userType: 'creator',
    amount: -amount,
    balanceBefore: result.currentBalance,
    balanceAfter: result.newBalance,
    reason,
    metadata: {
      type: 'withdrawal',
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Update trust score based on Stripe Identity verification and fraud signals
 */
export async function updateTrustScoreFromStripe(creatorId: string): Promise<void> {
  if (!adminDb || !stripe) return;

  const creatorDoc = await adminDb.collection('creators').doc(creatorId).get();
  if (!creatorDoc.exists) return;

  const creator = creatorDoc.data();
  const connectAccountId = creator?.stripe?.connectAccountId;
  const identityVerificationId = creator?.stripe?.identityVerificationId;

  if (!connectAccountId) return;

  try {
    // Get account fraud signals
    const account = await stripe.accounts.retrieve(connectAccountId);
    
    // Check Identity verification status
    if (identityVerificationId) {
      const verification = await stripe.identity.verificationSessions.retrieve(identityVerificationId);
      
      if (verification.status === 'verified') {
        // Identity verified - boost trust score
        // This would be factored into the trust score calculation
        await adminDb.collection('creators').doc(creatorId).update({
          'stripe.identityVerified': true,
          'stripe.identityVerifiedAt': admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else if (verification.status === 'requires_input') {
        // Verification failed or needs more info
        await adminDb.collection('creators').doc(creatorId).update({
          'stripe.identityVerified': false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    // Check account for fraud indicators
    // Stripe automatically flags suspicious activity
    const fraudIndicators = {
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      // Add more fraud checks as needed
    };

    // Store fraud indicators
    await adminDb.collection('creators').doc(creatorId).update({
      'stripe.fraudIndicators': fraudIndicators,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  } catch (error: any) {
    console.error('Error updating trust score from Stripe:', error);
  }
}
