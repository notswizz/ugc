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

export default function CreatorJobs() {
  const { user, appUser } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatorData, setCreatorData] = useState(null);

  useEffect(() => {
    if (user && appUser && appUser.role === 'creator') {
      fetchCreatorData();
    }
  }, [user, appUser]);

  const fetchCreatorData = async () => {
    if (!user || !appUser || appUser.role !== 'creator') return;
    
    try {
      const creatorDoc = await getDoc(doc(db, 'creators', user.uid));
      if (creatorDoc.exists()) {
        setCreatorData(creatorDoc.data());
      } else {
        // If creator profile doesn't exist yet, use empty defaults
        // Give new users a minimum trust score so they can see campaigns without trustScoreMin requirements
        // This matches the initial trust score calculation from onboarding (20 base + socials)
        setCreatorData({
          hardNos: [],
          interests: [],
          trustScore: 20, // Minimum trust score for new users (matches onboarding initial score)
        });
      }
    } catch (error) {
      console.error('Error fetching creator data:', error);
      // Use empty defaults on error with minimum trust score
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
    if (!user || !appUser || creatorData === null) return;
    
    try {
      setLoading(true);
      
      // Fetch jobs from Firestore
      let q = query(
        collection(db, 'jobs'),
        where('status', '==', 'open'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      const querySnapshot = await getDocs(q);
      
      // Fetch submissions for all jobs to check submission caps
      const jobsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        deadlineAt: doc.data().deadlineAt?.toDate ? doc.data().deadlineAt.toDate() : new Date(doc.data().deadlineAt),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt),
      }));

      // Check submission counts for each job to filter out jobs that have reached their cap
      const jobsWithSubmissionCounts = await Promise.all(
        jobsData.map(async (job) => {
          // Count approved submissions for this job
          const submissionsQuery = query(
            collection(db, 'submissions'),
            where('jobId', '==', job.id),
            where('status', '==', 'approved')
          );
          const submissionsSnapshot = await getDocs(submissionsQuery);
          const approvedCount = submissionsSnapshot.size;
          
          return {
            ...job,
            approvedSubmissionsCount: approvedCount,
          };
        })
      );

      // Filter out jobs that have reached their submission cap
      const fetchedJobs = jobsWithSubmissionCounts.filter(job => {
        const submissionCap = job.acceptedSubmissionsLimit || 1;
        return job.approvedSubmissionsCount < submissionCap;
      });

      // Filter by creator's Hard No's first (hard filter per plan)
      const creatorHardNos = creatorData?.hardNos || [];
      
      // Filter jobs that need squad checking separately
      const jobsNeedingSquadCheck = fetchedJobs.filter(job => 
        job.visibility === 'squad' && job.squadIds && job.squadIds.length > 0
      );
      
      // Check squad membership for jobs that need it and fetch squad names
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
                if (memberIds.includes(user?.uid || '')) {
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
        
        // Hard No filter - creators should never see jobs that violate their hard no's
        if (creatorHardNos.includes(job.primaryThing)) {
          return false;
        }
        if (job.secondaryTags?.some(tag => creatorHardNos.includes(tag))) {
          return false;
        }
        
        // Trust Score gating
        // Only filter if job has a trustScoreMin requirement AND creator's score is below it
        // If creatorData is null or trustScore is undefined, use minimum score (20) to allow seeing open campaigns
        if (job.trustScoreMin) {
          const creatorTrustScore = creatorData?.trustScore ?? 20; // Default to 20 for new users
          if (creatorTrustScore < job.trustScoreMin) {
            return false;
          }
        }

        // Visibility filter
        if (visibility === 'invite') {
          if (!job.invitedCreatorIds?.includes(user?.uid || '')) {
            return false;
          }
        }
        
        // Squad visibility filter - use the pre-checked membership map
        if (visibility === 'squad') {
          if (!job.squadIds || job.squadIds.length === 0) {
            // Squad visibility but no squads selected - exclude
            return false;
          }
          const squadInfo = squadMembershipMap.get(job.id);
          if (!squadInfo || !squadInfo.isInSquad) {
            return false;
          }
        }

        // Open visibility (default) - show it (already passed other filters)
        return true;
      });
      
      console.log(`Campaigns: ${fetchedJobs.length} fetched, ${filteredJobs.length} visible after filtering`);

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

      setJobs(jobsWithSquadNames);
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Available Campaigns</h1>
        </div>


        {/* Jobs Grid */}
        {loading ? (
          <LoadingSpinner text="Loading campaigns..." />
        ) : (
          <div className="space-y-3">
            {jobs.map(job => (
              <Card key={job.id} className="hover:shadow-md transition-shadow border-l-4 border-l-orange-500">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-bold line-clamp-2 mb-2">{job.title}</CardTitle>
                      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          {THINGS.find(t => t.id === job.primaryThing)?.icon && (
                            <span className="text-base">{THINGS.find(t => t.id === job.primaryThing)?.icon}</span>
                          )}
                          <span>{THINGS.find(t => t.id === job.primaryThing)?.name || job.primaryThing}</span>
                        </div>
                        {job.squadNames && job.squadNames.length > 0 && (
                          <div className="flex items-center gap-1">
                            {job.squadNames.map((squadName, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium flex items-center gap-1"
                              >
                                <span>👥</span>
                                <span>{squadName}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-2xl font-bold text-green-600">${job.calculatedPayout || job.basePayout || 0}</span>
                      {job.payoutType === 'dynamic' && (
                        <p className="text-[10px] text-gray-500 mt-0.5">Based on followers</p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {/* Time remaining */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Time left:</span>
                    <span className={`font-medium ${getUrgencyColor(job.deadlineAt)}`}>
                      {formatTimeRemaining(job.deadlineAt)}
                    </span>
                  </div>

                  {/* Deliverables */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500">Deliverables:</span>
                    {job.deliverables.videos > 0 && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                        {job.deliverables.videos} video{job.deliverables.videos > 1 ? 's' : ''}
                      </span>
                    )}
                    {job.deliverables.photos > 0 && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                        {job.deliverables.photos} photo{job.deliverables.photos > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* View Button */}
                  <div className="pt-1">
                    <Link href={`/creator/jobs/${job.id}`}>
                      <Button variant="outline" size="sm" className="w-full text-xs h-8">
                        View
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
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
    </Layout>
  );
}