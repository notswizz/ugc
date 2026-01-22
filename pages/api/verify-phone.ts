import type { NextApiRequest, NextApiResponse } from 'next';
import admin, { adminDb } from '@/lib/firebase/admin';

const BLAND_API_BASE = 'https://api.bland.ai/v1';
const BLAND_COLLECTION = 'bland_verification_calls';

function webhookUrl(): string | null {
  const base = process.env.BLAND_WEBHOOK_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    || process.env.NEXT_PUBLIC_APP_URL
    || null;
  if (!base) return null;
  const url = base.startsWith('http') ? base : `https://${base}`;
  const full = url.endsWith('/api/bland-webhook') ? url : `${url.replace(/\/$/, '')}/api/bland-webhook`;
  return full.startsWith('https://') ? full : null;
}

/**
 * Phone verification via Bland AI:
 * 1. User enters phone → we trigger Bland to call them.
 * 2. Bland uses your pathway to confirm username + chat about interests/hobbies.
 * 3. Post-call webhook marks creator phoneVerified when call completes.
 *
 * Env: BLAND_API_KEY, BLAND_PATHWAY_ID
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.BLAND_API_KEY;
  const pathwayId = process.env.BLAND_PATHWAY_ID;

  if (!apiKey || !pathwayId) {
    const missing: string[] = [];
    if (!apiKey) missing.push('BLAND_API_KEY');
    if (!pathwayId) missing.push('BLAND_PATHWAY_ID');
    console.error('[verify-phone] Missing env:', missing.join(', '));
    return res.status(500).json({
      error: 'Bland AI not configured',
      message: `Add to .env.local: ${missing.join(', ')}`,
    });
  }

  if (!adminDb) {
    return res.status(500).json({ error: 'Firebase Admin not initialized' });
  }

  const { userId, phoneNumber, username, interests, bio } = req.body ?? {};

  if (!userId || !phoneNumber) {
    return res.status(400).json({
      error: 'Missing userId or phoneNumber',
      message: 'Provide userId and phoneNumber.',
    });
  }

  const normalized = String(phoneNumber).trim().replace(/\D/g, '');
  const e164 = normalized.length === 10 ? `+1${normalized}` : normalized.startsWith('1') ? `+${normalized}` : `+1${normalized}`;
  if (!/^\+1\d{10}$/.test(e164)) {
    return res.status(400).json({
      error: 'Invalid phone number',
      message: 'Use a US number: +1 followed by 10 digits (e.g. +12345678901).',
    });
  }

  try {
    const creatorSnap = await adminDb.collection('creators').doc(userId).get();
    if (!creatorSnap.exists) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    const creator = creatorSnap.data();
    const useUsername = (typeof username === 'string' && username.trim())
      ? String(username).trim().replace(/^@/, '')
      : (creator?.username ?? '');
    if (!useUsername) {
      return res.status(400).json({
        error: 'Missing username',
        message: 'Set your username in Settings first, then verify your phone.',
      });
    }

    const useInterests = Array.isArray(interests) ? interests : (creator?.interests ?? []);
    const useBio = typeof bio === 'string' ? bio : (creator?.bio ?? '');

    const wh = webhookUrl();
    if (!wh) {
      const hint =
        process.env.VERCEL_URL
          ? 'BLAND_WEBHOOK_URL is not set; webhook uses VERCEL_URL on Vercel.'
          : !process.env.BLAND_WEBHOOK_URL && !process.env.NEXT_PUBLIC_APP_URL
            ? 'Set BLAND_WEBHOOK_URL or NEXT_PUBLIC_APP_URL to an HTTPS URL (e.g. ngrok for local dev).'
            : 'Webhook URL must be HTTPS. Use BLAND_WEBHOOK_URL or NEXT_PUBLIC_APP_URL.';
      console.error('[verify-phone] No webhook URL:', hint);
      return res.status(400).json({
        error: 'Webhook URL required',
        message: hint,
      });
    }

    // request_data: pathway variables Bland uses during the call (e.g. {{username}} in nodes).
    // request_metadata: optional extra context; we also store username in our DB for the webhook.
    const payload: Record<string, unknown> = {
      phone_number: e164,
      pathway_id: pathwayId,
      webhook: wh,
      request_data: {
        username: useUsername,
        user_name: useUsername,
        interests: useInterests,
        bio: useBio,
      },
      request_metadata: {
        user_id: userId,
        username: useUsername,
      },
    };

    const blandRes = await fetch(`${BLAND_API_BASE}/calls`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await blandRes.json().catch(() => ({}))) as { call_id?: string; id?: string; error?: string; message?: string };

    if (!blandRes.ok) {
      console.error('[verify-phone] Bland API error', { status: blandRes.status, data });
      return res.status(502).json({
        error: 'Bland API error',
        message: data?.message || data?.error || `Bland returned ${blandRes.status}`,
      });
    }

    const callId = data.call_id ?? data.id;
    if (!callId) {
      console.error('[verify-phone] No call_id in Bland response', data);
      return res.status(502).json({
        error: 'Bland API error',
        message: 'No call ID in response',
      });
    }

    await adminDb.collection(BLAND_COLLECTION).doc(String(callId)).set({
      userId,
      phoneNumber: e164,
      username: useUsername,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await adminDb.collection('creators').doc(userId).update({
      phoneNumber: e164,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      success: true,
      message: "We're calling you now. Answer to verify your username and chat about your interests.",
      callId: String(callId),
    });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error('[verify-phone] Error', err);
    return res.status(500).json({
      error: 'Verification failed',
      message: err?.message || 'Could not start verification call.',
    });
  }
}
