import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Creator } from '@/lib/models/types';
import Layout from '@/components/layout/Layout';
import toast from 'react-hot-toast';

interface CreatorWithId extends Creator {
  id: string;
  name?: string; // Name from User document
}

export default function CreatorProfile() {
  const [creator, setCreator] = useState<CreatorWithId | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();
  const { creatorId } = router.query;

  useEffect(() => {
    if (creatorId && typeof creatorId === 'string') {
      fetchCreator();
    }
  }, [creatorId]);

  const fetchCreator = async () => {
    try {
      setLoading(true);
      const creatorDoc = await getDoc(doc(db, 'creators', creatorId as string));

      if (creatorDoc.exists()) {
        const creatorData = creatorDoc.data();
        // Fetch user document to get name
        const userDoc = await getDoc(doc(db, 'users', creatorData.uid));
        const userData = userDoc.data();
        
        setCreator({
          id: creatorDoc.id,
          ...creatorData,
          name: userData?.name || 'Unknown User', // Add name from User document
        } as CreatorWithId & { name: string });
      } else {
        toast.error('Creator not found');
        router.push('/brand/creators');
      }
    } catch (error) {
      console.error('Error fetching creator:', error);
      toast.error('Failed to load creator profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = () => {
    // For now, just show a toast. In the future, this would open a gig selection modal
    toast.success('Invite feature coming soon!');
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-8">Loading creator profile...</div>
      </Layout>
    );
  }

  if (!creator) {
    return (
      <Layout>
        <div className="text-center py-8">Creator not found</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{creator.name || 'Unknown User'}</h1>
              <p className="text-muted-foreground">{creator.location}</p>
            </div>
            <Button onClick={handleInvite} size="lg">
              Invite to Gig
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bio */}
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{creator.bio}</p>
              </CardContent>
            </Card>

            {/* Portfolio */}
            <Card>
              <CardHeader>
                <CardTitle>Portfolio</CardTitle>
              </CardHeader>
              <CardContent>
                {creator.portfolioLinks.length > 0 ? (
                  <div className="space-y-2">
                    {creator.portfolioLinks.map((link, index) => (
                      <a
                        key={index}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-primary hover:underline"
                      >
                        {link}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No portfolio links added yet</p>
                )}
              </CardContent>
            </Card>

            {/* Interests */}
            <Card>
              <CardHeader>
                <CardTitle>Interests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {creator.interests?.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Experience */}
            {creator.experience && creator.experience.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Experience</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {creator.experience.map(exp => (
                      <span
                        key={exp}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {exp.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Hard No's */}
            {creator.hardNos && creator.hardNos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Won't Promote</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {creator.hardNos.map(no => (
                      <span
                        key={no}
                        className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                      >
                        {no}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Trust Score */}
            <Card>
              <CardHeader>
                <CardTitle>Trust Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Score</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                          style={{ width: `${creator.trustScore || 0}%` }}
                        />
                      </div>
                      <span className="font-medium">{creator.trustScore || 0}/100</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {creator.trustScore >= 70 ? '✅ High trust - Can accept all gigs' :
                     creator.trustScore >= 50 ? '⚠️ Medium trust - Limited to standard gigs' :
                     '❌ Low trust - Building reputation'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Languages */}
            <Card>
              <CardHeader>
                <CardTitle>Languages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {creator.languages.map(language => (
                    <span
                      key={language}
                      className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm"
                    >
                      {language}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Rates */}
            <Card>
              <CardHeader>
                <CardTitle>Rates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {creator.rates.perGigSuggested ? (
                    <div className="flex justify-between">
                      <span>Suggested per Gig</span>
                      <span className="font-medium">${creator.rates.perGigSuggested}</span>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-4">
                      Rate determined per gig by admin
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2">
                    <span>Typical Turnaround</span>
                    <span className="font-medium">{creator.turnaroundDays} days</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Experience */}
            <Card>
              <CardHeader>
                <CardTitle>Experience</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={creator.experience?.includes('paid_ads') ? 'text-green-600' : 'text-muted-foreground'}>
                        {creator.experience?.includes('paid_ads') ? '✓' : '✗'}
                      </span>
                      <span>Paid ads experience</span>
                    </div>
                  </div>
              </CardContent>
            </Card>

            {/* Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Rating</span>
                    <span className="font-medium">
                      ⭐ {creator.metrics.ratingAvg.toFixed(1)} ({creator.metrics.ratingCount} reviews)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gigs Completed</span>
                    <span className="font-medium">{creator.metrics.gigsCompleted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>On-Time Rate</span>
                    <span className="font-medium">{creator.metrics.onTimeRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Response Time</span>
                    <span className="font-medium">{creator.metrics.responseTimeHoursAvg}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Acceptance Rate</span>
                    <span className="font-medium">{creator.metrics.acceptanceRate}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}