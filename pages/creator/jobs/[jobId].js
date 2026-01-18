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
import { Clock, Play, Users, DollarSign, Activity, CheckCircle, XCircle, Sparkles, ArrowLeft } from 'lucide-react';

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
        isOpen, // Track if job is actually available to accept
        isAlreadyAccepted, // Track if already accepted by another creator
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

  const primaryThing = THINGS.find(t => t.id === job.primaryThing);
  const hoursRemaining = (job.deadlineAt - new Date()) / (1000 * 60 * 60);
  const isUrgent = hoursRemaining < 24;
  const isVeryUrgent = hoursRemaining < 6;
  const urgencyTextClass = getUrgencyColor(job.deadlineAt);
  const deliverables = job.deliverables || { videos: 0, photos: 0 };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-6 pb-28 px-4">
        {/* Back Link */}
        <Link href="/creator/jobs" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-orange-600 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Campaigns</span>
        </Link>

        {/* Hero Section - Premium Card */}
        <Card className="mb-6 bg-[#F9FAFB] border border-[rgba(0,0,0,0.04)] rounded-[20px] shadow-sm overflow-hidden relative">
          <CardContent className="p-6">
            {/* Header with Brand */}
            <div className="mb-6">
              {/* Brand and Title */}
              <div className="flex items-start gap-3 mb-4">
                {/* Brand Mark */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-white text-sm font-bold">
                    {job.brandName ? job.brandName.charAt(0).toUpperCase() : 'B'}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0 pr-32">
                  {/* Company Name */}
                  {job.brandName && (
                    <div className="mb-1.5">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {job.brandName}
                      </span>
                    </div>
                  )}
                  
                  {/* Campaign Title */}
                  <h1 className="text-3xl font-semibold text-gray-900 leading-tight mb-4">
                    {job.title}
                  </h1>
                </div>
              </div>

              {/* Tags and Meta Info */}
              <div className="space-y-3">
                {/* Category Tag */}
                {primaryThing && (
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-semibold border border-green-100">
                    <Activity className="w-4 h-4" />
                    <span>{primaryThing.name}</span>
                  </span>
                )}

                {/* Meta Info Grid */}
                <div className="flex items-center gap-6 flex-wrap">
                  {/* Countdown */}
                  <div className={`flex items-center gap-2 ${urgencyTextClass} ${isVeryUrgent ? 'animate-pulse' : ''}`}>
                    <Clock className="w-5 h-5" />
                    <span className="text-base font-semibold">
                      {formatTimeRemaining(job.deadlineAt)} left
                    </span>
                  </div>
                  
                  {/* Deliverables */}
                  {deliverables.videos > 0 && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Play className="w-5 h-5" />
                      <span className="text-sm font-medium">
                        {deliverables.videos} video{deliverables.videos > 1 ? 's' : ''} required
                      </span>
                    </div>
                  )}
                  
                  {deliverables.photos > 0 && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="text-sm font-medium">
                        {deliverables.photos} photo{deliverables.photos > 1 ? 's' : ''} required
                      </span>
                    </div>
                  )}

                  {job.productInVideoRequired && job.reimbursementMode === 'reimbursement' && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <DollarSign className="w-5 h-5" />
                      <span className="text-sm font-medium">Up to ${job.reimbursementCap || 0}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Payout Badge - Bottom Right */}
            <div className="absolute bottom-6 right-6 -rotate-1 hover:rotate-0 hover:scale-[1.02] transition-all duration-200">
              <div className="relative overflow-hidden bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 rounded-[18px] px-6 py-7 shadow-lg hover:shadow-xl min-w-[140px] flex flex-col justify-between before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-200 hover:before:opacity-100 before:bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.28),transparent_55%)]">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-green-50" />
                    <span className="text-[10px] text-green-50 font-bold uppercase tracking-wider leading-tight relative z-10">Payout</span>
                  </div>
                  <div className="text-4xl font-extrabold text-white leading-none drop-shadow-sm relative z-10">
                    ${(job.payout || job.basePayout || 0).toLocaleString()}
                  </div>
                </div>
                {job.payoutType === 'dynamic' && (
                  <p className="text-[9px] text-green-50 mt-4 pt-3 opacity-85 leading-tight border-t border-green-400/30 relative z-10">Based on followers</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Campaign Details - Unified Section */}
        <Card className="mb-6 bg-white border border-[rgba(0,0,0,0.06)] rounded-[20px] shadow-sm overflow-hidden">
          <CardContent className="p-6">
            {/* Unified Header */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Campaign Details</h2>
              
              {/* Two Column Grid for Overview Content */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Description */}
                {job.description && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-orange-600 text-base">📋</span>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900">Overview</h3>
                    </div>
                    <div className="ml-9">
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{job.description}</p>
                    </div>
                  </div>
                )}

                {/* Right: Deliverables */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Play className="w-4 h-4 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">What You'll Deliver</h3>
                  </div>
                  <div className="ml-9 space-y-2">
                    {deliverables.videos > 0 && (
                      <div className="flex items-center justify-between p-2.5 rounded-[10px] bg-blue-50 border border-blue-100">
                        <div className="flex items-center gap-2">
                          <Play className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-xs font-medium text-gray-900">Videos</span>
                        </div>
                        <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                          {deliverables.videos}
                        </span>
                      </div>
                    )}
                    {deliverables.photos > 0 && (
                      <div className="flex items-center justify-between p-2.5 rounded-[10px] bg-purple-50 border border-purple-100">
                        <div className="flex items-center gap-2">
                          <span className="text-base">📸</span>
                          <span className="text-xs font-medium text-gray-900">Photos</span>
                        </div>
                        <span className="px-2.5 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                          {deliverables.photos}
                        </span>
                      </div>
                    )}
                    {job.productInVideoRequired && job.reimbursementMode === 'reimbursement' && (
                      <div className="p-2.5 rounded-[10px] bg-emerald-50 border border-emerald-100 mt-2">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-xs font-semibold text-emerald-900">Reimbursement</span>
                        </div>
                        <p className="text-[10px] text-emerald-700 ml-5.5">Up to ${job.reimbursementCap || 0}</p>
                      </div>
                    )}
                    {!deliverables.videos && !deliverables.photos && (
                      <p className="text-xs text-gray-500 py-2">No deliverables specified</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Creative Brief - If Exists */}
            {job.brief && (
              <div className="pt-6 border-t border-gray-100 space-y-5">
                {/* Hooks and Talking Points */}
                {(job.brief.hooks?.filter(h => h).length > 0 || job.brief.talkingPoints?.filter(tp => tp).length > 0) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Content Hooks */}
                    {job.brief.hooks && job.brief.hooks.filter(h => h).length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                            <span className="text-orange-600 text-base">🎣</span>
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900">Content Hooks</h3>
                        </div>
                        <div className="ml-9 space-y-2">
                          {job.brief.hooks.filter(h => h).map((hook, index) => (
                            <div key={index} className="p-2.5 rounded-[10px] bg-orange-50/50 border border-orange-100 hover:bg-orange-50 transition-colors">
                              <p className="text-xs text-gray-700 leading-relaxed">{hook}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Talking Points */}
                    {job.brief.talkingPoints && job.brief.talkingPoints.filter(tp => tp).length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <span className="text-blue-600 text-base">💬</span>
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900">Talking Points</h3>
                        </div>
                        <div className="ml-9 space-y-2">
                          {job.brief.talkingPoints.filter(tp => tp).map((point, index) => (
                            <div key={index} className="p-2.5 rounded-[10px] bg-blue-50/50 border border-blue-100 hover:bg-blue-50 transition-colors">
                              <p className="text-xs text-gray-700 leading-relaxed">{point}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Do's and Don'ts */}
                {(job.brief.do?.filter(d => d).length > 0 || job.brief.dont?.filter(d => d).length > 0) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {job.brief.do && job.brief.do.filter(d => d).length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </div>
                          <h3 className="text-sm font-semibold text-green-900">Do's</h3>
                        </div>
                        <div className="ml-9 space-y-2">
                          {job.brief.do.filter(d => d).map((item, index) => (
                            <div key={index} className="flex items-start gap-2 p-2.5 rounded-[10px] bg-green-50/60 border border-green-100 hover:bg-green-50 transition-colors">
                              <CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-gray-700 leading-relaxed flex-1">{item}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {job.brief.dont && job.brief.dont.filter(d => d).length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                            <XCircle className="w-4 h-4 text-red-600" />
                          </div>
                          <h3 className="text-sm font-semibold text-red-900">Don'ts</h3>
                        </div>
                        <div className="ml-9 space-y-2">
                          {job.brief.dont.filter(d => d).map((item, index) => (
                            <div key={index} className="flex items-start gap-2 p-2.5 rounded-[10px] bg-red-50/60 border border-red-100 hover:bg-red-50 transition-colors">
                              <XCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-gray-700 leading-relaxed flex-1">{item}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* CTA Button - Enhanced Fixed Bottom */}
        <div className="fixed bottom-[64px] left-0 right-0 max-w-[428px] mx-auto bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-xl p-4 z-40">
          {job.hasCreatorSubmission ? (
            <Link href={`/creator/jobs/${job.id}/submit`} className="block">
              <Button className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 h-14 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 rounded-[12px]">
                Go to Submission
              </Button>
            </Link>
          ) : job.status === 'accepted' && job.acceptedBy === user?.uid ? (
            <Link href={`/creator/jobs/${job.id}/submit`} className="block">
              <Button className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 h-14 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 rounded-[12px]">
                Go to Submission
              </Button>
            </Link>
          ) : !job.isOpen ? (
            <Button
              disabled
              className="w-full bg-gray-300 cursor-not-allowed h-14 text-base font-semibold rounded-[12px]"
            >
              {job.approvedSubmissionsCount >= job.acceptedSubmissionsLimit 
                ? 'Campaign Full' 
                : job.isAlreadyAccepted
                  ? 'Already Accepted by Another Creator'
                  : 'Campaign Not Available'}
            </Button>
          ) : (
            <Button
              onClick={handleAcceptJob}
              disabled={accepting}
              className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 h-14 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-[12px]"
            >
              {accepting ? 'Accepting Campaign...' : 'Accept Campaign'}
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
}