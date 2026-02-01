import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronUp, MapPin, Heart, Briefcase, Instagram, Youtube, Linkedin, CheckCircle, XCircle, Plus, Star } from 'lucide-react';
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

  return (
    <Card className="hover:shadow-md transition-all duration-200 overflow-hidden border-gray-200">
      <CardContent className="p-0">
        {/* Creator Header */}
        <button onClick={onToggle} className="w-full text-left p-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getAvatarColor(creator.username || '')} flex items-center justify-center flex-shrink-0 shadow-sm`}>
              <span className="text-white font-bold text-sm">{getInitials(creator.username || 'UN')}</span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-base font-bold text-gray-900 truncate">@{creator.username}</h3>
                {avgScore !== null && avgScore > 0 && (
                  <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 rounded-full">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span className="text-[10px] font-bold text-amber-700">{avgScore}</span>
                  </div>
                )}
              </div>

              {creator.location && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{creator.location}</span>
                </div>
              )}

              {/* Quick Stats */}
              <div className="flex items-center gap-3 text-xs">
                <span className="text-gray-500">
                  {creator.submissions.length} submission{creator.submissions.length !== 1 ? 's' : ''}
                </span>
                {approvedCount > 0 && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-3 h-3" />
                    {approvedCount}
                  </span>
                )}
                {pendingCount > 0 && (
                  <span className="flex items-center gap-1 text-blue-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {pendingCount}
                  </span>
                )}
                {rejectedCount > 0 && (
                  <span className="flex items-center gap-1 text-red-600">
                    <XCircle className="w-3 h-3" />
                    {rejectedCount}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onInviteToSquad();
                }}
                className="p-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg hover:shadow-md transition-all"
                title="Add to Squad"
              >
                <Plus className="w-4 h-4" />
              </button>
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </div>
            </div>
          </div>
        </button>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="px-4 pb-4 border-t bg-gray-50/50">
            <div className="pt-4 space-y-4">
              {/* Bio */}
              {creator.bio && (
                <div>
                  <p className="text-sm text-gray-600 leading-relaxed">{creator.bio}</p>
                </div>
              )}

              {/* Experience */}
              {creator.experience && creator.experience.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-xs font-semibold text-gray-700">Experience</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {creator.experience.map((expId) => {
                      const exp = THINGS.find((t) => t.id === expId);
                      return (
                        <span key={expId} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                          {exp?.icon} {exp?.name || expId}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Social Links - Horizontal Scroll */}
              {creator.socials && (creator.socials.instagram || creator.socials.youtube || creator.socials.linkedin || creator.socials.tiktok) && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Socials</h4>
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {creator.socials.instagram && (
                      <a
                        href={creator.socials.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 w-32 p-3 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-xl hover:opacity-90 transition-opacity"
                      >
                        <Instagram className="w-6 h-6 text-white mb-2" />
                        <p className="text-white text-xs font-medium">Instagram</p>
                        {creator.followingCount?.instagram && (
                          <p className="text-white/80 text-[10px] mt-0.5">{creator.followingCount.instagram.toLocaleString()} followers</p>
                        )}
                      </a>
                    )}
                    {creator.socials.youtube && (
                      <a
                        href={creator.socials.youtube}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 w-32 p-3 bg-red-500 rounded-xl hover:opacity-90 transition-opacity"
                      >
                        <Youtube className="w-6 h-6 text-white mb-2" />
                        <p className="text-white text-xs font-medium">YouTube</p>
                        {creator.followingCount?.youtube && (
                          <p className="text-white/80 text-[10px] mt-0.5">{creator.followingCount.youtube.toLocaleString()} subscribers</p>
                        )}
                      </a>
                    )}
                    {creator.socials.tiktok && (
                      <a
                        href={creator.socials.tiktok}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 w-32 p-3 bg-black rounded-xl hover:opacity-90 transition-opacity"
                      >
                        <svg className="w-6 h-6 text-white mb-2" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                        </svg>
                        <p className="text-white text-xs font-medium">TikTok</p>
                        {creator.followingCount?.tiktok && (
                          <p className="text-white/80 text-[10px] mt-0.5">{creator.followingCount.tiktok.toLocaleString()} followers</p>
                        )}
                      </a>
                    )}
                    {creator.socials.linkedin && (
                      <a
                        href={creator.socials.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 w-32 p-3 bg-blue-600 rounded-xl hover:opacity-90 transition-opacity"
                      >
                        <Linkedin className="w-6 h-6 text-white mb-2" />
                        <p className="text-white text-xs font-medium">LinkedIn</p>
                        {creator.followingCount?.linkedin && (
                          <p className="text-white/80 text-[10px] mt-0.5">{creator.followingCount.linkedin.toLocaleString()} connections</p>
                        )}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Portfolio Links */}
              {creator.portfolioLinks && creator.portfolioLinks.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-gray-700">Portfolio</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {creator.portfolioLinks.map((link, idx) => (
                      <a
                        key={idx}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-orange-600 hover:text-orange-700 underline underline-offset-2"
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
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-xs font-semibold text-gray-700">
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
                        <div key={submission.id} className="flex-shrink-0 w-48 p-3 bg-white rounded-lg border border-gray-100">
                          <div className="flex items-center justify-between gap-1 mb-2">
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
                          <p className="text-xs font-medium text-gray-800 truncate">{submission.jobTitle || 'Unknown Gig'}</p>
                          {submission.companyName && (
                            <p className="text-[10px] text-gray-600 truncate">{submission.companyName}</p>
                          )}
                          <p className="text-[10px] text-gray-400 mt-0.5">
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
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-3.5 h-3.5 text-pink-500" />
                    <span className="text-xs font-semibold text-gray-700">Interests</span>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {creator.interests.map((interestId) => {
                      const thing = THINGS.find((t) => t.id === interestId);
                      return (
                        <span key={interestId} className="flex-shrink-0 px-2.5 py-1 bg-pink-50 text-pink-700 rounded-full text-xs font-medium border border-pink-200 whitespace-nowrap">
                          {thing?.icon} {thing?.name || interestId}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
