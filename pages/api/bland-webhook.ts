import type { NextApiRequest, NextApiResponse } from 'next';
import admin, { adminDb } from '@/lib/firebase/admin';

const BLAND_COLLECTION = 'bland_verification_calls';

/**
 * Post-call webhook from Bland AI.
 * Bland calls this when a verification call ends. We mark the creator phoneVerified.
 *
 * Expected payload shape (adjust if Bland sends different keys):
 * - call_id or id
 * - status: e.g. "completed", "failed", "no-answer"
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!adminDb) {
    console.error('[bland-webhook] Firebase Admin not initialized');
    return res.status(500).json({ error: 'Server error' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
    const callId = body.call_id ?? body.id ?? body.callId;
    const status = (body.status ?? '').toString().toLowerCase();

    if (!callId) {
      console.warn('[bland-webhook] No call_id in payload', Object.keys(body));
      return res.status(200).json({ received: true });
    }

    const doc = await adminDb.collection(BLAND_COLLECTION).doc(String(callId)).get();
    if (!doc.exists) {
      console.warn('[bland-webhook] Unknown call_id', callId);
      return res.status(200).json({ received: true });
    }

    const { userId, phoneNumber } = doc.data() ?? {};
    const docRef = adminDb.collection(BLAND_COLLECTION).doc(String(callId));

    if (!userId) {
      await docRef.delete();
      return res.status(200).json({ received: true });
    }

    const completed = ['completed', 'done', 'finished'].some((s) => status.includes(s));

    if (completed) {
      await adminDb.collection('creators').doc(userId).update({
        phoneVerified: true,
        phoneNumber: phoneNumber ?? undefined,
        phoneVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('[bland-webhook] Marked phone verified', { userId, callId });
    }

    await docRef.delete();

    return res.status(200).json({ received: true, verified: completed });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error('[bland-webhook] Error', err);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '256kb',
    },
  },
};
