'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs, orderBy, where, addDoc, getDoc, doc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/client';
import toast from 'react-hot-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/ui/loading-spinner';
import FilterPanel from './FilterPanel';
import CreatorCard from './CreatorCard';
import SquadInviteModal from './SquadInviteModal';
import { filterCreators, getUniqueLocations, getAllInterests, DEFAULT_FILTERS } from '@/lib/scout/filters';
import type { CreatorFilters, Creator } from '@/lib/scout/filters';
import { Search, Users, Filter } from 'lucide-react';

interface Submission {
  id: string;
  gigId: string;
  jobTitle?: string;
  companyName?: string;
  status: string;
  aiEvaluation?: {
    qualityScore?: number;
    compliancePassed?: boolean;
  };
  createdAt: Date;
}

interface CreatorWithSubmissions extends Creator {
  submissions: Submission[];
}

export default function CreatorScout() {
  const { user } = useAuth();
  const [creators, setCreators] = useState<CreatorWithSubmissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCreator, setExpandedCreator] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<CreatorFilters>(DEFAULT_FILTERS);
  const [searchQuery, setSearchQuery] = useState('');

  // Squad invitation modal
  const [showSquadModal, setShowSquadModal] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<CreatorWithSubmissions | null>(null);
  const [squads, setSquads] = useState<any[]>([]);
  const [loadingSquads, setLoadingSquads] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCreators();
    }
  }, [user]);

  useEffect(() => {
    if (showSquadModal && user) {
      fetchSquads();
    }
  }, [showSquadModal, user]);

  const fetchCreators = async () => {
    try {
      setLoading(true);

      // Fetch all creators
      const creatorsQuery = query(collection(db, 'creators'), orderBy('username'));
      const creatorsSnapshot = await getDocs(creatorsQuery);

      const creatorsData: Creator[] = creatorsSnapshot.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      })) as Creator[];

      // Fetch all gigs to get gig titles and brand info
      const gigsQuery = query(collection(db, 'gigs'));
      const gigsSnapshot = await getDocs(gigsQuery);
      const gigsMap = new Map();
      const brandIds = new Set<string>();
      gigsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        gigsMap.set(doc.id, { title: data.title, brandId: data.brandId });
        if (data.brandId) brandIds.add(data.brandId);
      });

      // Fetch brand names
      const brandsMap = new Map();
      if (brandIds.size > 0) {
        const brandIdsArray = Array.from(brandIds);
        for (let i = 0; i < brandIdsArray.length; i += 30) {
          const chunk = brandIdsArray.slice(i, i + 30);
          const brandsQuery = query(collection(db, 'brands'), where('__name__', 'in', chunk));
          const brandsSnapshot = await getDocs(brandsQuery);
          brandsSnapshot.docs.forEach((doc) => {
            brandsMap.set(doc.id, doc.data().companyName || 'Unknown Brand');
          });
        }
      }

      // Fetch all submissions
      const submissionsQuery = query(collection(db, 'submissions'), orderBy('createdAt', 'desc'));
      const submissionsSnapshot = await getDocs(submissionsQuery);

      // Group submissions by creator
      const submissionsByCreator = new Map<string, Submission[]>();

      submissionsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const creatorId = data.creatorId;

        if (creatorId) {
          const gigInfo = gigsMap.get(data.gigId);
          const brandName = gigInfo?.brandId ? brandsMap.get(gigInfo.brandId) : null;
          const submission: Submission = {
            id: doc.id,
            gigId: data.gigId,
            jobTitle: gigInfo?.title,
            companyName: brandName,
            status: data.status,
            aiEvaluation: data.aiEvaluation,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          };

          if (!submissionsByCreator.has(creatorId)) {
            submissionsByCreator.set(creatorId, []);
          }
          submissionsByCreator.get(creatorId)!.push(submission);
        }
      });

      // Combine creators with their submissions
      const creatorsWithSubmissions: CreatorWithSubmissions[] = creatorsData.map((creator) => ({
        ...creator,
        submissions: submissionsByCreator.get(creator.uid) || [],
      }));

      setCreators(creatorsWithSubmissions);
    } catch (error) {
      console.error('Error fetching creators:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSquads = async () => {
    if (!user) return;

    try {
      setLoadingSquads(true);
      const squadsQuery = query(collection(db, 'squads'), where('memberIds', 'array-contains', user.uid));
      const squadsSnapshot = await getDocs(squadsQuery);

      const squadsData = squadsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setSquads(squadsData);
    } catch (error) {
      console.error('Error fetching squads:', error);
      toast.error('Failed to load squads');
    } finally {
      setLoadingSquads(false);
    }
  };

  const handleInviteToSquad = async (squadId: string) => {
    if (!user || !selectedCreator) return;

    try {
      // Don't invite yourself
      if (selectedCreator.uid === user.uid) {
        toast.error('You cannot invite yourself');
        setShowSquadModal(false);
        setSelectedCreator(null);
        return;
      }

      // Check if already in squad
      const squadDoc = await getDoc(doc(db, 'squads', squadId));
      if (squadDoc.exists()) {
        const memberIds = squadDoc.data().memberIds || [];
        if (memberIds.includes(selectedCreator.uid)) {
          toast.error('Creator is already in this squad');
          setShowSquadModal(false);
          setSelectedCreator(null);
          return;
        }
      }

      // Check for existing pending invitation
      const existingInvQuery = query(
        collection(db, 'squadInvitations'),
        where('squadId', '==', squadId),
        where('inviteeId', '==', selectedCreator.uid),
        where('status', '==', 'pending')
      );
      const existingInvSnapshot = await getDocs(existingInvQuery);
      if (!existingInvSnapshot.empty) {
        toast.error('Invitation already sent');
        setShowSquadModal(false);
        setSelectedCreator(null);
        return;
      }

      // Create invitation
      await addDoc(collection(db, 'squadInvitations'), {
        squadId,
        inviterId: user.uid,
        inviteeId: selectedCreator.uid,
        status: 'pending',
        createdAt: new Date(),
      });

      toast.success(`Invitation sent to @${selectedCreator.username}!`);
      setShowSquadModal(false);
      setSelectedCreator(null);
    } catch (error) {
      console.error('Error inviting creator:', error);
      toast.error('Failed to send invitation');
    }
  };

  const openSquadModal = (creator: CreatorWithSubmissions) => {
    setSelectedCreator(creator);
    setShowSquadModal(true);
  };

  const updateFilters = (updates: Partial<CreatorFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  // Get unique values for filter dropdowns
  const uniqueLocations = getUniqueLocations(creators);
  const allInterests = getAllInterests(creators);

  // Filter creators by search and other filters
  const filteredCreators = useMemo(() => {
    let result = filterCreators(creators as any, filters) as CreatorWithSubmissions[];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((creator) => 
        creator.username?.toLowerCase().includes(query) ||
        creator.bio?.toLowerCase().includes(query) ||
        creator.location?.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [creators, filters, searchQuery]);

  const hasActiveFilters = 
    filters.locationFilter ||
    filters.interestFilter.length > 0 ||
    filters.socialFilter ||
    filters.followingCountFilter.platform ||
    filters.sortBy !== 'username' ||
    searchQuery.trim();

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner text="Loading creators..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Scout Creators</h1>

        {/* Search & Filter Bar */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by username, bio, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              filtersOpen || hasActiveFilters
                ? 'bg-orange-50 border-orange-300 text-orange-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filters</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-orange-500" />
            )}
          </button>
        </div>

        {/* Filters - Collapsible */}
        <FilterPanel
          isOpen={filtersOpen}
          onToggle={() => setFiltersOpen(!filtersOpen)}
          filters={filters}
          onFiltersChange={updateFilters}
          uniqueLocations={uniqueLocations}
          allInterests={allInterests}
        />

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            {hasActiveFilters ? (
              <>Showing <span className="font-semibold text-gray-900">{filteredCreators.length}</span> of {creators.length} creators</>
            ) : (
              <><span className="font-semibold text-gray-900">{creators.length}</span> creators</>
            )}
          </p>
          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilters(DEFAULT_FILTERS);
              }}
              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Creators List */}
        {filteredCreators.length > 0 ? (
          <div className="space-y-3">
            {filteredCreators.map((creator) => (
              <CreatorCard
                key={creator.uid}
                creator={creator}
                isExpanded={expandedCreator === creator.uid}
                onToggle={() => setExpandedCreator(expandedCreator === creator.uid ? null : creator.uid)}
                onInviteToSquad={() => openSquadModal(creator)}
              />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">No creators found</h3>
              <p className="text-sm text-gray-500 mb-4">
                {hasActiveFilters 
                  ? "Try adjusting your filters or search query"
                  : "No creators have signed up yet"}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilters(DEFAULT_FILTERS);
                  }}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                >
                  Clear all filters
                </button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Squad Selection Modal */}
        <SquadInviteModal
          isOpen={showSquadModal && !!selectedCreator}
          onClose={() => {
            setShowSquadModal(false);
            setSelectedCreator(null);
          }}
          creatorUsername={selectedCreator?.username || ''}
          squads={squads}
          loading={loadingSquads}
          onInvite={handleInviteToSquad}
        />
      </div>
    </Layout>
  );
}
