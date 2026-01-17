import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import VisibilityBadge from '@/components/jobs/VisibilityBadge';
import { THINGS } from '@/lib/things/constants';
import toast from 'react-hot-toast';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { calculatePayout, getCreatorFollowingCount } from '@/lib/payments/calculate-payout';

export default function JobDetail() {
  const router = useRouter();
  const { jobId } = router.query;
  const { user, appUser } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (jobId) {
      fetchJob();
    }
  }, [jobId]);

  const fetchJob = async () => {
    if (!jobId || typeof jobId !== 'string') return;
    
    try {
      setLoading(true);
      
      // Fetch job from Firestore
      const jobDoc = await getDoc(doc(db, 'jobs', jobId));
      
      if (!jobDoc.exists()) {
        toast.error('Campaign not found');
        router.push('/creator/jobs');
        return;
      }

      const jobData = jobDoc.data();
      
      // Fetch brand name from users collection
      let brandName = 'Unknown Brand';
      if (jobData.brandId) {
        try {
          const brandDoc = await getDoc(doc(db, 'users', jobData.brandId));
          if (brandDoc.exists()) {
            brandName = brandDoc.data().name || 'Unknown Brand';
          }
        } catch (err) {
          console.error('Error fetching brand name:', err);
        }
      }

      // Fetch creator data to calculate payout for dynamic ranges
      let creatorFollowingCount = 0;
      if (user && jobData.payoutType === 'dynamic') {
        try {
          const creatorDoc = await getDoc(doc(db, 'creators', user.uid));
          if (creatorDoc.exists()) {
            const creatorData = creatorDoc.data();
            creatorFollowingCount = getCreatorFollowingCount(creatorData);
          }
        } catch (err) {
          console.error('Error fetching creator data:', err);
        }
      }

      // Calculate payout based on payout type
      const calculatedPayout = calculatePayout(jobData, creatorFollowingCount);

      // Check approved submissions count to determine if job is still open
      const approvedSubmissionsQuery = query(
        collection(db, 'submissions'),
        where('jobId', '==', jobId),
        where('status', '==', 'approved')
      );
      const approvedSubmissionsSnapshot = await getDocs(approvedSubmissionsQuery);
      const approvedSubmissionsCount = approvedSubmissionsSnapshot.size;
      const acceptedSubmissionsLimit = jobData.acceptedSubmissionsLimit || 1;
      
      // Check if creator already submitted to this job (any status)
      let hasCreatorSubmission = false;
      if (user) {
        const creatorSubmissionsQuery = query(
          collection(db, 'submissions'),
          where('jobId', '==', jobId),
          where('creatorId', '==', user.uid)
        );
        const creatorSubmissionsSnapshot = await getDocs(creatorSubmissionsQuery);
        hasCreatorSubmission = creatorSubmissionsSnapshot.size > 0;
      }
      
      // Job is considered "open" if it hasn't reached the submission limit
      // For single-creator jobs (limit = 1), check if already accepted by someone else
      // For multi-creator jobs, allow acceptance as long as approved submissions < limit
      const isSingleCreatorJob = acceptedSubmissionsLimit === 1;
      const isAlreadyAccepted = isSingleCreatorJob && 
                                jobData.status === 'accepted' && 
                                jobData.acceptedBy && 
                                jobData.acceptedBy !== user?.uid;
      
      // Job is open if:
      // 1. Original status is 'open' or undefined (new jobs)
      // 2. Hasn't reached submission limit
      // 3. Not already accepted by someone else (only for single-creator jobs)
      const isOpen = (jobData.status === 'open' || !jobData.status || jobData.status === 'accepted') && 
                     approvedSubmissionsCount < acceptedSubmissionsLimit && 
                     !isAlreadyAccepted;

      console.log('Job status check:', {
        jobId,
        originalStatus: jobData.status,
        approvedCount: approvedSubmissionsCount,
        limit: acceptedSubmissionsLimit,
        isSingleCreatorJob,
        isAlreadyAccepted,
        isOpen,
        hasCreatorSubmission,
        acceptedBy: jobData.acceptedBy,
        currentUser: user?.uid,
      });

      // Convert Firestore Timestamps to Dates
      const job = {
        id: jobDoc.id,
        ...jobData,
        status: isOpen ? 'open' : 'closed', // Set display status
        deadlineAt: jobData.deadlineAt?.toDate ? jobData.deadlineAt.toDate() : new Date(jobData.deadlineAt),
        createdAt: jobData.createdAt?.toDate ? jobData.createdAt.toDate() : new Date(jobData.createdAt),
        brandName,
        // Map to display format
        payout: calculatedPayout || jobData.basePayout || 0,
        calculatedPayout: calculatedPayout,
        tagsWanted: [jobData.primaryThing, ...(jobData.secondaryTags || [])],
        productType: THINGS.find(t => t.id === jobData.primaryThing)?.name || jobData.primaryThing,
        hasCreatorSubmission, // Track if creator already submitted
        approvedSubmissionsCount, // Track approved count
        acceptedSubmissionsLimit, // Track limit
      };

      setJob(job);
    } catch (error) {
      console.error('Error fetching job:', error);
      toast.error('Failed to load campaign details');
      router.push('/creator/jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptJob = async () => {
    if (!job || accepting || !user) return;

    setAccepting(true);
    try {
      // Update job status to accepted
      await updateDoc(doc(db, 'jobs', job.id), {
        status: 'accepted',
        acceptedBy: user.uid,
        acceptedAt: new Date(),
        updatedAt: new Date(),
      });

      toast.success('Campaign accepted! Redirecting to submission page...');
      // Redirect to submission page
      setTimeout(() => {
        router.push(`/creator/jobs/${job.id}/submit`);
      }, 1000);

    } catch (error) {
      console.error('Error accepting campaign:', error);
      toast.error('Failed to accept campaign. It may have been taken by another creator.');
    } finally {
      setAccepting(false);
    }
  };

  const formatTimeRemaining = (deadline) => {
    const now = new Date();
    const diff = deadline - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const getUrgencyColor = (deadline) => {
    const hours = (deadline - new Date()) / (1000 * 60 * 60);
    if (hours < 6) return 'text-red-600';
    if (hours < 24) return 'text-orange-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner text="Loading campaign details..." />
      </Layout>
    );
  }

  if (!job) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Campaign Not Found</h1>
          <Link href="/creator/jobs">
            <Button>Back to Campaigns</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8 pb-28">
        {/* Header - Compact */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold mb-2 line-clamp-2">{job.title}</h1>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {job.primaryThing && (
                  <>
                    <span className="text-lg">{THINGS.find(t => t.id === job.primaryThing)?.icon || '📦'}</span>
                    <span>{THINGS.find(t => t.id === job.primaryThing)?.name || job.primaryThing}</span>
                  </>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-2xl font-bold text-green-600">${job.payout || job.basePayout || 0}</div>
              {job.payoutType === 'dynamic' && (
                <p className="text-[10px] text-gray-500 mt-0.5">Based on followers</p>
              )}
            </div>
          </div>

          {/* Key Info - Compact */}
          <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
            <div className="flex items-center gap-1">
              <span>⏰</span>
              <span className={getUrgencyColor(job.deadlineAt)}>{formatTimeRemaining(job.deadlineAt)}</span>
            </div>
            {job.deliverables.videos > 0 && (
              <div className="flex items-center gap-1">
                <span>📹</span>
                <span>{job.deliverables.videos} video</span>
              </div>
            )}
            {job.acceptedSubmissionsLimit > 1 && (
              <div className="flex items-center gap-1">
                <span>👥</span>
                <span>{job.acceptedSubmissionsLimit} submissions</span>
              </div>
            )}
            {job.productInVideoRequired && job.reimbursementMode === 'reimbursement' && (
              <div className="flex items-center gap-1">
                <span>💰</span>
                <span>Up to ${job.reimbursementCap || 0}</span>
              </div>
            )}
          </div>
        </div>

        {/* Description - Simplified */}
        {job.description && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Description</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-700 leading-relaxed">{job.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Brief - Collapsible sections, simplified */}
        {job.brief && (
          <div className="space-y-4 mb-6">
            {job.brief.hooks && job.brief.hooks.filter(h => h).length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Hooks</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-1.5 text-sm text-gray-700">
                    {job.brief.hooks.filter(h => h).map((hook, index) => (
                      <li key={index}>• {hook}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {job.brief.talkingPoints && job.brief.talkingPoints.filter(tp => tp).length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Talking Points</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-1.5 text-sm text-gray-700">
                    {job.brief.talkingPoints.filter(tp => tp).map((point, index) => (
                      <li key={index}>• {point}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {(job.brief.do?.filter(d => d).length > 0 || job.brief.dont?.filter(d => d).length > 0) && (
              <div className="grid grid-cols-2 gap-3">
                {job.brief.do && job.brief.do.filter(d => d).length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-green-700">Do's</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-1.5 text-sm text-gray-700">
                        {job.brief.do.filter(d => d).map((item, index) => (
                          <li key={index}>• {item}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {job.brief.dont && job.brief.dont.filter(d => d).length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-red-700">Don'ts</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-1.5 text-sm text-gray-700">
                        {job.brief.dont.filter(d => d).map((item, index) => (
                          <li key={index}>• {item}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}

        {/* Accept Button - Above Bottom Nav */}
        <div className="fixed bottom-[64px] left-0 right-0 max-w-[428px] mx-auto bg-white border-t border-gray-200 shadow-lg p-4 z-40">
          {job.hasCreatorSubmission ? (
            <Link href={`/creator/jobs/${job.id}/submit`} className="block">
              <Button className="w-full bg-orange-600 hover:bg-orange-700 h-12 text-base font-medium">
                View Submission
              </Button>
            </Link>
          ) : job.status === 'accepted' && job.acceptedBy === user?.uid ? (
            <Link href={`/creator/jobs/${job.id}/submit`} className="block">
              <Button className="w-full bg-orange-600 hover:bg-orange-700 h-12 text-base font-medium">
                Go to Submission
              </Button>
            </Link>
          ) : job.status !== 'open' ? (
            <Button
              disabled
              className="w-full bg-gray-400 cursor-not-allowed h-12 text-base font-medium"
            >
              {job.approvedSubmissionsCount >= job.acceptedSubmissionsLimit 
                ? 'Campaign Full' 
                : job.status === 'accepted' && job.acceptedBy && job.acceptedBy !== user?.uid && job.acceptedSubmissionsLimit === 1
                  ? 'Already Accepted by Another Creator'
                  : 'Campaign Not Available'}
            </Button>
          ) : (
            <Button
              onClick={handleAcceptJob}
              disabled={accepting}
              className="w-full bg-orange-600 hover:bg-orange-700 h-12 text-base font-medium disabled:opacity-50"
            >
              {accepting ? 'Accepting Campaign...' : 'Accept Campaign'}
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
}