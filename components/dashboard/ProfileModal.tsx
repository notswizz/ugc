import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Instagram, CheckCircle, X as XIcon, Link2, Sparkles } from 'lucide-react';
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
  const [followers, setFollowers] = useState({
    tiktok: '',
    instagram: '',
    youtube: '',
    x: '',
  });

  useEffect(() => {
    if (isOpen && creatorData) {
      setSocialValues({
        tiktok: creatorData.socials?.tiktok || '',
        instagram: creatorData.socials?.instagram || '',
        youtube: creatorData.socials?.youtube || '',
        x: creatorData.socials?.x || '',
      });
      setFollowers({
        tiktok: creatorData.followingCount?.tiktok?.toString() || '',
        instagram: creatorData.followingCount?.instagram?.toString() || '',
        youtube: creatorData.followingCount?.youtube?.toString() || '',
        x: creatorData.followingCount?.x?.toString() || '',
      });
    }
  }, [isOpen, creatorData]);

  if (!isOpen || !creatorData) return null;

  const handleSave = async () => {
    if (!userId) return toast.error('Please sign in');
    setSaving(true);
    try {
      const cleanedSocials: any = {};
      if (socialValues.tiktok.trim()) cleanedSocials.tiktok = socialValues.tiktok.trim();
      if (socialValues.instagram.trim()) cleanedSocials.instagram = socialValues.instagram.trim();
      if (socialValues.youtube.trim()) cleanedSocials.youtube = socialValues.youtube.trim();
      if (socialValues.x.trim()) cleanedSocials.x = socialValues.x.trim();

      const cleanedFollowers: Record<string, number> = {};
      const parse = (s: string) => {
        const n = parseInt(s.replace(/,/g, '').trim(), 10);
        return !isNaN(n) && n >= 0 ? n : null;
      };
      const tk = parse(followers.tiktok); if (tk !== null) cleanedFollowers.tiktok = tk;
      const ig = parse(followers.instagram); if (ig !== null) cleanedFollowers.instagram = ig;
      const yt = parse(followers.youtube); if (yt !== null) cleanedFollowers.youtube = yt;
      const xf = parse(followers.x); if (xf !== null) cleanedFollowers.x = xf;

      const existingSocials = creatorData.socials || {};
      const mergedSocials = { ...existingSocials, ...cleanedSocials };

      await updateDoc(doc(db, 'creators', userId), {
        socials: Object.keys(mergedSocials).length > 0 ? mergedSocials : {},
        followingCount: Object.keys(cleanedFollowers).length > 0 ? cleanedFollowers : {},
        updatedAt: new Date(),
      });

      toast.success('Saved!');
      onRefresh?.();
      onClose();
    } catch {
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
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
        </svg>
      ),
      bg: 'bg-black',
    },
    {
      id: 'instagram' as const,
      name: 'Instagram',
      icon: <Instagram className="h-4 w-4" />,
      bg: 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400',
    },
    {
      id: 'youtube' as const,
      name: 'YouTube',
      icon: <span className="text-sm font-bold">▶</span>,
      bg: 'bg-red-600',
    },
    {
      id: 'x' as const,
      name: 'X',
      icon: <span className="text-sm font-bold">𝕏</span>,
      bg: 'bg-black',
    },
  ];

  const linkedCount = platforms.filter(p => creatorData.socials?.[p.id]).length;

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => { if (!socialVerifyPlatform) onClose(); }}
    >
      <div
        className="relative bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative top gradient line */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-orange-500 via-pink-500 to-rose-500" />

        {/* Header */}
        <div className="px-6 pt-7 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shadow-lg shadow-orange-200">
                <Link2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Socials</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${i < linkedCount ? 'bg-emerald-500' : 'bg-slate-200'}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-slate-400">{linkedCount}/4</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-slate-100 rounded-xl transition-all duration-200 group"
            >
              <XIcon className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-5 space-y-3">
          {platforms.map((platform) => {
            const value = socialValues[platform.id];
            const followerVal = followers[platform.id];
            const isVerified = creatorData.socialVerification?.[platform.id]?.verified;
            const savedValue = creatorData.socials?.[platform.id];

            return (
              <div
                key={platform.id}
                className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all duration-200 ${
                  isVerified
                    ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50'
                    : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'
                }`}
              >
                <div className={`w-11 h-11 rounded-xl ${platform.bg} text-white flex items-center justify-center flex-shrink-0 shadow-lg ${
                  platform.id === 'tiktok' ? 'shadow-slate-300' :
                  platform.id === 'instagram' ? 'shadow-pink-200' :
                  platform.id === 'youtube' ? 'shadow-red-200' : 'shadow-slate-300'
                }`}>
                  {platform.icon}
                </div>

                {isVerified ? (
                  <>
                    <span className="flex-1 font-semibold text-slate-900 text-sm">@{savedValue}</span>
                    {creatorData.followingCount?.[platform.id] && (
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                        {creatorData.followingCount[platform.id].toLocaleString()}
                      </span>
                    )}
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="@username"
                      value={value}
                      onChange={(e) => setSocialValues({ ...socialValues, [platform.id]: e.target.value })}
                      className="flex-1 min-w-0 h-10 px-3 text-sm text-slate-900 placeholder-slate-300 bg-white border-2 border-slate-100 rounded-xl focus:outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-50 transition-all duration-200"
                      disabled={saving}
                    />
                    <input
                      type="text"
                      placeholder="0"
                      value={followerVal}
                      onChange={(e) => setFollowers({ ...followers, [platform.id]: e.target.value })}
                      className="w-16 h-10 px-2 text-sm text-slate-900 placeholder-slate-300 bg-white border-2 border-slate-100 rounded-xl text-center focus:outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-50 transition-all duration-200"
                      disabled={saving}
                    />
                    {value && savedValue === value && (
                      <button
                        onClick={() => setSocialVerifyPlatform(platform.id)}
                        className="px-3 h-10 text-xs font-semibold bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl hover:from-violet-600 hover:to-purple-700 shadow-md shadow-violet-200 transition-all duration-200 flex-shrink-0"
                      >
                        Verify
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-1 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="flex-1 h-12 rounded-xl bg-slate-50 border-2 border-slate-200 text-slate-600 font-medium hover:bg-slate-100 hover:border-slate-300 transition-all duration-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="relative flex-1 h-12 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-400 hover:to-pink-400 text-white font-semibold shadow-lg shadow-orange-200 hover:shadow-orange-300 transition-all duration-200 overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Save
              </span>
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
