import Stripe from 'stripe';
import admin, { adminDb } from '@/lib/firebase/admin';
import { transferBalance, updateBalance, getOrCreateBankAccount } from './balance';

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16' as any,
    })
  : null;

export interface PaymentData {
  submissionId: string;
  gigId: string;
  creatorId: string;
  brandId: string;
  gig: any;
  submission: any;
}

/**
 * Processes automatic payment for approved submission
 * Uses Stripe if configured, otherwise uses balance system
 */
export async function processPayment(data: PaymentData): Promise<void> {
  const { submissionId, gigId, creatorId, brandId, gig, submission } = data;
  
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  // Check if payment already exists for this submission
  const existingPayments = await adminDb
    .collection('payments')
    .where('submissionId', '==', submissionId)
    .where('status', 'in', ['pending', 'captured', 'transferred', 'balance_transferred'])
    .get();

  if (!existingPayments.empty) {
    console.log('Payment already exists for submission:', submissionId);
    return;
  }

  // Calculate payment amounts
  // If gig has dynamic follower ranges, calculate payout based on creator's follower count
  let basePayout = parseFloat(gig.basePayout) || 0;
  
  if (gig.payoutType === 'dynamic' && gig.followerRanges && gig.followerRanges.length > 0) {
    // Get creator data to calculate payout based on follower count
    const creatorDoc = await adminDb.collection('creators').doc(creatorId).get();
    if (creatorDoc.exists) {
      const creator = creatorDoc.data();
      const followingCount = (creator?.followingCount?.tiktok || 0) + 
                            (creator?.followingCount?.instagram || 0) + 
                            (creator?.followingCount?.youtube || 0) + 
                            (creator?.followingCount?.linkedin || 0);
      
      // Find matching range
      const sortedRanges = [...gig.followerRanges].sort((a: any, b: any) => (a.min || 0) - (b.min || 0));
      for (const range of sortedRanges) {
        const min = range.min || 0;
        const max = range.max;
        
        if (followingCount >= min) {
          if (max === null || max === undefined || followingCount <= max) {
            basePayout = range.payout || 0;
            break;
          }
        }
      }
    }
  }
  
  // Get platform fee percentage from environment variable (defaults to 15% if not set)
  // Support both PLATFORM_FEE_PERCENTAGE and platform_fee_percentage
  const platformFeePercentage = parseFloat(
    process.env.PLATFORM_FEE_PERCENTAGE || 
    process.env.platform_fee_percentage || 
    '15'
  );
  const platformFeeRate = platformFeePercentage / 100; // Convert percentage to decimal
  const platformFee = basePayout * platformFeeRate;
  
  // Reimbursement amount (separate from basePayout, no platform fee on this)
  let reimbursementAmount = 0;
  
  // Check for reimbursement - look for productPurchase data
  if (submission.productPurchase) {
    const requestedReimbursement = parseFloat(submission.productPurchase.amount) || 0;
    const reimbursementCap = parseFloat(gig.reimbursementCap) || 0;
    
    // Reimbursement is available if there's an amount (check both ocrVerified and amount)
    // For now, if amount exists, include it (can add ocrVerified check later if needed)
    if (requestedReimbursement > 0 && reimbursementCap > 0) {
      reimbursementAmount = Math.min(requestedReimbursement, reimbursementCap);
      console.log('Reimbursement calculation:', {
        requestedAmount: requestedReimbursement,
        cap: reimbursementCap,
        finalAmount: reimbursementAmount,
      });
    }
  }

  const bonusAmount = 0; // Can be calculated based on quality score
  
  // Creator receives: basePayout - platformFee + reimbursementAmount + bonusAmount
  // Platform fee is ONLY deducted from basePayout, reimbursement is separate
  const creatorNet = basePayout - platformFee + reimbursementAmount + bonusAmount;
  
  // Total brand pays: basePayout + reimbursementAmount + bonusAmount
  // (Platform fee is deducted from basePayout portion only)

  console.log('💰 Payment calculation:', {
    basePayout: `$${basePayout.toFixed(2)}`,
    platformFee: `$${platformFee.toFixed(2)} (10% of basePayout only)`,
    reimbursementAmount: reimbursementAmount > 0 ? `$${reimbursementAmount.toFixed(2)} (separate, no fee)` : '$0.00 (none)',
    bonusAmount: `$${bonusAmount.toFixed(2)}`,
    creatorNet: `$${creatorNet.toFixed(2)} (what creator receives)`,
    breakdown: `Creator gets: $${basePayout.toFixed(2)} - $${platformFee.toFixed(2)} + $${reimbursementAmount.toFixed(2)} + $${bonusAmount.toFixed(2)} = $${creatorNet.toFixed(2)}`,
    totalBrandPays: `$${(basePayout + reimbursementAmount + bonusAmount).toFixed(2)}`,
  });

  if (creatorNet <= 0) {
    console.log('⚠️ Creator net amount is 0 or negative, skipping payment');
    return;
  }

  // If Stripe is configured, try Stripe first
  if (stripe) {
    // Get creator data to check Stripe Connect account
    const creatorDoc = await adminDb.collection('creators').doc(creatorId).get();
    if (!creatorDoc.exists) {
      throw new Error('Creator not found');
    }

    const creator = creatorDoc.data();
    const connectAccountId = creator?.stripe?.connectAccountId;

    if (connectAccountId) {
      // Process via Stripe
      try {
        await processStripePayment({
          submissionId,
          gigId,
          creatorId,
          brandId,
          basePayout,
          bonusAmount,
          reimbursementAmount,
          platformFee,
          creatorNet,
          connectAccountId,
        });
        return; // Successfully processed via Stripe
      } catch (stripeError: any) {
        console.error('Stripe payment failed, falling back to balance system:', stripeError);
        // Fall through to balance system
      }
    } else {
      console.log('Creator does not have Stripe Connect account set up, using balance system');
    }
  }

  // Process via balance system (either Stripe not configured or Stripe failed)
  await processBalancePayment({
    submissionId,
    gigId,
    creatorId,
    brandId,
    basePayout,
    bonusAmount,
    reimbursementAmount,
    platformFee,
    creatorNet,
  });
}

