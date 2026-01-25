import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Instagram, CheckCircle, X as XIcon, Save, Link2, ExternalLink } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import toast from 'react-hot-toast';
import SocialVerificationDialog from './SocialVerificationDialog';
import type { SocialPlatform } from '@/lib/ai/social-screenshot-verifier';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorData: any;
  userId?: string;
  onRefresh?: () => void;
}

export default function ProfileModal({
  isOpen,
  onClose,
  creatorData,
  userId,
  onRefresh,
}: ProfileModalProps) {
  const [socialVerifyPlatform, setSocialVerifyPlatform] = useState<SocialPlatform | null>(null);
  const [saving, setSaving] = useState(false);
  const [socialValues, setSocialValues] = useState({
    tiktok: '',
    instagram: '',
    youtube: '',
    x: '',
  });
  const [followerCounts, setFollowerCounts] = useState({
    tiktok: '',
    instagram: '',
    youtube: '',
    x: '',
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && creatorData) {
      setSocialValues({
        tiktok: creatorData.socials?.tiktok || '',
        instagram: creatorData.socials?.instagram || '',
        youtube: creatorData.socials?.youtube || '',
        x: creatorData.socials?.x || '',
      });
      setFollowerCounts({
        tiktok: creatorData.followingCount?.tiktok?.toString() || '',
        instagram: creatorData.followingCount?.instagram?.toString() || '',
        youtube: creatorData.followingCount?.youtube?.toString() || '',
        x: creatorData.followingCount?.x?.toString() || '',
      });
    }
  }, [isOpen, creatorData]);

  if (!isOpen || !creatorData) return null;

  const handleSave = async () => {
    if (!userId) {
      toast.error('Please sign in');
      return;
    }

    setSaving(true);
    try {
      const cleanedSocials: any = {};
      if (socialValues.tiktok.trim()) cleanedSocials.tiktok = socialValues.tiktok.trim();
      if (socialValues.instagram.trim()) cleanedSocials.instagram = socialValues.instagram.trim();
      if (socialValues.youtube.trim()) cleanedSocials.youtube = socialValues.youtube.trim();
      if (socialValues.x.trim()) cleanedSocials.x = socialValues.x.trim();

      const cleanedFollowerCounts: Record<string, number> = {};
      const parseCount = (raw: string): number | null => {
        const s = raw.trim().replace(/,/g, '');
        if (!s) return null;
        const n = parseInt(s, 10);
        return !isNaN(n) && n >= 0 ? n : null;
      };

      const tiktokN = parseCount(followerCounts.tiktok);
      if (tiktokN !== null) cleanedFollowerCounts.tiktok = tiktokN;
      const instagramN = parseCount(followerCounts.instagram);
      if (instagramN !== null) cleanedFollowerCounts.instagram = instagramN;
      const youtubeN = parseCount(followerCounts.youtube);
      if (youtubeN !== null) cleanedFollowerCounts.youtube = youtubeN;
      const xN = parseCount(followerCounts.x);
      if (xN !== null) cleanedFollowerCounts.x = xN;

      const existingSocials = creatorData.socials || {};
      const mergedSocials = { ...existingSocials, ...cleanedSocials };

      await updateDoc(doc(db, 'creators', userId), {
        socials: Object.keys(mergedSocials).length > 0 ? mergedSocials : {},
        followingCount: Object.keys(cleanedFollowerCounts).length > 0 ? cleanedFollowerCounts : {},
        updatedAt: new Date(),
      });

      toast.success('Socials updated!');
      onRefresh?.();
      onClose();
    } catch (error: any) {
      console.error('Error updating socials:', error);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const platforms = [
    {
      id: 'tiktok' as const,
      name: 'TikTok',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
        </svg>
      ),
      bgColor: 'bg-zinc-900',
      placeholder: '@username',
      followerLabel: 'Followers',
      url: (u: string) => `https://tiktok.com/@${u}`,
    },
    {
      id: 'instagram' as const,
      name: 'Instagram',
      icon: <Instagram className="h-5 w-5" />,
      bgColor: 'bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#FD1D1D]',
      placeholder: '@username',
      followerLabel: 'Followers',
      url: (u: string) => `https://instagram.com/${u}`,
    },
    {
      id: 'youtube' as const,
      name: 'YouTube',
      icon: <span className="text-lg font-bold leading-none">▶</span>,
      bgColor: 'bg-[#FF0000]',
      placeholder: '@channel',
      followerLabel: 'Subscribers',
      url: (u: string) => `https://youtube.com/@${u}`,
    },
    {
      id: 'x' as const,
      name: 'X',
      icon: <span className="text-lg font-bold">𝕏</span>,
      bgColor: 'bg-zinc-900',
      placeholder: '@username',
      followerLabel: 'Followers',
      url: (u: string) => `https://x.com/${u}`,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={() => { if (!socialVerifyPlatform) onClose(); }}
    >
      <div
        className="bg-zinc-50 w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Social Links</h2>
              <p className="text-xs text-zinc-400">Connect your profiles</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <XIcon className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-4 pb-32 space-y-3">
          {platforms.map((platform) => {
            const value = socialValues[platform.id];
            const followers = followerCounts[platform.id];
            const isVerified = creatorData.socialVerification?.[platform.id]?.verified;
            const savedValue = creatorData.socials?.[platform.id];

            return (
              <div key={platform.id} className={`bg-white rounded-2xl border overflow-hidden ${isVerified ? 'border-emerald-200' : 'border-zinc-200'}`}>
                {/* Platform Header */}
                <div className={`flex items-center gap-3 px-4 py-3 ${isVerified ? 'bg-emerald-50' : ''}`}>
                  <div className={`w-9 h-9 rounded-lg ${platform.bgColor} text-white flex items-center justify-center`}>
                    {platform.icon}
                  </div>
                  <span className="text-sm font-semibold text-zinc-900 flex-1">{platform.name}</span>
                  {isVerified ? (
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-100 px-2 py-1 rounded-full">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Verified
                      </span>
                      <a
                        href={platform.url(savedValue)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-emerald-100 rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 text-emerald-600" />
                      </a>
                    </div>
                  ) : value ? (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSocialVerifyPlatform(platform.id)}
                        className="text-xs h-7 text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                      >
                        Verify
                      </Button>
                      <a
                        href={platform.url(value)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 text-zinc-400" />
                      </a>
                    </div>
                  ) : null}
                </div>

                {/* Verified - show read-only info */}
                {isVerified ? (
                  <div className="px-4 py-3 bg-emerald-50/50 flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-900">@{savedValue}</span>
                    {creatorData.followingCount?.[platform.id] && (
                      <span className="text-xs text-zinc-500">{creatorData.followingCount[platform.id].toLocaleString()} {platform.followerLabel.toLowerCase()}</span>
                    )}
                  </div>
                ) : (
                  /* Inputs for non-verified */
                  <div className="p-4 grid grid-cols-[1fr_100px] gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1 block">Username</label>
                      <Input
                        type="text"
                        placeholder={platform.placeholder}
                        value={value}
                        onChange={(e) => setSocialValues({ ...socialValues, [platform.id]: e.target.value })}
                        className="h-10 text-sm bg-zinc-50 border-zinc-200"
                        disabled={saving}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1 block">{platform.followerLabel}</label>
                      <Input
                        type="text"
                        placeholder="0"
                        value={followers}
                        onChange={(e) => setFollowerCounts({ ...followerCounts, [platform.id]: e.target.value })}
                        className="h-10 text-sm bg-zinc-50 border-zinc-200"
                        disabled={saving}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-zinc-200 p-4 pb-24 flex gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving} className="flex-1 h-12 rounded-xl">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 h-12 rounded-xl bg-zinc-900 hover:bg-zinc-800">
            {saving ? 'Saving…' : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      {socialVerifyPlatform && (
        <SocialVerificationDialog
          isOpen={!!socialVerifyPlatform}
          onClose={() => setSocialVerifyPlatform(null)}
          platform={socialVerifyPlatform}
          userId={userId}
          username={socialValues[socialVerifyPlatform]}
          onVerified={onRefresh}
        />
      )}
    </div>
  );
}
