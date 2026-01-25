import type { NextApiRequest, NextApiResponse } from 'next';
import admin, { adminDb } from '@/lib/firebase/admin';
import { verifySocialScreenshot, type SocialPlatform } from '@/lib/ai/social-screenshot-verifier';

const PLATFORMS: SocialPlatform[] = ['tiktok', 'instagram', 'youtube', 'x'];

function isPlatform(s: string): s is SocialPlatform {
  return PLATFORMS.includes(s as SocialPlatform);
}

function platformLabel(platform: SocialPlatform): string {
  const map: Record<SocialPlatform, string> = {
    tiktok: 'TikTok',
    instagram: 'Instagram',
    youtube: 'YouTube',
    x: 'X',
  };
  return map[platform];
}

function countLabel(platform: SocialPlatform): string {
  return platform === 'youtube' ? 'subscriber count' : 'follower count';
}

/**
 * Verify any social via screenshot: user adds GIGLET to bio, uploads screenshot
 * showing username, bio, follower/subscriber count. AI checks GIGLET and extracts
 * username + count, then we update creator.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const bodyKeys = Object.keys(req.body ?? {});
  const body = (req.body ?? {}) as Record<string, unknown>;
  const platform = body.platform;
  const userId = body.userId;
  const screenshotUrl = body.screenshotUrl;
  const expectedUsername = body.username;

  console.log('[verify-social-screenshot] POST', {
    method: req.method,
    bodyKeys,
    platform: typeof platform === 'string' ? platform : `(${typeof platform})`,
    userId: typeof userId === 'string' ? `${userId.slice(0, 8)}...` : `(${typeof userId})`,
    hasScreenshotUrl: !!screenshotUrl,
    screenshotUrlLength: typeof screenshotUrl === 'string' ? screenshotUrl.length : 0,
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!platform || !userId || !screenshotUrl) {
    const missing: string[] = [];
    if (!platform) missing.push('platform');
    if (!userId) missing.push('userId');
    if (!screenshotUrl) missing.push('screenshotUrl');
    const message = `Missing required fields: ${missing.join(', ')}`;
    console.error('[verify-social-screenshot] 400 MISSING_FIELDS', { missing, bodyKeys, platform: !!platform, userId: !!userId, screenshotUrl: !!screenshotUrl });
    return res.status(400).json({ success: false, error: message, message });
  }

  const platformStr = String(platform);
  if (!isPlatform(platformStr)) {
    console.error('[verify-social-screenshot] 400 INVALID_PLATFORM', { platform, bodyKeys });
    return res.status(400).json({
      success: false,
      error: 'Invalid platform',
      message: `Platform must be one of: ${PLATFORMS.join(', ')}`,
    });
  }

  if (!adminDb) {
    return res.status(500).json({
      error: 'Firebase Admin not initialized',
    });
  }

  const label = platformLabel(platformStr);
  const countType = countLabel(platformStr);

  try {
    console.log('[verify-social-screenshot] calling AI verifier', { platform: platformStr, screenshotUrlLen: String(screenshotUrl).length });
    const result = await verifySocialScreenshot(String(screenshotUrl), platformStr);
    console.log('[verify-social-screenshot] AI result', { gigletInBio: result.gigletInBio, followerCount: result.followerCount, username: result.username });

    if (!result.gigletInBio) {
      console.error('[verify-social-screenshot] 400 GIGLET_NOT_IN_BIO', { platform: platformStr, raw: result.raw?.slice(0, 200) });
      return res.status(400).json({
        success: false,
        error: 'GIGLET not found in bio',
        message: `Add the exact word "GIGLET" to your ${label} bio, then upload a new screenshot showing your username, bio, and ${countType}.`,
      });
    }

    if (result.followerCount == null || result.followerCount < 0) {
      console.error('[verify-social-screenshot] 400 COULD_NOT_READ_COUNT', { platform: platformStr, raw: result.raw?.slice(0, 200) });
      return res.status(400).json({
        success: false,
        error: 'Could not read count',
        message: `The screenshot must clearly show your ${countType}. Please upload a new screenshot.`,
      });
    }

    const creatorRef = adminDb.collection('creators').doc(String(userId));
    const creatorDoc = await creatorRef.get();

    if (!creatorDoc.exists) {
      return res.status(404).json({ error: 'Creator profile not found' });
    }

    const creatorData = creatorDoc.data();
    const extractedUsername = result.username?.trim().replace(/^@/, '') || null;
    const existingUsername =
      (expectedUsername && String(expectedUsername).trim().replace(/^@/, '')) ||
      creatorData?.socials?.[platformStr];

    const usernameToStore = existingUsername || extractedUsername;

    const updatedFollowingCount = {
      ...(creatorData?.followingCount || {}),
      [platformStr]: result.followerCount,
    };

    const platformVerification: Record<string, unknown> = {
      verified: true,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      followerCount: result.followerCount,
      ...(platformStr === 'youtube' && { subscriberCount: result.followerCount }),
      ...(usernameToStore && { username: usernameToStore }),
    };

    const verificationData = {
      ...(creatorData?.socialVerification || {}),
      [platformStr]: platformVerification,
    };

    const updatePayload: Record<string, unknown> = {
      followingCount: updatedFollowingCount,
      socialVerification: verificationData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (usernameToStore) {
      updatePayload.socials = {
        ...(creatorData?.socials || {}),
        [platformStr]: usernameToStore,
      };
    }

    await creatorRef.update(updatePayload);
    console.log('[verify-social-screenshot] 200 OK', { platform: platformStr, userId: String(userId).slice(0, 8), followerCount: result.followerCount });

    return res.status(200).json({
      success: true,
      platform: platformStr,
      followerCount: result.followerCount,
      username: usernameToStore,
      message: `${label} verified successfully`,
    });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error('Verify social screenshot error:', e);
    return res.status(500).json({
      success: false,
      error: 'Verification failed',
      message: err?.message || 'Could not verify screenshot. Please try again.',
    });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '2mb' },
  },
};
