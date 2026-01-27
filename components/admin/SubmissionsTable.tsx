import { useState } from 'react';
import { ChevronDown, ChevronRight, FileVideo, CheckCircle2, AlertTriangle, Lightbulb, BarChart3, User, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Submission {
  id: string;
  creatorName?: string;
  creatorEmail?: string;
  status?: string;
  createdAt?: Date;
  aiEvaluation?: {
    qualityScore?: number;
    compliancePassed?: boolean;
    qualityBreakdown?: Record<string, number>;
    complianceIssues?: string[];
    improvementTips?: string[];
  };
}

interface SubmissionsTableProps {
  submissions: Submission[];
  onDelete?: (submissionId: string) => Promise<void>;
}

export default function SubmissionsTable({ submissions, onDelete }: SubmissionsTableProps) {
  const [expandedSubmissions, setExpandedSubmissions] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, submissionId: string) => {
    e.stopPropagation();
    if (!onDelete) return;

    if (!confirm('Are you sure you want to delete this submission? This cannot be undone.')) {
      return;
    }

    setDeletingId(submissionId);
    try {
      await onDelete(submissionId);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedSubmissions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'approved':
        return { bg: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-500' };
      case 'submitted':
        return { bg: 'bg-amber-400', text: 'text-amber-900', border: 'border-amber-400' };
      case 'needs_changes':
        return { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-500' };
      case 'rejected':
        return { bg: 'bg-red-500', text: 'text-white', border: 'border-red-500' };
      default:
        return { bg: 'bg-zinc-400', text: 'text-white', border: 'border-zinc-400' };
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'bg-blue-50 border-blue-200';
    if (score >= 40) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
          <FileVideo className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-zinc-900">Submissions</h3>
          <p className="text-xs text-zinc-500">{submissions.length} total</p>
        </div>
      </div>

      {submissions.length === 0 ? (
        <div className="p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-3">
            <FileVideo className="w-6 h-6 text-zinc-400" />
          </div>
          <p className="text-sm text-zinc-500">No submissions yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Creator</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Score</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Compliance</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Date</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {submissions.map((sub) => {
                const isExpanded = expandedSubmissions.has(sub.id);
                const statusConfig = getStatusConfig(sub.status || '');
                return (
                  <>
                    <tr
                      key={sub.id}
                      className="hover:bg-zinc-50 transition-colors cursor-pointer group"
                      onClick={() => toggleExpand(sub.id)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="text-zinc-400 group-hover:text-zinc-600 transition-colors">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </div>
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-zinc-500" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-zinc-900">{sub.creatorName}</p>
                            <p className="text-xs text-zinc-500 truncate max-w-[180px]">{sub.creatorEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide ${statusConfig.bg} ${statusConfig.text}`}>
                          {sub.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {sub.aiEvaluation ? (
                          <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border ${getScoreBg(sub.aiEvaluation.qualityScore || 0)}`}>
                            <span className={`text-lg font-bold ${getScoreColor(sub.aiEvaluation.qualityScore || 0)}`}>
                              {sub.aiEvaluation.qualityScore}
                            </span>
                            <span className="text-zinc-400 text-xs">/100</span>
                          </div>
                        ) : (
                          <span className="text-zinc-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {sub.aiEvaluation ? (
                          sub.aiEvaluation.compliancePassed ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span className="text-xs font-semibold text-emerald-700">Passed</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200">
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                              <span className="text-xs font-semibold text-red-700">Failed</span>
                            </div>
                          )
                        ) : (
                          <span className="text-zinc-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-zinc-600">{sub.createdAt?.toLocaleDateString()}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDelete(e, sub.id)}
                            disabled={deletingId === sub.id}
                            className="h-8 w-8 p-0 text-zinc-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className={`w-4 h-4 ${deletingId === sub.id ? 'animate-pulse' : ''}`} />
                          </Button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && sub.aiEvaluation && (
                      <tr key={`${sub.id}-expanded`} className="bg-gradient-to-b from-zinc-50 to-zinc-100/50">
                        <td colSpan={6} className="px-5 py-5">
                          <div className="space-y-4 ml-7">
                            {/* Quality Breakdown */}
                            {sub.aiEvaluation.qualityBreakdown && (
                              <div className="bg-white rounded-xl border border-zinc-200 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <BarChart3 className="w-4 h-4 text-blue-600" />
                                  <h4 className="text-sm font-semibold text-zinc-900">Quality Breakdown</h4>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                  {Object.entries(sub.aiEvaluation.qualityBreakdown).map(([key, value]) => (
                                    <div key={key} className="bg-zinc-50 rounded-lg p-3 text-center border border-zinc-100">
                                      <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1 capitalize">{key}</p>
                                      <p className={`text-xl font-bold ${getScoreColor(value || 0)}`}>{value || 0}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Compliance Issues */}
                            {sub.aiEvaluation.complianceIssues && sub.aiEvaluation.complianceIssues.length > 0 && (
                              <div className="bg-red-50 rounded-xl border border-red-200 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <AlertTriangle className="w-4 h-4 text-red-600" />
                                  <h4 className="text-sm font-semibold text-red-900">Compliance Issues</h4>
                                </div>
                                <ul className="space-y-2">
                                  {sub.aiEvaluation.complianceIssues.map((issue, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm text-red-700">
                                      <span className="text-red-400 mt-1">•</span>
                                      {issue}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Improvement Tips */}
                            {sub.aiEvaluation.improvementTips && sub.aiEvaluation.improvementTips.length > 0 && (
                              <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <Lightbulb className="w-4 h-4 text-blue-600" />
                                  <h4 className="text-sm font-semibold text-blue-900">Improvement Tips</h4>
                                </div>
                                <ul className="space-y-2">
                                  {sub.aiEvaluation.improvementTips.map((tip, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm text-blue-700">
                                      <span className="text-blue-400 mt-1">•</span>
                                      {tip}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
