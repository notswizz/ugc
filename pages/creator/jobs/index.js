import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, where, orderBy, getDocs, getDoc, doc, limit, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import VisibilityBadge from '@/components/jobs/VisibilityBadge';
import { canAcceptJob } from '@/lib/trustScore/calculator';
import { THINGS } from '@/lib/things/constants';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { calculatePayout, getCreatorFollowingCount } from '@/lib/payments/calculate-payout';
import HistoryTab from './_history-tab';
import { Clock, Play, ArrowRight, Activity, Users, Sparkles } from 'lucide-react';

export default function CreatorJobs() {
  const { user, appUser } = useAuth();
  const [activeTab, setActiveTab] = useState('browse'); // 'browse', 'history'
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatorData, setCreatorData] = useState(null);

  useEffect(() => {
    if (user && appUser && appUser.role === 'creator') {
      fetchCreatorData();
    }
  }, [user, appUser]);

  const fetchCreatorData = async () => {
    if (!user || !appUser || appUser.role !== 'creator') {
      console.log('Not fetching creator data:', { hasUser: !!user, hasAppUser: !!appUser, role: appUser?.role });
      return;
    }
    
    try {
      console.log('Fetching creator data for:', user.uid);
      const creatorDoc = await getDoc(doc(db, 'creators', user.uid));
      if (creatorDoc.exists()) {
        const data = creatorDoc.data();
        console.log('Creator profile found:', { trustScore: data.trustScore, hardNos: data.hardNos });
        setCreatorData(data);
      } else {
        // If creator profile doesn't exist yet, use empty defaults
        // Give new users a minimum trust score so they can see campaigns without trustScoreMin requirements
        // This matches the initial trust score calculation from onboarding (20 base + socials)
        console.log('No creator profile found, using defaults with trustScore: 20');
        setCreatorData({
          hardNos: [],
          interests: [],
          trustScore: 20, // Minimum trust score for new users (matches onboarding initial score)
        });
      }
    } catch (error) {
      console.error('Error fetching creator data:', error);
      // Use empty defaults on error with minimum trust score
      console.log('Error occurred, using defaults with trustScore: 20');
      setCreatorData({
        hardNos: [],
        interests: [],
        trustScore: 20, // Minimum trust score so users can see open campaigns
      });
    }
  };

  // Fetch jobs when creator data is available
  useEffect(() => {
    if (user && appUser && creatorData !== null) {
      fetchJobs();
    }
  }, [user, appUser, creatorData]);

  const fetchJobs = async () => {
    if (!user || !appUser || creatorData === null) {
      console.log('Not fetching jobs:', { hasUser: !!user, hasAppUser: !!appUser, creatorData: creatorData });
      return;
    }
    
    try {
      setLoading(true);
      console.log('Fetching jobs for creator:', user.uid);
      
      // Fetch jobs from Firestore
      // First try to get jobs with status 'open', but if that returns 0, check all jobs
      let q = query(
        collection(db, 'jobs'),
        where('status', '==', 'open'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      let querySnapshot = await getDocs(q);
      console.log(`Found ${querySnapshot.size} jobs with status 'open'`);
      
      // If no jobs found with 'open' status, try fetching all jobs and filter client-side
      if (querySnapshot.size === 0) {
        console.log('No jobs with status "open" found, fetching all jobs to check statuses...');
        const allJobsQuery = query(
          collection(db, 'jobs'),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
        const allJobsSnapshot = await getDocs(allJobsQuery);
        console.log(`Found ${allJobsSnapshot.size} total jobs in database`);
        
        // Log the statuses we found
        const statusCounts = {};
        allJobsSnapshot.docs.forEach(doc => {
          const status = doc.data().status || 'undefined';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        console.log('Job statuses found:', statusCounts);
        
        // Filter to only include jobs that should be visible (open, or no status set, or accepted)
        // A job should be visible if it doesn't have a status, or has status 'open' or 'accepted'
        const visibleDocs = allJobsSnapshot.docs.filter(doc => {
          const status = doc.data().status;
          const shouldShow = !status || status === 'open' || status === 'accepted';
          if (!shouldShow) {
            console.log(`Job ${doc.id} filtered out due to status: ${status}`);
          }
          return shouldShow;
        });
        
        // Create a new query snapshot-like object with filtered docs
        querySnapshot = {
          docs: visibleDocs,
          size: visibleDocs.length,
          empty: visibleDocs.length === 0,
          forEach: (callback) => visibleDocs.forEach(callback),
          map: (callback) => visibleDocs.map(callback),
        };
        console.log(`After filtering, ${querySnapshot.size} jobs are potentially visible`);
      }
      
      // Fetch submissions for all jobs to check submission caps
      const jobsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        deadlineAt: doc.data().deadlineAt?.toDate ? doc.data().deadlineAt.toDate() : new Date(doc.data().deadlineAt),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt),
      }));

      // Check submission counts and creator submissions for each job
      const jobsWithSubmissionCounts = await Promise.all(
        jobsData.map(async (job) => {
          // Count approved submissions for this job
          const approvedSubmissionsQuery = query(
            collection(db, 'submissions'),
            where('jobId', '==', job.id),
            where('status', '==', 'approved')
          );
          const approvedSubmissionsSnapshot = await getDocs(approvedSubmissionsQuery);
          const approvedCount = approvedSubmissionsSnapshot.size;
          
          // Check if creator already submitted to this job (any status)
          const creatorSubmissionsQuery = query(
            collection(db, 'submissions'),
            where('jobId', '==', job.id),
            where('creatorId', '==', user?.uid || '')
          );
          const creatorSubmissionsSnapshot = await getDocs(creatorSubmissionsQuery);
          const hasCreatorSubmission = creatorSubmissionsSnapshot.size > 0;
          
          return {
            ...job,
            approvedSubmissionsCount: approvedCount,
            hasCreatorSubmission,
          };
        })
      );

      // Filter out jobs that have reached their submission cap or creator already submitted
      const fetchedJobs = jobsWithSubmissionCounts.filter(job => {
        const submissionCap = job.acceptedSubmissionsLimit || 1;
        const isFull = job.approvedSubmissionsCount >= submissionCap;
        if (isFull) {
          console.log(`Job ${job.id} filtered: Campaign is full (${job.approvedSubmissionsCount}/${submissionCap})`);
          return false;
        }
        if (job.hasCreatorSubmission) {
          console.log(`Job ${job.id} filtered: Creator already submitted`);
          return false;
        }
        return true;
      });

      // Filter by creator's Hard No's first (hard filter per plan)
      const creatorHardNos = creatorData?.hardNos || [];
      
      // Fetch pending squad invitations for this user
      let pendingSquadIds = [];
      if (user) {
        try {
          const invitationsQuery = query(
            collection(db, 'squadInvitations'),
            where('inviteeId', '==', user.uid),
            where('status', '==', 'pending')
          );
          const invitationsSnapshot = await getDocs(invitationsQuery);
          pendingSquadIds = invitationsSnapshot.docs.map(doc => doc.data().squadId).filter(Boolean);
          console.log('Pending squad invitations:', pendingSquadIds);
        } catch (error) {
          console.error('Error fetching squad invitations:', error);
        }
      }
      
      // Filter jobs that need squad checking separately
      const jobsNeedingSquadCheck = fetchedJobs.filter(job => 
        job.visibility === 'squad' && job.squadIds && job.squadIds.length > 0
      );
      
      // Check squad membership for jobs that need it and fetch squad names
      // Include both accepted memberships and pending invitations
      const squadMemberships = await Promise.all(
        jobsNeedingSquadCheck.map(async (job) => {
          let isInSelectedSquad = false;
          const squadNames = [];
          for (const squadId of job.squadIds) {
            try {
              const squadDoc = await getDoc(doc(db, 'squads', squadId));
              if (squadDoc.exists()) {
                const squadData = squadDoc.data();
                const memberIds = squadData.memberIds || [];
                // Check if user is a member OR has a pending invitation
                const isMember = memberIds.includes(user?.uid || '');
                const hasPendingInvite = pendingSquadIds.includes(squadId);
                
                if (isMember || hasPendingInvite) {
                  isInSelectedSquad = true;
                  // Store the squad name for display
                  if (squadData.name) {
                    squadNames.push(squadData.name);
                  }
                }
              }
            } catch (error) {
              console.error('Error checking squad membership:', error);
            }
          }
          return { jobId: job.id, isInSquad: isInSelectedSquad, squadNames };
        })
      );
      
      const squadMembershipMap = new Map(
        squadMemberships.map(s => [s.jobId, { isInSquad: s.isInSquad, squadNames: s.squadNames }])
      );
      
      // Also fetch squad names for all squad-visible jobs (not just for membership check)
      const squadNamesMap = new Map();
      for (const job of fetchedJobs) {
        if (job.visibility === 'squad' && job.squadIds && job.squadIds.length > 0) {
          const squadNames = [];
          for (const squadId of job.squadIds) {
            try {
              const squadDoc = await getDoc(doc(db, 'squads', squadId));
              if (squadDoc.exists()) {
                const squadData = squadDoc.data();
                if (squadData.name) {
                  squadNames.push(squadData.name);
                }
              }
            } catch (error) {
              console.error('Error fetching squad name:', error);
            }
          }
          if (squadNames.length > 0) {
            squadNamesMap.set(job.id, squadNames);
          }
        }
      }
      
      // Now filter all jobs with proper squad check
      let filteredJobs = fetchedJobs.filter(job => {
        // Default to 'open' if visibility not set
        const visibility = job.visibility || 'open';
        
        // Check if job is already accepted by someone else (for single-creator jobs)
        const isSingleCreatorJob = (job.acceptedSubmissionsLimit || 1) === 1;
        if (isSingleCreatorJob && job.status === 'accepted' && job.acceptedBy && job.acceptedBy !== user?.uid) {
          console.log(`Job ${job.id} filtered: Already accepted by another creator (single-creator job)`);
          return false;
        }
        
        // Filter out jobs that are closed/cancelled/expired
        if (job.status === 'closed' || job.status === 'cancelled' || job.status === 'expired' || job.status === 'paid') {
          console.log(`Job ${job.id} filtered: Status is ${job.status}`);
          return false;
        }
        
        // Hard No filter - creators should never see jobs that violate their hard no's
        if (creatorHardNos.includes(job.primaryThing)) {
          console.log(`Job ${job.id} filtered: Hard No match (${job.primaryThing})`);
          return false;
        }
        if (job.secondaryTags?.some(tag => creatorHardNos.includes(tag))) {
          console.log(`Job ${job.id} filtered: Hard No match in secondary tags`);
          return false;
        }
        
        // Trust Score gating
        // Only filter if job has a trustScoreMin requirement AND creator's score is below it
        // If creatorData is null or trustScore is undefined, use minimum score (20) to allow seeing open campaigns
        if (job.trustScoreMin) {
          const creatorTrustScore = creatorData?.trustScore ?? 20; // Default to 20 for new users
          if (creatorTrustScore < job.trustScoreMin) {
            console.log(`Job ${job.id} filtered: Trust score ${creatorTrustScore} < ${job.trustScoreMin}`);
            return false;
          }
        }

        // Experience Requirements filter
        // If job has experience requirements, creator must have at least one matching experience
        if (job.experienceRequirements && job.experienceRequirements.length > 0) {
          const creatorExperience = creatorData?.experience || [];
          const hasMatchingExperience = job.experienceRequirements.some(req => 
            creatorExperience.includes(req)
          );
          if (!hasMatchingExperience) {
            console.log(`Job ${job.id} filtered: Creator doesn't meet experience requirements (needs: ${job.experienceRequirements.join(', ')}, has: ${creatorExperience.join(', ')})`);
            return false;
          }
        }

        // Visibility filter
        if (visibility === 'invite') {
          if (!job.invitedCreatorIds?.includes(user?.uid || '')) {
            console.log(`Job ${job.id} filtered: Not invited (invite-only campaign)`);
            return false;
          }
        }
        
        // Squad visibility filter - use the pre-checked membership map
        if (visibility === 'squad') {
          if (!job.squadIds || job.squadIds.length === 0) {
            // Squad visibility but no squads selected - exclude
            console.log(`Job ${job.id} filtered: Squad visibility but no squads`);
            return false;
          }
          const squadInfo = squadMembershipMap.get(job.id);
          if (!squadInfo || !squadInfo.isInSquad) {
            console.log(`Job ${job.id} filtered: Not in required squad`);
            return false;
          }
        }

        // Open visibility (default) - show it (already passed other filters)
        console.log(`Job ${job.id} passed all filters - will be shown`);
        return true;
      });
      
      console.log(`Campaigns: ${fetchedJobs.length} fetched, ${filteredJobs.length} visible after filtering`);
      console.log('Creator data:', { 
        hasCreatorData: !!creatorData, 
        trustScore: creatorData?.trustScore ?? 20, 
        hardNos: creatorHardNos 
      });

      // Calculate payouts for sorting (temporary, will be recalculated later)
      const creatorFollowingCount = getCreatorFollowingCount(creatorData);
      filteredJobs.forEach(job => {
        job.calculatedPayout = calculatePayout(job, creatorFollowingCount);
      });

      // Sort by recommended (interest overlap + payout)
      filteredJobs.sort((a, b) => {
        const creatorInterests = creatorData?.interests || [];
        const aOverlap = (a.primaryThing === creatorInterests.find(i => i === a.primaryThing) ? 2 : 0) +
                       (a.secondaryTags?.filter(tag => creatorInterests.includes(tag)).length || 0);
        const bOverlap = (b.primaryThing === creatorInterests.find(i => i === b.primaryThing) ? 2 : 0) +
                       (b.secondaryTags?.filter(tag => creatorInterests.includes(tag)).length || 0);
        if (aOverlap !== bOverlap) return bOverlap - aOverlap;
        const aPayout = a.calculatedPayout || a.basePayout || 0;
        const bPayout = b.calculatedPayout || b.basePayout || 0;
        return bPayout - aPayout;
      });

      // Add squad names (payouts already calculated during sort)
      const jobsWithSquadNames = filteredJobs.map(job => ({
        ...job,
        squadNames: squadNamesMap.get(job.id) || []
      }));

      // Fetch brand names for all jobs
      const uniqueBrandIds = [...new Set(jobsWithSquadNames.map(job => job.brandId).filter(Boolean))];
      const brandNamesMap = new Map();
      
      await Promise.all(
        uniqueBrandIds.map(async (brandId) => {
          try {
            // First try brands collection
            let brandDoc = await getDoc(doc(db, 'brands', brandId));
            if (brandDoc.exists()) {
              const brandData = brandDoc.data();
              if (brandData.companyName) {
                brandNamesMap.set(brandId, brandData.companyName);
                return;
              }
            }
            // Fallback to users collection
            brandDoc = await getDoc(doc(db, 'users', brandId));
            if (brandDoc.exists()) {
              const brandData = brandDoc.data();
              brandNamesMap.set(brandId, brandData.companyName || brandData.name || '');
            }
          } catch (error) {
            console.error('Error fetching brand name:', error);
          }
        })
      );

      // Add brand names to jobs
      const jobsWithBrandNames = jobsWithSquadNames.map(job => ({
        ...job,
        brandName: brandNamesMap.get(job.brandId) || ''
      }));

      setJobs(jobsWithBrandNames);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptJob = async (jobId) => {
    // In real implementation, this would call a Firebase Function
    // to atomically accept the job (first-come-first-served)
    console.log('Accepting job:', jobId);
    alert('Job acceptance functionality coming soon!');
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

  if (!user || !appUser) {
    return <LoadingSpinner fullScreen text="Loading campaigns..." />;
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Tab Navigation - Sticky */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200 mb-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('browse')}
              className={`px-4 py-3 font-semibold text-sm border-b-2 transition-all ${
                activeTab === 'browse'
                  ? 'border-orange-600 text-orange-600 bg-orange-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Browse
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-3 font-semibold text-sm border-b-2 transition-all ${
                activeTab === 'history'
                  ? 'border-orange-600 text-orange-600 bg-orange-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              History
            </button>
          </div>
        </div>

        {/* Browse Tab Content */}
        {activeTab === 'browse' && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Available Campaigns</h1>
            </div>

            {/* Jobs Grid */}
        {loading ? (
          <LoadingSpinner text="Loading campaigns..." />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {jobs.map(job => {
              const hoursRemaining = (job.deadlineAt - new Date()) / (1000 * 60 * 60);
              const isUrgent = hoursRemaining < 24;
              const isVeryUrgent = hoursRemaining < 6;
              const urgencyTextClass = getUrgencyColor(job.deadlineAt);
              const primaryThing = THINGS.find(t => t.id === job.primaryThing);
              const deliverables = job.deliverables || { videos: 0, photos: 0 };
              const displayTitle = job.title.endsWith('2') ? job.title.replace(' 2', ' Campaign') : job.title;
              
              return (
                <Link key={job.id} href={`/creator/jobs/${job.id}`} className="block group">
                  <Card className="relative overflow-hidden bg-[#F9FAFB] border border-[rgba(0,0,0,0.04)] rounded-[20px] shadow-sm hover:shadow-xl hover:-translate-y-0.5 hover:border-[rgba(0,0,0,0.06)] hover:ring-1 hover:ring-black/5 transition-all duration-200 cursor-pointer">
                    <CardContent className="p-6">
                      {/* Header with Brand and Payout - Payout spans full height */}
                      <div className="flex items-stretch justify-between gap-4 mb-5">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* Brand Mark */}
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <span className="text-white text-xs font-bold">
                              {job.brandName ? job.brandName.charAt(0).toUpperCase() : 'C'}
                            </span>
                          </div>
                          
                          <div className="flex-1 min-w-0 pr-2">
                            {/* Company Name */}
                            {job.brandName && (
                              <div className="mb-1">
                                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                                  {job.brandName}
                                </span>
                              </div>
                            )}
                            
                            {/* Campaign Title */}
                            <h3 className="text-xl font-semibold text-gray-900 leading-tight line-clamp-2 group-hover:text-orange-600 transition-colors mb-3">
                              {displayTitle}
                            </h3>

                            {/* Tags Section - Moved inside left column */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Primary Tag */}
                              {primaryThing && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-semibold border border-green-100 hover:bg-green-100 hover:-translate-y-0.5 transition-all duration-150 cursor-default">
                                  <Activity className="w-3.5 h-3.5" />
                                  <span>{primaryThing.name}</span>
                                </span>
                              )}
                              
                              {/* Secondary Tags (Squads) */}
                              {job.squadNames && job.squadNames.length > 0 && (
                                job.squadNames.map((squadName, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium border border-purple-200 hover:bg-purple-100 hover:-translate-y-0.5 transition-all duration-150 cursor-default"
                                  >
                                    <Users className="w-3.5 h-3.5" />
                                    <span>{squadName}</span>
                                  </span>
                                ))
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Payout Badge - Taller to fill vertical space */}
                        <div className="flex-shrink-0 -rotate-1 group-hover:rotate-0 group-hover:scale-[1.02] transition-all duration-200 self-stretch">
                          <div className="relative overflow-hidden bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 rounded-[16px] px-4 py-7 shadow-md group-hover:shadow-lg min-w-[100px] w-[110px] h-full flex flex-col justify-between before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-200 group-hover:before:opacity-100 before:bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.28),transparent_55%)] after:absolute after:-inset-x-10 after:top-0 after:h-10 after:-skew-y-6 after:bg-white/10 after:translate-y-[-140%] after:transition-transform after:duration-500 group-hover:after:translate-y-[520%]">
                            <div>
                              <div className="flex items-center gap-1.5 mb-4">
                                <Sparkles className="w-3 h-3 text-green-50" />
                                <span className="text-[9px] text-green-50 font-bold uppercase tracking-wider leading-tight">Payout</span>
                              </div>
                              <div className="text-3xl font-extrabold text-white leading-none drop-shadow-sm">
                                ${(job.calculatedPayout || job.basePayout || 0).toLocaleString()}
                              </div>
                            </div>
                            {job.payoutType === 'dynamic' && (
                              <p className="text-[8px] text-green-50 mt-auto pt-3 opacity-80 leading-tight">Based on followers</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Meta Info Row */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-4">
                          {/* Countdown */}
                          <div className={`flex items-center gap-1.5 ${urgencyTextClass} ${isVeryUrgent ? 'animate-pulse' : ''}`}>
                            <Clock className="w-4 h-4" />
                            <span className="text-sm font-semibold">
                              {formatTimeRemaining(job.deadlineAt)} left
                            </span>
                          </div>
                          
                          {/* Video Count */}
                          {deliverables.videos > 0 && (
                            <div className="flex items-center gap-1.5 text-gray-500">
                              <Play className="w-4 h-4" />
                              <span className="text-xs font-medium">
                                {deliverables.videos} video{deliverables.videos > 1 ? 's' : ''} required
                              </span>
                            </div>
                          )}
                          
                          {/* Photo Count */}
                          {deliverables.photos > 0 && (
                            <div className="flex items-center gap-1.5 text-gray-500">
                              <span className="text-xs font-medium">
                                {deliverables.photos} photo{deliverables.photos > 1 ? 's' : ''} required
                              </span>
                            </div>
                          )}
                        </div>

                        {/* View Details Link */}
                        <div className="flex items-center gap-1 text-xs text-gray-400 opacity-90 group-hover:opacity-100 group-hover:text-orange-600 transition-all">
                          <span className="font-medium">View details</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

            {!loading && jobs.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold mb-2">No campaigns found</h3>
                <p className="text-sm text-gray-500">Check back later for new opportunities!</p>
              </div>
            )}
          </div>
        )}

        {/* History Tab Content */}
        {activeTab === 'history' && (
          <HistoryTab user={user} />
        )}
      </div>
    </Layout>
  );
}
