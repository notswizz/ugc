import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, where, orderBy, getDocs, getDoc, doc, limit, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import VisibilityBadge from '@/components/gigs/VisibilityBadge';
import { canAcceptGig } from '@/lib/trustScore/calculator';
import { THINGS } from '@/lib/things/constants';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { calculatePayout, getCreatorFollowingCount } from '@/lib/payments/calculate-payout';
import HistoryTab from './_history-tab';
import { Clock, Play, ArrowRight, Activity, Users, Sparkles, Lock, Award } from 'lucide-react';
import { canAccessGig, getRepLevel } from '@/lib/rep/service';

export default function CreatorGigs() {
  const { user, appUser } = useAuth();
  const [activeTab, setActiveTab] = useState('browse'); // 'browse', 'history'
  const [gigs, setGigs] = useState([]);
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
        // Give new users a minimum trust score so they can see gigs without trustScoreMin requirements
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
        trustScore: 20, // Minimum trust score so users can see open gigs
      });
    }
  };

  // Fetch gigs when creator data is available
  useEffect(() => {
    if (user && appUser && creatorData !== null) {
      fetchGigs();
    }
  }, [user, appUser, creatorData]);

  const fetchGigs = async () => {
    if (!user || !appUser || creatorData === null) {
      console.log('Not fetching gigs:', { hasUser: !!user, hasAppUser: !!appUser, creatorData: creatorData });
      return;
    }
    
    try {
      setLoading(true);
      console.log('Fetching gigs for creator:', user.uid);
      
      // Fetch gigs from Firestore
      // Fetch all gigs and filter client-side by status (can't use 'in' with multiple statuses in Firestore efficiently)
      const q = query(
        collection(db, 'gigs'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      const querySnapshot = await getDocs(q);
      console.log(`Found ${querySnapshot.size} total gigs in database`);
      
      // Log the statuses we found
      const statusCounts = {};
      querySnapshot.docs.forEach(doc => {
        const status = doc.data().status || 'undefined';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      console.log('Gig statuses found:', statusCounts);
      
      // Filter to only include gigs that should be visible (open, accepted, or no status set)
      // Gigs with status 'closed', 'cancelled', 'expired', 'paid' should not show in browse
      const visibleStatuses = ['open', 'accepted', undefined, null];
      const visibleDocs = querySnapshot.docs.filter(doc => {
        const status = doc.data().status;
        const shouldShow = !status || status === 'open' || status === 'accepted';
        if (!shouldShow) {
          console.log(`Gig ${doc.id} filtered out due to status: ${status}`);
        }
        return shouldShow;
      });
      
      console.log(`After status filtering, ${visibleDocs.length} gigs are potentially visible`);
      
      // Fetch submissions for all gigs to check submission caps
      const gigsData = visibleDocs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        deadlineAt: doc.data().deadlineAt?.toDate ? doc.data().deadlineAt.toDate() : new Date(doc.data().deadlineAt),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt),
      }));

      // Check submission counts and creator submissions for each job
      const gigsWithSubmissionCounts = await Promise.all(
        gigsData.map(async (gig) => {
          // Count approved submissions for this job
          const approvedSubmissionsQuery = query(
            collection(db, 'submissions'),
            where('gigId', '==', gig.id),
            where('status', '==', 'approved')
          );
          const approvedSubmissionsSnapshot = await getDocs(approvedSubmissionsQuery);
          const approvedCount = approvedSubmissionsSnapshot.size;
          
          // Check if creator already has an APPROVED submission for this job
          // (rejected or pending submissions should not hide the gig)
          const creatorApprovedSubmissionsQuery = query(
            collection(db, 'submissions'),
            where('gigId', '==', gig.id),
            where('creatorId', '==', user?.uid || ''),
            where('status', '==', 'approved')
          );
          const creatorApprovedSubmissionsSnapshot = await getDocs(creatorApprovedSubmissionsQuery);
          const hasCreatorApprovedSubmission = creatorApprovedSubmissionsSnapshot.size > 0;
          
          return {
            ...gig,
            approvedSubmissionsCount: approvedCount,
            hasCreatorApprovedSubmission,
          };
        })
      );

      // Filter out gigs that have reached their submission cap or creator already has approved submission
      const fetchedGigs = gigsWithSubmissionCounts.filter(gig => {
        const submissionCap = gig.acceptedSubmissionsLimit || 1;
        const isFull = gig.approvedSubmissionsCount >= submissionCap;
        if (isFull) {
          console.log(`Gig ${gig.id} filtered: Gig is full (${gig.approvedSubmissionsCount}/${submissionCap})`);
          return false;
        }
        if (gig.hasCreatorApprovedSubmission) {
          console.log(`Gig ${gig.id} filtered: Creator already has approved submission`);
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
      
      // Filter gigs that need squad checking separately
      const gigsNeedingSquadCheck = fetchedGigs.filter(gig => 
        gig.visibility === 'squad' && gig.squadIds && gig.squadIds.length > 0
      );
      
      // Check squad membership for gigs that need it and fetch squad names
      // Include both accepted memberships and pending invitations
      const squadMemberships = await Promise.all(
        gigsNeedingSquadCheck.map(async (gig) => {
          let isInSelectedSquad = false;
          const squadNames = [];
          for (const squadId of gig.squadIds) {
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
          return { gigId: gig.id, isInSquad: isInSelectedSquad, squadNames };
        })
      );
      
      const squadMembershipMap = new Map(
        squadMemberships.map(s => [s.gigId, { isInSquad: s.isInSquad, squadNames: s.squadNames }])
      );
      
      // Also fetch squad names for all squad-visible gigs (not just for membership check)
      const squadNamesMap = new Map();
      for (const gig of fetchedGigs) {
        if (gig.visibility === 'squad' && gig.squadIds && gig.squadIds.length > 0) {
          const squadNames = [];
          for (const squadId of gig.squadIds) {
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
            squadNamesMap.set(gig.id, squadNames);
          }
        }
      }
      
      // Now filter all gigs with proper squad check and rep-based access
      let filteredGigs = fetchedGigs.filter(gig => {
        // Default to 'open' if visibility not set
        const visibility = gig.visibility || 'open';
        
        // Check if gig is already accepted by someone else (for single-creator gigs)
        const isSingleCreatorGig = (gig.acceptedSubmissionsLimit || 1) === 1;
        if (isSingleCreatorGig && gig.status === 'accepted' && gig.acceptedBy && gig.acceptedBy !== user?.uid) {
          console.log(`Gig ${gig.id} filtered: Already accepted by another creator (single-creator gig)`);
          return false;
        }
        
        // Filter out gigs that are closed/cancelled/expired
        if (gig.status === 'closed' || gig.status === 'cancelled' || gig.status === 'expired' || gig.status === 'paid') {
          console.log(`Gig ${gig.id} filtered: Status is ${gig.status}`);
          return false;
        }
        
        // Rep-based early access filter (only for open gigs, NOT squad gigs)
        // Squad gigs bypass the rep system - all squad members see them immediately
        if (visibility !== 'squad') {
          const creatorRep = creatorData?.rep || 0;
          const gigAccess = canAccessGig(creatorRep, gig.createdAt);
          if (!gigAccess.canAccess) {
            console.log(`Gig ${gig.id} filtered: Rep-based early access locked for ${gigAccess.minutesUntilUnlock} more minutes`);
            // Still mark it on the gig object so we can show a locked state
            gig.repLocked = true;
            gig.unlockAt = gigAccess.unlockAt;
            gig.minutesUntilUnlock = gigAccess.minutesUntilUnlock;
            return false;
          }
        }
        
        // Hard No filter - creators should never see gigs that violate their hard no's
        if (creatorHardNos.includes(gig.primaryThing)) {
          console.log(`Gig ${gig.id} filtered: Hard No match (${gig.primaryThing})`);
          return false;
        }
        if (gig.secondaryTags?.some(tag => creatorHardNos.includes(tag))) {
          console.log(`Gig ${gig.id} filtered: Hard No match in secondary tags`);
          return false;
        }
        
        // Trust Score gating
        // Only filter if gig has a trustScoreMin requirement AND creator's score is below it
        // If creatorData is null or trustScore is undefined, use minimum score (20) to allow seeing open gigs
        if (gig.trustScoreMin) {
          const creatorTrustScore = creatorData?.trustScore ?? 20; // Default to 20 for new users
          if (creatorTrustScore < gig.trustScoreMin) {
            console.log(`Gig ${gig.id} filtered: Trust score ${creatorTrustScore} < ${gig.trustScoreMin}`);
            return false;
          }
        }

        // Experience Requirements filter
        // If gig has experience requirements, creator must have at least one matching experience
        if (gig.experienceRequirements && gig.experienceRequirements.length > 0) {
          const creatorExperience = creatorData?.experience || [];
          const hasMatchingExperience = gig.experienceRequirements.some(req => 
            creatorExperience.includes(req)
          );
          if (!hasMatchingExperience) {
            console.log(`Gig ${gig.id} filtered: Creator doesn't meet experience requirements (needs: ${gig.experienceRequirements.join(', ')}, has: ${creatorExperience.join(', ')})`);
            return false;
          }
        }

        // Visibility filter
        if (visibility === 'invite') {
          if (!gig.invitedCreatorIds?.includes(user?.uid || '')) {
            console.log(`Gig ${gig.id} filtered: Not invited (invite-only gig)`);
            return false;
          }
        }
        
        // Squad visibility filter - use the pre-checked membership map
        if (visibility === 'squad') {
          if (!gig.squadIds || gig.squadIds.length === 0) {
            // Squad visibility but no squads selected - exclude
            console.log(`Gig ${gig.id} filtered: Squad visibility but no squads`);
            return false;
          }
          const squadInfo = squadMembershipMap.get(gig.id);
          if (!squadInfo || !squadInfo.isInSquad) {
            console.log(`Gig ${gig.id} filtered: Not in required squad`);
            return false;
          }
        }

        // Open visibility (default) - show it (already passed other filters)
        console.log(`Gig ${gig.id} passed all filters - will be shown`);
        return true;
      });
      
      console.log(`Gigs: ${fetchedGigs.length} fetched, ${filteredGigs.length} visible after filtering`);
      console.log('Creator data:', { 
        hasCreatorData: !!creatorData, 
        trustScore: creatorData?.trustScore ?? 20, 
        hardNos: creatorHardNos 
      });

      // Calculate payouts for sorting (temporary, will be recalculated later)
      const creatorFollowingCount = getCreatorFollowingCount(creatorData);
      filteredGigs.forEach(gig => {
        gig.calculatedPayout = calculatePayout(gig, creatorFollowingCount);
      });

      // Sort by recommended (interest overlap + payout)
      filteredGigs.sort((a, b) => {
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
      const gigsWithSquadNames = filteredGigs.map(gig => ({
        ...gig,
        squadNames: squadNamesMap.get(gig.id) || []
      }));

      // Fetch brand names for all gigs
      const uniqueBrandIds = [...new Set(gigsWithSquadNames.map(gig => gig.brandId).filter(Boolean))];
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

      // Add brand names to gigs
      const gigsWithBrandNames = gigsWithSquadNames.map(gig => ({
        ...gig,
        brandName: brandNamesMap.get(gig.brandId) || ''
      }));

      setGigs(gigsWithBrandNames);
    } catch (error) {
      console.error('Error fetching gigs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptGig = async (gigId) => {
    // In real implementation, this would call a Firebase Function
    // to atomically accept the gig (first-come-first-served)
    console.log('Accepting job:', gigId);
    alert('Gig acceptance functionality coming soon!');
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
    return <LoadingSpinner fullScreen text="Loading gigs..." />;
  }

  return (
    <Layout>
      <div className="h-full flex flex-col -mx-4 -my-8">
        {/* Tab Navigation + Heading - Fixed at top */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-4">
          <div className="flex gap-1 mb-4">
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
          
          {/* Page Title */}
          {activeTab === 'browse' && (
            <h1 className="text-2xl font-bold">Available Gigs</h1>
          )}
          {activeTab === 'history' && (
            <h1 className="text-2xl font-bold">Gig History</h1>
          )}
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Browse Tab Content */}
          {activeTab === 'browse' && (
            <div className="p-4">
            {/* Gigs Grid */}
        {loading ? (
          <LoadingSpinner text="Loading gigs..." />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {gigs.map(gig => {
              const hoursRemaining = (gig.deadlineAt - new Date()) / (1000 * 60 * 60);
              const isUrgent = hoursRemaining < 24;
              const isVeryUrgent = hoursRemaining < 6;
              const urgencyTextClass = getUrgencyColor(gig.deadlineAt);
              const primaryThing = THINGS.find(t => t.id === gig.primaryThing);
              const deliverables = gig.deliverables || { videos: 0, photos: 0 };
              const displayTitle = gig.title.endsWith('2') ? gig.title.replace(' 2', ' Gig') : gig.title;
              
              return (
                <Link key={gig.id} href={`/creator/gigs/${gig.id}`} className="block group">
                  <Card className="relative overflow-hidden bg-[#F9FAFB] border border-[rgba(0,0,0,0.04)] rounded-[20px] shadow-sm hover:shadow-xl hover:-translate-y-0.5 hover:border-[rgba(0,0,0,0.06)] hover:ring-1 hover:ring-black/5 transition-all duration-200 cursor-pointer">
                    <CardContent className="p-6">
                      {/* Header with Brand and Payout - Payout spans full height */}
                      <div className="flex items-stretch justify-between gap-4 mb-5">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* Brand Mark */}
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <span className="text-white text-xs font-bold">
                              {gig.brandName ? gig.brandName.charAt(0).toUpperCase() : 'C'}
                            </span>
                          </div>
                          
                          <div className="flex-1 min-w-0 pr-2">
                            {/* Company Name */}
                            {gig.brandName && (
                              <div className="mb-1">
                                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                                  {gig.brandName}
                                </span>
                              </div>
                            )}
                            
                            {/* Gig Title */}
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
                              {gig.squadNames && gig.squadNames.length > 0 && (
                                gig.squadNames.map((squadName, idx) => (
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
                                ${(gig.calculatedPayout || gig.basePayout || 0).toLocaleString()}
                              </div>
                            </div>
                            {gig.payoutType === 'dynamic' && (
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
                              {formatTimeRemaining(gig.deadlineAt)} left
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

            {!loading && gigs.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold mb-2">No gigs found</h3>
                <p className="text-sm text-gray-500">Check back later for new opportunities!</p>
              </div>
            )}
          </div>
        )}

        {/* History Tab Content */}
        {activeTab === 'history' && (
          <div className="p-4">
            <HistoryTab user={user} hideFiltersInComponent={true} />
          </div>
        )}
        </div>
      </div>
    </Layout>
  );
}
