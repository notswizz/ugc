# TikTok Follower Count Verification Setup

This guide explains how to set up TikTok follower count verification for creators.

## Overview

The TikTok verification system allows creators to verify their follower counts automatically using TikTok's OAuth API. When a creator verifies their TikTok account, the system fetches their actual follower count from TikTok and updates their profile.

## Features

- ✅ OAuth-based verification (secure, no passwords)
- ✅ Automatic follower count update
- ✅ Verification badge on creator profile
- ✅ Works with TikTok Business/Personal accounts (public accounts only)

## Setup Instructions

### 1. Register TikTok App

1. Go to [TikTok for Developers](https://developers.tiktok.com/)
2. Create a developer account if you don't have one
3. Create a new app
4. Note your **Client Key** and **Client Secret**
5. Add your redirect URI: `https://yourdomain.com/tiktok-callback`
   - For local development: `http://localhost:3000/tiktok-callback`

### 2. Configure Environment Variables

Add these to your `.env.local` file:

```env
# TikTok OAuth Credentials
TIKTOK_CLIENT_KEY=your_client_key_here
TIKTOK_CLIENT_SECRET=your_client_secret_here

# Public TikTok Client Key (for OAuth redirect URL)
NEXT_PUBLIC_TIKTOK_CLIENT_KEY=your_client_key_here

# App URL (used for redirect URI)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # or your production URL
```

### 3. Request Required Permissions

When registering your TikTok app, ensure you request these scopes:
- `user.info.basic` - Basic user information
- `user.info.profile` - Profile information (username, display name)
- `user.info.stats` - **Required for follower count** (important!)

### 4. Submit for App Review

TikTok requires app review for production use. During development, you can test with your own TikTok account. For production:

1. Complete your app profile in TikTok Developer Portal
2. Submit your app for review
3. Wait for approval (typically 1-3 business days)

## How It Works

1. Creator clicks "Verify" button on their dashboard next to TikTok
2. They're redirected to TikTok OAuth page
3. Creator authorizes your app
4. TikTok redirects back with authorization code
5. Backend exchanges code for access token
6. Backend fetches follower count from TikTok API
7. Creator profile is updated with verified count
8. Verification badge appears on profile

## API Endpoints

### `/api/verify-tiktok`
- **Method**: POST
- **Body**: `{ code: string, creatorId: string }`
- **Returns**: `{ success: boolean, followerCount: number, username: string }`
- **Protected**: Uses server-side credentials

### `/tiktok-callback`
- **Type**: Next.js page (handles OAuth callback)
- **Purpose**: Receives OAuth code from TikTok and initiates verification

## Testing

1. Make sure environment variables are set
2. Start your development server: `npm run dev`
3. Go to creator dashboard
4. Click "Verify" next to TikTok username
5. Complete TikTok OAuth flow
6. Should redirect back with verified follower count

## Troubleshooting

### "TikTok integration not configured"
- Check that `NEXT_PUBLIC_TIKTOK_CLIENT_KEY` is set in `.env.local`
- Restart your development server after adding env variables

### "Failed to exchange code for token"
- Verify `TIKTOK_CLIENT_SECRET` is correct
- Check redirect URI matches exactly what's configured in TikTok Developer Portal
- Ensure redirect URI includes protocol (http:// or https://)

### "Follower count not available"
- TikTok account must be public
- User must be 18+
- Account must not be restricted

### "Scope not authorized"
- Ensure `user.info.stats` scope is requested during OAuth
- Check that your app has been approved for this scope by TikTok

## Security Notes

- Never commit `.env.local` to git
- Client Secret should only be in server-side environment variables
- Client Key can be public (used in browser for OAuth redirect)
- Access tokens are not stored permanently (only used for one-time verification)

## Future Enhancements

- [ ] Periodic re-verification (e.g., monthly)
- [ ] Instagram verification
- [ ] YouTube verification
- [ ] Verification history/audit log
- [ ] Admin panel to trigger verification

## References

- [TikTok Developer Documentation](https://developers.tiktok.com/doc/)
- [TikTok OAuth Guide](https://developers.tiktok.com/doc/tiktok-api-v2-get-user-info/)
- [User Info Scope Migration](https://developers.tiktok.com/bulletin/user-info-scope-migration)
