import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { collection, query, getDocs, orderBy, doc, getDoc, where } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { Job, Submission, Payment } from '@/lib/models/types';
import { X } from 'lucide-react';

const ADMIN_EMAIL = '7jackdsmith@gmail.com';

export default function AdminDashboard() {
  const { user, appUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bankBalance, setBankBalance] = useState<number | null>(null);
  const [stats, setStats] = useState({
    totalJobs: 0,
    totalSubmissions: 0,
    totalPayments: 0,
    totalPlatformFees: 0,
  });
  const [jobs, setJobs] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'submissions' | 'payments'>('overview');
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [jobDetails, setJobDetails] = useState<{
    job: any;
    brand: any;
    jobSubmissions: any[];
    jobPayments: any[];
  } | null>(null);
  const [loadingJobDetails, setLoadingJobDetails] = useState(false);

  // Check admin access
  useEffect(() => {
    if (!authLoading && (!user || !appUser || appUser.email !== ADMIN_EMAIL)) {
      router.push('/');
    }
  }, [user, appUser, authLoading, router]);

  useEffect(() => {
    if (user && appUser && appUser.email === ADMIN_EMAIL) {
      fetchAllData();
    }
  }, [user, appUser]);

  // Fetch detailed job information when a job is selected
  useEffect(() => {
    if (selectedJob) {
      fetchJobDetails(selectedJob);
    }
  }, [selectedJob]);

  const fetchJobDetails = async (job: any) => {
    if (!job) return;
    
    try {
      setLoadingJobDetails(true);
      
      // Fetch brand information
      const brandDoc = await getDoc(doc(db, 'brands', job.brandId));
      const brand = brandDoc.exists() ? brandDoc.data() : null;
      
      // Fetch user information for brand
      const brandUserDoc = await getDoc(doc(db, 'users', job.brandId));
      const brandUser = brandUserDoc.exists() ? brandUserDoc.data() : null;
      
      // Fetch all submissions for this job
      const submissionsQuery = query(
        collection(db, 'submissions'),
        where('jobId', '==', job.id),
        orderBy('createdAt', 'desc')
      );
      const submissionsSnapshot = await getDocs(submissionsQuery);
      const jobSubmissions = submissionsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          creatorId: data.creatorId as string,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
        };
      });
      
      // Fetch creator information for each submission
      const submissionsWithCreators = await Promise.all(
        jobSubmissions.map(async (sub: any) => {
          try {
            const creatorDoc = await getDoc(doc(db, 'users', sub.creatorId));
            const creator = creatorDoc.exists() ? creatorDoc.data() : null;
            return {
              ...sub,
              creatorName: creator?.name || 'Unknown',
              creatorEmail: creator?.email || 'Unknown',
            };
          } catch (err) {
            return {
              ...sub,
              creatorName: 'Unknown',
              creatorEmail: 'Unknown',
            };
          }
        })
      );
      
      // Fetch all payments for this job
      const paymentsQuery = query(
        collection(db, 'payments'),
        where('jobId', '==', job.id),
        orderBy('createdAt', 'desc')
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const jobPayments = paymentsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          transferredAt: data.transferredAt?.toDate ? data.transferredAt.toDate() : null,
        };
      });
      
      setJobDetails({
        job,
        brand: { ...brand, ...brandUser },
        jobSubmissions: submissionsWithCreators,
        jobPayments,
      });
    } catch (error) {
      console.error('Error fetching job details:', error);
    } finally {
      setLoadingJobDetails(false);
    }
  };

  const fetchAllData = async () => {
    if (!user || appUser?.email !== ADMIN_EMAIL) return;

    try {
      setLoading(true);

      // Fetch bank balance
      const bankDoc = await getDoc(doc(db, 'brands', 'BANK'));
      if (bankDoc.exists()) {
        setBankBalance(bankDoc.data().balance || 0);
      } else {
        setBankBalance(0);
      }

      // Fetch all jobs
      const jobsQuery = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
      const jobsSnapshot = await getDocs(jobsQuery);
      const jobsData = jobsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt),
        deadlineAt: doc.data().deadlineAt?.toDate ? doc.data().deadlineAt.toDate() : new Date(doc.data().deadlineAt),
        updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : new Date(doc.data().updatedAt),
      }));
      setJobs(jobsData);

      // Fetch all submissions
      const submissionsQuery = query(collection(db, 'submissions'), orderBy('createdAt', 'desc'));
      const submissionsSnapshot = await getDocs(submissionsQuery);
      const submissionsData = submissionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt),
        updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : new Date(doc.data().updatedAt),
      }));
      setSubmissions(submissionsData);

      // Fetch all payments
      const paymentsQuery = query(collection(db, 'payments'), orderBy('createdAt', 'desc'));
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const paymentsData = paymentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt),
        transferredAt: doc.data().transferredAt?.toDate ? doc.data().transferredAt?.toDate() : null,
      }));
      setPayments(paymentsData);

      // Calculate stats
      const totalPlatformFees = paymentsData.reduce((sum, p) => sum + (p.platformFee || 0), 0);
      setStats({
        totalJobs: jobsData.length,
        totalSubmissions: submissionsData.length,
        totalPayments: paymentsData.length,
        totalPlatformFees,
      });
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <LoadingSpinner fullScreen text="Loading admin dashboard..." />
      </Layout>
    );
  }

  if (!user || !appUser || appUser.email !== ADMIN_EMAIL) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">You do not have permission to access this page.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Complete platform overview and analytics</p>
        </div>

        {/* Bank Balance Card */}
        <Card className="mb-6 border-green-200 bg-green-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-green-800">Platform Bank Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-5xl font-bold text-green-700 mb-2">
                ${(bankBalance ?? 0).toFixed(2)}
              </div>
              <p className="text-sm text-green-600">Total platform fees collected</p>
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalJobs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalSubmissions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalPayments}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Platform Fees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${stats.totalPlatformFees.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="mb-4 border-b border-gray-200">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-2 px-4 font-medium ${
                activeTab === 'overview'
                  ? 'border-b-2 border-orange-600 text-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              className={`pb-2 px-4 font-medium ${
                activeTab === 'jobs'
                  ? 'border-b-2 border-orange-600 text-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Jobs ({jobs.length})
            </button>
            <button
              onClick={() => setActiveTab('submissions')}
              className={`pb-2 px-4 font-medium ${
                activeTab === 'submissions'
                  ? 'border-b-2 border-orange-600 text-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Submissions ({submissions.length})
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`pb-2 px-4 font-medium ${
                activeTab === 'payments'
                  ? 'border-b-2 border-orange-600 text-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Payments ({payments.length})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {jobs.slice(0, 10).map((job) => (
                    <div 
                      key={job.id} 
                      className="border-b pb-3 last:border-0 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                      onClick={() => setSelectedJob(job)}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0 pr-2">
                          <h3 className="font-semibold text-sm mb-1">{job.title}</h3>
                          {job.description && (
                            <p className="text-xs text-gray-500 mb-2 overflow-hidden" style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              lineHeight: '1.4',
                              maxHeight: '2.8em'
                            }}>
                              {job.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-xs whitespace-nowrap ${
                              job.status === 'open' ? 'bg-green-100 text-green-800' :
                              job.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                              job.status === 'paid' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {job.status}
                            </span>
                            <span className="text-xs text-gray-500 whitespace-nowrap">{job.createdAt?.toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-sm">${job.basePayout?.toFixed(2) || '0.00'}</p>
                          <p className="text-xs text-gray-500">Payout</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'jobs' && (
          <Card>
            <CardHeader>
              <CardTitle>All Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Title</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Base Payout</th>
                      <th className="text-left p-2">Created</th>
                      <th className="text-left p-2">Deadline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr 
                        key={job.id} 
                        className="border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedJob(job)}
                      >
                        <td className="p-2 font-medium">{job.title}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            job.status === 'open' ? 'bg-green-100 text-green-800' :
                            job.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                            job.status === 'paid' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="p-2">${job.basePayout?.toFixed(2) || '0.00'}</td>
                        <td className="p-2 text-gray-600">
                          {job.createdAt?.toLocaleDateString()}
                        </td>
                        <td className="p-2 text-gray-600">
                          {job.deadlineAt?.toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'submissions' && (
          <Card>
            <CardHeader>
              <CardTitle>All Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Job ID</th>
                      <th className="text-left p-2">Creator ID</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">AI Score</th>
                      <th className="text-left p-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub) => (
                      <tr key={sub.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-mono text-xs">{sub.jobId}</td>
                        <td className="p-2 font-mono text-xs">{sub.creatorId}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            sub.status === 'approved' ? 'bg-green-100 text-green-800' :
                            sub.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                            sub.status === 'needs_changes' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="p-2">
                          {sub.aiEvaluation ? (
                            <span className="font-medium">
                              {sub.aiEvaluation.qualityScore}/100
                            </span>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="p-2 text-gray-600">
                          {sub.createdAt?.toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'payments' && (
          <Card>
            <CardHeader>
              <CardTitle>All Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Job ID</th>
                      <th className="text-left p-2">Brand ID</th>
                      <th className="text-left p-2">Creator ID</th>
                      <th className="text-left p-2">Base Payout</th>
                      <th className="text-left p-2">Platform Fee</th>
                      <th className="text-left p-2">Creator Net</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-mono text-xs">{payment.jobId}</td>
                        <td className="p-2 font-mono text-xs">{payment.brandId}</td>
                        <td className="p-2 font-mono text-xs">{payment.creatorId}</td>
                        <td className="p-2">${(payment.basePayout || 0).toFixed(2)}</td>
                        <td className="p-2 font-medium text-green-600">
                          ${(payment.platformFee || 0).toFixed(2)}
                        </td>
                        <td className="p-2">${(payment.creatorNet || 0).toFixed(2)}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            payment.status === 'transferred' || payment.status === 'balance_transferred' 
                              ? 'bg-green-100 text-green-800' :
                            payment.status === 'pending' 
                              ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="p-2 text-gray-600">
                          {payment.createdAt?.toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Job Details Modal */}
        {selectedJob && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedJob(null);
                setJobDetails(null);
              }
            }}
          >
            <div 
              className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b p-3 flex items-center justify-between z-10">
                <h2 className="text-xl font-bold">Campaign Details</h2>
                <button
                  onClick={() => {
                    setSelectedJob(null);
                    setJobDetails(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingJobDetails ? (
                <div className="p-6 text-center">
                  <LoadingSpinner text="Loading campaign details..." />
                </div>
              ) : jobDetails ? (
                <div className="p-4 space-y-4">
                  {/* Campaign Basic Info */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Campaign Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-0.5">Title</p>
                        <p className="text-sm font-semibold">{jobDetails.job.title}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-0.5">Status</p>
                          <span className={`inline-block px-2 py-0.5 rounded text-xs ${
                            jobDetails.job.status === 'open' ? 'bg-green-100 text-green-800' :
                            jobDetails.job.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                            jobDetails.job.status === 'paid' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {jobDetails.job.status}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-0.5">Base Payout</p>
                          <p className="text-sm font-semibold">${jobDetails.job.basePayout?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-0.5">Created</p>
                          <p className="text-xs">{jobDetails.job.createdAt?.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-0.5">Deadline</p>
                          <p className="text-xs">{jobDetails.job.deadlineAt?.toLocaleString()}</p>
                        </div>
                      </div>
                      {jobDetails.job.description && (
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-0.5">Description</p>
                          <p className="text-xs whitespace-pre-wrap">{jobDetails.job.description}</p>
                        </div>
                      )}
                      {jobDetails.job.productDescription && (
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-0.5">Product Description</p>
                          <p className="text-xs whitespace-pre-wrap">{jobDetails.job.productDescription}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-0.5">Primary Category</p>
                          <p className="text-xs">{jobDetails.job.primaryThing || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-0.5">Visibility</p>
                          <p className="text-xs">{jobDetails.job.visibility || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-0.5">Accepted Submissions Limit</p>
                          <p className="text-xs">{jobDetails.job.acceptedSubmissionsLimit || 1}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-0.5">AI Compliance Required</p>
                          <p className="text-xs">{jobDetails.job.aiComplianceRequired ? 'Yes' : 'No'}</p>
                        </div>
                      </div>
                      {jobDetails.job.deliverables && (
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-0.5">Deliverables</p>
                          <div className="text-xs space-y-0.5">
                            <p>Videos: {jobDetails.job.deliverables.videos || 0}</p>
                            <p>Photos: {jobDetails.job.deliverables.photos || 0}</p>
                            <p>Raw Footage: {jobDetails.job.deliverables.raw ? 'Yes' : 'No'}</p>
                            {jobDetails.job.deliverables.notes && (
                              <p>Notes: {jobDetails.job.deliverables.notes}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Brand Information */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Brand Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-sm">
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-0.5">Brand ID</p>
                        <p className="text-xs font-mono">{jobDetails.job.brandId}</p>
                      </div>
                      {jobDetails.brand && (
                        <>
                          {jobDetails.brand.companyName && (
                            <div>
                              <p className="text-xs font-medium text-gray-600 mb-0.5">Company Name</p>
                              <p className="text-xs">{jobDetails.brand.companyName}</p>
                            </div>
                          )}
                          {jobDetails.brand.name && (
                            <div>
                              <p className="text-xs font-medium text-gray-600 mb-0.5">Contact Name</p>
                              <p className="text-xs">{jobDetails.brand.name}</p>
                            </div>
                          )}
                          {jobDetails.brand.email && (
                            <div>
                              <p className="text-xs font-medium text-gray-600 mb-0.5">Email</p>
                              <p className="text-xs">{jobDetails.brand.email}</p>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Submissions */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Submissions ({jobDetails.jobSubmissions.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {jobDetails.jobSubmissions.length === 0 ? (
                        <p className="text-xs text-gray-500">No submissions yet</p>
                      ) : (
                        <div className="space-y-3">
                          {jobDetails.jobSubmissions.map((sub) => (
                            <div key={sub.id} className="border rounded-lg p-3 space-y-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-xs font-medium">Creator: {sub.creatorName}</p>
                                  <p className="text-xs text-gray-500">{sub.creatorEmail}</p>
                                  <p className="text-xs text-gray-400 mt-0.5">ID: {sub.id.substring(0, 8)}...</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  sub.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  sub.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                                  sub.status === 'needs_changes' ? 'bg-orange-100 text-orange-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {sub.status}
                                </span>
                              </div>
                              {sub.aiEvaluation && (
                                <div className="mt-2 pt-2 border-t">
                                  <p className="text-xs font-medium mb-1.5">AI Evaluation</p>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <p className="text-gray-600 text-xs">Quality Score</p>
                                      <p className="font-semibold text-sm">{sub.aiEvaluation.qualityScore}/100</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-600 text-xs">Compliance</p>
                                      <p className={sub.aiEvaluation.compliancePassed ? 'text-green-600 font-semibold text-xs' : 'text-red-600 font-semibold text-xs'}>
                                        {sub.aiEvaluation.compliancePassed ? 'Passed' : 'Failed'}
                                      </p>
                                    </div>
                                    {sub.aiEvaluation.qualityBreakdown && (
                                      <>
                                        <div>
                                          <p className="text-gray-600 text-xs">Hook</p>
                                          <p className="font-medium text-xs">{sub.aiEvaluation.qualityBreakdown.hook || 0}</p>
                                        </div>
                                        <div>
                                          <p className="text-gray-600 text-xs">Lighting</p>
                                          <p className="font-medium text-xs">{sub.aiEvaluation.qualityBreakdown.lighting || 0}</p>
                                        </div>
                                        <div>
                                          <p className="text-gray-600 text-xs">Product Clarity</p>
                                          <p className="font-medium text-xs">{sub.aiEvaluation.qualityBreakdown.productClarity || 0}</p>
                                        </div>
                                        <div>
                                          <p className="text-gray-600 text-xs">Authenticity</p>
                                          <p className="font-medium text-xs">{sub.aiEvaluation.qualityBreakdown.authenticity || 0}</p>
                                        </div>
                                        <div>
                                          <p className="text-gray-600 text-xs">Editing</p>
                                          <p className="font-medium text-xs">{sub.aiEvaluation.qualityBreakdown.editing || 0}</p>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  {sub.aiEvaluation.complianceIssues && sub.aiEvaluation.complianceIssues.length > 0 && (
                                    <div className="mt-1.5">
                                      <p className="text-xs font-medium text-red-600">Compliance Issues:</p>
                                      <ul className="text-xs text-red-600 list-disc list-inside">
                                        {sub.aiEvaluation.complianceIssues.map((issue: string, idx: number) => (
                                          <li key={idx}>{issue}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {sub.aiEvaluation.improvementTips && sub.aiEvaluation.improvementTips.length > 0 && (
                                    <div className="mt-1.5">
                                      <p className="text-xs font-medium text-blue-600">Improvement Tips:</p>
                                      <ul className="text-xs text-blue-600 list-disc list-inside">
                                        {sub.aiEvaluation.improvementTips.map((tip: string, idx: number) => (
                                          <li key={idx}>{tip}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="text-xs text-gray-400 mt-1">
                                Created: {sub.createdAt?.toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Payments */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Payments ({jobDetails.jobPayments.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {jobDetails.jobPayments.length === 0 ? (
                        <p className="text-xs text-gray-500">No payments yet</p>
                      ) : (
                        <div className="space-y-2">
                          {jobDetails.jobPayments.map((payment) => (
                            <div key={payment.id} className="border rounded-lg p-3">
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <p className="text-gray-600 mb-0.5">Creator ID</p>
                                  <p className="font-mono text-xs">{payment.creatorId.substring(0, 8)}...</p>
                                </div>
                                <div>
                                  <p className="text-gray-600 mb-0.5">Status</p>
                                  <span className={`inline-block px-2 py-0.5 rounded text-xs ${
                                    payment.status === 'transferred' || payment.status === 'balance_transferred' 
                                      ? 'bg-green-100 text-green-800' :
                                    payment.status === 'pending' 
                                      ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {payment.status}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-gray-600 mb-0.5">Base Payout</p>
                                  <p className="font-semibold text-xs">${(payment.basePayout || 0).toFixed(2)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600 mb-0.5">Platform Fee</p>
                                  <p className="font-semibold text-green-600 text-xs">${(payment.platformFee || 0).toFixed(2)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600 mb-0.5">Creator Net</p>
                                  <p className="font-semibold text-xs">${(payment.creatorNet || 0).toFixed(2)}</p>
                                </div>
                                {payment.bonusAmount && (
                                  <div>
                                    <p className="text-gray-600 mb-0.5">Bonus</p>
                                    <p className="font-semibold text-xs">${payment.bonusAmount.toFixed(2)}</p>
                                  </div>
                                )}
                                {payment.reimbursementAmount && (
                                  <div>
                                    <p className="text-gray-600 mb-0.5">Reimbursement</p>
                                    <p className="font-semibold text-xs">${payment.reimbursementAmount.toFixed(2)}</p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-gray-600 mb-0.5">Created</p>
                                  <p className="text-xs">{payment.createdAt?.toLocaleString()}</p>
                                </div>
                                {payment.transferredAt && (
                                  <div>
                                    <p className="text-gray-600 mb-0.5">Transferred</p>
                                    <p className="text-xs">{payment.transferredAt.toLocaleString()}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-gray-500">Error loading job details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
