import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, where, orderBy, getDocs, getDoc, doc, limit, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import GigCard from '@/components/gigs/GigCard';
import { canAcceptGig, calculateTrustScore } from '@/lib/trustScore/calculator';
import { THINGS } from '@/lib/things/constants';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { calculatePayout, getCreatorFollowingCount, getCreatorNetPayout } from '@/lib/payments/calculate-payout';
import HistoryTab from './_history-tab';
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
        const data = { ...creatorDoc.data(), uid: user.uid };
        console.log('Creator profile found:', { trustScore: calculateTrustScore(data), hardNos: data.hardNos });
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

        // Filter out ended gigs (deadline passed) — inactive, no sign-up or accept
        const deadlineMs = gig.deadlineAt ? new Date(gig.deadlineAt).getTime() : null;
        if (deadlineMs != null && deadlineMs < Date.now()) {
          console.log(`Gig ${gig.id} filtered: Deadline passed (ended)`);
          return false;
        }
        
        // Rep-based early access filter (only for open gigs, NOT squad gigs)
        // Squad gigs bypass the rep system - all squad members see them immediately
        if (visibility !== 'squad') {
          const creatorRep = creatorData?.rep || 0;
          const gigAccess = canAccessGig(creatorRep, gig.createdAt);
          if (!gigAccess.canAccess) {
            console.log(`Gig ${gig.id} locked: Rep-based early access locked for ${gigAccess.minutesUntilUnlock} more minutes`);
            // Mark it on the gig object so we can show a locked state
            gig.repLocked = true;
            gig.unlockAt = gigAccess.unlockAt;
            gig.minutesUntilUnlock = gigAccess.minutesUntilUnlock;
            // Don't filter out - show it as locked
          } else {
            gig.repLocked = false;
          }
        } else {
          gig.repLocked = false;
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
        // Use calculated trust score (reflects current verifications), not stored field
        if (gig.trustScoreMin) {
          const creatorTrustScore = creatorData?.uid
            ? calculateTrustScore(creatorData)
            : (creatorData?.trustScore ?? 20);
          if (creatorTrustScore < gig.trustScoreMin) {
            console.log(`Gig ${gig.id} filtered: Trust score ${creatorTrustScore} < ${gig.trustScoreMin}`);
            return false;
          }
        }

        // Minimum Followers filter
        // If gig has minimum follower requirement for a platform, check creator's follower count
        if (gig.minFollowers && gig.minFollowersPlatform) {
          const platform = gig.minFollowersPlatform.toLowerCase(); // 'TikTok', 'Instagram', 'X'
          const creatorFollowers = creatorData?.followingCount?.[platform] || 0;
          
          if (creatorFollowers < gig.minFollowers) {
            console.log(`Gig ${gig.id} filtered: ${platform} followers ${creatorFollowers} < ${gig.minFollowers}`);
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
      
      const displayedTrustScore = creatorData?.uid
        ? calculateTrustScore(creatorData)
        : (creatorData?.trustScore ?? 20);
      console.log(`Gigs: ${fetchedGigs.length} fetched, ${filteredGigs.length} visible after filtering`);
      console.log('Creator data:', { 
        hasCreatorData: !!creatorData, 
        trustScore: displayedTrustScore, 
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
          <div className="space-y-3">
            {gigs.map(gig => {
              const primaryThing = THINGS.find(t => t.id === gig.primaryThing);
              const deliverables = gig.deliverables || { videos: 0, photos: 0 };
              const displayTitle = gig.title.endsWith('2') ? gig.title.replace(' 2', ' Gig') : gig.title;
              
              // Calculate time left in minutes
              const deadlineDate = gig.deadlineAt?.toDate ? gig.deadlineAt.toDate() : new Date(gig.deadlineAt);
              const now = new Date();
              const timeLeftMinutes = Math.max(0, Math.floor((deadlineDate.getTime() - now.getTime()) / (1000 * 60)));
              
              // Format deliverables text
              const deliverableParts = [];
              if (deliverables.videos > 0) {
                deliverableParts.push(`${deliverables.videos} video${deliverables.videos > 1 ? 's' : ''}`);
              }
              if (deliverables.photos > 0) {
                deliverableParts.push(`${deliverables.photos} photo${deliverables.photos > 1 ? 's' : ''}`);
              }
              const deliverablesText = deliverableParts.length > 0 ? deliverableParts.join(' + ') : 'No deliverables';
              
              // Calculate payout in cents - show creator's net payout (after 15% platform fee)
              const basePayoutDollars = gig.calculatedPayout || gig.basePayout || 0;
              const creatorNetPayoutDollars = getCreatorNetPayout(basePayoutDollars);
              const payoutCents = Math.round(creatorNetPayoutDollars * 100);
              
              // Determine if gig is new (created within last 24 hours)
              const createdAt = gig.createdAt?.toDate ? gig.createdAt.toDate() : new Date(gig.createdAt);
              const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
              const isNew = hoursSinceCreation < 24;
              
              // Get unlock timestamp if locked
              let unlockAtTimestamp = null;
              if (gig.repLocked && gig.unlockAt) {
                const unlockDate = gig.unlockAt instanceof Date ? gig.unlockAt : new Date(gig.unlockAt);
                unlockAtTimestamp = unlockDate.getTime();
              }
              
              return (
                <GigCard
                  key={gig.id}
                  id={gig.id}
                  brandName={gig.brandName || 'Unknown Brand'}
                  brandLogoUrl={undefined}
                  title={displayTitle}
                  categoryTag={primaryThing?.name || 'General'}
                  visibilityType={gig.visibility || 'open'}
                  payoutCents={payoutCents}
                  timeLeftMinutes={timeLeftMinutes}
                  deliverablesText={deliverablesText}
                  isNew={isNew}
                  isLocked={gig.repLocked || false}
                  unlockAtTimestamp={unlockAtTimestamp}
                  payoutType={gig.payoutType === 'dynamic' ? 'dynamic' : 'fixed'}
                />
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
