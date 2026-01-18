import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { collection, query, getDocs, orderBy, where, addDoc, getDoc, doc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/client';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { THINGS } from '@/lib/things/constants';
import { ChevronDown, ChevronUp, MapPin, Heart, Briefcase, XCircle, Globe, Instagram, Youtube, Linkedin, CheckCircle, XCircle as XCircleIcon, Plus } from 'lucide-react';

interface Creator {
  uid: string;
  username: string;
  bio?: string;
  location?: string;
  interests?: string[];
  experience?: string[];
  hardNos?: string[];
  languages?: string[];
  socials?: {
    tiktok?: string;
    instagram?: string;
    youtube?: string;
    linkedin?: string;
  };
  portfolioLinks?: string[];
  trustScore?: number;
  followingCount?: {
    tiktok?: number;
    instagram?: number;
    youtube?: number;
    linkedin?: number;
  };
  metrics?: {
    gigsCompleted?: number;
    ratingAvg?: number;
  };
}

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

export default function ScoutPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [creators, setCreators] = useState<CreatorWithSubmissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCreator, setExpandedCreator] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(true);
  
  // Filters
  const [locationFilter, setLocationFilter] = useState('');
  const [interestFilter, setInterestFilter] = useState<string[]>([]);
  const [socialFilter, setSocialFilter] = useState<string>('');
  const [followingCountFilter, setFollowingCountFilter] = useState<{ platform: string; min: number }>({ platform: '', min: 0 });
  const [sortBy, setSortBy] = useState<string>('username');
  
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
      const creatorsQuery = query(
        collection(db, 'creators'),
        orderBy('username')
      );
      const creatorsSnapshot = await getDocs(creatorsQuery);
      
      const creatorsData: Creator[] = creatorsSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
      } as Creator));

      // Fetch all gigs to get gig titles
      const gigsQuery = query(collection(db, 'gigs'));
      const gigsSnapshot = await getDocs(gigsQuery);
      const gigsMap = new Map();
      gigsSnapshot.docs.forEach(doc => {
        gigsMap.set(doc.id, doc.data().title);
      });

      // Fetch all submissions
      const submissionsQuery = query(
        collection(db, 'submissions'),
        orderBy('createdAt', 'desc')
      );
      const submissionsSnapshot = await getDocs(submissionsQuery);
      
      // Group submissions by creator
      const submissionsByCreator = new Map<string, Submission[]>();
      
      submissionsSnapshot.docs.forEach(doc => {
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
      const creatorsWithSubmissions: CreatorWithSubmissions[] = creatorsData.map(creator => ({
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
      const squadsQuery = query(
        collection(db, 'squads'),
        where('memberIds', 'array-contains', user.uid)
      );
      const squadsSnapshot = await getDocs(squadsQuery);
      
      const squadsData = squadsSnapshot.docs.map(doc => ({
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

  // Get unique values for filter dropdowns
  const uniqueLocations = Array.from(new Set(creators.map(c => c.location).filter(Boolean))).sort();
  const allInterests = Array.from(new Set(creators.flatMap(c => c.interests || []))).sort();

  // Filter and sort creators
  let filteredCreators = creators.filter(creator => {
    // Location filter
    if (locationFilter && creator.location?.toLowerCase() !== locationFilter.toLowerCase()) {
      return false;
    }

    // Interest filter
    if (interestFilter.length > 0) {
      const creatorInterests = creator.interests || [];
      const hasAllInterests = interestFilter.every(interest => creatorInterests.includes(interest));
      if (!hasAllInterests) {
        return false;
      }
    }

    // Social filter
    if (socialFilter) {
      const hasSocial = creator.socials?.[socialFilter as keyof typeof creator.socials];
      if (!hasSocial) {
        return false;
      }
    }

    // Following count filter
    if (followingCountFilter.platform && followingCountFilter.min > 0) {
      const count = creator.followingCount?.[followingCountFilter.platform as keyof typeof creator.followingCount] || 0;
      if (count < followingCountFilter.min) {
        return false;
      }
    }

    return true;
  });

  // Sort creators
  filteredCreators = [...filteredCreators].sort((a, b) => {
    switch (sortBy) {
      case 'username':
        return (a.username || '').localeCompare(b.username || '');
      case 'location':
        return (a.location || '').localeCompare(b.location || '');
      case 'followingCount':
        const aTotal = Object.values(a.followingCount || {}).reduce((sum, count) => sum + (count || 0), 0);
        const bTotal = Object.values(b.followingCount || {}).reduce((sum, count) => sum + (count || 0), 0);
        return bTotal - aTotal;
      case 'submissions':
        return b.submissions.length - a.submissions.length;
      default:
        return 0;
    }
  });

  const toggleCreator = (creatorId: string) => {
    setExpandedCreator(expandedCreator === creatorId ? null : creatorId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved', icon: <CheckCircle className="w-3 h-3" /> };
      case 'rejected':
        return { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected', icon: <XCircleIcon className="w-3 h-3" /> };
      case 'submitted':
        return { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Pending', icon: null };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', label: status, icon: null };
    }
  };

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
            {/* Location Filter */}
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Location</label>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md"
              >
                <option value="">All Locations</option>
                {uniqueLocations.map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>

            {/* Interest Filter */}
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Interests</label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {allInterests.map(interestId => {
                  const thing = THINGS.find(t => t.id === interestId);
                  const isSelected = interestFilter.includes(interestId);
                  return (
                    <button
                      key={interestId}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setInterestFilter(interestFilter.filter(i => i !== interestId));
                        } else {
                          setInterestFilter([...interestFilter, interestId]);
                        }
                      }}
                      className={`px-2 py-1 rounded text-xs border ${
                        isSelected
                          ? 'bg-orange-100 text-orange-800 border-orange-300'
                          : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                      }`}
                    >
                      {thing?.icon} {thing?.name || interestId}
                    </button>
                  );
                })}
              </div>
              {interestFilter.length > 0 && (
                <button
                  onClick={() => setInterestFilter([])}
                  className="text-xs text-orange-600 hover:text-orange-700 mt-1"
                >
                  Clear ({interestFilter.length})
                </button>
              )}
            </div>

            {/* Social Filter */}
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Has Social</label>
              <select
                value={socialFilter}
                onChange={(e) => setSocialFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md"
              >
                <option value="">All Creators</option>
                <option value="tiktok">TikTok</option>
                <option value="instagram">Instagram</option>
                <option value="youtube">YouTube</option>
                <option value="linkedin">LinkedIn</option>
              </select>
            </div>

            {/* Following Count Filter */}
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Minimum Following Count</label>
              <div className="flex gap-2">
                <select
                  value={followingCountFilter.platform}
                  onChange={(e) => setFollowingCountFilter({ ...followingCountFilter, platform: e.target.value })}
                  className="flex-1 px-3 py-2 text-sm border rounded-md"
                >
                  <option value="">Select Platform</option>
                  <option value="tiktok">TikTok</option>
                  <option value="instagram">Instagram</option>
                  <option value="youtube">YouTube</option>
                  <option value="linkedin">LinkedIn</option>
                </select>
                <Input
                  type="number"
                  placeholder="Min"
                  value={followingCountFilter.min || ''}
                  onChange={(e) => setFollowingCountFilter({ 
                    ...followingCountFilter, 
                    min: e.target.value ? parseInt(e.target.value) : 0 
                  })}
                  className="w-24"
                  disabled={!followingCountFilter.platform}
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
                <option value="username">Username</option>
                <option value="location">Location</option>
                <option value="followingCount">Following Count</option>
                <option value="submissions">Submissions</option>
              </select>
            </div>

            {/* Clear Filters */}
            {(locationFilter || interestFilter.length > 0 || socialFilter || followingCountFilter.platform || sortBy !== 'username') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLocationFilter('');
                  setInterestFilter([]);
                  setSocialFilter('');
                  setFollowingCountFilter({ platform: '', min: 0 });
                  setSortBy('username');
                }}
                className="w-full text-xs"
              >
                Clear All Filters
              </Button>
            )}
            </CardContent>
          )}
        </Card>

        {/* Creators List */}
        {filteredCreators.length > 0 ? (
          <div className="space-y-3">
            {filteredCreators.map((creator) => {
              const approvedCount = creator.submissions.filter(s => s.status === 'approved').length;
              const rejectedCount = creator.submissions.filter(s => s.status === 'rejected').length;
              const pendingCount = creator.submissions.filter(s => s.status === 'submitted').length;
              const isExpanded = expandedCreator === creator.uid;

              return (
                <Card key={creator.uid} className="hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    {/* Creator Header */}
                    <button
                      onClick={() => toggleCreator(creator.uid)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-base font-bold text-gray-900">@{creator.username}</h3>
                          </div>
                          
                          {creator.bio && (
                            <p className="text-xs text-gray-600 line-clamp-2 mb-2">{creator.bio}</p>
                          )}

                          {/* Quick Stats */}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{creator.submissions.length} submission{creator.submissions.length !== 1 ? 's' : ''}</span>
                            {approvedCount > 0 && <span className="text-green-600">{approvedCount} approved</span>}
                            {rejectedCount > 0 && <span className="text-red-600">{rejectedCount} rejected</span>}
                            {pendingCount > 0 && <span className="text-blue-600">{pendingCount} pending</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openSquadModal(creator);
                            }}
                            className="p-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded hover:shadow-md transition-colors"
                            title="Add to Squad"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                        </div>
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        {/* Profile Info */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-gray-700">Profile Information</h4>
                          
                          {creator.location && (
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              <span>{creator.location}</span>
                            </div>
                          )}

                          {creator.languages && creator.languages.length > 0 && (
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Globe className="w-3 h-3 text-gray-400" />
                              <span>{creator.languages.join(', ')}</span>
                            </div>
                          )}

                          {creator.interests && creator.interests.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Heart className="w-3 h-3 text-pink-500" />
                                <span className="text-xs font-semibold text-gray-700">Interests</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {creator.interests.map((interestId) => {
                                  const thing = THINGS.find(t => t.id === interestId);
                                  return (
                                    <span key={interestId} className="px-2 py-0.5 bg-pink-100 text-pink-800 rounded text-[10px]">
                                      {thing?.icon} {thing?.name || interestId}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {creator.experience && creator.experience.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Briefcase className="w-3 h-3 text-blue-500" />
                                <span className="text-xs font-semibold text-gray-700">Experience</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {creator.experience.map((expId) => {
                                  const exp = THINGS.find(t => t.id === expId);
                                  return (
                                    <span key={expId} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px]">
                                      {exp?.icon} {exp?.name || expId}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {creator.socials && (
                            <div>
                              <div className="flex items-center gap-3 pt-1 mb-2">
                                {creator.socials.instagram && (
                                  <a href={creator.socials.instagram} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:text-pink-700">
                                    <Instagram className="w-4 h-4" />
                                  </a>
                                )}
                                {creator.socials.youtube && (
                                  <a href={creator.socials.youtube} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-700">
                                    <Youtube className="w-4 h-4" />
                                  </a>
                                )}
                                {creator.socials.linkedin && (
                                  <a href={creator.socials.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                                    <Linkedin className="w-4 h-4" />
                                  </a>
                                )}
                              </div>
                              {/* Following Count */}
                              {creator.followingCount && Object.keys(creator.followingCount).length > 0 && (
                                <div className="pt-2 border-t border-gray-200">
                                  <span className="text-xs font-semibold text-gray-700 mb-1 block">Following Count:</span>
                                  <div className="space-y-1 text-xs text-gray-600">
                                    {creator.followingCount.tiktok && (
                                      <div>TikTok: {creator.followingCount.tiktok.toLocaleString()}</div>
                                    )}
                                    {creator.followingCount.instagram && (
                                      <div>Instagram: {creator.followingCount.instagram.toLocaleString()}</div>
                                    )}
                                    {creator.followingCount.youtube && (
                                      <div>YouTube: {creator.followingCount.youtube.toLocaleString()}</div>
                                    )}
                                    {creator.followingCount.linkedin && (
                                      <div>LinkedIn: {creator.followingCount.linkedin.toLocaleString()}</div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {creator.portfolioLinks && creator.portfolioLinks.length > 0 && (
                            <div>
                              <span className="text-xs font-semibold text-gray-700">Portfolio:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {creator.portfolioLinks.map((link, idx) => (
                                  <a key={idx} href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-600 hover:underline">
                                    {link}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {creator.metrics && (
                            <div className="pt-2 border-t">
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {creator.metrics.gigsCompleted !== undefined && (
                                  <div>
                                    <span className="text-gray-500">Completed:</span>
                                    <span className="font-medium ml-1">{creator.metrics.gigsCompleted}</span>
                                  </div>
                                )}
                                {creator.metrics.ratingAvg !== undefined && (
                                  <div>
                                    <span className="text-gray-500">Rating:</span>
                                    <span className="font-medium ml-1">{creator.metrics.ratingAvg.toFixed(1)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Submissions */}
                        {creator.submissions.length > 0 ? (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-700 mb-2">Submissions ({creator.submissions.length})</h4>
                            <div className="space-y-2">
                              {creator.submissions.map((submission) => {
                                const statusBadge = getStatusBadge(submission.status);
                                return (
                                  <div key={submission.id} className="p-2 bg-gray-50 rounded border border-gray-200">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-800">{submission.jobTitle || 'Unknown Gig'}</p>
                                        <p className="text-[10px] text-gray-500 mt-0.5">
                                          {submission.createdAt?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) || 'N/A'}
                                        </p>
                                      </div>
                                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full flex items-center gap-1 ${statusBadge.bg} ${statusBadge.text}`}>
                                        {statusBadge.icon}
                                        {statusBadge.label}
                                      </span>
                                    </div>
                                    {submission.aiEvaluation && (
                                      <div className="mt-2 pt-2 border-t border-gray-200">
                                        <div className="flex items-center justify-between text-[10px]">
                                          <span className="text-gray-600">AI Score:</span>
                                          <span className="font-bold text-blue-600">
                                            {submission.aiEvaluation.qualityScore || 0}/100
                                          </span>
                                        </div>
                                        {submission.aiEvaluation.compliancePassed !== undefined && (
                                          <div className="text-[10px] text-gray-600 mt-0.5">
                                            Compliance: {submission.aiEvaluation.compliancePassed ? '✅ Passed' : '❌ Failed'}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 text-center py-2">
                            No submissions yet
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
                No creators found.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Squad Selection Modal */}
        {showSquadModal && selectedCreator && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full max-h-[80vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">
                    Add @{selectedCreator.username} to Squad
                  </CardTitle>
                  <button
                    onClick={() => {
                      setShowSquadModal(false);
                      setSelectedCreator(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingSquads ? (
                  <div className="text-center py-4">
                    <div className="text-xs text-gray-500">Loading squads...</div>
                  </div>
                ) : squads.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-xs text-gray-500 mb-2">You don't have any squads yet.</p>
                    <p className="text-xs text-gray-400">Create a squad from your dashboard first.</p>
                  </div>
                ) : (
                  squads.map((squad) => (
                    <button
                      key={squad.id}
                      onClick={() => handleInviteToSquad(squad.id)}
                      className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{squad.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {squad.memberIds?.length || 0} member{(squad.memberIds?.length || 0) !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <button className="px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700">
                          Invite
                        </button>
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
