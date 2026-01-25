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
    const existingConnectId = creator?.stripe?.connectAccountId;

    let accountId = existingConnectId;

    // Create Stripe Connect account if it doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express', // Express accounts are simpler for creators
        country: 'US', // You can make this dynamic based on user location
        email: creator.email || undefined,
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
        metadata: {
          creatorId: userId,
        },
      });

      accountId = account.id;

      // Save Connect account ID to creator document
      await adminDb.collection('creators').doc(userId).update({
        'stripe.connectAccountId': accountId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Ensure transfers capability is requested for existing accounts
      try {
        const account = await stripe.accounts.retrieve(accountId);
        if (account.capabilities?.transfers !== 'active') {
          // Request transfers capability if not already active
          await stripe.accounts.update(accountId, {
            capabilities: {
              transfers: { requested: true },
            },
          });
        }
      } catch (error: any) {
        console.error('Error updating account capabilities:', error);
        // Don't fail the request if capability update fails
      }
    }

    // Create onboarding link
    const origin = req.headers.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const returnUrl = `${origin}/creator/dashboard?stripe_return=true`;
    const refreshUrl = `${origin}/creator/dashboard?stripe_refresh=true`;

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return res.status(200).json({
      url: accountLink.url,
      accountId,
    });
  } catch (error: any) {
    console.error('Stripe Connect onboarding error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to create Stripe Connect onboarding link',
    });
  }
}
