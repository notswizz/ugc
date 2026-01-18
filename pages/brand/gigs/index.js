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
      <div className="max-w-6xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Gigs</h1>
        </div>

        {loading ? (
          <LoadingSpinner text="Loading gigs..." />
        ) : gigs.length > 0 ? (
          <div className="space-y-4">
            {gigs.map((gig) => (
              <Card key={gig.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Link href={`/brand/gigs/${gig.id}`} className="font-semibold text-lg hover:text-orange-600 transition-colors">
                          {gig.title}
                        </Link>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          gig.status === 'open' ? 'bg-green-100 text-green-800' :
                          gig.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {gig.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        ${gig.basePayout || 0} • Posted {gig.createdAt?.toLocaleDateString() || 'Recently'}
                      </p>
                      {/* Submission Stats */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>📊 {gig.totalSubmissions || 0} submissions</span>
                        <span className="text-green-600">✓ {gig.approvedSubmissions || 0} approved</span>
                        {gig.pendingSubmissions > 0 && (
                          <span className="text-orange-600">⏳ {gig.pendingSubmissions} pending</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex gap-2">
                      <Link href={`/brand/gigs/new?reuse=${gig.id}`}>
                        <Button variant="outline" size="sm">Reuse</Button>
                      </Link>
                      <Link href={`/brand/gigs/${gig.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No gigs posted yet.</p>
              <Link href="/brand/gigs/new">
                <Button className="bg-orange-600 hover:bg-orange-700">Create Your First Gig</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
