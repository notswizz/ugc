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

export default function BrandDashboard() {
  const { user, appUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [showAddBalance, setShowAddBalance] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [addingBalance, setAddingBalance] = useState(false);
  const [recentJobs, setRecentJobs] = useState([]);
  const [companyName, setCompanyName] = useState<string>('');

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
      console.error('Error fetching balance:', error);
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
    
    const amount = parseFloat(addAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }

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
      alert(`Successfully added $${amount.toFixed(2)} to your balance!`);
    } catch (error: any) {
      console.error('Error adding balance:', error);
      alert(error.message || 'Failed to add balance. Please try again.');
    } finally {
      setAddingBalance(false);
    }
  };

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
        orderBy('createdAt', 'desc'),
        limit(50)
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
          const approvedSubmissions = submissions.filter((s: any) => s.status === 'approved').length;
          const pendingSubmissions = submissions.filter((s: any) => s.status === 'submitted').length;
          
          return {
            id: jobId,
            ...data,
            status: data.status || 'open',
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            deadlineAt: data.deadlineAt?.toDate ? data.deadlineAt.toDate() : new Date(data.deadlineAt),
            totalSubmissions,
            approvedSubmissions,
            pendingSubmissions,
          } as any;
        })
      );

      // Set recent jobs (last 5)
      setRecentJobs(jobsWithStats.slice(0, 5));
    } catch (error) {
      console.error('Error fetching brand jobs:', error);
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
          <h1 className="text-3xl font-bold mb-2">{companyName || 'Brand Dashboard'}</h1>
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
                  ${(balance ?? 0).toFixed(2)}
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

        {/* Add Campaign Button */}
        <div className="mb-8">
          <Link href="/brand/jobs/new">
            <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white py-6 text-lg font-medium">
              + Add Campaign
            </Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
}