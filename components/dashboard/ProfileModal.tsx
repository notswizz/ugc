import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Instagram, CheckCircle, X as XIcon, Save, Link2 } from 'lucide-react';
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
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => { if (!socialVerifyPlatform) onClose(); }}
    >
      <div
        className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-pink-500 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link2 className="w-6 h-6 text-white" />
              <div>
                <h2 className="text-lg font-bold text-white">Socials</h2>
                <p className="text-xs text-white/70">{linkedCount}/4 linked</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg">
              <XIcon className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {platforms.map((platform) => {
            const value = socialValues[platform.id];
            const followerVal = followers[platform.id];
            const isVerified = creatorData.socialVerification?.[platform.id]?.verified;
            const savedValue = creatorData.socials?.[platform.id];

            return (
              <div
                key={platform.id}
                className={`flex items-center gap-2 p-2 rounded-xl ${
                  isVerified ? 'bg-emerald-50 border border-emerald-200' : 'bg-zinc-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl ${platform.bg} text-white flex items-center justify-center flex-shrink-0`}>
                  {platform.icon}
                </div>

                {isVerified ? (
                  <>
                    <span className="flex-1 font-semibold text-zinc-900 text-sm">@{savedValue}</span>
                    {creatorData.followingCount?.[platform.id] && (
                      <span className="text-xs text-zinc-500">{creatorData.followingCount[platform.id].toLocaleString()}</span>
                    )}
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="@username"
                      value={value}
                      onChange={(e) => setSocialValues({ ...socialValues, [platform.id]: e.target.value })}
                      className="flex-1 min-w-0 h-10 px-3 text-sm bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-orange-400"
                      disabled={saving}
                    />
                    <input
                      type="text"
                      placeholder="0"
                      value={followerVal}
                      onChange={(e) => setFollowers({ ...followers, [platform.id]: e.target.value })}
                      className="w-16 h-10 px-2 text-sm bg-white border border-zinc-200 rounded-lg text-center focus:outline-none focus:border-orange-400"
                      disabled={saving}
                    />
                    {value && savedValue === value && (
                      <button
                        onClick={() => setSocialVerifyPlatform(platform.id)}
                        className="px-3 h-10 text-xs font-semibold bg-violet-100 text-violet-600 rounded-lg hover:bg-violet-200 flex-shrink-0"
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
        <div className="p-4 pt-2 flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving} className="flex-1 h-12 rounded-xl">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving} 
            className="flex-1 h-12 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold"
          >
            {saving ? 'Saving…' : <><Save className="w-4 h-4 mr-2" /> Save</>}
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
