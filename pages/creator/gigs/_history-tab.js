// This file exports the HistoryTab component for use in gigs/index.js
// It's extracted from pages/creator/gigs/history.js to be used as a tab

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, where, orderBy, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function HistoryTab({ user, hideFiltersInComponent = false }) {
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedFeedback, setExpandedFeedback] = useState(new Set());

  useEffect(() => {
    if (user) {
      fetchGigHistory();
    }
  }, [user, filter]);

  const fetchGigHistory = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const acceptedGigsQuery = query(
        collection(db, 'gigs'),
        where('acceptedBy', '==', user.uid)
      );
      const acceptedGigsSnapshot = await getDocs(acceptedGigsQuery);
      const acceptedGigIds = new Set(acceptedGigsSnapshot.docs.map(doc => doc.id));

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

      const submittedGigIds = new Set(submissionDocs.map(sub => sub.gigId));

      const acceptedNotSubmittedGigs = await Promise.all(
        acceptedGigsSnapshot.docs
          .filter(gigDoc => !submittedGigIds.has(gigDoc.id))
          .map(async (gigDoc) => {
            const gigData = gigDoc.data();
            
            let brandName = '';
            try {
              const brandDoc = await getDoc(doc(db, 'brands', gigData.brandId));
              if (brandDoc.exists()) {
                brandName = brandDoc.data().companyName || '';
              } else {
                const userDoc = await getDoc(doc(db, 'users', gigData.brandId));
                if (userDoc.exists()) {
                  brandName = userDoc.data().name || '';
                }
              }
            } catch (err) {
              console.error('Error fetching brand name:', err);
            }

            return {
              gigId: gigDoc.id,
              jobTitle: gigData.title,
              brandName,
              submission: null,
              gig: {
                basePayout: gigData.basePayout || 0,
                bonusPool: gigData.bonusPool,
                deadlineAt: gigData.deadlineAt?.toDate ? gigData.deadlineAt.toDate() : new Date(gigData.deadlineAt),
                primaryThing: gigData.primaryThing,
                status: gigData.status,
              },
              payment: null,
            };
          })
      );

      const gigsWithDetails = await Promise.all(
        submissionDocs.map(async (submission) => {
          const gigDoc = await getDoc(doc(db, 'gigs', submission.jobId)); // Database still uses jobId field
          if (!gigDoc.exists()) return null;

          const gigData = gigDoc.data();
          
          let brandName = '';
          try {
            const brandDoc = await getDoc(doc(db, 'brands', gigData.brandId));
            if (brandDoc.exists()) {
              brandName = brandDoc.data().companyName || '';
            } else {
              const userDoc = await getDoc(doc(db, 'users', gigData.brandId));
              if (userDoc.exists()) {
                brandName = userDoc.data().name || '';
              }
            }
          } catch (err) {
            console.error('Error fetching brand name:', err);
          }

          const paymentsQuery = query(
            collection(db, 'payments'),
            where('jobId', '==', submission.jobId), // Database still uses jobId field
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
            gigId: gigData.id || submission.jobId, // Use jobId from submission
            gigTitle: gigData.title,
            brandName,
            submission: {
              id: submission.id,
              status: submission.status,
              contentLink: submission.contentLink,
              createdAt: submission.createdAt,
              updatedAt: submission.updatedAt,
              aiEvaluation: submission.aiEvaluation,
            },
            gig: {
              basePayout: gigData.basePayout || 0,
              bonusPool: gigData.bonusPool,
              deadlineAt: gigData.deadlineAt?.toDate ? gigData.deadlineAt.toDate() : new Date(gigData.deadlineAt),
              primaryThing: gigData.primaryThing,
              status: gigData.status,
            },
            payment: payment || null,
          };
        })
      );

      let allGigs = [...acceptedNotSubmittedGigs, ...gigsWithDetails.filter(gig => gig !== null)];

      if (filter === 'pending') {
        allGigs = allGigs.filter(gig => 
          !gig.submission || 
          gig.submission.status === 'submitted' || 
          gig.submission.status === 'needs_changes'
        );
      } else if (filter === 'paid') {
        allGigs = allGigs.filter(gig => 
          gig.payment && gig.payment.status === 'transferred'
        );
      } else if (filter === 'completed') {
        allGigs = allGigs.filter(gig => 
          gig.submission && (
            gig.submission.status === 'approved' || 
            gig.submission.status === 'rejected' || 
            gig.payment?.status === 'transferred'
          )
        );
      }

      const uniqueGigs = {};
      allGigs.forEach(gig => {
        if (!uniqueGigs[gig.gigId]) {
          uniqueGigs[gig.gigId] = job;
        } else if (gig.submission && uniqueGigs[gig.gigId].submission) {
          if (gig.submission.createdAt > uniqueGigs[gig.gigId].submission.createdAt) {
            uniqueGigs[gig.gigId] = job;
          }
        } else if (gig.submission && !uniqueGigs[gig.gigId].submission) {
          uniqueGigs[gig.gigId] = job;
        }
      });

      setGigs(Object.values(uniqueGigs));
    } catch (error) {
      console.error('Error fetching gig history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatus = (gig) => {
    if (!gig.submission) {
      return { status: 'pending_submission', text: 'Pending Submission', color: 'text-blue-600' };
    }

    if (!gig.payment) {
      if (gig.submission.status === 'approved') {
        return { status: 'approved', text: 'Approved - Payment Pending', color: 'text-yellow-600' };
      } else if (gig.submission.status === 'rejected') {
        return { status: 'rejected', text: 'Rejected', color: 'text-red-600' };
      } else if (gig.submission.status === 'submitted') {
        return { status: 'pending', text: 'Pending Approval', color: 'text-blue-600' };
      } else if (gig.submission.status === 'needs_changes') {
        return { status: 'needs_changes', text: 'Needs Changes', color: 'text-orange-600' };
      }
      return { status: gig.submission.status || 'unknown', text: gig.submission.status || 'Unknown', color: 'text-gray-600' };
    }

    if (gig.payment.status === 'transferred' || gig.payment.status === 'balance_transferred') {
      return { status: 'paid', text: 'Paid', color: 'text-green-600' };
    } else if (gig.payment.status === 'captured') {
      return { status: 'captured', text: 'Payment Captured - Transferring Soon', color: 'text-yellow-600' };
    } else if (gig.payment.status === 'pending') {
      return { status: 'pending', text: 'Payment Pending', color: 'text-blue-600' };
    }
    return { status: 'unknown', text: 'Payment Status Unknown', color: 'text-gray-600' };
  };

  if (loading) {
    return <LoadingSpinner text="Loading gig history..." />;
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
      <div className="border-b border-gray-200 mb-6 pb-2">
        <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            filter === 'all'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          All ({gigs.length})
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
      </div>

      {/* Gigs List */}
      {gigs.length > 0 ? (
        <div className="space-y-3">
          {gigs.map((gig) => {
            const paymentStatus = getPaymentStatus(gig);
            const qualityScore = gig.submission?.aiEvaluation?.qualityScore;
            const amountPaid = gig.payment?.creatorNet || (gig.submission?.status === 'approved' ? gig.basePayout : null);
            
            const badgeStatus = paymentStatus.status === 'paid' 
              ? 'paid' 
              : (gig.submission?.status || paymentStatus.status || 'unknown');
            const statusConfig = getStatusConfig(badgeStatus);
            
            return (
              <Card key={gig.gigId} className="hover:shadow-md transition-all border-l-4 border-l-orange-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-2">
                        <h3 className="text-base font-bold line-clamp-2 flex-1">{gig.gigTitle}</h3>
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full whitespace-nowrap flex-shrink-0 ${statusConfig.bg} ${statusConfig.text}`}>
                          {statusConfig.icon} {statusConfig.label}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs mb-3">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">📅</span>
                          <span className="text-gray-600">{gig.submission?.createdAt?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) || gig.deadlineAt?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) || 'N/A'}</span>
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

                      {!gig.submission && (
                        <div className="mt-2">
                          <Link href={`/creator/gigs/${gig.gigId}/submit`}>
                            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white text-xs h-7 px-3">
                              Submit Content
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>

                    {amountPaid && (
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            ${typeof amountPaid === 'number' ? amountPaid.toFixed(2) : amountPaid}
                          </div>
                          <div className="text-[10px] text-gray-500">Paid</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* AI Feedback Section */}
                  {gig.submission?.aiEvaluation && (
                    <div className="mt-4 pt-4 border-t">
                      <button
                        onClick={() => {
                          setExpandedFeedback(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(gig.gigId)) {
                              newSet.delete(gig.gigId);
                            } else {
                              newSet.add(gig.gigId);
                            }
                            return newSet;
                          });
                        }}
                        className="w-full flex items-center justify-between text-left mb-2"
                      >
                        <span className="text-sm font-semibold text-gray-700">AI Feedback</span>
                        <span className="text-gray-500">
                          {expandedFeedback.has(gig.gigId) ? '▼' : '▶'}
                        </span>
                      </button>
                      
                      {expandedFeedback.has(gig.gigId) && (
                        <div className={`mt-2 p-4 rounded-lg border-2 transition-all ${
                          gig.submission.status === 'rejected' 
                            ? 'bg-red-50 border-red-200' 
                            : gig.submission.status === 'approved'
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

                          {gig.submission.aiEvaluation.compliancePassed !== undefined && (
                            <div className="mb-3 flex items-center gap-2">
                              <span className="text-xs font-semibold text-gray-700">Compliance:</span>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                gig.submission.aiEvaluation.compliancePassed 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {gig.submission.aiEvaluation.compliancePassed ? '✅ Passed' : '❌ Failed'}
                              </span>
                            </div>
                          )}

                          {gig.submission.aiEvaluation.complianceIssues && 
                           gig.submission.aiEvaluation.complianceIssues.length > 0 && (
                            <div className="mb-3">
                              <div className="text-xs font-semibold text-red-800 mb-1.5">Issues Found:</div>
                              <ul className="list-disc list-inside space-y-1">
                                {gig.submission.aiEvaluation.complianceIssues.map((issue, idx) => (
                                  <li key={idx} className="text-xs text-red-700 leading-relaxed">{issue}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {gig.submission.aiEvaluation.improvementTips && 
                           gig.submission.aiEvaluation.improvementTips.length > 0 && (
                            <div>
                              <div className={`text-xs font-semibold mb-1.5 ${
                                gig.submission.status === 'approved' ? 'text-green-800' : 'text-blue-800'
                              }`}>
                                {gig.submission.status === 'approved' ? 'Feedback & Tips:' : 'Improvement Tips:'}
                              </div>
                              <ul className="list-disc list-inside space-y-1">
                                {gig.submission.aiEvaluation.improvementTips.map((tip, idx) => (
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
                ? "No gig history yet. Accept and complete gigs to see them here."
                : `No ${filter} gigs found.`}
            </p>
            <Link href="/creator/gigs">
              <Button>Browse Available Gigs</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
