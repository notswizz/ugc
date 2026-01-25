'use client';

import { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, where, addDoc, getDoc, doc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/client';
import toast from 'react-hot-toast';
import { Card, CardContent } from '@/components/ui/card';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/ui/loading-spinner';
import FilterPanel from './FilterPanel';
import CreatorCard from './CreatorCard';
import SquadInviteModal from './SquadInviteModal';
import { filterCreators, getUniqueLocations, getAllInterests, DEFAULT_FILTERS } from '@/lib/scout/filters';
import type { CreatorFilters, Creator } from '@/lib/scout/filters';

interface Submission {
  id: string;
  gigId: string;
  jobTitle?: string;
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
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [filters, setFilters] = useState<CreatorFilters>(DEFAULT_FILTERS);

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

      // Fetch all gigs to get gig titles
      const gigsQuery = query(collection(db, 'gigs'));
      const gigsSnapshot = await getDocs(gigsQuery);
      const gigsMap = new Map();
      gigsSnapshot.docs.forEach((doc) => {
        gigsMap.set(doc.id, doc.data().title);
      });

      // Fetch all submissions
      const submissionsQuery = query(collection(db, 'submissions'), orderBy('createdAt', 'desc'));
      const submissionsSnapshot = await getDocs(submissionsQuery);

      // Group submissions by creator
      const submissionsByCreator = new Map<string, Submission[]>();

      submissionsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const creatorId = data.creatorId;

        if (creatorId) {
          const submission: Submission = {
            id: doc.id,
            gigId: data.gigId,
            jobTitle: gigsMap.get(data.gigId),
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

  // Filter and sort creators
  const filteredCreators = filterCreators(creators as any, filters) as CreatorWithSubmissions[];

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner text="Loading creators..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto py-4">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold mb-2">Scout Creators</h1>
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
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No creators found.</p>
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
