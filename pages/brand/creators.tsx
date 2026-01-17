import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { collection, query, where, orderBy, getDocs, getDoc, doc, limit } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Creator } from '@/lib/models/types';
import Layout from '@/components/layout/Layout';

interface CreatorWithId extends Creator {
  id: string;
  name?: string; // Name from User document
}

const COMMON_TAGS = [
  'Lifestyle', 'Fashion', 'Beauty', 'Fitness', 'Food', 'Travel',
  'Technology', 'Gaming', 'Music', 'Art', 'Photography', 'Dance',
  'Comedy', 'Education', 'Business', 'Health', 'Sports'
];

type SortOption = 'recommended' | 'lowest_rate' | 'fastest';

export default function BrandCreators() {
  const [creators, setCreators] = useState<CreatorWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    maxRate: 500,
    maxTurnaroundDays: 14,
    paidAdsExperience: false,
    languages: [] as string[],
  });
  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.email) {
      fetchCreators();
    }
  }, [user, selectedTags, filters, sortBy]);

  const fetchCreators = async () => {
    try {
      setLoading(true);
      let q = query(
        collection(db, 'creators'),
        where('status', '==', 'active'),
        limit(50)
      );

      // Apply tag filter if tags are selected
      if (selectedTags.length > 0) {
        // For now, we'll filter client-side since Firestore array-contains-any has limitations
        // In production, you might want to use Algolia or restructure data
      }

      const querySnapshot = await getDocs(q);
      
      // Fetch user data for each creator to get names
      const creatorsWithNames = await Promise.all(
        querySnapshot.docs.map(async (creatorDoc) => {
          const creatorData = creatorDoc.data();
          // Fetch user document to get name
          const userDoc = await getDoc(doc(db, 'users', creatorData.uid));
          const userData = userDoc.data();
          
          return {
            id: creatorDoc.id,
            ...creatorData,
            name: userData?.name || 'Unknown User', // Add name from User document
          } as CreatorWithId & { name: string };
        })
      );
      
      let fetchedCreators = creatorsWithNames;

      // Apply client-side filters
      if (selectedTags.length > 0) {
        fetchedCreators = fetchedCreators.filter(creator =>
          selectedTags.some(tag => creator.interests?.includes(tag))
        );
      }

      if (filters.maxRate < 500) {
        fetchedCreators = fetchedCreators.filter(creator =>
          creator.rates.perJobSuggested && creator.rates.perJobSuggested <= filters.maxRate
        );
      }

      if (filters.maxTurnaroundDays < 14) {
        fetchedCreators = fetchedCreators.filter(creator =>
          creator.turnaroundDays <= filters.maxTurnaroundDays
        );
      }

      if (filters.paidAdsExperience) {
        fetchedCreators = fetchedCreators.filter(creator =>
          creator.experience?.includes('paid_ads')
        );
      }

      if (filters.languages.length > 0) {
        fetchedCreators = fetchedCreators.filter(creator =>
          filters.languages.some(lang => creator.languages.includes(lang))
        );
      }

      // Apply search
      if (searchQuery) {
        fetchedCreators = fetchedCreators.filter(creator =>
          creator.interests?.some(tag =>
            tag.toLowerCase().includes(searchQuery.toLowerCase())
          ) ||
          creator.location.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Sort creators
      fetchedCreators.sort((a, b) => {
        switch (sortBy) {
          case 'lowest_rate':
            return (a.rates.perJobSuggested || 999) - (b.rates.perJobSuggested || 999);
          case 'fastest':
            return a.turnaroundDays - b.turnaroundDays;
          case 'recommended':
          default:
            // Simple recommendation scoring
            const scoreA = calculateRecommendationScore(a);
            const scoreB = calculateRecommendationScore(b);
            return scoreB - scoreA; // Higher score first
        }
      });

      setCreators(fetchedCreators);
    } catch (error) {
      console.error('Error fetching creators:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRecommendationScore = (creator: CreatorWithId): number => {
    let score = 0;

    // Tag overlap weight (if user has selected tags)
    if (selectedTags.length > 0) {
      const overlap = selectedTags.filter(tag => creator.interests?.includes(tag)).length;
      score += overlap * 20;
    }

    // Rating weight
    score += creator.metrics.ratingAvg * 10;

    // Jobs completed weight
    score += creator.metrics.jobsCompleted * 2;

    // Response time weight (lower is better)
    score += Math.max(0, 50 - creator.metrics.responseTimeHoursAvg);

    // On time rate weight
    score += creator.metrics.onTimeRate * 0.3;

    return score;
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setFilters({
      maxRate: 500,
      maxTurnaroundDays: 14,
      paidAdsExperience: false,
      languages: [],
    });
    setSearchQuery('');
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Find Creators</h1>

          {/* Search and Sort */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search by tags, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="recommended">Recommended</option>
                <option value="lowest_rate">Lowest Rate</option>
                <option value="fastest">Fastest Turnaround</option>
              </select>
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Tag Filters */}
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2">Filter by Content Type</h3>
            <div className="flex flex-wrap gap-2">
              {COMMON_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    selectedTags.includes(tag)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted rounded-lg">
            <div>
              <label className="block text-sm font-medium mb-1">Max Rate ($)</label>
              <Input
                type="number"
                value={filters.maxRate}
                onChange={(e) => setFilters(prev => ({ ...prev, maxRate: Number(e.target.value) }))}
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Turnaround (days)</label>
              <Input
                type="number"
                value={filters.maxTurnaroundDays}
                onChange={(e) => setFilters(prev => ({ ...prev, maxTurnaroundDays: Number(e.target.value) }))}
                min="1"
              />
            </div>
            <div>
              <label className="flex items-center space-x-2 mt-6">
                <input
                  type="checkbox"
                  checked={filters.paidAdsExperience}
                  onChange={(e) => setFilters(prev => ({ ...prev, paidAdsExperience: e.target.checked }))}
                />
                <span className="text-sm">Paid ads experience</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Languages</label>
              <select
                multiple
                value={filters.languages}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  setFilters(prev => ({ ...prev, languages: values }));
                }}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
              </select>
            </div>
          </div>
        </div>

        {/* Creators Grid */}
        {loading ? (
          <div className="text-center py-8">Loading creators...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {creators.map(creator => (
              <Card key={creator.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{creator.name || 'Unknown User'}</CardTitle>
                      <p className="text-sm text-muted-foreground">{creator.location}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {creator.rates.perJobSuggested ? `$${creator.rates.perJobSuggested}/job` : 'Rate on request'}
                      </p>
                      <p className="text-xs text-muted-foreground">{creator.turnaroundDays} days</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-3 line-clamp-2">{creator.bio}</p>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {creator.interests?.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                    {creator.interests && creator.interests.length > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{creator.interests.length - 3} more
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm mb-4">
                    <span>⭐ {creator.metrics.ratingAvg.toFixed(1)} ({creator.metrics.ratingCount})</span>
                    <span>✅ {creator.metrics.jobsCompleted} jobs</span>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/brand/creators/${creator.id}`}>
                      <Button variant="outline" size="sm" className="flex-1">
                        View Profile
                      </Button>
                    </Link>
                    <Button size="sm" className="flex-1">
                      Invite
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && creators.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No creators found matching your criteria.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}