/**
 * Processes payment via Stripe
 */
async function processStripePayment(data: {
  submissionId: string;
  gigId: string;
  creatorId: string;
  brandId: string;
  basePayout: number;
  bonusAmount: number;
  reimbursementAmount: number;
  platformFee: number;
  creatorNet: number;
  connectAccountId: string;
}): Promise<void> {
  const {
    submissionId,
    gigId,
    creatorId,
    brandId,
    basePayout,
    bonusAmount,
    reimbursementAmount,
    platformFee,
    creatorNet,
    connectAccountId,
  } = data;

  // Convert to cents for Stripe
  const transferAmount = Math.round(creatorNet * 100);

  try {
    // Create Stripe transfer
    const transfer = await stripe!.transfers.create({
      amount: transferAmount,
      currency: 'usd',
      destination: connectAccountId,
      metadata: {
        submissionId,
        gigId,
        creatorId,
        brandId,
      },
    });

    // Create payment document
    const paymentData: any = {
      submissionId,
      gigId,
      brandId,
      creatorId,
      basePayout,
      platformFee,
      creatorNet,
      stripe: {
        transferId: transfer.id,
      },
      status: 'transferred',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      transferredAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Only include optional fields if they have values
    if (bonusAmount > 0) {
      paymentData.bonusAmount = bonusAmount;
    }
    if (reimbursementAmount > 0) {
      paymentData.reimbursementAmount = reimbursementAmount;
    }

    await adminDb!.collection('payments').add(paymentData);

    console.log('Stripe payment processed successfully:', {
      submissionId,
      transferId: transfer.id,
      amount: creatorNet,
    });
  } catch (stripeError: any) {
    console.error('Stripe transfer error:', stripeError);
    
    // Create payment document with pending status
    const paymentData: any = {
      submissionId,
      gigId,
      brandId,
      creatorId,
      basePayout,
      platformFee,
      creatorNet,
      stripe: {},
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      error: stripeError.message,
    };

    // Only include optional fields if they have values
    if (bonusAmount > 0) {
      paymentData.bonusAmount = bonusAmount;
    }
    if (reimbursementAmount > 0) {
      paymentData.reimbursementAmount = reimbursementAmount;
    }

    await adminDb!.collection('payments').add(paymentData);
    
    throw new Error(`Stripe payment processing failed: ${stripeError.message}`);
  }
}

/**
 * Processes payment via balance system
 */
async function processBalancePayment(data: {
  submissionId: string;
  gigId: string;
  creatorId: string;
  brandId: string;
  basePayout: number;
  bonusAmount: number;
  reimbursementAmount: number;
  platformFee: number;
  creatorNet: number;
}): Promise<void> {
  const {
    submissionId,
    gigId,
    creatorId,
    brandId,
    basePayout,
    bonusAmount,
    reimbursementAmount,
    platformFee,
    creatorNet,
  } = data;

  try {
    // Check if brand has sufficient balance for both creator payment and platform fee
    const brandDoc = await adminDb!.collection('brands').doc(brandId).get();
    if (!brandDoc.exists) {
      throw new Error('Brand not found');
    }
    const brandBalance = brandDoc.data()?.balance || 0;
    const totalRequired = creatorNet + platformFee;
    
    if (brandBalance < totalRequired) {
      throw new Error(`Insufficient brand balance. Current: $${brandBalance.toFixed(2)}, Required: $${totalRequired.toFixed(2)} (Creator: $${creatorNet.toFixed(2)} + Platform Fee: $${platformFee.toFixed(2)})`);
    }

    // Transfer balance from brand to creator (net amount after fees)
    // This deducts creatorNet from brand balance
    await transferBalance(
      brandId,
      creatorId,
      creatorNet,
      `Payment for approved submission`,
      {
        submissionId,
        gigId,
        basePayout,
        bonusAmount,
        reimbursementAmount,
        platformFee,
      }
    );

    // Transfer platform fee from brand to BANK account
    // The brand balance was already decreased by creatorNet, now we also deduct platformFee
    if (platformFee > 0) {
      const bankId = await getOrCreateBankAccount();
      // Deduct platform fee from brand balance (brand already lost creatorNet, now loses platformFee too)
      await updateBalance(
        brandId,
        'brand',
        -platformFee, // Negative amount to deduct
        `Platform fee for submission ${submissionId}`,
        {
          submissionId,
          gigId,
          creatorId,
          platformFee,
          type: 'platform_fee',
        }
      );
      // Add platform fee to BANK balance
      await updateBalance(
        bankId,
        'brand',
        platformFee,
        `Platform fee for submission ${submissionId}`,
        {
          submissionId,
          gigId,
          brandId,
          creatorId,
          platformFee,
          type: 'platform_fee',
        }
      );
      console.log(`Platform fee of $${platformFee.toFixed(2)} transferred from brand ${brandId} to BANK account`);
    }

    // Create payment document
    const paymentData: any = {
      submissionId,
      gigId,
      brandId,
      creatorId,
      basePayout,
      platformFee,
      creatorNet,
      stripe: {},
      status: 'balance_transferred',
      paymentMethod: 'balance',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      transferredAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Only include optional fields if they have values
    if (bonusAmount > 0) {
      paymentData.bonusAmount = bonusAmount;
    }
    if (reimbursementAmount > 0) {
      paymentData.reimbursementAmount = reimbursementAmount;
    }

    await adminDb!.collection('payments').add(paymentData);

    console.log('✅ Balance payment processed successfully:', {
      submissionId,
      creatorReceives: creatorNet,
      breakdown: {
        basePayout,
        platformFeeDeducted: platformFee,
        reimbursementAdded: reimbursementAmount,
        bonusAdded: bonusAmount,
      },
      brandId,
      creatorId,
    });
    
    if (reimbursementAmount > 0) {
      console.log(`✅ Reimbursement of $${reimbursementAmount.toFixed(2)} included in creator payment`);
    }
  } catch (balanceError: any) {
    console.error('Balance transfer error:', balanceError);
    
    // Create payment document with pending status
    const paymentData: any = {
      submissionId,
      gigId,
      brandId,
      creatorId,
      basePayout,
      platformFee,
      creatorNet,
      stripe: {},
      status: 'pending',
      paymentMethod: 'balance',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      error: balanceError.message,
    };

    // Only include optional fields if they have values
    if (bonusAmount > 0) {
      paymentData.bonusAmount = bonusAmount;
    }
    if (reimbursementAmount > 0) {
      paymentData.reimbursementAmount = reimbursementAmount;
    }

    await adminDb!.collection('payments').add(paymentData);
    
    throw new Error(`Balance payment processing failed: ${balanceError.message}`);
  }
}
