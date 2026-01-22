import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import admin, { adminDb } from '@/lib/firebase/admin';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16' as any,
    })
  : null;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!adminDb || !stripe) {
      return res.status(500).json({ error: 'Server not configured' });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Get creator data
    const creatorDoc = await adminDb.collection('creators').doc(userId).get();
    if (!creatorDoc.exists) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    const creator = creatorDoc.data();
    const connectAccountId = creator?.stripe?.connectAccountId;
    const identityVerificationId = creator?.stripe?.identityVerificationId;

    const updates: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Check Stripe Connect account status
    if (connectAccountId) {
      try {
        const account = await stripe.accounts.retrieve(connectAccountId);
        
        // Update onboarding status based on details_submitted
        const onboardingComplete = account.details_submitted === true;
        if (onboardingComplete !== creator?.stripe?.onboardingComplete) {
          updates['stripe.onboardingComplete'] = onboardingComplete;
        }

        // Check and update transfers capability status
        const transfersStatus = account.capabilities?.transfers;
        if (transfersStatus && transfersStatus !== creator?.stripe?.transfersCapabilityStatus) {
          updates['stripe.transfersCapabilityStatus'] = transfersStatus;
        }

        // If transfers is not active or pending, try to request it
        if (onboardingComplete && (!transfersStatus || transfersStatus === 'inactive')) {
          try {
            const updatedAccount = await stripe.accounts.update(connectAccountId, {
              capabilities: {
                transfers: { requested: true },
              },
            });
            const newTransfersStatus = updatedAccount.capabilities?.transfers;
            if (newTransfersStatus) {
              updates['stripe.transfersCapabilityStatus'] = newTransfersStatus;
            }
          } catch (updateError: any) {
            console.error('Error requesting transfers capability:', updateError);
            // Don't fail the whole check if this fails
          }
        }
      } catch (error: any) {
        console.error('Error retrieving Stripe account:', error);
        // Continue even if account retrieval fails
      }
    }

    // Check Identity verification status
    if (identityVerificationId) {
      try {
        const verificationSession = await stripe.identity.verificationSessions.retrieve(
          identityVerificationId
        );

        const identityVerified = verificationSession.status === 'verified';
        
        // Update identity verification status if it changed
        if (identityVerified !== creator?.stripe?.identityVerified) {
          updates['stripe.identityVerified'] = identityVerified;
          if (identityVerified) {
            updates['stripe.identityVerifiedAt'] = admin.firestore.FieldValue.serverTimestamp();
          } else {
            updates['stripe.identityVerificationStatus'] = verificationSession.status;
          }
        }
      } catch (error: any) {
        console.error('Error retrieving Identity verification session:', error);
        // Continue even if verification retrieval fails
      }
    }

    // Update creator document if there are changes
    if (Object.keys(updates).length > 1) { // More than just updatedAt
      await adminDb.collection('creators').doc(userId).update(updates);
    }

    // Return current status
    const updatedDoc = await adminDb.collection('creators').doc(userId).get();
    const updatedData = updatedDoc.data();

    return res.status(200).json({
      success: true,
      status: {
        onboardingComplete: updatedData?.stripe?.onboardingComplete || false,
        identityVerified: updatedData?.stripe?.identityVerified || false,
        hasConnectAccount: !!connectAccountId,
        hasVerificationSession: !!identityVerificationId,
        transfersCapabilityStatus: updatedData?.stripe?.transfersCapabilityStatus || null,
        canWithdraw: updatedData?.stripe?.onboardingComplete === true && 
                     (updatedData?.stripe?.transfersCapabilityStatus === 'active' || 
                      updatedData?.stripe?.transfersCapabilityStatus === 'pending'),
      },
    });
  } catch (error: any) {
    console.error('Check Stripe status error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to check Stripe status',
    });
  }
}
