import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronUp, MapPin, Heart, Briefcase, Globe, Instagram, Youtube, Linkedin, CheckCircle, XCircle, Plus } from 'lucide-react';
import { THINGS } from '@/lib/things/constants';
import type { Creator } from '@/lib/scout/filters';

interface Submission {
  id: string;
  gigId: string;
  jobTitle?: string;
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
      return { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved', icon: <CheckCircle className="w-3 h-3" /> };
    case 'rejected':
      return { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected', icon: <XCircle className="w-3 h-3" /> };
    case 'submitted':
      return { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Pending', icon: null };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800', label: status, icon: null };
  }
}

export default function CreatorCard({ creator, isExpanded, onToggle, onInviteToSquad }: CreatorCardProps) {
  const approvedCount = creator.submissions.filter((s) => s.status === 'approved').length;
  const rejectedCount = creator.submissions.filter((s) => s.status === 'rejected').length;
  const pendingCount = creator.submissions.filter((s) => s.status === 'submitted').length;

  return (
    <Card className="hover:shadow-md transition-all">
      <CardContent className="p-4">
        {/* Creator Header */}
        <button onClick={onToggle} className="w-full text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-base font-bold text-gray-900">@{creator.username}</h3>
              </div>

              {creator.bio && <p className="text-xs text-gray-600 line-clamp-2 mb-2">{creator.bio}</p>}

              {/* Quick Stats */}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>
                  {creator.submissions.length} submission{creator.submissions.length !== 1 ? 's' : ''}
                </span>
                {approvedCount > 0 && <span className="text-green-600">{approvedCount} approved</span>}
                {rejectedCount > 0 && <span className="text-red-600">{rejectedCount} rejected</span>}
                {pendingCount > 0 && <span className="text-blue-600">{pendingCount} pending</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onInviteToSquad();
                }}
                className="p-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded hover:shadow-md transition-colors"
                title="Add to Squad"
              >
                <Plus className="w-4 h-4" />
              </button>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>
        </button>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            {/* Profile Info */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-700">Profile Information</h4>

              {creator.location && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <MapPin className="w-3 h-3 text-gray-400" />
                  <span>{creator.location}</span>
                </div>
              )}

              {creator.languages && creator.languages.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Globe className="w-3 h-3 text-gray-400" />
                  <span>{creator.languages.join(', ')}</span>
                </div>
              )}

              {creator.interests && creator.interests.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Heart className="w-3 h-3 text-pink-500" />
                    <span className="text-xs font-semibold text-gray-700">Interests</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {creator.interests.map((interestId) => {
                      const thing = THINGS.find((t) => t.id === interestId);
                      return (
                        <span key={interestId} className="px-2 py-0.5 bg-pink-100 text-pink-800 rounded text-[10px]">
                          {thing?.icon} {thing?.name || interestId}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {creator.experience && creator.experience.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Briefcase className="w-3 h-3 text-blue-500" />
                    <span className="text-xs font-semibold text-gray-700">Experience</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {creator.experience.map((expId) => {
                      const exp = THINGS.find((t) => t.id === expId);
                      return (
                        <span key={expId} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px]">
                          {exp?.icon} {exp?.name || expId}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {creator.socials && (
                <div>
                  <div className="flex items-center gap-3 pt-1 mb-2">
                    {creator.socials.instagram && (
                      <a
                        href={creator.socials.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pink-600 hover:text-pink-700"
                      >
                        <Instagram className="w-4 h-4" />
                      </a>
                    )}
                    {creator.socials.youtube && (
                      <a
                        href={creator.socials.youtube}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Youtube className="w-4 h-4" />
                      </a>
                    )}
                    {creator.socials.linkedin && (
                      <a
                        href={creator.socials.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Linkedin className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  {/* Following Count */}
                  {creator.followingCount && Object.keys(creator.followingCount).length > 0 && (
                    <div className="pt-2 border-t border-gray-200">
                      <span className="text-xs font-semibold text-gray-700 mb-1 block">Following Count:</span>
                      <div className="space-y-1 text-xs text-gray-600">
                        {creator.followingCount.tiktok && <div>TikTok: {creator.followingCount.tiktok.toLocaleString()}</div>}
                        {creator.followingCount.instagram && (
                          <div>Instagram: {creator.followingCount.instagram.toLocaleString()}</div>
                        )}
                        {creator.followingCount.youtube && (
                          <div>YouTube: {creator.followingCount.youtube.toLocaleString()}</div>
                        )}
                        {creator.followingCount.linkedin && (
                          <div>LinkedIn: {creator.followingCount.linkedin.toLocaleString()}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {creator.portfolioLinks && creator.portfolioLinks.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-gray-700">Portfolio:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {creator.portfolioLinks.map((link, idx) => (
                      <a
                        key={idx}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-orange-600 hover:underline"
                      >
                        {link}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {creator.metrics && (
                <div className="pt-2 border-t">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {creator.metrics.gigsCompleted !== undefined && (
                      <div>
                        <span className="text-gray-500">Completed:</span>
                        <span className="font-medium ml-1">{creator.metrics.gigsCompleted}</span>
                      </div>
                    )}
                    {creator.metrics.ratingAvg !== undefined && (
                      <div>
                        <span className="text-gray-500">Rating:</span>
                        <span className="font-medium ml-1">{creator.metrics.ratingAvg.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Submissions */}
            {creator.submissions.length > 0 ? (
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2">Submissions ({creator.submissions.length})</h4>
                <div className="space-y-2">
                  {creator.submissions.map((submission) => {
                    const statusBadge = getStatusBadge(submission.status);
                    return (
                      <div key={submission.id} className="p-2 bg-gray-50 rounded border border-gray-200">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800">{submission.jobTitle || 'Unknown Gig'}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              {submission.createdAt?.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              }) || 'N/A'}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-medium rounded-full flex items-center gap-1 ${statusBadge.bg} ${statusBadge.text}`}
                          >
                            {statusBadge.icon}
                            {statusBadge.label}
                          </span>
                        </div>
                        {submission.aiEvaluation && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-gray-600">AI Score:</span>
                              <span className="font-bold text-blue-600">{submission.aiEvaluation.qualityScore || 0}/100</span>
                            </div>
                            {submission.aiEvaluation.compliancePassed !== undefined && (
                              <div className="text-[10px] text-gray-600 mt-0.5">
                                Compliance: {submission.aiEvaluation.compliancePassed ? 'Passed' : 'Failed'}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500 text-center py-2">No submissions yet</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
