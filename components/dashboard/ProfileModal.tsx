import { Button } from '@/components/ui/button';
import { MapPin, Heart, Briefcase, XCircle, Link as LinkIcon, Instagram, CheckCircle, User, X as XIcon } from 'lucide-react';
import { THINGS } from '@/lib/things/constants';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorData: any;
  onVerifyTikTok: () => void;
  verifyingTikTok: boolean;
}

export default function ProfileModal({ isOpen, onClose, creatorData, onVerifyTikTok, verifyingTikTok }: ProfileModalProps) {
  if (!isOpen || !creatorData) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
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
            {/* Bio */}
            {creatorData.bio && (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                <p className="text-sm text-gray-700 leading-relaxed italic">&ldquo;{creatorData.bio}&rdquo;</p>
              </div>
            )}

            {/* Social Links */}
            {creatorData.socials && (creatorData.socials.tiktok || creatorData.socials.instagram || creatorData.socials.x) && (
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border-2 border-orange-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                    <span className="text-lg">🔗</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900">Social Profiles</p>
                </div>
                <div className="space-y-2.5">
                  {creatorData.socials.tiktok && (
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
                            onClick={onVerifyTikTok}
                            disabled={verifyingTikTok}
                            className="text-xs h-7 px-2"
                          >
                            {verifyingTikTok ? 'Verifying...' : 'Verify'}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {creatorData.socials.instagram && (
                    <div className="flex items-center justify-between gap-3 bg-white rounded-lg p-3 border border-orange-100">
                      <a 
                        href={`https://instagram.com/${creatorData.socials.instagram}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-gray-900 hover:text-orange-600 transition-colors flex-1 font-medium"
                      >
                        <Instagram className="w-5 h-5" />
                        <span>@{creatorData.socials.instagram}</span>
                      </a>
                      {creatorData.followingCount?.instagram && (
                        <span className="text-xs text-gray-600 font-semibold bg-gray-100 px-2 py-1 rounded-full">
                          {creatorData.followingCount.instagram.toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}

                  {creatorData.socials.x && (
                    <div className="flex items-center justify-between gap-3 bg-white rounded-lg p-3 border border-orange-100">
                      <a 
                        href={`https://x.com/${creatorData.socials.x}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-gray-900 hover:text-orange-600 transition-colors flex-1 font-medium"
                      >
                        <span className="text-lg">𝕏</span>
                        <span>@{creatorData.socials.x}</span>
                      </a>
                      {creatorData.followingCount?.x && (
                        <span className="text-xs text-gray-600 font-semibold bg-gray-100 px-2 py-1 rounded-full">
                          {creatorData.followingCount.x.toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Interests */}
            {creatorData.interests && creatorData.interests.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                    <Heart className="w-3 h-3 text-white" fill="white" />
                  </div>
                  <p className="text-xs font-bold text-gray-900">Interests</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {creatorData.interests.map((interestId: string) => {
                    const thing = THINGS.find(t => t.id === interestId);
                    return thing ? (
                      <span key={interestId} className="px-2 py-0.5 text-[10px] rounded-md bg-gradient-to-r from-pink-50 to-rose-50 text-pink-700 border border-pink-200 font-semibold">
                        {thing.icon} {thing.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}

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
    </div>
  );
}
