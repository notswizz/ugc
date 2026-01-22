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

    if (!connectAccountId) {
      return res.status(400).json({
        error: 'Stripe Connect account required. Please complete Stripe Connect setup first.',
      });
    }

    // Check if identity verification already exists
    let verificationSessionId = creator?.stripe?.identityVerificationId;

    if (!verificationSessionId) {
      // Create new Identity verification session
      const verificationSession = await stripe.identity.verificationSessions.create({
        type: 'document',
        metadata: {
          creatorId: userId,
          connectAccountId,
        },
      });

      verificationSessionId = verificationSession.id;

      // Save verification session ID to creator document
      await adminDb.collection('creators').doc(userId).update({
        'stripe.identityVerificationId': verificationSessionId,
        'stripe.identityVerificationUrl': verificationSession.url,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Retrieve existing session to get URL
      const verificationSession = await stripe.identity.verificationSessions.retrieve(
        verificationSessionId
      );
      
      // Update URL in case it changed
      await adminDb.collection('creators').doc(userId).update({
        'stripe.identityVerificationUrl': verificationSession.url,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Get the verification session URL
    const verificationSession = await stripe.identity.verificationSessions.retrieve(
      verificationSessionId
    );

    // Create return URL
    const origin = req.headers.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const returnUrl = `${origin}/creator/dashboard?identity_verified=true`;

    // Update session with return URL (if needed)
    // Note: Stripe Identity sessions use client_secret for client-side verification
    // We'll redirect to the verification URL

    return res.status(200).json({
      url: verificationSession.url,
      sessionId: verificationSessionId,
    });
  } catch (error: any) {
    console.error('Stripe Identity verification error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to create Identity verification session',
    });
  }
}
