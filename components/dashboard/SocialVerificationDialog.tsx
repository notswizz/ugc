import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/client';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import type { SocialPlatform } from '@/lib/ai/social-screenshot-verifier';

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
  x: 'X',
};

function platformSteps(platform: SocialPlatform): { bio: string; count: string } {
  switch (platform) {
    case 'youtube':
      return {
        bio: 'Add the exact word GIGLET to your YouTube channel description or "About" section.',
        count: 'subscriber count',
      };
    default:
      return {
        bio: `Add the exact word GIGLET to your ${PLATFORM_LABELS[platform]} profile bio.`,
        count: 'follower count',
      };
  }
}

function successCountLabel(platform: SocialPlatform): string {
  return platform === 'youtube' ? 'Subscriber count' : 'Follower count';
}

interface SocialVerificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  platform: SocialPlatform;
  userId?: string;
  username?: string;
  onVerified?: () => void;
}

export default function SocialVerificationDialog({
  isOpen,
  onClose,
  platform,
  userId,
  username,
  onVerified,
}: SocialVerificationDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setUploading(false);
    setVerifying(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!userId) {
      toast.error('Please sign in');
      return;
    }
    if (!file) {
      toast.error('Please select a screenshot');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image (PNG, JPEG, etc.)');
      return;
    }

    setUploading(true);
    setVerifying(true);

    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `users/${userId}/verification/${platform}-${Date.now()}.${ext}`;
      const fileRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(fileRef, file);

      const downloadUrl = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          () => {},
          (err) => reject(err),
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          }
        );
      });

      setUploading(false);

      if (!userId || !downloadUrl?.trim()) {
        toast.error('Missing userId or screenshot URL. Please sign in and try again.');
        return;
      }

      const body: Record<string, string> = {
        platform,
        userId: String(userId),
        screenshotUrl: downloadUrl.trim(),
      };
      if (username && String(username).trim()) body.username = String(username).trim();

      console.log('[SocialVerification] POST /api/verify-social-screenshot', {
        platform: body.platform,
        userId: body.userId,
        userIdLen: body.userId?.length,
        hasScreenshotUrl: !!body.screenshotUrl,
        screenshotUrlLen: body.screenshotUrl?.length,
        bodyKeys: Object.keys(body),
      });

      const response = await fetch('/api/verify-social-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      let data: { success?: boolean; message?: string; error?: string; followerCount?: number } = {};
      try {
        data = await response.json();
      } catch {
        console.error('[SocialVerification] response.json() failed', { status: response.status, statusText: response.statusText });
        toast.error('Invalid response from server');
        return;
      }

      console.log('[SocialVerification] API response', { status: response.status, ok: response.ok, data });

      if (response.ok && data.success) {
        const countLabel = successCountLabel(platform);
        toast.success(
          `${PLATFORM_LABELS[platform]} verified! ${countLabel}: ${(data.followerCount ?? 0).toLocaleString()}`
        );
        onVerified?.();
        handleClose();
      } else {
        const msg = data.message || data.error || 'Verification failed';
        console.warn('[SocialVerification] API error', { status: response.status, message: data.message, error: data.error, full: data });
        toast.error(msg);
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.error('Social verification error:', err);
      toast.error(err?.message || 'Upload or verification failed');
    } finally {
      setVerifying(false);
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  const busy = uploading || verifying;
  const label = PLATFORM_LABELS[platform];
  const { bio, count } = platformSteps(platform);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="verify-dialog-title"
    >
      {/* Backdrop - no close on click; file picker won't dismiss */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />

      <div
        className="relative z-10 w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="verify-dialog-title" className="text-lg font-semibold leading-none tracking-tight">
            Verify {label}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            className="rounded-sm p-1.5 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Add <strong>GIGLET</strong> to your {label} bio{platform === 'youtube' ? ' or channel description' : ''}, then upload a screenshot showing your username, bio, and {count}.
        </p>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-semibold mb-1">Steps:</p>
            <ol className="list-decimal list-inside space-y-1 text-amber-800">
              <li>{bio}</li>
              <li>
                Take a screenshot of your {label} profile{platform === 'youtube' ? ' or channel' : ''} showing <strong>username</strong>, <strong>bio</strong>
                {platform === 'youtube' ? ' / description' : ''}, and <strong>{count}</strong>.
              </li>
              <li>Upload the screenshot below.</li>
            </ol>
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-900 mb-1.5 block">Screenshot</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-200"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <p className="text-xs text-zinc-500 mt-1">{file.name}</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={handleClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={busy || !file}>
            {uploading ? 'Uploading…' : verifying ? 'Verifying…' : 'Verify'}
          </Button>
        </div>
      </div>
    </div>
  );
}
