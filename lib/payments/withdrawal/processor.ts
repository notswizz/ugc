import Stripe from 'stripe';
import admin, { adminDb } from '@/lib/firebase/admin';
import { calculateTrustScore } from '@/lib/trustScore/calculator';
import { getBalance } from '../balance';
import { canUseInstantWithdrawal, validateWithdrawalAmount, validateBalance } from './validator';
import type { WithdrawalRequest, WithdrawalResult } from './types';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16' as any,
    })
  : null;

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
  const amountValidation = validateWithdrawalAmount(amount);
  if (!amountValidation.valid) {
    throw new Error(amountValidation.error);
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
  const balanceValidation = validateBalance(balance, amount);
  if (!balanceValidation.valid) {
    throw new Error(balanceValidation.error);
  }

  // Calculate trust score
  const trustScore = calculateTrustScore(creator);
  const canUseInstant = canUseInstantWithdrawal(trustScore);

  // Determine withdrawal method
  const method = request.destination === 'instant' && canUseInstant ? 'instant' : 'ach';

  // Verify Stripe setup
  if (method === 'instant') {
    await verifyInstantWithdrawalSetup(creator, creatorId);
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
      const result = await processInstantWithdrawal(creator, creatorId, amount, withdrawalData);
      estimatedArrival = result.estimatedArrival;
    } else {
      const result = await processAchWithdrawal(creator, creatorId, amount, withdrawalData);
      estimatedArrival = result.estimatedArrival;
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
    await adminDb.collection('withdrawals').add(withdrawalData);

    throw new Error(`Withdrawal failed: ${error.message}`);
  }
}

/**
 * Verify instant withdrawal setup requirements
 */
async function verifyInstantWithdrawalSetup(creator: any, creatorId: string): Promise<void> {
  if (!stripe || !adminDb) throw new Error('Services not configured');

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
    if (!creator.stripe?.identityVerified) {
      const identityVerificationId = creator.stripe?.identityVerificationId;
      if (identityVerificationId) {
        try {
          const verification = await stripe.identity.verificationSessions.retrieve(identityVerificationId);
          if (verification.status === 'verified') {
            await adminDb.collection('creators').doc(creatorId).update({
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

/**
 * Check and enable transfers capability if needed
 */
async function ensureTransfersCapability(connectAccountId: string): Promise<void> {
  if (!stripe) throw new Error('Stripe not configured');

  const account = await stripe.accounts.retrieve(connectAccountId);

  if (!account.details_submitted) {
    throw new Error(
      'Your Stripe Connect account setup is incomplete. Please complete all required steps in your Stripe Connect onboarding and try again.'
    );
  }

  const transfersStatus = account.capabilities?.transfers;

  if (transfersStatus === 'active' || transfersStatus === 'pending') {
    return;
  }

  if (!transfersStatus || transfersStatus === 'inactive') {
    try {
      const updatedAccount = await stripe.accounts.update(connectAccountId, {
        capabilities: {
          transfers: { requested: true },
        },
      });

      const newStatus = updatedAccount.capabilities?.transfers;
      if (newStatus === 'active' || newStatus === 'pending') {
        return;
      }

      throw new Error(
        'Transfers capability is not yet active. Please: 1) Complete all required verification steps in your Stripe Connect dashboard, 2) Ensure identity verification is complete, 3) Wait a few minutes after completing setup, then try again. If the issue persists, check your Stripe Connect dashboard for any pending requirements.'
      );
    } catch (updateError: any) {
      if (
        updateError.message?.includes('already enabled') ||
        updateError.message?.includes('active') ||
        updateError.message?.includes('pending')
      ) {
        return;
      }
      throw new Error(
        `Unable to enable transfers. Please complete your Stripe Connect onboarding, including identity verification and all required business information. Then wait a few minutes before trying again. Error: ${updateError.message}`
      );
    }
  }
}

/**
 * Create transfer to Connect account
 */
async function createTransfer(
  connectAccountId: string,
  amountCents: number,
  creatorId: string,
  method: 'instant' | 'ach'
): Promise<Stripe.Transfer> {
  if (!stripe) throw new Error('Stripe not configured');

  try {
    return await stripe.transfers.create({
      amount: amountCents,
      currency: 'usd',
      destination: connectAccountId,
      metadata: {
        type: 'withdrawal',
        creatorId,
        method,
      },
    });
  } catch (transferError: any) {
    if (transferError.message?.includes('stripe_balance.stripe_transfers') || transferError.message?.includes('transfers')) {
      throw new Error(
        'Transfers are not yet enabled on your account. Please complete all verification steps in your Stripe Connect dashboard, then wait a few minutes before trying again.'
      );
    }
    if (transferError.code === 'account_invalid') {
      throw new Error(
        'Your Stripe Connect account is not fully set up. Please complete the onboarding process in Stripe and try again.'
      );
    }
    throw transferError;
  }
}

/**
 * Process instant withdrawal via Stripe (debit card)
 */
async function processInstantWithdrawal(
  creator: any,
  creatorId: string,
  amount: number,
  withdrawalData: any
): Promise<{ estimatedArrival: string }> {
  if (!stripe) throw new Error('Stripe not configured');

  const connectAccountId = creator.stripe.connectAccountId;
  const amountCents = Math.round(amount * 100);

  await ensureTransfersCapability(connectAccountId);

  const transfer = await createTransfer(connectAccountId, amountCents, creatorId, 'instant');

  // Create instant payout (to debit card)
  const payout = await stripe.payouts.create(
    {
      amount: amountCents,
      currency: 'usd',
      method: 'instant',
    },
    {
      stripeAccount: connectAccountId,
    }
  );

  withdrawalData.stripe = {
    transferId: transfer.id,
    payoutId: payout.id,
  };
  withdrawalData.status = 'processing';

  await deductBalance(creatorId, amount, 'Instant withdrawal via Stripe');

  return { estimatedArrival: 'Within minutes' };
}

/**
 * Process ACH withdrawal (2-3 business days)
 */
async function processAchWithdrawal(
  creator: any,
  creatorId: string,
  amount: number,
  withdrawalData: any
): Promise<{ estimatedArrival: string }> {
  if (!stripe) throw new Error('Stripe not configured');

  const connectAccountId = creator.stripe?.connectAccountId;
  const bankAccountId = creator.stripe?.bankAccount?.accountId;

  if (!connectAccountId || !bankAccountId) {
    throw new Error('Bank account details required for ACH withdrawal');
  }

  const amountCents = Math.round(amount * 100);

  await ensureTransfersCapability(connectAccountId);

  const transfer = await createTransfer(connectAccountId, amountCents, creatorId, 'ach');

  // Create ACH payout (2-3 business days)
  const payout = await stripe.payouts.create(
    {
      amount: amountCents,
      currency: 'usd',
      method: 'standard',
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

  await deductBalance(creatorId, amount, 'ACH withdrawal via Stripe');

  return { estimatedArrival: `By ${arrivalDate.toLocaleDateString()}` };
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
        await adminDb.collection('creators').doc(creatorId).update({
          'stripe.identityVerified': true,
          'stripe.identityVerifiedAt': admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else if (verification.status === 'requires_input') {
        await adminDb.collection('creators').doc(creatorId).update({
          'stripe.identityVerified': false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    // Check account for fraud indicators
    const fraudIndicators = {
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
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
