import { MapPin, Heart, Briefcase, Instagram, Youtube, Linkedin, CheckCircle, XCircle, Star, X as XIcon, Users } from 'lucide-react';
import { THINGS } from '@/lib/things/constants';
import type { Creator } from '@/lib/scout/filters';

interface Submission {
  id: string;
  gigId: string;
  jobTitle?: string;
  companyName?: string;
  status: string;
  aiEvaluation?: {
    qualityScore?: number;
    compliancePassed?: boolean;
  };
  createdAt: Date;
}

interface CreatorWithSubmissions extends Creator {
  submissions: Submission[];
}

interface CreatorCardProps {
  creator: CreatorWithSubmissions;
  isExpanded: boolean;
  onToggle: () => void;
  onInviteToSquad: () => void;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'approved':
      return { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved', icon: <CheckCircle className="w-3 h-3" /> };
    case 'rejected':
      return { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected', icon: <XCircle className="w-3 h-3" /> };
    case 'submitted':
      return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Pending', icon: null };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', label: status, icon: null };
  }
}

function getInitials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

function getAvatarColor(username: string): string {
  const colors = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-600',
    'from-green-500 to-emerald-600',
    'from-orange-500 to-red-600',
    'from-pink-500 to-rose-600',
    'from-indigo-500 to-blue-600',
    'from-teal-500 to-green-600',
    'from-amber-500 to-orange-600',
  ];
  const index = username.charCodeAt(0) % colors.length;
  return colors[index];
}

