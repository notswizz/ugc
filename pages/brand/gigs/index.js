import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function BrandGigs() {
  const { user, appUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [gigs, setGigs] = useState([]);

  useEffect(() => {
    if (user && appUser) {
      fetchBrandGigs();
    }
  }, [user, appUser]);

  const fetchBrandGigs = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch all gigs posted by this brand
      const gigsQuery = query(
        collection(db, 'gigs'),
        where('brandId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const gigsSnapshot = await getDocs(gigsQuery);
      const gigsWithStats = await Promise.all(
        gigsSnapshot.docs.map(async (doc) => {
          const data = doc.data();
          const gigId = doc.id;
          
          // Fetch submissions for this job
          const submissionsQuery = query(
            collection(db, 'submissions'),
            where('gigId', '==', gigId)
          );
          const submissionsSnapshot = await getDocs(submissionsQuery);
          const submissions = submissionsSnapshot.docs.map(subDoc => subDoc.data());
          
          const totalSubmissions = submissions.length;
          const approvedSubmissions = submissions.filter((s) => s.status === 'approved').length;
          const pendingSubmissions = submissions.filter((s) => s.status === 'submitted').length;
          
          // Determine display status: "closed" if reached limit, otherwise "open"
          const acceptedSubmissionsLimit = data.acceptedSubmissionsLimit || 1;
          const displayStatus = approvedSubmissions >= acceptedSubmissionsLimit ? 'closed' : 'open';
          
          return {
            id: gigId,
            ...data,
            status: displayStatus,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            deadlineAt: data.deadlineAt?.toDate ? data.deadlineAt.toDate() : new Date(data.deadlineAt),
            totalSubmissions,
            approvedSubmissions,
            pendingSubmissions,
          };
        })
      );

      setGigs(gigsWithStats);
    } catch (error) {
      console.error('Error fetching brand gigs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || !appUser) {
    return <LoadingSpinner fullScreen text="Loading gigs..." />;
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">My Gigs</h1>
          <Link href="/brand/gigs/new">
            <Button size="sm" className="shadow-brand">+ New</Button>
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner text="Loading..." />
        ) : gigs.length > 0 ? (
          <div className="space-y-3">
            {gigs.map((gig) => (
              <Card key={gig.id} className="group hover:shadow-lg transition-all duration-200 border-0 overflow-hidden">
                {/* Status bar */}
                <div className={`h-1 ${
                  gig.status === 'open' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                  'bg-gradient-to-r from-gray-400 to-gray-500'
                }`} />
                
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    {/* Left: Info */}
                    <div className="flex-1 min-w-0">
                      <Link href={`/brand/gigs/${gig.id}`} className="block group/link">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-lg text-gray-900 group-hover/link:text-brand-600 transition-colors line-clamp-1">
                            {gig.title}
                          </h3>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {gig.createdAt?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </Link>
                      
                      {/* Stats Row */}
                      <div className="flex items-center gap-3 text-sm">
                        {/* Payout */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 rounded-lg border border-green-200">
                          <span className="text-green-700 font-bold">${gig.basePayout || 0}</span>
                        </div>
                        
                        {/* Submissions */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-lg border border-blue-200">
                          <span className="text-blue-600">📊</span>
                          <span className="font-semibold text-blue-700">{gig.totalSubmissions || 0}</span>
                        </div>
                        
                        {/* Approved */}
                        {gig.approvedSubmissions > 0 && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 rounded-lg border border-green-200">
                            <span className="text-green-600">✓</span>
                            <span className="font-semibold text-green-700">{gig.approvedSubmissions}</span>
                          </div>
                        )}
                        
                        {/* Pending */}
                        {gig.pendingSubmissions > 0 && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 rounded-lg border border-orange-200">
                            <span className="text-orange-600">⏳</span>
                            <span className="font-semibold text-orange-700">{gig.pendingSubmissions}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <Link href={`/brand/gigs/new?reuse=${gig.id}`}>
                        <Button variant="outline" size="sm" className="border-brand-300 text-brand-700 hover:bg-brand-50 font-semibold">
                          ♻️
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="py-16 text-center">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-gray-600 mb-6 font-medium">No gigs yet</p>
              <Link href="/brand/gigs/new">
                <Button size="lg">Create First Gig</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
