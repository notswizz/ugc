import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { doc, getDoc, collection, query, where, getDocs, orderBy, deleteDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import VisibilityBadge from '@/components/jobs/VisibilityBadge';
import { THINGS } from '@/lib/things/constants';
import toast from 'react-hot-toast';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function BrandJobDetail() {
  const router = useRouter();
  const { jobId } = router.query;
  const { user, appUser } = useAuth();
  const [job, setJob] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    approvedSubmissions: 0,
    pendingSubmissions: 0,
    rejectedSubmissions: 0,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (jobId && typeof jobId === 'string') {
      fetchJobAndSubmissions();
    }
  }, [jobId, user]);

  const fetchJobAndSubmissions = async () => {
    if (!jobId || typeof jobId !== 'string' || !user) return;
    
    try {
      setLoading(true);
      
      // Fetch job
      const jobDoc = await getDoc(doc(db, 'jobs', jobId));
      
      if (!jobDoc.exists()) {
        toast.error('Job not found');
        router.push('/brand/dashboard');
        return;
      }

      const jobData = jobDoc.data();
      
      // Check if user owns this job
      if (jobData.brandId !== user.uid) {
        toast.error('You do not have permission to view this job');
        router.push('/brand/dashboard');
        return;
      }

      // Fetch submissions
      const submissionsQuery = query(
        collection(db, 'submissions'),
        where('jobId', '==', jobId),
        orderBy('createdAt', 'desc')
      );
      const submissionsSnapshot = await getDocs(submissionsQuery);
      const fetchedSubmissions = submissionsSnapshot.docs.map(subDoc => {
        const data = subDoc.data();
        return {
          id: subDoc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
        };
      });

      // Fetch creator names for submissions
      const submissionsWithCreators = await Promise.all(
        fetchedSubmissions.map(async (sub) => {
          try {
            const creatorDoc = await getDoc(doc(db, 'users', sub.creatorId));
            const creatorData = creatorDoc.data();
            return {
              ...sub,
              creatorName: creatorData?.name || 'Unknown Creator',
            };
          } catch (err) {
            return {
              ...sub,
              creatorName: 'Unknown Creator',
            };
          }
        })
      );

      setSubmissions(submissionsWithCreators);

      // Calculate stats
      const totalSubmissions = submissionsWithCreators.length;
      const approvedSubmissions = submissionsWithCreators.filter((s) => s.status === 'approved').length;
      const pendingSubmissions = submissionsWithCreators.filter((s) => s.status === 'submitted').length;
      const rejectedSubmissions = submissionsWithCreators.filter((s) => s.status === 'rejected').length;

      setStats({
        totalSubmissions,
        approvedSubmissions,
        pendingSubmissions,
        rejectedSubmissions,
      });

      // Determine display status: "closed" if reached limit, otherwise "open"
      const acceptedSubmissionsLimit = jobData.acceptedSubmissionsLimit || 1;
      const displayStatus = approvedSubmissions >= acceptedSubmissionsLimit ? 'closed' : 'open';

      setJob({
        id: jobDoc.id,
        ...jobData,
        status: displayStatus,
        deadlineAt: jobData.deadlineAt?.toDate ? jobData.deadlineAt.toDate() : new Date(jobData.deadlineAt),
        createdAt: jobData.createdAt?.toDate ? jobData.createdAt.toDate() : new Date(jobData.createdAt),
      });
    } catch (error) {
      console.error('Error fetching job:', error);
      toast.error('Failed to load job');
      router.push('/brand/dashboard');
    } finally {
      setLoading(false);
    }
  };


  const handleDeleteJob = async () => {
    if (!jobId || typeof jobId !== 'string' || !user) return;
    
    // Confirm deletion
    const confirmed = window.confirm(
      'Are you sure you want to delete this job? This action cannot be undone. All submissions associated with this job will remain, but the job will no longer be visible.'
    );
    
    if (!confirmed) return;
    
    setIsDeleting(true);
    
    try {
      // Delete the job document
      await deleteDoc(doc(db, 'jobs', jobId));
      
      toast.success('Job deleted successfully');
      router.push('/brand/dashboard');
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error('Failed to delete job. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner text="Loading campaign details..." />
      </Layout>
    );
  }

  if (!job) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Job Not Found</h1>
          <Link href="/brand/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto py-4">
        {/* Compact Header */}
        <div className="mb-4">
          <Link href="/brand/dashboard" className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 text-sm mb-3">
            <span>←</span>
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold mb-2">{job.title}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                {job.visibility && <VisibilityBadge visibility={job.visibility} />}
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                  job.status === 'open' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {job.status === 'open' ? 'open' : 'closed'}
                </span>
              </div>
            </div>
            <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
              <div className="text-2xl font-bold text-orange-600">${job.basePayout || 0}</div>
              <Link href={`/brand/jobs/new?reuse=${jobId}`}>
                <Button size="sm" variant="outline">Reuse Campaign</Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards - Compact */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <Card className="p-3">
            <div className="text-xs text-gray-600 mb-1">Total Submissions</div>
            <div className="text-xl font-bold">{stats.totalSubmissions}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">All submissions</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-gray-600 mb-1">Approved</div>
            <div className="text-xl font-bold text-green-600">{stats.approvedSubmissions}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">Approved & ready</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-gray-600 mb-1">Pending Review</div>
            <div className="text-xl font-bold text-orange-600">{stats.pendingSubmissions}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">Awaiting approval</div>
          </Card>
        </div>

        {/* Job Info - Compact */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Job Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-xs text-gray-600 mb-1">Description</div>
                <p className="text-sm text-gray-700">{job.description || 'No description provided'}</p>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Primary Category</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{THINGS.find(t => t.id === job.primaryThing)?.icon || '📦'}</span>
                  <span className="text-sm font-medium">{THINGS.find(t => t.id === job.primaryThing)?.name || job.primaryThing}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Job Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Job Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Accepted Submissions Limit:</span>
                <span className="font-medium">{job.acceptedSubmissionsLimit || 1}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Deadline:</span>
                <span className="font-medium">{job.deadlineAt?.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Created:</span>
                <span className="font-medium">{job.createdAt?.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) || 'N/A'}</span>
              </div>
              <div className="pt-3 border-t mt-3">
                <Button
                  onClick={handleDeleteJob}
                  disabled={isDeleting}
                  variant="outline"
                  className="w-full text-red-600 border-red-300 hover:bg-red-50 text-sm h-9"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Job'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submissions List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Submissions ({submissions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {submissions.length > 0 ? (
              <div className="space-y-3">
                {submissions.map((submission) => (
                  <div key={submission.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{submission.creatorName}</h4>
                          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                            submission.status === 'approved' ? 'bg-green-100 text-green-800' :
                            submission.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            submission.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {submission.status === 'submitted' ? 'Pending' : 
                             submission.status === 'approved' ? 'Accepted' :
                             submission.status === 'rejected' ? 'Rejected' : submission.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {submission.createdAt?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) || 'Recently'}
                        </p>
                      </div>
                    </div>
                    
                    {submission.contentLink && (
                      <div className="mb-2">
                        <a
                          href={submission.contentLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 hover:underline text-xs inline-flex items-center gap-1"
                        >
                          <span>View Content</span>
                          <span>→</span>
                        </a>
                      </div>
                    )}

                    {/* AI Evaluation Section - Compact */}
                    {submission.aiEvaluation ? (
                      <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-blue-900">AI Score</span>
                          <span className="text-sm font-bold text-blue-600">
                            {submission.aiEvaluation.qualityScore || 0}/100
                          </span>
                        </div>
                        {submission.aiEvaluation.compliancePassed !== undefined && (
                          <div className="text-[10px] text-gray-600">
                            {submission.aiEvaluation.compliancePassed ? '✅ Passed' : '❌ Failed'}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-gray-500">
                        AI evaluation pending...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No submissions yet. Creators who accept this job will appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
