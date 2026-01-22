import type { NextApiRequest, NextApiResponse } from 'next';
import admin, { adminDb } from '@/lib/firebase/admin';
import { verifyTikTokScreenshot } from '@/lib/ai/tiktok-screenshot-verifier';

/**
 * Verify TikTok via screenshot: user adds GIGLET to bio, uploads screenshot
 * showing username, bio, follower count. AI checks GIGLET in bio and extracts
 * username + follower count, then we update creator.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, screenshotUrl, tiktokUsername: expectedUsername } = req.body;

  if (!userId || !screenshotUrl) {
    return res.status(400).json({ error: 'Missing userId or screenshotUrl' });
  }

  if (!adminDb) {
    return res.status(500).json({
      error: 'Firebase Admin not initialized',
    });
  }

  try {
    const result = await verifyTikTokScreenshot(screenshotUrl);

    if (!result.gigletInBio) {
      return res.status(400).json({
        success: false,
        error: 'GIGLET not found in bio',
        message: 'Add the exact word "GIGLET" to your TikTok bio, then upload a new screenshot showing your username, bio, and follower count.',
      });
    }

    if (result.followerCount == null || result.followerCount < 0) {
      return res.status(400).json({
        success: false,
        error: 'Could not read follower count',
        message: 'The screenshot must clearly show your follower count. Please upload a new screenshot.',
      });
    }

    const creatorRef = adminDb.collection('creators').doc(userId);
    const creatorDoc = await creatorRef.get();

    if (!creatorDoc.exists) {
      return res.status(404).json({ error: 'Creator profile not found' });
    }

    const creatorData = creatorDoc.data();
    const extractedUsername = result.username?.trim().replace(/^@/, '') || null;

    // Optional: if profile has tiktok username, prefer it; otherwise use extracted
    const usernameToStore = expectedUsername?.trim().replace(/^@/, '') || extractedUsername || creatorData?.socials?.tiktok;

    const updatedFollowingCount = {
      ...(creatorData?.followingCount || {}),
      tiktok: result.followerCount,
    };

    const verificationData = {
      tiktok: {
        verified: true,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        followerCount: result.followerCount,
        username: usernameToStore || undefined,
      },
    };

    const updatePayload: Record<string, unknown> = {
      followingCount: updatedFollowingCount,
      socialVerification: {
        ...(creatorData?.socialVerification || {}),
        ...verificationData,
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (usernameToStore) {
      updatePayload.socials = { ...(creatorData?.socials || {}), tiktok: usernameToStore };
    }
    await creatorRef.update(updatePayload);

    return res.status(200).json({
      success: true,
      followerCount: result.followerCount,
      username: usernameToStore,
      message: 'TikTok verified successfully',
    });
  } catch (e: any) {
    console.error('Verify TikTok screenshot error:', e);
    return res.status(500).json({
      success: false,
      error: 'Verification failed',
      message: e?.message || 'Could not verify screenshot. Please try again.',
    });
  }
}
