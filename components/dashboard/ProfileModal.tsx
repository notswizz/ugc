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
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center animate-in fade-in duration-200"
      onClick={() => { if (!socialVerifyPlatform) onClose(); }}
    >
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[90vh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-br from-orange-500 via-pink-500 to-red-500 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/30">
                <Link2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Link Your Socials</h2>
                <p className="text-sm text-white/80 mt-0.5">Connect to unlock more gigs</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors duration-200"
              aria-label="Close"
            >
              <XIcon className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-5 pb-32 space-y-4 bg-gradient-to-b from-zinc-50 to-white">
          {platforms.map((platform) => {
            const value = socialValues[platform.id];
            const followers = followerCounts[platform.id];
            const isVerified = creatorData.socialVerification?.[platform.id]?.verified;
            const savedValue = creatorData.socials?.[platform.id];

            return (
              <div key={platform.id} className={`bg-white rounded-2xl border-2 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 ${isVerified ? 'border-emerald-300 shadow-emerald-100' : 'border-zinc-200/80'}`}>
                {/* Platform Header */}
                <div className={`flex items-center gap-3 px-5 py-4 ${isVerified ? 'bg-gradient-to-r from-emerald-50 to-teal-50' : 'bg-zinc-50/50'}`}>
                  <div className={`w-11 h-11 rounded-xl ${platform.bgColor} text-white flex items-center justify-center shadow-md`}>
                    {platform.icon}
                  </div>
                  <span className="text-base font-bold text-zinc-900 flex-1">{platform.name}</span>
                  {isVerified ? (
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-100 px-3 py-1.5 rounded-full ring-2 ring-emerald-200/50">
                        <CheckCircle className="w-4 h-4" />
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
                        onClick={() => setSocialVerifyPlatform(platform.id)}
                        className="text-xs h-8 px-4 bg-violet-600 hover:bg-violet-700 text-white rounded-lg shadow-sm"
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
                  <div className="px-5 py-4 bg-gradient-to-r from-emerald-50/80 to-teal-50/80 flex items-center justify-between border-t border-emerald-100">
                    <span className="text-base font-semibold text-zinc-900">@{savedValue}</span>
                    {creatorData.followingCount?.[platform.id] && (
                      <span className="text-sm text-zinc-600 font-medium">{creatorData.followingCount[platform.id].toLocaleString()} {platform.followerLabel.toLowerCase()}</span>
                    )}
                  </div>
                ) : (
                  /* Inputs for non-verified */
                  <div className="p-5 grid grid-cols-[1fr_110px] gap-3 bg-white">
                    <div>
                      <label className="text-xs font-semibold text-zinc-500 mb-2 block">Username</label>
                      <Input
                        type="text"
                        placeholder={platform.placeholder}
                        value={value}
                        onChange={(e) => setSocialValues({ ...socialValues, [platform.id]: e.target.value })}
                        className="h-11 text-sm bg-zinc-50 border-2 border-zinc-200 focus:border-orange-400 focus:ring-orange-100 rounded-xl"
                        disabled={saving}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-500 mb-2 block">{platform.followerLabel}</label>
                      <Input
                        type="text"
                        placeholder="0"
                        value={followers}
                        onChange={(e) => setFollowerCounts({ ...followerCounts, [platform.id]: e.target.value })}
                        className="h-11 text-sm bg-zinc-50 border-2 border-zinc-200 focus:border-orange-400 focus:ring-orange-100 rounded-xl"
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
        <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-white/80 backdrop-blur-sm border-t border-zinc-200 p-5 pb-24 flex gap-3 shadow-lg">
          <Button variant="outline" onClick={onClose} disabled={saving} className="flex-1 h-12 rounded-xl border-2 border-zinc-200 hover:bg-zinc-50 font-semibold">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 h-12 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold shadow-lg shadow-orange-500/30">
            {saving ? 'Saving…' : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
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
