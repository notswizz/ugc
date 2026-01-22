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
    const raw = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
    const data = raw.data ?? raw.payload ?? raw;
    const body = typeof data === 'object' && data !== null ? { ...raw, ...data } : raw;

    const callId =
      body.call_id ?? body.id ?? body.callId ?? body.callID ?? (body.call && (body.call as { id?: string }).id);

    const status = (body.status ?? body.call_status ?? '').toString().toLowerCase();
    const customVerified =
      body.verified === true ||
      body.username_verified === true ||
      (typeof (body as { variable?: Record<string, unknown> }).variable === 'object' &&
        (body as { variable?: { username_verified?: boolean } }).variable?.username_verified === true);

    console.log('[bland-webhook] Incoming', {
      keys: Object.keys(body),
      callId: callId ?? null,
      status: status || null,
      customVerified,
    });

    if (!callId) {
      console.warn('[bland-webhook] No call_id in payload', Object.keys(body));
      return res.status(200).json({ received: true });
    }

    const doc = await adminDb.collection(BLAND_COLLECTION).doc(String(callId)).get();
    if (!doc.exists) {
      console.warn('[bland-webhook] Unknown call_id', callId, '(store doc IDs from verify-phone create response)');
      return res.status(200).json({ received: true });
    }

    const { userId, phoneNumber } = doc.data() ?? {};
    const docRef = adminDb.collection(BLAND_COLLECTION).doc(String(callId));

    if (!userId) {
      await docRef.delete();
      return res.status(200).json({ received: true });
    }

    const completed =
      customVerified ||
      [
        'completed',
        'complete',
        'done',
        'finished',
        'success',
        'successful',
        'ended',
        'verified',
      ].some((s) => status.includes(s));

    if (completed) {
      await adminDb.collection('creators').doc(userId).update({
        phoneVerified: true,
        phoneNumber: phoneNumber ?? undefined,
        phoneVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('[bland-webhook] Marked phone verified', { userId, callId, status });
    } else {
      console.log('[bland-webhook] Call not treated as completed', { callId, status, customVerified });
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