export default function CreatorCard({ creator, isExpanded, onToggle, onInviteToSquad }: CreatorCardProps) {
  const approvedCount = creator.submissions.filter((s) => s.status === 'approved').length;
  const rejectedCount = creator.submissions.filter((s) => s.status === 'rejected').length;
  const pendingCount = creator.submissions.filter((s) => s.status === 'submitted').length;
  const avgScore = creator.submissions.length > 0
    ? Math.round(creator.submissions.reduce((sum, s) => sum + (s.aiEvaluation?.qualityScore || 0), 0) / creator.submissions.length)
    : null;

  const hasSocials = creator.socials && (creator.socials.tiktok || creator.socials.instagram || creator.socials.youtube || creator.socials.x);

  return (
    <>
      <div
        className="group bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden"
        onClick={onToggle}
      >
        <div className="p-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getAvatarColor(creator.username || '')} flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow`}>
              <span className="text-white font-bold text-base">{getInitials(creator.username || 'UN')}</span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-bold text-slate-900 truncate group-hover:text-slate-700 transition-colors">@{creator.username}</h3>
                {avgScore !== null && avgScore > 0 && (
                  <div className="flex items-center gap-0.5 px-2 py-0.5 bg-amber-100 rounded-full">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span className="text-[10px] font-bold text-amber-700">{avgScore}</span>
                  </div>
                )}
              </div>

              {creator.location && (
                <div className="flex items-center gap-1 text-sm text-slate-500 mb-2">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate">{creator.location}</span>
                </div>
              )}

              {/* Stats Row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
                  {creator.submissions.length} submission{creator.submissions.length !== 1 ? 's' : ''}
                </span>
                {approvedCount > 0 && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded-lg text-xs font-medium text-green-700">
                    <CheckCircle className="w-3 h-3" />
                    {approvedCount}
                  </span>
                )}
                {pendingCount > 0 && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-lg text-xs font-medium text-blue-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {pendingCount}
                  </span>
                )}
                {rejectedCount > 0 && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-red-50 rounded-lg text-xs font-medium text-red-700">
                    <XCircle className="w-3 h-3" />
                    {rejectedCount}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Social Icons Row */}
          {hasSocials && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
              {creator.socials?.tiktok && (
                <div className={`w-8 h-8 rounded-lg bg-black flex items-center justify-center ${creator.socialVerification?.tiktok?.verified ? 'ring-2 ring-emerald-400 ring-offset-1' : ''}`}>
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                  </svg>
                </div>
              )}
              {creator.socials?.instagram && (
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center ${creator.socialVerification?.instagram?.verified ? 'ring-2 ring-emerald-400 ring-offset-1' : ''}`}>
                  <Instagram className="w-4 h-4 text-white" />
                </div>
              )}
              {creator.socials?.youtube && (
                <div className={`w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center ${creator.socialVerification?.youtube?.verified ? 'ring-2 ring-emerald-400 ring-offset-1' : ''}`}>
                  <Youtube className="w-4 h-4 text-white" />
                </div>
              )}
              {creator.socials?.x && (
                <div className={`w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center ${creator.socialVerification?.x?.verified ? 'ring-2 ring-emerald-400 ring-offset-1' : ''}`}>
                  <span className="text-white text-sm font-bold">𝕏</span>
                </div>
              )}
              <div className="flex-1" />
              <span className="text-xs text-slate-400 group-hover:text-slate-600 transition-colors">View profile →</span>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onToggle}
        >
          <div
            className="relative bg-white w-full max-w-md max-h-[85vh] rounded-3xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative top gradient line */}
            <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${getAvatarColor(creator.username || '')}`} />

            {/* Header */}
            <div className="px-6 pt-7 pb-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getAvatarColor(creator.username || '')} flex items-center justify-center shadow-lg`}>
                    <span className="text-white font-bold text-lg">{getInitials(creator.username || 'UN')}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-900 tracking-tight">@{creator.username}</h2>
                      {avgScore !== null && avgScore > 0 && (
                        <div className="flex items-center gap-0.5 px-2 py-1 bg-amber-100 rounded-full">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span className="text-xs font-bold text-amber-700">{avgScore}</span>
                        </div>
                      )}
                    </div>
                    {creator.location && (
                      <div className="flex items-center gap-1 text-sm text-slate-500 mt-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{creator.location}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={onToggle}
                  className="p-2.5 hover:bg-slate-100 rounded-xl transition-all duration-200 group"
                >
                  <XIcon className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="px-6 pb-6 overflow-y-auto max-h-[calc(85vh-140px)] space-y-5">
              {/* Bio */}
              {creator.bio && (
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-sm text-slate-600 leading-relaxed">{creator.bio}</p>
                </div>
              )}

              {/* Experience */}
              {creator.experience && creator.experience.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">Experience</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {creator.experience.map((expId) => {
                      const exp = THINGS.find((t) => t.id === expId);
                      return (
                        <span key={expId} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-medium border border-blue-200">
                          {exp?.icon} {exp?.name || expId}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Social Links - Horizontal Scroll */}
              {creator.socials && (creator.socials.instagram || creator.socials.youtube || creator.socials.linkedin || creator.socials.tiktok || creator.socials.x) && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Socials</h4>
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {creator.socials.tiktok && (
                      <a
                        href={creator.socials.tiktok}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex-shrink-0 w-28 p-3 bg-black rounded-xl hover:opacity-90 transition-opacity ${creator.socialVerification?.tiktok?.verified ? 'ring-2 ring-emerald-400 ring-offset-2' : ''}`}
                      >
                        <svg className="w-5 h-5 text-white mb-1.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                        </svg>
                        <p className="text-white text-xs font-medium">TikTok</p>
                        {creator.followingCount?.tiktok && (
                          <p className="text-white/70 text-[10px]">{creator.followingCount.tiktok.toLocaleString()}</p>
                        )}
                      </a>
                    )}
                    {creator.socials.instagram && (
                      <a
                        href={creator.socials.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex-shrink-0 w-28 p-3 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-xl hover:opacity-90 transition-opacity ${creator.socialVerification?.instagram?.verified ? 'ring-2 ring-emerald-400 ring-offset-2' : ''}`}
                      >
                        <Instagram className="w-5 h-5 text-white mb-1.5" />
                        <p className="text-white text-xs font-medium">Instagram</p>
                        {creator.followingCount?.instagram && (
                          <p className="text-white/70 text-[10px]">{creator.followingCount.instagram.toLocaleString()}</p>
                        )}
                      </a>
                    )}
                    {creator.socials.youtube && (
                      <a
                        href={creator.socials.youtube}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex-shrink-0 w-28 p-3 bg-red-500 rounded-xl hover:opacity-90 transition-opacity ${creator.socialVerification?.youtube?.verified ? 'ring-2 ring-emerald-400 ring-offset-2' : ''}`}
                      >
                        <Youtube className="w-5 h-5 text-white mb-1.5" />
                        <p className="text-white text-xs font-medium">YouTube</p>
                        {creator.followingCount?.youtube && (
                          <p className="text-white/70 text-[10px]">{creator.followingCount.youtube.toLocaleString()}</p>
                        )}
                      </a>
                    )}
                    {creator.socials.x && (
                      <a
                        href={`https://x.com/${creator.socials.x.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex-shrink-0 w-28 p-3 bg-sky-500 rounded-xl hover:opacity-90 transition-opacity ${creator.socialVerification?.x?.verified ? 'ring-2 ring-emerald-400 ring-offset-2' : ''}`}
                      >
                        <span className="text-white text-lg font-bold block mb-1">𝕏</span>
                        <p className="text-white text-xs font-medium">X</p>
                        {creator.followingCount?.x && (
                          <p className="text-white/70 text-[10px]">{creator.followingCount.x.toLocaleString()}</p>
                        )}
                      </a>
                    )}
                    {creator.socials.linkedin && (
                      <a
                        href={creator.socials.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex-shrink-0 w-28 p-3 bg-blue-600 rounded-xl hover:opacity-90 transition-opacity ${creator.socialVerification?.linkedin?.verified ? 'ring-2 ring-emerald-400 ring-offset-2' : ''}`}
                      >
                        <Linkedin className="w-5 h-5 text-white mb-1.5" />
                        <p className="text-white text-xs font-medium">LinkedIn</p>
                        {creator.followingCount?.linkedin && (
                          <p className="text-white/70 text-[10px]">{creator.followingCount.linkedin.toLocaleString()}</p>
                        )}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Portfolio Links */}
              {creator.portfolioLinks && creator.portfolioLinks.length > 0 && (
                <div>
                  <span className="text-sm font-semibold text-slate-700">Portfolio</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {creator.portfolioLinks.map((link, idx) => (
                      <a
                        key={idx}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200 transition-colors"
                      >
                        {new URL(link).hostname}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Submissions - Horizontal Scroll */}
              {creator.submissions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="text-sm font-semibold text-slate-700">
                      Submissions ({creator.submissions.length})
                    </h4>
                    <div className="flex items-center gap-1.5">
                      {approvedCount > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
                          <CheckCircle className="w-2.5 h-2.5" /> {approvedCount}
                        </span>
                      )}
                      {rejectedCount > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] font-medium text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full">
                          <XCircle className="w-2.5 h-2.5" /> {rejectedCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {creator.submissions.map((submission) => {
                      const statusBadge = getStatusBadge(submission.status);
                      return (
                        <div key={submission.id} className="flex-shrink-0 w-44 p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-medium rounded-full flex items-center gap-1 ${statusBadge.bg} ${statusBadge.text}`}
                            >
                              {statusBadge.icon}
                              {statusBadge.label}
                            </span>
                            {submission.aiEvaluation?.qualityScore !== undefined && (
                              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 rounded-full">
                                <Star className="w-2.5 h-2.5 text-blue-500" />
                                <span className="text-[10px] font-bold text-blue-700">{submission.aiEvaluation.qualityScore}</span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs font-medium text-slate-800 truncate">{submission.jobTitle || 'Unknown Gig'}</p>
                          {submission.companyName && (
                            <p className="text-[10px] text-slate-500 truncate">{submission.companyName}</p>
                          )}
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {submission.createdAt?.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            }) || 'N/A'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Interests - Horizontal Scroll */}
              {creator.interests && creator.interests.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-lg bg-pink-100 flex items-center justify-center">
                      <Heart className="w-3.5 h-3.5 text-pink-600" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">Interests</span>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {creator.interests.map((interestId) => {
                      const thing = THINGS.find((t) => t.id === interestId);
                      return (
                        <span key={interestId} className="flex-shrink-0 px-3 py-1.5 bg-pink-50 text-pink-700 rounded-xl text-xs font-medium border border-pink-200 whitespace-nowrap">
                          {thing?.icon} {thing?.name || interestId}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add to Squad Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onInviteToSquad();
                }}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-semibold rounded-2xl shadow-lg shadow-purple-200 hover:shadow-purple-300 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Users className="w-5 h-5" />
                Add to Squad
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
