import type { NextApiRequest, NextApiResponse } from 'next';
import admin, { adminDb } from '@/lib/firebase/admin';

/**
 * Verify TikTok follower count via TikTok API
 * 
 * This endpoint:
 * 1. Receives TikTok OAuth code from client
 * 2. Exchanges code for access token
 * 3. Fetches user info including follower_count
 * 4. Updates creator profile with verified count
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, creatorId } = req.body;

  if (!code || !creatorId) {
    return res.status(400).json({ error: 'Missing code or creatorId' });
  }

  // Validate Firebase Admin initialization
  if (!adminDb) {
    return res.status(500).json({ 
      error: 'Firebase Admin not initialized',
      message: 'Please configure Firebase Admin credentials'
    });
  }

  try {
    // Step 1: Exchange OAuth code for access token
    const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
    const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
    const TIKTOK_REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tiktok-callback`;

    if (!TIKTOK_CLIENT_KEY || !TIKTOK_CLIENT_SECRET) {
      return res.status(500).json({ 
        error: 'TikTok API credentials not configured',
        message: 'Please set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET environment variables'
      });
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_key: TIKTOK_CLIENT_KEY,
        client_secret: TIKTOK_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: TIKTOK_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error('TikTok token exchange failed:', errorData);
      return res.status(400).json({ 
        error: 'Failed to exchange code for token',
        message: errorData.error_description || 'Invalid authorization code'
      });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.status(400).json({ 
        error: 'No access token received from TikTok'
      });
    }

    // Step 2: Fetch user info including follower count
    const userInfoResponse = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=username,display_name,follower_count,following_count', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      const errorData = await userInfoResponse.json().catch(() => ({}));
      console.error('TikTok user info fetch failed:', errorData);
      return res.status(400).json({ 
        error: 'Failed to fetch user info from TikTok',
        message: errorData.error?.message || 'Could not retrieve TikTok profile'
      });
    }

    const userInfo = await userInfoResponse.json();
    
    // TikTok API returns data in format: { data: { user: { ... } } }
    const tiktokUser = userInfo?.data?.user;
    
    if (!tiktokUser) {
      return res.status(400).json({ 
        error: 'Invalid response from TikTok API',
        message: 'User data not found in response'
      });
    }

    const followerCount = tiktokUser.follower_count;
    const username = tiktokUser.username;
    const displayName = tiktokUser.display_name;

    if (followerCount === undefined || followerCount === null) {
      return res.status(400).json({ 
        error: 'Follower count not available',
        message: 'TikTok account may be private or age-restricted'
      });
    }

    // Step 3: Update creator profile with verified count
    const creatorRef = adminDb.collection('creators').doc(creatorId);
    const creatorDoc = await creatorRef.get();

    if (!creatorDoc.exists) {
      return res.status(404).json({ error: 'Creator profile not found' });
    }

    const creatorData = creatorDoc.data();
    
    // Update followingCount with verified TikTok count
    const updatedFollowingCount = {
      ...(creatorData?.followingCount || {}),
      tiktok: followerCount,
    };

    // Store verification metadata
    const verificationData = {
      tiktok: {
        verified: true,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        followerCount: followerCount,
        username: username,
        displayName: displayName,
      },
    };

    await creatorRef.update({
      followingCount: updatedFollowingCount,
      socialVerification: {
        ...(creatorData?.socialVerification || {}),
        ...verificationData,
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      success: true,
      followerCount,
      username,
      displayName,
      message: 'TikTok follower count verified successfully',
    });

  } catch (error: any) {
    console.error('Error verifying TikTok:', error);
    return res.status(500).json({ 
      error: 'Verification failed',
      message: error.message || 'An unexpected error occurred'
    });
  }
}
