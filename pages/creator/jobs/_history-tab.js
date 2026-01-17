// This file exports the HistoryTab component for use in jobs/index.js
// It's extracted from pages/creator/jobs/history.js to be used as a tab

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, where, orderBy, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function HistoryTab({ user }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedFeedback, setExpandedFeedback] = useState(new Set());

  useEffect(() => {
    if (user) {
      fetchJobHistory();
    }
  }, [user, filter]);

  const fetchJobHistory = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const acceptedJobsQuery = query(
        collection(db, 'jobs'),
        where('acceptedBy', '==', user.uid)
      );
      const acceptedJobsSnapshot = await getDocs(acceptedJobsQuery);
      const acceptedJobIds = new Set(acceptedJobsSnapshot.docs.map(doc => doc.id));

      const submissionsQuery = query(
        collection(db, 'submissions'),
        where('creatorId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      const submissionsSnapshot = await getDocs(submissionsQuery);
      const submissionDocs = submissionsSnapshot.docs.map(subDoc => ({
        id: subDoc.id,
        ...subDoc.data(),
        createdAt: subDoc.data().createdAt?.toDate ? subDoc.data().createdAt.toDate() : new Date(subDoc.data().createdAt),
        updatedAt: subDoc.data().updatedAt?.toDate ? subDoc.data().updatedAt.toDate() : new Date(subDoc.data().updatedAt),
      }));

      const submittedJobIds = new Set(submissionDocs.map(sub => sub.jobId));

      const acceptedNotSubmittedJobs = await Promise.all(
        acceptedJobsSnapshot.docs
          .filter(jobDoc => !submittedJobIds.has(jobDoc.id))
          .map(async (jobDoc) => {
            const jobData = jobDoc.data();
            
            let brandName = '';
            try {
              const brandDoc = await getDoc(doc(db, 'brands', jobData.brandId));
              if (brandDoc.exists()) {
                brandName = brandDoc.data().companyName || '';
              } else {
                const userDoc = await getDoc(doc(db, 'users', jobData.brandId));
                if (userDoc.exists()) {
                  brandName = userDoc.data().name || '';
                }
              }
            } catch (err) {
              console.error('Error fetching brand name:', err);
            }

            return {
              jobId: jobDoc.id,
              jobTitle: jobData.title,
              brandName,
              submission: null,
              job: {
                basePayout: jobData.basePayout || 0,
                bonusPool: jobData.bonusPool,
                deadlineAt: jobData.deadlineAt?.toDate ? jobData.deadlineAt.toDate() : new Date(jobData.deadlineAt),
                primaryThing: jobData.primaryThing,
                status: jobData.status,
              },
              payment: null,
            };
          })
      );

      const jobsWithDetails = await Promise.all(
        submissionDocs.map(async (submission) => {
          const jobDoc = await getDoc(doc(db, 'jobs', submission.jobId));
          if (!jobDoc.exists()) return null;

          const jobData = jobDoc.data();
          
          let brandName = '';
          try {
            const brandDoc = await getDoc(doc(db, 'brands', jobData.brandId));
            if (brandDoc.exists()) {
              brandName = brandDoc.data().companyName || '';
            } else {
              const userDoc = await getDoc(doc(db, 'users', jobData.brandId));
              if (userDoc.exists()) {
                brandName = userDoc.data().name || '';
              }
            }
          } catch (err) {
            console.error('Error fetching brand name:', err);
          }

          const paymentsQuery = query(
            collection(db, 'payments'),
            where('jobId', '==', submission.jobId),
            where('creatorId', '==', user.uid)
          );
          const paymentsSnapshot = await getDocs(paymentsQuery);
          const payments = paymentsSnapshot.docs.map(payDoc => ({
            id: payDoc.id,
            ...payDoc.data(),
            createdAt: payDoc.data().createdAt?.toDate ? payDoc.data().createdAt.toDate() : new Date(payDoc.data().createdAt),
            transferredAt: payDoc.data().transferredAt?.toDate ? payDoc.data().transferredAt.toDate() : null,
          }));

          const payment = payments[0];

          return {
            jobId: jobData.id || submission.jobId,
            jobTitle: jobData.title,
            brandName,
            submission: {
              id: submission.id,
              status: submission.status,
              contentLink: submission.contentLink,
              createdAt: submission.createdAt,
              updatedAt: submission.updatedAt,
              aiEvaluation: submission.aiEvaluation,
            },
            job: {
              basePayout: jobData.basePayout || 0,
              bonusPool: jobData.bonusPool,
              deadlineAt: jobData.deadlineAt?.toDate ? jobData.deadlineAt.toDate() : new Date(jobData.deadlineAt),
              primaryThing: jobData.primaryThing,
              status: jobData.status,
            },
            payment: payment || null,
          };
        })
      );

      let allJobs = [...acceptedNotSubmittedJobs, ...jobsWithDetails.filter(job => job !== null)];

      if (filter === 'pending') {
        allJobs = allJobs.filter(job => 
          !job.submission || 
          job.submission.status === 'submitted' || 
          job.submission.status === 'needs_changes'
        );
      } else if (filter === 'paid') {
        allJobs = allJobs.filter(job => 
          job.payment && job.payment.status === 'transferred'
        );
      } else if (filter === 'completed') {
        allJobs = allJobs.filter(job => 
          job.submission && (
            job.submission.status === 'approved' || 
            job.submission.status === 'rejected' || 
            job.payment?.status === 'transferred'
          )
        );
      }

      const uniqueJobs = {};
      allJobs.forEach(job => {
        if (!uniqueJobs[job.jobId]) {
          uniqueJobs[job.jobId] = job;
        } else if (job.submission && uniqueJobs[job.jobId].submission) {
          if (job.submission.createdAt > uniqueJobs[job.jobId].submission.createdAt) {
            uniqueJobs[job.jobId] = job;
          }
        } else if (job.submission && !uniqueJobs[job.jobId].submission) {
          uniqueJobs[job.jobId] = job;
        }
      });

      setJobs(Object.values(uniqueJobs));
    } catch (error) {
      console.error('Error fetching job history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatus = (job) => {
    if (!job.submission) {
      return { status: 'pending_submission', text: 'Pending Submission', color: 'text-blue-600' };
    }

    if (!job.payment) {
      if (job.submission.status === 'approved') {
        return { status: 'approved', text: 'Approved - Payment Pending', color: 'text-yellow-600' };
      } else if (job.submission.status === 'rejected') {
        return { status: 'rejected', text: 'Rejected', color: 'text-red-600' };
      } else if (job.submission.status === 'submitted') {
        return { status: 'pending', text: 'Pending Approval', color: 'text-blue-600' };
      } else if (job.submission.status === 'needs_changes') {
        return { status: 'needs_changes', text: 'Needs Changes', color: 'text-orange-600' };
      }
      return { status: job.submission.status || 'unknown', text: job.submission.status || 'Unknown', color: 'text-gray-600' };
    }

    if (job.payment.status === 'transferred') {
      return { status: 'paid', text: 'Paid', color: 'text-green-600' };
    } else if (job.payment.status === 'captured') {
      return { status: 'captured', text: 'Payment Captured - Transferring Soon', color: 'text-yellow-600' };
    } else if (job.payment.status === 'pending') {
      return { status: 'pending', text: 'Payment Pending', color: 'text-blue-600' };
    }
    return { status: 'unknown', text: 'Payment Status Unknown', color: 'text-gray-600' };
  };

  if (loading) {
    return <LoadingSpinner text="Loading campaign history..." />;
  }

  const getStatusConfig = (status) => {
    switch (status) {
      case 'pending_submission':
        return { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Pending Submission', icon: '📝' };
      case 'paid':
        return { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid', icon: '✓' };
      case 'approved':
        return { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved', icon: '✓' };
      case 'submitted':
        return { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Pending', icon: '⏳' };
      case 'rejected':
        return { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected', icon: '✗' };
      case 'needs_changes':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Changes', icon: '↻' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', label: status || 'Unknown', icon: '•' };
    }
  };

  return (
    <div>
      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            filter === 'all'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          All ({jobs.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            filter === 'pending'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            filter === 'completed'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Completed
        </button>
      </div>

      {/* Jobs List */}
      {jobs.length > 0 ? (
        <div className="space-y-3">
          {jobs.map((job) => {
            const paymentStatus = getPaymentStatus(job);
            const qualityScore = job.submission?.aiEvaluation?.qualityScore;
            const amountPaid = job.payment?.creatorNet || (job.submission?.status === 'approved' ? job.job.basePayout : null);
            
            const badgeStatus = paymentStatus.status === 'paid' 
              ? 'paid' 
              : (job.submission?.status || paymentStatus.status || 'unknown');
            const statusConfig = getStatusConfig(badgeStatus);
            
            return (
              <Card key={job.jobId} className="hover:shadow-md transition-all border-l-4 border-l-orange-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-2">
                        <h3 className="text-base font-bold line-clamp-2 flex-1">{job.jobTitle}</h3>
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full whitespace-nowrap flex-shrink-0 ${statusConfig.bg} ${statusConfig.text}`}>
                          {statusConfig.icon} {statusConfig.label}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs mb-3">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">📅</span>
                          <span className="text-gray-600">{job.submission?.createdAt?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) || job.job.deadlineAt?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) || 'N/A'}</span>
                        </div>
                      </div>

                      {paymentStatus.status !== 'unknown' && paymentStatus.status !== 'rejected' && (
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                          paymentStatus.status === 'paid' ? 'bg-green-50 text-green-700' :
                          paymentStatus.status === 'approved' ? 'bg-yellow-50 text-yellow-700' :
                          'bg-blue-50 text-blue-700'
                        }`}>
                          {paymentStatus.status === 'paid' ? '✓' : paymentStatus.status === 'approved' ? '⏳' : '•'}
                          {paymentStatus.status === 'paid' ? 'Paid' : paymentStatus.status === 'approved' ? 'Awaiting Payment' : 'Pending'}
                        </div>
                      )}

                      {job.submission?.contentLink && (
                        <div className="mt-2">
                          <a
                            href={job.submission.contentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-orange-600 hover:text-orange-700 font-medium inline-flex items-center gap-1"
                          >
                            View Submission <span>→</span>
                          </a>
                        </div>
                      )}
                      
                      {!job.submission && (
                        <div className="mt-2">
                          <Link href={`/creator/jobs/${job.jobId}/submit`}>
                            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white text-xs h-7 px-3">
                              Submit Content
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {amountPaid && (
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            ${typeof amountPaid === 'number' ? amountPaid.toFixed(2) : amountPaid}
                          </div>
                          <div className="text-[10px] text-gray-500">Paid</div>
                        </div>
                      )}
                      
                      <Link href={`/creator/jobs/${job.jobId}`}>
                        <Button variant="outline" size="sm" className="text-xs h-8 px-3">
                          View Campaign
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* AI Feedback Section */}
                  {job.submission?.aiEvaluation && (
                    <div className="mt-4 pt-4 border-t">
                      <button
                        onClick={() => {
                          setExpandedFeedback(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(job.jobId)) {
                              newSet.delete(job.jobId);
                            } else {
                              newSet.add(job.jobId);
                            }
                            return newSet;
                          });
                        }}
                        className="w-full flex items-center justify-between text-left mb-2"
                      >
                        <span className="text-sm font-semibold text-gray-700">AI Feedback</span>
                        <span className="text-gray-500">
                          {expandedFeedback.has(job.jobId) ? '▼' : '▶'}
                        </span>
                      </button>
                      
                      {expandedFeedback.has(job.jobId) && (
                        <div className={`mt-2 p-4 rounded-lg border-2 transition-all ${
                          job.submission.status === 'rejected' 
                            ? 'bg-red-50 border-red-200' 
                            : job.submission.status === 'approved'
                            ? 'bg-green-50 border-green-200'
                            : 'bg-blue-50 border-blue-200'
                        }`}>
                          {qualityScore !== undefined && (
                            <div className="mb-3">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-semibold text-gray-700">AI Quality Score</span>
                                <span className={`text-sm font-bold ${
                                  qualityScore >= 80 ? 'text-green-700' :
                                  qualityScore >= 60 ? 'text-blue-700' :
                                  qualityScore >= 40 ? 'text-yellow-700' :
                                  'text-orange-700'
                                }`}>{qualityScore}/100</span>
                              </div>
                              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${
                                    qualityScore >= 80 ? 'bg-green-500' :
                                    qualityScore >= 60 ? 'bg-blue-500' :
                                    qualityScore >= 40 ? 'bg-yellow-500' :
                                    'bg-orange-500'
                                  }`}
                                  style={{ width: `${qualityScore}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {job.submission.aiEvaluation.compliancePassed !== undefined && (
                            <div className="mb-3 flex items-center gap-2">
                              <span className="text-xs font-semibold text-gray-700">Compliance:</span>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                job.submission.aiEvaluation.compliancePassed 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {job.submission.aiEvaluation.compliancePassed ? '✅ Passed' : '❌ Failed'}
                              </span>
                            </div>
                          )}

                          {job.submission.aiEvaluation.complianceIssues && 
                           job.submission.aiEvaluation.complianceIssues.length > 0 && (
                            <div className="mb-3">
                              <div className="text-xs font-semibold text-red-800 mb-1.5">Issues Found:</div>
                              <ul className="list-disc list-inside space-y-1">
                                {job.submission.aiEvaluation.complianceIssues.map((issue, idx) => (
                                  <li key={idx} className="text-xs text-red-700 leading-relaxed">{issue}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {job.submission.aiEvaluation.improvementTips && 
                           job.submission.aiEvaluation.improvementTips.length > 0 && (
                            <div>
                              <div className={`text-xs font-semibold mb-1.5 ${
                                job.submission.status === 'approved' ? 'text-green-800' : 'text-blue-800'
                              }`}>
                                {job.submission.status === 'approved' ? 'Feedback & Tips:' : 'Improvement Tips:'}
                              </div>
                              <ul className="list-disc list-inside space-y-1">
                                {job.submission.aiEvaluation.improvementTips.map((tip, idx) => (
                                  <li key={idx} className="text-xs text-gray-800 leading-relaxed">{tip}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">
              {filter === 'all' 
                ? "No campaign history yet. Accept and complete campaigns to see them here."
                : `No ${filter} campaigns found.`}
            </p>
            <Link href="/creator/jobs">
              <Button>Browse Available Campaigns</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
