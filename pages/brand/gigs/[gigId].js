import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { doc, getDoc, collection, query, where, getDocs, orderBy, deleteDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import VisibilityBadge from '@/components/gigs/VisibilityBadge';
import { THINGS } from '@/lib/things/constants';
import toast from 'react-hot-toast';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function BrandGigDetail() {
  const router = useRouter();
  const { gigId } = router.query;
  const { user, appUser } = useAuth();
  const [gig, setGig] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    approvedSubmissions: 0,
    pendingSubmissions: 0,
    rejectedSubmissions: 0,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [evaluatingSubmissions, setEvaluatingSubmissions] = useState(new Set());

  useEffect(() => {
    if (gigId && typeof gigId === 'string') {
      fetchGigAndSubmissions();
    }
  }, [gigId, user]);

  const fetchGigAndSubmissions = async () => {
    if (!gigId || typeof gigId !== 'string' || !user) return;
    
    try {
      setLoading(true);
      
      // Fetch job
      const gigDoc = await getDoc(doc(db, 'gigs', gigId));
      
      if (!gigDoc.exists()) {
        toast.error('Gig not found');
        router.push('/brand/dashboard');
        return;
      }

      const gigData = gigDoc.data();
      
      // Check if user owns this job
      if (gigData.brandId !== user.uid) {
        toast.error('You do not have permission to view this job');
        router.push('/brand/dashboard');
        return;
      }

      // Fetch submissions
      const submissionsQuery = query(
        collection(db, 'submissions'),
        where('gigId', '==', gigId),
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
      const acceptedSubmissionsLimit = gigData.acceptedSubmissionsLimit || 1;
      const displayStatus = approvedSubmissions >= acceptedSubmissionsLimit ? 'closed' : 'open';

      setGig({
        id: gigDoc.id,
        ...gigData,
        status: displayStatus,
        deadlineAt: gigData.deadlineAt?.toDate ? gigData.deadlineAt.toDate() : new Date(gigData.deadlineAt),
        createdAt: gigData.createdAt?.toDate ? gigData.createdAt.toDate() : new Date(gigData.createdAt),
      });
    } catch (error) {
      console.error('Error fetching job:', error);
      toast.error('Failed to load job');
      router.push('/brand/dashboard');
    } finally {
      setLoading(false);
    }
  };


  const handleEvaluateSubmission = async (submissionId) => {
    if (!submissionId || !gigId) return;
    
    setEvaluatingSubmissions(prev => new Set(prev).add(submissionId));
    
    try {
      const response = await fetch('/api/evaluate-submission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionId,
          gigId: gigId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Evaluation failed with status ${response.status}`);
      }

      const result = await response.json();
      console.log('AI evaluation successful:', result);
      
      toast.success('AI evaluation completed! Submission has been scored.');
      
      // Refresh the gig and submissions data
      fetchGigAndSubmissions();
    } catch (error) {
      console.error('Error evaluating submission:', error);
      toast.error(`Failed to evaluate submission: ${error.message}`);
    } finally {
      setEvaluatingSubmissions(prev => {
        const newSet = new Set(prev);
        newSet.delete(submissionId);
        return newSet;
      });
    }
  };

  const handleDeleteGig = async () => {
    if (!gigId || typeof gigId !== 'string' || !user) return;
    
    // Confirm deletion
    const confirmed = window.confirm(
      'Are you sure you want to delete this job? This action cannot be undone. All submissions associated with this gig will remain, but the gig will no longer be visible.'
    );
    
    if (!confirmed) return;
    
    setIsDeleting(true);
    
    try {
      // Delete the gig document
      await deleteDoc(doc(db, 'gigs', gigId));
      
      toast.success('Gig deleted successfully');
      router.push('/brand/dashboard');
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error('Failed to delete gig. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner text="Loading gig details..." />
      </Layout>
    );
  }

  if (!gig) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Gig Not Found</h1>
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
              <h1 className="text-2xl font-bold mb-2">{gig.title}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                {gig.visibility && <VisibilityBadge visibility={gig.visibility} />}
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                  gig.status === 'open' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {gig.status === 'open' ? 'open' : 'closed'}
                </span>
              </div>
            </div>
            <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
              <div className="text-2xl font-bold text-orange-600">${gig.basePayout || 0}</div>
              <Link href={`/brand/gigs/new?reuse=${gigId}`}>
                <Button size="sm" variant="outline">Reuse Gig</Button>
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

        {/* Gig Info - Compact */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Gig Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Gig Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-xs text-gray-600 mb-1">Description</div>
                <p className="text-sm text-gray-700">{gig.description || 'No description provided'}</p>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Primary Category</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{THINGS.find(t => t.id === gig.primaryThing)?.icon || '📦'}</span>
                  <span className="text-sm font-medium">{THINGS.find(t => t.id === gig.primaryThing)?.name || gig.primaryThing}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gig Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Gig Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Accepted Submissions Limit:</span>
                <span className="font-medium">{gig.acceptedSubmissionsLimit || 1}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Deadline:</span>
                <span className="font-medium">{gig.deadlineAt?.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Created:</span>
                <span className="font-medium">{gig.createdAt?.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) || 'N/A'}</span>
              </div>
              <div className="pt-3 border-t mt-3">
                <Button
                  onClick={handleDeleteGig}
                  disabled={isDeleting}
                  variant="outline"
                  className="w-full text-red-600 border-red-300 hover:bg-red-50 text-sm h-9"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Gig'}
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
                      <div className="mt-2 flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          AI evaluation pending...
                        </div>
                        {(submission.status === 'submitted' || !submission.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEvaluateSubmission(submission.id)}
                            disabled={evaluatingSubmissions.has(submission.id)}
                            className="text-xs h-6 px-2"
                          >
                            {evaluatingSubmissions.has(submission.id) ? 'Evaluating...' : '🤖 Run AI'}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No submissions yet. Creators who accept this gig will appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
