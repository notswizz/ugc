import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Briefcase, XCircle, Instagram, CheckCircle, User, X as XIcon, Save } from 'lucide-react';
import { THINGS } from '@/lib/things/constants';
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
  if (!isOpen || !creatorData) return null;

  const socialLinksRef = React.useRef<HTMLDivElement>(null);
  const [editingSocials, setEditingSocials] = useState(false);
  const [socialVerifyPlatform, setSocialVerifyPlatform] = useState<SocialPlatform | null>(null);
  const [savingSocials, setSavingSocials] = useState(false);
  const [socialValues, setSocialValues] = useState({
    tiktok: creatorData.socials?.tiktok || '',
    instagram: creatorData.socials?.instagram || '',
    youtube: creatorData.socials?.youtube || '',
    x: creatorData.socials?.x || '',
  });
  const [followerCounts, setFollowerCounts] = useState({
    tiktok: creatorData.followingCount?.tiktok?.toString() || '',
    instagram: creatorData.followingCount?.instagram?.toString() || '',
    youtube: creatorData.followingCount?.youtube?.toString() || '',
    x: creatorData.followingCount?.x?.toString() || '',
  });

  const handleSaveSocials = async () => {
    if (!userId) {
      toast.error('Please sign in');
      return;
    }

    setSavingSocials(true);
    try {
      // Clean up empty values for socials
      const cleanedSocials: any = {};
      if (socialValues.tiktok.trim()) cleanedSocials.tiktok = socialValues.tiktok.trim();
      if (socialValues.instagram.trim()) cleanedSocials.instagram = socialValues.instagram.trim();
      if (socialValues.youtube.trim()) cleanedSocials.youtube = socialValues.youtube.trim();
      if (socialValues.x.trim()) cleanedSocials.x = socialValues.x.trim();

      // Build followingCount from form only (no merge) so we never drop platforms like YouTube
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

      const updateData: any = {
        updatedAt: new Date(),
      };

      // Merge socials with existing values
      const existingSocials = creatorData.socials || {};
      const mergedSocials = { ...existingSocials, ...cleanedSocials };
      if (Object.keys(mergedSocials).length > 0) {
        updateData.socials = mergedSocials;
      }

      if (Object.keys(cleanedFollowerCounts).length > 0) {
        updateData.followingCount = cleanedFollowerCounts;
      } else {
        // If all follower counts are cleared, set to empty object
        updateData.followingCount = {};
      }

      await updateDoc(doc(db, 'creators', userId), updateData);

      toast.success('Social links and followers updated!');
      setEditingSocials(false);
      if (onRefresh) {
        onRefresh();
      }
    } catch (error: any) {
      console.error('Error updating social links:', error);
      toast.error('Failed to update social links');
    } finally {
      setSavingSocials(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => { if (!socialVerifyPlatform) onClose(); }}
    >
      <div 
        className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-indigo-600 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <User className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">@{creatorData.username}</h2>
              {creatorData.location && (
                <p className="text-xs text-white/80 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {creatorData.location}
                </p>
              )}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <XIcon className="w-5 h-5 text-white" />
          </button>
        </div>
        
        <div className="overflow-y-auto max-h-[calc(85vh-80px)]">
          <div className="p-5 space-y-5">
            {/* Social Links */}
            <div ref={socialLinksRef} id="social-links-section">
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border-2 border-orange-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                      <span className="text-lg">🔗</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900">Social Profiles</p>
                  </div>
                  {!editingSocials && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingSocials(true)}
                      className="text-xs text-blue-600"
                    >
                      Edit
                    </Button>
                  )}
                </div>

                {editingSocials ? (
                  <div className="space-y-4">
                    {/* TikTok */}
                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0f0f0f] text-white">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                          </svg>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">TikTok</span>
                      </div>
                      <div className="grid grid-cols-[1fr_7rem] gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-500">Username</label>
                          <Input
                            type="text"
                            placeholder="@username"
                            value={socialValues.tiktok}
                            onChange={(e) => setSocialValues({ ...socialValues, tiktok: e.target.value })}
                            className="h-10 text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-500">Followers</label>
                          <Input
                            type="text"
                            placeholder="0"
                            value={followerCounts.tiktok}
                            onChange={(e) => setFollowerCounts({ ...followerCounts, tiktok: e.target.value })}
                            className="h-10 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Instagram */}
                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#FD1D1D] text-white">
                          <Instagram className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-semibold text-gray-900">Instagram</span>
                      </div>
                      <div className="grid grid-cols-[1fr_7rem] gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-500">Username</label>
                          <Input
                            type="text"
                            placeholder="@username"
                            value={socialValues.instagram}
                            onChange={(e) => setSocialValues({ ...socialValues, instagram: e.target.value })}
                            className="h-10 text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-500">Followers</label>
                          <Input
                            type="text"
                            placeholder="0"
                            value={followerCounts.instagram}
                            onChange={(e) => setFollowerCounts({ ...followerCounts, instagram: e.target.value })}
                            className="h-10 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* YouTube */}
                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FF0000] text-white">
                          <span className="text-base font-bold leading-none">▶</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">YouTube</span>
                      </div>
                      <div className="grid grid-cols-[1fr_7rem] gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-500">Channel</label>
                          <Input
                            type="text"
                            placeholder="@channel or ID"
                            value={socialValues.youtube}
                            onChange={(e) => setSocialValues({ ...socialValues, youtube: e.target.value })}
                            className="h-10 text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-500">Subscribers</label>
                          <Input
                            type="text"
                            placeholder="0"
                            value={followerCounts.youtube}
                            onChange={(e) => setFollowerCounts({ ...followerCounts, youtube: e.target.value })}
                            className="h-10 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* X/Twitter */}
                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0f0f0f] text-white">
                          <span className="text-base font-bold">𝕏</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">X</span>
                      </div>
                      <div className="grid grid-cols-[1fr_7rem] gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-500">Username</label>
                          <Input
                            type="text"
                            placeholder="@username"
                            value={socialValues.x}
                            onChange={(e) => setSocialValues({ ...socialValues, x: e.target.value })}
                            className="h-10 text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-500">Followers</label>
                          <Input
                            type="text"
                            placeholder="0"
                            value={followerCounts.x}
                            onChange={(e) => setFollowerCounts({ ...followerCounts, x: e.target.value })}
                            className="h-10 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Save / Cancel */}
                    <div className="flex gap-3 border-t border-gray-200 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingSocials(false);
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
                        }}
                        disabled={savingSocials}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveSocials}
                        disabled={savingSocials}
                        className="flex-1"
                      >
                        {savingSocials ? (
                          'Saving…'
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {creatorData.socials?.tiktok && (
                      <div className="flex items-center justify-between gap-3 bg-white rounded-lg p-3 border border-orange-100">
                        <a 
                          href={`https://tiktok.com/@${creatorData.socials.tiktok}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-gray-900 hover:text-orange-600 transition-colors flex-1 font-medium"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                          </svg>
                          <span>@{creatorData.socials.tiktok}</span>
                          {creatorData.socialVerification?.tiktok?.verified && (
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                          )}
                        </a>
                        <div className="flex items-center gap-2">
                          {creatorData.followingCount?.tiktok && (
                            <span className="text-xs text-gray-600 font-semibold bg-gray-100 px-2 py-1 rounded-full">
                              {creatorData.followingCount.tiktok.toLocaleString()}
                            </span>
                          )}
                          {!creatorData.socialVerification?.tiktok?.verified && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSocialVerifyPlatform('tiktok')}
                              className="text-xs h-7 px-2"
                            >
                              Verify
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {creatorData.socials?.instagram && (
                      <div className="flex items-center justify-between gap-3 bg-white rounded-lg p-3 border border-orange-100">
                        <a 
                          href={`https://instagram.com/${creatorData.socials.instagram}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-gray-900 hover:text-orange-600 transition-colors flex-1 font-medium"
                        >
                          <Instagram className="w-5 h-5" />
                          <span>@{creatorData.socials.instagram}</span>
                          {creatorData.socialVerification?.instagram?.verified && (
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                          )}
                        </a>
                        <div className="flex items-center gap-2">
                          {creatorData.followingCount?.instagram != null && (
                            <span className="text-xs text-gray-600 font-semibold bg-gray-100 px-2 py-1 rounded-full">
                              {creatorData.followingCount.instagram.toLocaleString()}
                            </span>
                          )}
                          {!creatorData.socialVerification?.instagram?.verified && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSocialVerifyPlatform('instagram')}
                              className="text-xs h-7 px-2"
                            >
                              Verify
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {creatorData.socials?.youtube && (
                      <div className="flex items-center justify-between gap-3 bg-white rounded-lg p-3 border border-orange-100">
                        <a 
                          href={`https://youtube.com/@${creatorData.socials.youtube}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-gray-900 hover:text-orange-600 transition-colors flex-1 font-medium"
                        >
                          <span className="text-lg">▶</span>
                          <span>@{creatorData.socials.youtube}</span>
                          {creatorData.socialVerification?.youtube?.verified && (
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                          )}
                        </a>
                        <div className="flex items-center gap-2">
                          {creatorData.followingCount?.youtube != null && (
                            <span className="text-xs text-gray-600 font-semibold bg-gray-100 px-2 py-1 rounded-full">
                              {creatorData.followingCount.youtube.toLocaleString()} subs
                            </span>
                          )}
                          {!creatorData.socialVerification?.youtube?.verified && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSocialVerifyPlatform('youtube')}
                              className="text-xs h-7 px-2"
                            >
                              Verify
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {creatorData.socials?.x && (
                      <div className="flex items-center justify-between gap-3 bg-white rounded-lg p-3 border border-orange-100">
                        <a 
                          href={`https://x.com/${creatorData.socials.x}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-gray-900 hover:text-orange-600 transition-colors flex-1 font-medium"
                        >
                          <span className="text-lg">𝕏</span>
                          <span>@{creatorData.socials.x}</span>
                          {creatorData.socialVerification?.x?.verified && (
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                          )}
                        </a>
                        <div className="flex items-center gap-2">
                          {creatorData.followingCount?.x != null && (
                            <span className="text-xs text-gray-600 font-semibold bg-gray-100 px-2 py-1 rounded-full">
                              {creatorData.followingCount.x.toLocaleString()}
                            </span>
                          )}
                          {!creatorData.socialVerification?.x?.verified && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSocialVerifyPlatform('x')}
                              className="text-xs h-7 px-2"
                            >
                              Verify
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {!creatorData.socials || (!creatorData.socials.tiktok && !creatorData.socials.instagram && !creatorData.socials.youtube && !creatorData.socials.x) && (
                      <p className="text-xs text-gray-500 text-center py-2">No social accounts added yet</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Experience */}
            {creatorData.experience && creatorData.experience.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                    <Briefcase className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-sm font-bold text-gray-900">Experience</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {creatorData.experience.map((exp: string) => (
                    <span key={exp} className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-2 border-blue-200 font-semibold shadow-sm capitalize">
                      {exp.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Hard No's */}
            {creatorData.hardNos && creatorData.hardNos.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center">
                    <XCircle className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-sm font-bold text-gray-900">Hard No's</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {creatorData.hardNos.map((no: string) => {
                    const thing = THINGS.find(t => t.id === no);
                    return (
                      <span key={no} className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-2 border-red-200 font-semibold shadow-sm">
                        {thing ? `${thing.icon} ${thing.name}` : no}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {socialVerifyPlatform && (
        <SocialVerificationDialog
          isOpen={!!socialVerifyPlatform}
          onClose={() => setSocialVerifyPlatform(null)}
          platform={socialVerifyPlatform}
          userId={userId}
          username={creatorData?.socials?.[socialVerifyPlatform]}
          onVerified={onRefresh}
        />
      )}
    </div>
  );
}
