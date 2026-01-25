import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
}

export default function SubmissionsTable({ submissions }: SubmissionsTableProps) {
  const [expandedSubmissions, setExpandedSubmissions] = useState<Set<string>>(new Set());

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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Submissions ({submissions.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {submissions.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-xs text-gray-500">No submissions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-2 font-semibold text-gray-700">Creator</th>
                  <th className="text-left p-2 font-semibold text-gray-700">Status</th>
                  <th className="text-center p-2 font-semibold text-gray-700">Score</th>
                  <th className="text-center p-2 font-semibold text-gray-700">Compliance</th>
                  <th className="text-left p-2 font-semibold text-gray-700">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {submissions.map((sub) => {
                  const isExpanded = expandedSubmissions.has(sub.id);
                  return (
                    <>
                      <tr
                        key={sub.id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => toggleExpand(sub.id)}
                      >
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                            <div>
                              <p className="font-medium text-gray-900">{sub.creatorName}</p>
                              <p className="text-[10px] text-gray-500 truncate max-w-[150px]">{sub.creatorEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              sub.status === 'approved'
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : sub.status === 'submitted'
                                ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                : sub.status === 'needs_changes'
                                ? 'bg-orange-100 text-orange-700 border border-orange-200'
                                : 'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}
                          >
                            {sub.status?.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          {sub.aiEvaluation ? (
                            <div>
                              <span
                                className={`font-bold ${
                                  (sub.aiEvaluation.qualityScore || 0) >= 80
                                    ? 'text-green-600'
                                    : (sub.aiEvaluation.qualityScore || 0) >= 60
                                    ? 'text-blue-600'
                                    : (sub.aiEvaluation.qualityScore || 0) >= 40
                                    ? 'text-yellow-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {sub.aiEvaluation.qualityScore}
                              </span>
                              <span className="text-gray-400 text-[10px]">/100</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          {sub.aiEvaluation ? (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                sub.aiEvaluation.compliancePassed
                                  ? 'bg-green-100 text-green-700 border border-green-200'
                                  : 'bg-red-100 text-red-700 border border-red-200'
                              }`}
                            >
                              {sub.aiEvaluation.compliancePassed ? '✓' : '✗'}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="p-2 text-gray-500">{sub.createdAt?.toLocaleDateString()}</td>
                      </tr>
                      {isExpanded && sub.aiEvaluation && (
                        <tr key={`${sub.id}-expanded`} className="bg-gray-50">
                          <td colSpan={5} className="p-3">
                            <div className="space-y-3">
                              {/* Quality Breakdown */}
                              {sub.aiEvaluation.qualityBreakdown && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-700 mb-2">Quality Breakdown</p>
                                  <div className="grid grid-cols-5 gap-2">
                                    {Object.entries(sub.aiEvaluation.qualityBreakdown).map(([key, value]) => (
                                      <div key={key} className="bg-white p-2 rounded border">
                                        <p className="text-[10px] text-gray-500 mb-0.5 capitalize">{key}</p>
                                        <p className="font-bold text-xs">{value || 0}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {/* Compliance Issues */}
                              {sub.aiEvaluation.complianceIssues && sub.aiEvaluation.complianceIssues.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-red-700 mb-1">Compliance Issues</p>
                                  <ul className="list-disc list-inside space-y-0.5">
                                    {sub.aiEvaluation.complianceIssues.map((issue, idx) => (
                                      <li key={idx} className="text-[10px] text-red-600">
                                        {issue}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {/* Improvement Tips */}
                              {sub.aiEvaluation.improvementTips && sub.aiEvaluation.improvementTips.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-blue-700 mb-1">Improvement Tips</p>
                                  <ul className="list-disc list-inside space-y-0.5">
                                    {sub.aiEvaluation.improvementTips.map((tip, idx) => (
                                      <li key={idx} className="text-[10px] text-blue-600">
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
      </CardContent>
    </Card>
  );
}
