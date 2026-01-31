import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { formatCurrencyFromDollars } from '@/lib/utils/formatters';
import { logger } from '@/lib/utils/logger';
import { isValidAmount } from '@/lib/utils/validation';
import { DollarSign, Users, Clock, TrendingUp, Briefcase, CheckCircle2 } from 'lucide-react';

export default function BrandDashboard() {
  const { user, appUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [showAddBalance, setShowAddBalance] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [addingBalance, setAddingBalance] = useState(false);
  const [recentGigs, setRecentGigs] = useState([]);
  const [companyName, setCompanyName] = useState<string>('');
  const [analytics, setAnalytics] = useState({
    totalSpent: 0,
    totalCreators: 0,
    avgApprovalTime: 0,
    totalGigs: 0,
    activeGigs: 0,
    completionRate: 0,
  });

  // Fetch brand balance and company name
  const fetchBalance = async () => {
    if (!user || !appUser || appUser.role !== 'brand') return;
    
    try {
      setLoadingBalance(true);
      const brandDoc = await getDoc(doc(db, 'brands', user.uid));
      if (brandDoc.exists()) {
        const data = brandDoc.data();
        setBalance(data.balance || 0);
        setCompanyName(data.companyName || '');
      } else {
        setBalance(0);
        setCompanyName('');
      }
    } catch (error) {
      logger.error('Error fetching balance', error);
      setBalance(0);
      setCompanyName('');
    } finally {
      setLoadingBalance(false);
    }
  };

  useEffect(() => {
    if (user && appUser) {
      fetchBalance();
    }
  }, [user, appUser]);

  const handleAddBalance = async () => {
    if (!user || !addAmount) return;

    if (!isValidAmount(addAmount)) {
      alert('Please enter a valid amount greater than 0');
      return;
    }

    const amount = parseFloat(addAmount);

    try {
      setAddingBalance(true);
      const response = await fetch('/api/add-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          userType: 'brand',
          amount: amount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add balance');
      }

      // Update balance display
      setBalance(data.newBalance);
      setAddAmount('');
      setShowAddBalance(false);
      alert(`Successfully added ${formatCurrencyFromDollars(amount)} to your balance!`);
    } catch (error: any) {
      logger.error('Error adding balance', error);
      alert(error.message || 'Failed to add balance. Please try again.');
    } finally {
      setAddingBalance(false);
    }
  };

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
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const gigsSnapshot = await getDocs(gigsQuery);

      // If no gigs, return early
      if (gigsSnapshot.empty) {
        setRecentGigs([]);
        setLoading(false);
        return;
      }

      // Extract gig IDs for batched query
      const gigIds = gigsSnapshot.docs.map(doc => doc.id);

      // ✅ FIX: Fetch ALL submissions in a single batched query (solves N+1 problem)
      // Firestore 'in' operator supports up to 30 items, so we batch in chunks if needed
      const submissionsByGigId = new Map();

      // Process in chunks of 30 (Firestore 'in' limit)
      for (let i = 0; i < gigIds.length; i += 30) {
        const chunk = gigIds.slice(i, i + 30);
        const submissionsQuery = query(
          collection(db, 'submissions'),
          where('gigId', 'in', chunk)
        );
        const submissionsSnapshot = await getDocs(submissionsQuery);

        // Group submissions by gigId
        submissionsSnapshot.docs.forEach(doc => {
          const submission = doc.data();
          const gigId = submission.gigId;
          if (!submissionsByGigId.has(gigId)) {
            submissionsByGigId.set(gigId, []);
          }
          submissionsByGigId.get(gigId).push(submission);
        });
      }

      // Map gigs with their submission stats
      const gigsWithStats = gigsSnapshot.docs.map((doc) => {
        const data = doc.data();
        const gigId = doc.id;
        const submissions = submissionsByGigId.get(gigId) || [];

        const totalSubmissions = submissions.length;
        const approvedSubmissions = submissions.filter((s: any) => s.status === 'approved').length;
        const pendingSubmissions = submissions.filter((s: any) => s.status === 'submitted').length;

        return {
          id: gigId,
          ...data,
          status: data.status || 'open',
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          deadlineAt: data.deadlineAt?.toDate ? data.deadlineAt.toDate() : new Date(data.deadlineAt),
          totalSubmissions,
          approvedSubmissions,
          pendingSubmissions,
        } as any;
      });

      // Set recent gigs (last 5)
      setRecentGigs(gigsWithStats.slice(0, 5));
      logger.debug('Fetched brand gigs with submissions', { count: gigsWithStats.length });

      // Calculate analytics
      const totalGigs = gigsWithStats.length;
      const activeGigs = gigsWithStats.filter((g: any) => g.status === 'open' || g.status === 'accepted').length;
      const totalSubmissions = gigsWithStats.reduce((sum: number, g: any) => sum + g.totalSubmissions, 0);
      const approvedSubmissions = gigsWithStats.reduce((sum: number, g: any) => sum + g.approvedSubmissions, 0);
      const completionRate = totalSubmissions > 0 ? (approvedSubmissions / totalSubmissions) * 100 : 0;

      // Fetch unique creators who submitted
      const uniqueCreators = new Set();
      for (const gigId of gigIds) {
        const subs = submissionsByGigId.get(gigId) || [];
        subs.forEach((sub: any) => {
          if (sub.creatorId) uniqueCreators.add(sub.creatorId);
        });
      }

      // Fetch payments to calculate total spent
      const paymentsQuery = query(
        collection(db, 'payments'),
        where('brandId', '==', user.uid),
        where('status', 'in', ['transferred', 'balance_transferred'])
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const totalSpent = paymentsSnapshot.docs.reduce((sum, doc) => {
        const data = doc.data();
        return sum + (data.amount || 0);
      }, 0);

      setAnalytics({
        totalSpent,
        totalCreators: uniqueCreators.size,
        avgApprovalTime: 0, // TODO: Calculate from submission timestamps
        totalGigs,
        activeGigs,
        completionRate,
      });
    } catch (error) {
      logger.error('Error fetching brand gigs', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || !appUser) {
    return <LoadingSpinner fullScreen text="Loading dashboard..." />;
  }

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner text="Loading dashboard..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{companyName || 'Giglet'}</h1>
          {companyName && (
            <p className="text-sm text-gray-500">Welcome back! Here's what's happening with your gigs.</p>
          )}
        </div>

        {/* Balance Display */}
        <Card className="mb-6 border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-blue-800">Account Balance</CardTitle>
              <Button
                onClick={() => setShowAddBalance(!showAddBalance)}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {showAddBalance ? 'Cancel' : '+ Add Funds'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingBalance ? (
              <div className="text-center py-2">
                <div className="text-sm text-gray-500">Loading...</div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-700">
                  {formatCurrencyFromDollars(balance ?? 0)}
                </div>
                <p className="text-sm text-blue-600 mt-2">Available balance for payments</p>
                
                {/* Add Balance Form */}
                {showAddBalance && (
                  <div className="mt-6 pt-4 border-t border-blue-200">
                    <div className="max-w-xs mx-auto space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-blue-900 mb-1">
                          Amount to Add ($)
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          value={addAmount}
                          onChange={(e) => setAddAmount(e.target.value)}
                          className="text-center text-lg"
                        />
                      </div>
                      <Button
                        onClick={handleAddBalance}
                        disabled={addingBalance || !addAmount}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        {addingBalance ? 'Adding...' : 'Add to Balance'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analytics Cards */}
        {recentGigs.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-zinc-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Total Spent</p>
                    <p className="text-lg font-bold text-zinc-900">
                      {formatCurrencyFromDollars(analytics.totalSpent)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Creators</p>
                    <p className="text-lg font-bold text-zinc-900">{analytics.totalCreators}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Active Gigs</p>
                    <p className="text-lg font-bold text-zinc-900">{analytics.activeGigs}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Approval Rate</p>
                    <p className="text-lg font-bold text-zinc-900">{analytics.completionRate.toFixed(0)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add Gig Button */}
        <div className="mb-8">
          <Link href="/brand/gigs/new">
            <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white py-6 text-lg font-medium">
              + Create New Gig
            </Button>
          </Link>
        </div>

        {/* Recent Gigs with Activity */}
        {recentGigs.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                <Link href="/brand/gigs" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
                  View All →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentGigs.map((gig: any) => (
                <Link key={gig.id} href={`/brand/gigs/${gig.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-orange-200 hover:bg-orange-50/50 transition-all cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{gig.title}</h4>
                      <p className="text-xs text-gray-500">
                        ${gig.basePayout || 0} • {gig.totalSubmissions || 0} submissions
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      {gig.pendingSubmissions > 0 && (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                          {gig.pendingSubmissions} pending
                        </span>
                      )}
                      {gig.approvedSubmissions > 0 && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          {gig.approvedSubmissions} approved
                        </span>
                      )}
                      {gig.totalSubmissions === 0 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
                          No submissions
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {recentGigs.length === 0 && (
          <Card className="mb-6 border-dashed">
            <CardContent className="py-8 text-center">
              <div className="text-4xl mb-3">🎬</div>
              <h3 className="font-medium mb-1">No gigs yet</h3>
              <p className="text-sm text-gray-500 mb-4">Create your first gig to start getting content from creators</p>
              <Link href="/brand/gigs/new">
                <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                  Create Your First Gig
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}