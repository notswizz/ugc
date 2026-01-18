import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { collection, query, getDocs, orderBy, doc, getDoc, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { Gig, Submission, Payment } from '@/lib/models/types';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

const ADMIN_EMAIL = '7jackdsmith@gmail.com';

// Community Creation Form Component
function CreateCommunityForm() {
  const { user } = useAuth();
  const [communityName, setCommunityName] = useState('');
  const [communityCode, setCommunityCode] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!communityName.trim() || !communityCode.trim()) {
      toast.error('Please enter both name and code');
      return;
    }

    const code = communityCode.trim().toUpperCase();
    
    // Validate code format (alphanumeric, 3-20 chars)
    if (!/^[A-Z0-9]{3,20}$/.test(code)) {
      toast.error('Code must be 3-20 characters (letters and numbers only)');
      return;
    }

    setCreating(true);
    try {
      // Check if code already exists
      const codeQuery = query(
        collection(db, 'communityCodes'),
        where('code', '==', code)
      );
      const codeSnapshot = await getDocs(codeQuery);
      
      if (!codeSnapshot.empty) {
        toast.error('This code already exists');
        setCreating(false);
        return;
      }

      // Create community document
      const communityRef = await addDoc(collection(db, 'communities'), {
        name: communityName.trim(),
        type: 'general',
        description: `${communityName.trim()} community`,
        createdAt: serverTimestamp(),
        createdBy: user?.uid,
        settings: {
          prizesEnabled: true,
          leaderboardEnabled: true,
        },
        stats: {
          memberCount: 0,
          totalEarnings: 0,
          totalGigsCompleted: 0,
        },
      });

      // Create community code document
      await addDoc(collection(db, 'communityCodes'), {
        code: code,
        communityId: communityRef.id,
        communityName: communityName.trim(),
        createdAt: serverTimestamp(),
        createdBy: user?.uid,
        isActive: true,
        usageCount: 0,
      });

      toast.success(`Community "${communityName}" created with code: ${code}`);
      setCommunityName('');
      setCommunityCode('');
    } catch (error) {
      console.error('Error creating community:', error);
      toast.error('Failed to create community');
    } finally {
      setCreating(false);
    }
  };

  return (
    <form onSubmit={handleCreateCommunity} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2 text-purple-900">Community Name</label>
          <Input
            type="text"
            value={communityName}
            onChange={(e) => setCommunityName(e.target.value)}
            placeholder="Harvard University"
            className="h-11"
            disabled={creating}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2 text-purple-900">Community Code</label>
          <Input
            type="text"
            value={communityCode}
            onChange={(e) => setCommunityCode(e.target.value.toUpperCase())}
            placeholder="HARVARD2024"
            className="h-11 uppercase"
            disabled={creating}
          />
          <p className="text-xs text-purple-700 mt-1">3-20 characters (letters & numbers)</p>
        </div>
      </div>
      <Button
        type="submit"
        disabled={creating || !communityName.trim() || !communityCode.trim()}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
      >
        {creating ? 'Creating...' : '✨ Create Community'}
      </Button>
    </form>
  );
}

