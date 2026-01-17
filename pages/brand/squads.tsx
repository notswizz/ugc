import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { collection, query, getDocs, orderBy, where, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { THINGS } from '@/lib/things/constants';
import { ChevronDown, ChevronUp, UsersRound, Search } from 'lucide-react';
import toast from 'react-hot-toast';

interface Squad {
  id: string;
  name: string;
  creatorId: string;
  memberIds: string[];
  createdAt: Date;
}

interface SquadWithMembers extends Squad {
  members: Array<{
    uid: string;
    username: string;
  }>;
  memberCount: number;
}

export default function BrandSquads() {
  const { user } = useAuth();
  const router = useRouter();
  const [squads, setSquads] = useState<SquadWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSquad, setExpandedSquad] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [minMembersFilter, setMinMembersFilter] = useState<number>(0);
  const [maxMembersFilter, setMaxMembersFilter] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('name');

  useEffect(() => {
    if (user) {
      fetchSquads();
    }
  }, [user]);

  const fetchSquads = async () => {
    try {
      setLoading(true);
      
      // Fetch all squads
      const squadsQuery = query(
        collection(db, 'squads'),
        orderBy('createdAt', 'desc')
      );
      const squadsSnapshot = await getDocs(squadsQuery);
      
      const squadsData: Squad[] = squadsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt),
      } as Squad));

      // Fetch member details for each squad
      const squadsWithMembers = await Promise.all(
        squadsData.map(async (squad) => {
          const memberDetails = await Promise.all(
            (squad.memberIds || []).map(async (memberId) => {
              try {
                const creatorDoc = await getDoc(doc(db, 'creators', memberId));
                if (creatorDoc.exists()) {
                  const creatorData = creatorDoc.data();
                  return {
                    uid: memberId,
                    username: creatorData.username || 'Unknown',
                  };
                }
              } catch (error) {
                console.error('Error fetching creator:', error);
              }
              return null;
            })
          );

          return {
            ...squad,
            members: memberDetails.filter(Boolean) as Array<{ uid: string; username: string }>,
            memberCount: squad.memberIds?.length || 0,
          };
        })
      );

      setSquads(squadsWithMembers);
    } catch (error) {
      console.error('Error fetching squads:', error);
      toast.error('Failed to load squads');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort squads
  let filteredSquads = squads.filter(squad => {
    // Search filter
    if (searchTerm && !squad.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !squad.members.some(m => m.username?.toLowerCase().includes(searchTerm.toLowerCase()))) {
      return false;
    }

    // Member count filter
    if (minMembersFilter > 0 && squad.memberCount < minMembersFilter) {
      return false;
    }
    if (maxMembersFilter > 0 && squad.memberCount > maxMembersFilter) {
      return false;
    }

    return true;
  });

  // Sort squads
  filteredSquads = [...filteredSquads].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'memberCount':
        return b.memberCount - a.memberCount;
      case 'createdAt':
        return b.createdAt.getTime() - a.createdAt.getTime();
      default:
        return 0;
    }
  });

  const toggleSquad = (squadId: string) => {
    setExpandedSquad(expandedSquad === squadId ? null : squadId);
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner text="Loading squads..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto py-4">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold mb-2">Squads</h1>
        </div>

        {/* Filters - Collapsible */}
        <Card className="mb-4">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="w-full"
          >
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Filters</CardTitle>
                {filtersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </CardHeader>
          </button>
          {filtersOpen && (
            <CardContent className="pt-0 px-4 pb-4 space-y-3">
              {/* Search */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search by squad name or member..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Member Count Filter */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Member Count</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={minMembersFilter || ''}
                    onChange={(e) => setMinMembersFilter(e.target.value ? parseInt(e.target.value) : 0)}
                    className="w-24"
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={maxMembersFilter || ''}
                    onChange={(e) => setMaxMembersFilter(e.target.value ? parseInt(e.target.value) : 0)}
                    className="w-24"
                  />
                </div>
              </div>

              {/* Sort By */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-md"
                >
                  <option value="name">Name</option>
                  <option value="memberCount">Member Count</option>
                  <option value="createdAt">Newest First</option>
                </select>
              </div>

              {/* Clear Filters */}
              {(searchTerm || minMembersFilter > 0 || maxMembersFilter > 0 || sortBy !== 'name') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setMinMembersFilter(0);
                    setMaxMembersFilter(0);
                    setSortBy('name');
                  }}
                  className="w-full text-xs"
                >
                  Clear All Filters
                </Button>
              )}
            </CardContent>
          )}
        </Card>

        {/* Squads List */}
        {filteredSquads.length > 0 ? (
          <div className="space-y-3">
            {filteredSquads.map((squad) => {
              const isExpanded = expandedSquad === squad.id;

              return (
                <Card key={squad.id} className="hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    {/* Squad Header */}
                    <button
                      onClick={() => toggleSquad(squad.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <UsersRound className="w-5 h-5 text-purple-600" />
                            <h3 className="text-base font-bold text-gray-900">{squad.name}</h3>
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                              {squad.memberCount} member{squad.memberCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Created {squad.createdAt?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) || 'N/A'}
                          </p>
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        {/* Members List */}
                        {squad.members.length > 0 ? (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-700 mb-2">Members</h4>
                            <div className="space-y-2">
                              {squad.members.map((member) => (
                                <div key={member.uid} className="p-2 bg-gray-50 rounded border border-gray-200">
                                  <p className="text-xs font-medium text-gray-800">@{member.username}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 text-center py-2">
                            No members found
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
              <p className="text-muted-foreground">
                {searchTerm || minMembersFilter > 0 || maxMembersFilter > 0
                  ? 'No squads found matching your filters.'
                  : 'No squads found.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
