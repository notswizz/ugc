import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import LoadingSpinner from '@/components/ui/loading-spinner';

/**
 * TikTok OAuth callback page
 * This page receives the OAuth code from TikTok and forwards it to the verification API
 */
export default function TikTokCallback() {
  const router = useRouter();
  const { code, state, error } = router.query;
  const [status, setStatus] = useState<string>('Processing...');

  useEffect(() => {
    if (error) {
      console.error('TikTok OAuth error:', error);
      setStatus('OAuth error occurred');
      // Redirect back to dashboard with error
      setTimeout(() => {
        router.push('/creator/dashboard?tiktok_error=' + encodeURIComponent(error as string));
      }, 2000);
      return;
    }

    if (code && state) {
      // Extract creatorId from state (we'll pass it in the OAuth flow)
      const creatorId = state as string;
      setStatus('Verifying follower count...');

      // Call verification API
      fetch('/api/verify-tiktok', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          creatorId: creatorId,
        }),
      })
        .then(async response => {
          const data = await response.json();
          if (response.ok && data.success) {
            setStatus('Verification successful!');
            // Success - redirect to dashboard with success message
            setTimeout(() => {
              router.push(`/creator/dashboard?tiktok_verified=true&count=${data.followerCount}`);
            }, 1500);
          } else {
            setStatus('Verification failed');
            // Error - redirect with error message
            setTimeout(() => {
              router.push(`/creator/dashboard?tiktok_error=${encodeURIComponent(data.message || data.error || 'Verification failed')}`);
            }, 2000);
          }
        })
        .catch(error => {
          console.error('Verification API error:', error);
          setStatus('Connection error');
          setTimeout(() => {
            router.push(`/creator/dashboard?tiktok_error=${encodeURIComponent('Failed to verify TikTok account')}`);
          }, 2000);
        });
    }
  }, [code, state, error, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner text={status} />
        <p className="text-sm text-gray-500 mt-4">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}