export default function AdminDashboard() {
  const { user, appUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bankBalance, setBankBalance] = useState<number | null>(null);
  const [stats, setStats] = useState({
    totalGigs: 0,
    totalSubmissions: 0,
    totalPayments: 0,
    totalPlatformFees: 0,
  });
  const [gigs, setGigs] = useState<any[]>([]);
  const [sortedGigs, setSortedGigs] = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [brandsList, setBrandsList] = useState<Array<{ id: string; name: string }>>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [selectedGig, setSelectedGig] = useState<any | null>(null);
  const [jobDetails, setGigDetails] = useState<{
    gig: any;
    brand: any;
    jobSubmissions: any[];
    jobPayments: any[];
  } | null>(null);
  const [loadingGigDetails, setLoadingGigDetails] = useState(false);
  const [evaluatingSubmissions, setEvaluatingSubmissions] = useState<Set<string>>(new Set());
  const [expandedSubmissions, setExpandedSubmissions] = useState<Set<string>>(new Set());

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

  // Sort gigs when sort option changes
  useEffect(() => {
    if (gigs.length > 0) {
      // Extract unique brands
      const uniqueBrands = new Map<string, string>();
      gigs.forEach(gig => {
        if (gig.brandId && gig.brandName) {
          uniqueBrands.set(gig.brandId, gig.brandName);
        }
      });
      
      const brands = Array.from(uniqueBrands.entries())
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name));
      
      setBrandsList(brands);
      
      // Filter and sort gigs
      let filtered = gigs;
      if (selectedBrand !== 'all') {
        filtered = gigs.filter(gig => gig.brandId === selectedBrand);
      }
      
      // Sort by date (newest first)
      const sorted = [...filtered].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setSortedGigs(sorted);
    }
  }, [selectedBrand, gigs]);

  // Fetch detailed gig information when a gig is selected
  useEffect(() => {
    if (selectedGig) {
      fetchGigDetails(selectedGig);
    }
  }, [selectedGig]);

  const fetchGigDetails = async (gig: any) => {
    if (!gig) return;
    
    try {
      setLoadingGigDetails(true);
      
      // Fetch brand information
      const brandDoc = await getDoc(doc(db, 'brands', gig.brandId));
      const brand = brandDoc.exists() ? brandDoc.data() : null;
      
      // Fetch user information for brand
      const brandUserDoc = await getDoc(doc(db, 'users', gig.brandId));
      const brandUser = brandUserDoc.exists() ? brandUserDoc.data() : null;
      
      // Fetch all submissions for this job
      const submissionsQuery = query(
        collection(db, 'submissions'),
        where('gigId', '==', gig.id),
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
        where('gigId', '==', gig.id),
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
      
      setGigDetails({
        gig,
        brand: { ...brand, ...brandUser },
        jobSubmissions: submissionsWithCreators,
        jobPayments,
      });
    } catch (error) {
      console.error('Error fetching gig details:', error);
    } finally {
      setLoadingGigDetails(false);
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

      // Fetch all gigs
      const gigsQuery = query(collection(db, 'gigs'), orderBy('createdAt', 'desc'));
      const gigsSnapshot = await getDocs(gigsQuery);
      
      // Calculate actual gig status based on approved submissions
      const gigsData = await Promise.all(
        gigsSnapshot.docs.map(async (gigDoc) => {
          const gigData = gigDoc.data();
          const gigId = gigDoc.id;
          
          // Fetch brand info for sorting
          let brandName = '';
          try {
            const brandDoc = await getDoc(doc(db, 'brands', gigData.brandId));
            if (brandDoc.exists()) {
              brandName = brandDoc.data().companyName || '';
            }
          } catch (err) {
            console.error('Error fetching brand name:', err);
          }
          
          // Count approved submissions for this job
          const approvedSubmissionsQuery = query(
            collection(db, 'submissions'),
            where('gigId', '==', gigId),
            where('status', '==', 'approved')
          );
          const approvedSubmissionsSnapshot = await getDocs(approvedSubmissionsQuery);
          const approvedCount = approvedSubmissionsSnapshot.size;
          const acceptedSubmissionsLimit = gigData.acceptedSubmissionsLimit || 1;
          
          // Determine actual status: open or closed
          // A gig is closed if:
          // 1. It has reached the submission limit
          // 2. It's explicitly marked as cancelled/expired/paid
          // Otherwise it's open
          let actualStatus = 'open';
          if (gigData.status === 'cancelled' || gigData.status === 'expired' || gigData.status === 'paid') {
            actualStatus = gigData.status;
          } else if (approvedCount >= acceptedSubmissionsLimit) {
            actualStatus = 'closed';
          } else {
            actualStatus = 'open';
          }
          
          return {
            id: gigDoc.id,
            ...gigData,
            brandName,
            status: actualStatus, // Override with calculated status
            approvedSubmissionsCount: approvedCount,
            acceptedSubmissionsLimit,
            createdAt: gigData.createdAt?.toDate ? gigData.createdAt.toDate() : new Date(gigData.createdAt),
            deadlineAt: gigData.deadlineAt?.toDate ? gigData.deadlineAt.toDate() : new Date(gigData.deadlineAt),
            updatedAt: gigData.updatedAt?.toDate ? gigData.updatedAt.toDate() : new Date(gigData.updatedAt),
          };
        })
      );
      setGigs(gigsData);
      setSortedGigs(gigsData);

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
      const paymentsData = paymentsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          platformFee: (data.platformFee || 0) as number,
          basePayout: (data.basePayout || 0) as number,
          creatorNet: (data.creatorNet || 0) as number,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          transferredAt: data.transferredAt?.toDate ? data.transferredAt.toDate() : null,
        };
      });
      setPayments(paymentsData);

      // Calculate stats
      const totalPlatformFees = paymentsData.reduce((sum, p: any) => sum + (p.platformFee || 0), 0);
      setStats({
        totalGigs: gigsData.length,
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

  const handleEvaluateSubmission = async (submissionId: string, gigId: string) => {
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
          gigId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Evaluation failed with status ${response.status}`);
      }

      const result = await response.json();
      console.log('AI evaluation successful:', result);
      
      toast.success('AI evaluation completed! Submission has been scored.');
      
      // Refresh the data
      fetchAllData();
    } catch (error: any) {
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
        
        {/* Bank Balance - Small Text */}
        <div className="mb-4 text-sm text-green-700">
          <span className="font-medium">Platform Balance:</span> ${(bankBalance ?? 0).toFixed(2)}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Gigs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalGigs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalSubmissions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalPayments}</div>
            </CardContent>
          </Card>
        </div>

        {/* Community Management */}
        <Card className="mb-6 border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="text-purple-900">🏫 Community Management</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateCommunityForm />
          </CardContent>
        </Card>

        {/* Overview Content */}
        <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Gigs</CardTitle>
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="text-sm border-2 border-gray-300 rounded px-3 py-1.5 bg-white min-w-[200px] font-medium"
                  >
                    <option value="all">🏢 All Brands</option>
                    {brandsList.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>
              </CardHeader>
              <CardContent className="max-h-[600px] overflow-y-auto">
                {sortedGigs.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No gigs found for this brand</p>
                ) : (
                  <>
                    <div className="mb-3 text-sm text-gray-600">
                      Showing {sortedGigs.length} gig{sortedGigs.length !== 1 ? 's' : ''}
                      {selectedBrand !== 'all' && (
                        <span className="ml-1">
                          from <span className="font-semibold">{brandsList.find(b => b.id === selectedBrand)?.name}</span>
                        </span>
                      )}
                    </div>
                    <div className="space-y-3">
                      {sortedGigs.map((gig) => (
                    <div 
                      key={gig.id} 
                      className="border-b pb-3 last:border-0 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                      onClick={() => setSelectedGig(gig)}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0 pr-2">
                          <h3 className="font-semibold text-sm mb-1">{gig.title}</h3>
                          {gig.brandName && (
                            <p className="text-xs text-gray-600 mb-1">
                              🏢 {gig.brandName}
                            </p>
                          )}
                          {gig.description && (
                            <p className="text-xs text-gray-500 mb-2 overflow-hidden" style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              lineHeight: '1.4',
                              maxHeight: '2.8em'
                            }}>
                              {gig.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-xs whitespace-nowrap ${
                              gig.status === 'open' ? 'bg-green-100 text-green-800' :
                              gig.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                              gig.status === 'paid' ? 'bg-purple-100 text-purple-800' :
                              gig.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              gig.status === 'expired' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {gig.status?.toUpperCase()}
                            </span>
                            {gig.approvedSubmissionsCount !== undefined && (
                              <span className="text-xs text-gray-500 whitespace-nowrap">
                                {gig.approvedSubmissionsCount}/{gig.acceptedSubmissionsLimit || 1} approved
                              </span>
                            )}
                            <span className="text-xs text-gray-500 whitespace-nowrap">{gig.createdAt?.toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-sm">${gig.basePayout?.toFixed(2) || '0.00'}</p>
                          <p className="text-xs text-gray-500">Payout</p>
                        </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              </CardContent>
            </Card>
        </div>

        {/* Gig Details Modal */}
        {selectedGig && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedGig(null);
                setGigDetails(null);
              }
            }}
          >
            <div 
              className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10 shadow-sm">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Gig Details</h2>
                  {jobDetails && (
                    <p className="text-xs text-gray-500 mt-0.5">{jobDetails.gig.title}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedGig(null);
                    setGigDetails(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingGigDetails ? (
                <div className="p-6 text-center">
                  <LoadingSpinner text="Loading gig details..." />
                </div>
              ) : jobDetails ? (
                <div className="p-4 space-y-3">
                  {/* Gig Header - Compact */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Gig Info */}
                    <Card className="md:col-span-2">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">Gig Info</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            jobDetails.gig.status === 'open' ? 'bg-green-100 text-green-700 border border-green-200' :
                            jobDetails.gig.status === 'closed' ? 'bg-gray-100 text-gray-700 border border-gray-200' :
                            jobDetails.gig.status === 'paid' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                            jobDetails.gig.status === 'cancelled' ? 'bg-red-100 text-red-700 border border-red-200' :
                            jobDetails.gig.status === 'expired' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                            'bg-gray-100 text-gray-700 border border-gray-200'
                          }`}>
                            {jobDetails.gig.status?.toUpperCase()}
                          </span>
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                            ${jobDetails.gig.basePayout?.toFixed(2) || '0.00'}
                          </span>
                          {jobDetails.gig.primaryThing && (
                            <span className="px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-200">
                              {jobDetails.gig.primaryThing}
                            </span>
                          )}
                          <span className="px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-200">
                            Limit: {jobDetails.gig.acceptedSubmissionsLimit || 1}
                          </span>
                        </div>
                        {jobDetails.gig.deliverables && (
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            {jobDetails.gig.deliverables.videos > 0 && (
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700">📹 {jobDetails.gig.deliverables.videos} videos</span>
                            )}
                            {jobDetails.gig.deliverables.photos > 0 && (
                              <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700">📸 {jobDetails.gig.deliverables.photos} photos</span>
                            )}
                            {jobDetails.gig.deliverables.raw && (
                              <span className="px-2 py-0.5 rounded bg-yellow-50 text-yellow-700">🎬 Raw footage</span>
                            )}
                            {jobDetails.gig.aiComplianceRequired && (
                              <span className="px-2 py-0.5 rounded bg-green-50 text-green-700">🤖 AI Compliance</span>
                            )}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                          <div>
                            <span className="font-medium">Created:</span> {jobDetails.gig.createdAt?.toLocaleDateString()}
                          </div>
                          <div>
                            <span className="font-medium">Deadline:</span> {jobDetails.gig.deadlineAt?.toLocaleDateString()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Brand Info - Compact */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">Brand</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1.5 text-xs">
                        {jobDetails.brand?.companyName && (
                          <div>
                            <p className="font-semibold text-gray-900">{jobDetails.brand.companyName}</p>
                          </div>
                        )}
                        {jobDetails.brand?.name && (
                          <div className="text-gray-600">{jobDetails.brand.name}</div>
                        )}
                        {jobDetails.brand?.email && (
                          <div className="text-gray-500 truncate">{jobDetails.brand.email}</div>
                        )}
                        <div className="pt-1 border-t">
                          <p className="text-[10px] font-mono text-gray-400">{jobDetails.gig.brandId.substring(0, 12)}...</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Submissions - Compact Table */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Submissions ({jobDetails.jobSubmissions.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {jobDetails.jobSubmissions.length === 0 ? (
                        <div className="p-4 text-center">
                          <p className="text-xs text-gray-500">No submissions yet</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50 border-b">
                              <tr>
                                <th className="text-left p-2 font-semibold text-gray-700">Creator</th>
                                <th className="text-left p-2 font-semibold text-gray-700">Status</th>
                                <th className="text-center p-2 font-semibold text-gray-700">Score</th>
                                <th className="text-center p-2 font-semibold text-gray-700">Compliance</th>
                                <th className="text-left p-2 font-semibold text-gray-700">Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {jobDetails.jobSubmissions.map((sub) => {
                                const isExpanded = expandedSubmissions.has(sub.id);
                                return (
                                  <>
                                    <tr key={sub.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => {
                                      setExpandedSubmissions(prev => {
                                        const newSet = new Set(prev);
                                        if (newSet.has(sub.id)) {
                                          newSet.delete(sub.id);
                                        } else {
                                          newSet.add(sub.id);
                                        }
                                        return newSet;
                                      });
                                    }}>
                                      <td className="p-2">
                                        <div className="flex items-center gap-2">
                                          <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                                          <div>
                                            <p className="font-medium text-gray-900">{sub.creatorName}</p>
                                            <p className="text-[10px] text-gray-500 truncate max-w-[150px]">{sub.creatorEmail}</p>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="p-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                          sub.status === 'approved' ? 'bg-green-100 text-green-700 border border-green-200' :
                                          sub.status === 'submitted' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                          sub.status === 'needs_changes' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                                          'bg-gray-100 text-gray-700 border border-gray-200'
                                        }`}>
                                          {sub.status?.toUpperCase()}
                                        </span>
                                      </td>
                                      <td className="p-2 text-center">
                                        {sub.aiEvaluation ? (
                                          <div>
                                            <span className={`font-bold ${
                                              sub.aiEvaluation.qualityScore >= 80 ? 'text-green-600' :
                                              sub.aiEvaluation.qualityScore >= 60 ? 'text-blue-600' :
                                              sub.aiEvaluation.qualityScore >= 40 ? 'text-yellow-600' :
                                              'text-red-600'
                                            }`}>
                                              {sub.aiEvaluation.qualityScore}
                                            </span>
                                            <span className="text-gray-400 text-[10px]">/100</span>
                                          </div>
                                        ) : (
                                          <span className="text-gray-400">—</span>
                                        )}
                                      </td>
                                      <td className="p-2 text-center">
                                        {sub.aiEvaluation ? (
                                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                            sub.aiEvaluation.compliancePassed 
                                              ? 'bg-green-100 text-green-700 border border-green-200' 
                                              : 'bg-red-100 text-red-700 border border-red-200'
                                          }`}>
                                            {sub.aiEvaluation.compliancePassed ? '✓' : '✗'}
                                          </span>
                                        ) : (
                                          <span className="text-gray-400">—</span>
                                        )}
                                      </td>
                                      <td className="p-2 text-gray-500">
                                        {sub.createdAt?.toLocaleDateString()}
                                      </td>
                                    </tr>
                                    {isExpanded && sub.aiEvaluation && (
                                      <tr className="bg-gray-50">
                                        <td colSpan={5} className="p-3">
                                          <div className="space-y-3">
                                            {/* Quality Breakdown */}
                                            {sub.aiEvaluation.qualityBreakdown && (
                                              <div>
                                                <p className="text-xs font-semibold text-gray-700 mb-2">Quality Breakdown</p>
                                                <div className="grid grid-cols-5 gap-2">
                                                  {Object.entries(sub.aiEvaluation.qualityBreakdown).map(([key, value]: [string, any]) => (
                                                    <div key={key} className="bg-white p-2 rounded border">
                                                      <p className="text-[10px] text-gray-500 mb-0.5 capitalize">{key}</p>
                                                      <p className="font-bold text-xs">{value || 0}</p>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                            {/* Compliance Issues */}
                                            {sub.aiEvaluation.complianceIssues && sub.aiEvaluation.complianceIssues.length > 0 && (
                                              <div>
                                                <p className="text-xs font-semibold text-red-700 mb-1">Compliance Issues</p>
                                                <ul className="list-disc list-inside space-y-0.5">
                                                  {sub.aiEvaluation.complianceIssues.map((issue: string, idx: number) => (
                                                    <li key={idx} className="text-[10px] text-red-600">{issue}</li>
                                                  ))}
                                                </ul>
                                              </div>
                                            )}
                                            {/* Improvement Tips */}
                                            {sub.aiEvaluation.improvementTips && sub.aiEvaluation.improvementTips.length > 0 && (
                                              <div>
                                                <p className="text-xs font-semibold text-blue-700 mb-1">Improvement Tips</p>
                                                <ul className="list-disc list-inside space-y-0.5">
                                                  {sub.aiEvaluation.improvementTips.map((tip: string, idx: number) => (
                                                    <li key={idx} className="text-[10px] text-blue-600">{tip}</li>
                                                  ))}
                                                </ul>
                                              </div>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Payments - Compact Table */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Payments ({jobDetails.jobPayments.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {jobDetails.jobPayments.length === 0 ? (
                        <div className="p-4 text-center">
                          <p className="text-xs text-gray-500">No payments yet</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50 border-b">
                              <tr>
                                <th className="text-left p-2 font-semibold text-gray-700">Creator</th>
                                <th className="text-right p-2 font-semibold text-gray-700">Base</th>
                                <th className="text-right p-2 font-semibold text-gray-700">Platform Fee</th>
                                <th className="text-right p-2 font-semibold text-gray-700">Net</th>
                                <th className="text-center p-2 font-semibold text-gray-700">Status</th>
                                <th className="text-left p-2 font-semibold text-gray-700">Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {jobDetails.jobPayments.map((payment) => (
                                <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="p-2">
                                    <p className="font-mono text-[10px] text-gray-600">{payment.creatorId.substring(0, 12)}...</p>
                                  </td>
                                  <td className="p-2 text-right font-semibold">${(payment.basePayout || 0).toFixed(2)}</td>
                                  <td className="p-2 text-right">
                                    <span className="font-semibold text-green-600">${(payment.platformFee || 0).toFixed(2)}</span>
                                  </td>
                                  <td className="p-2 text-right font-semibold text-gray-900">${(payment.creatorNet || 0).toFixed(2)}</td>
                                  <td className="p-2 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                      payment.status === 'transferred' || payment.status === 'balance_transferred' 
                                        ? 'bg-green-100 text-green-700 border border-green-200' :
                                      payment.status === 'pending' 
                                        ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                        'bg-gray-100 text-gray-700 border border-gray-200'
                                    }`}>
                                      {payment.status === 'balance_transferred' ? 'SENT' : payment.status?.replace('_', ' ').toUpperCase()}
                                    </span>
                                  </td>
                                  <td className="p-2 text-gray-500">
                                    {payment.createdAt?.toLocaleDateString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-gray-500">Error loading gig details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
