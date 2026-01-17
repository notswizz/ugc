import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function BrandJobs() {
  const { user, appUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    if (user && appUser) {
      fetchBrandJobs();
    }
  }, [user, appUser]);

  const fetchBrandJobs = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch all jobs posted by this brand
      const jobsQuery = query(
        collection(db, 'jobs'),
        where('brandId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const jobsSnapshot = await getDocs(jobsQuery);
      const jobsWithStats = await Promise.all(
        jobsSnapshot.docs.map(async (doc) => {
          const data = doc.data();
          const jobId = doc.id;
          
          // Fetch submissions for this job
          const submissionsQuery = query(
            collection(db, 'submissions'),
            where('jobId', '==', jobId)
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
            id: jobId,
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

      setJobs(jobsWithStats);
    } catch (error) {
      console.error('Error fetching brand jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || !appUser) {
    return <LoadingSpinner fullScreen text="Loading campaigns..." />;
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Campaigns</h1>
        </div>

        {loading ? (
          <LoadingSpinner text="Loading campaigns..." />
        ) : jobs.length > 0 ? (
          <div className="space-y-4">
            {jobs.map((job) => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Link href={`/brand/jobs/${job.id}`} className="font-semibold text-lg hover:text-orange-600 transition-colors">
                          {job.title}
                        </Link>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          job.status === 'open' ? 'bg-green-100 text-green-800' :
                          job.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {job.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        ${job.basePayout || 0} • Posted {job.createdAt?.toLocaleDateString() || 'Recently'}
                      </p>
                      {/* Submission Stats */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>📊 {job.totalSubmissions || 0} submissions</span>
                        <span className="text-green-600">✓ {job.approvedSubmissions || 0} approved</span>
                        {job.pendingSubmissions > 0 && (
                          <span className="text-orange-600">⏳ {job.pendingSubmissions} pending</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex gap-2">
                      <Link href={`/brand/jobs/new?reuse=${job.id}`}>
                        <Button variant="outline" size="sm">Reuse</Button>
                      </Link>
                      <Link href={`/brand/jobs/${job.id}`}>
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
              <p className="text-muted-foreground mb-4">No campaigns posted yet.</p>
              <Link href="/brand/jobs/new">
                <Button className="bg-orange-600 hover:bg-orange-700">Create Your First Campaign</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
