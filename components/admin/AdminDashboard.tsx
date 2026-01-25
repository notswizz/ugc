'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { collection, query, getDocs, orderBy, doc, getDoc, where } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/ui/loading-spinner';
import CommunityForm from './CommunityForm';
import GigsTable from './GigsTable';
import GigDetailsModal from './GigDetailsModal';

const ADMIN_EMAIL = '7jackdsmith@gmail.com';

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
  const [selectedGig, setSelectedGig] = useState<any | null>(null);
  const [gigDetails, setGigDetails] = useState<{
    gig: any;
    brand: any;
    jobSubmissions: any[];
    jobPayments: any[];
  } | null>(null);
  const [loadingGigDetails, setLoadingGigDetails] = useState(false);

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
      gigs.forEach((gig) => {
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
        filtered = gigs.filter((gig) => gig.brandId === selectedBrand);
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
      const jobSubmissions = submissionsSnapshot.docs.map((doc) => {
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
      const paymentsQuery = query(collection(db, 'payments'), where('gigId', '==', gig.id), orderBy('createdAt', 'desc'));
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const jobPayments = paymentsSnapshot.docs.map((doc) => {
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

          // Determine actual status
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
            status: actualStatus,
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
      const submissionsData = submissionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt),
        updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : new Date(doc.data().updatedAt),
      }));

      // Fetch all payments
      const paymentsQuery = query(collection(db, 'payments'), orderBy('createdAt', 'desc'));
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const paymentsData = paymentsSnapshot.docs.map((doc) => {
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
            <CardTitle className="text-purple-900">Community Management</CardTitle>
          </CardHeader>
          <CardContent>
            <CommunityForm />
          </CardContent>
        </Card>

        {/* Gigs Table */}
        <div className="space-y-4">
          <GigsTable
            gigs={sortedGigs}
            brandsList={brandsList}
            selectedBrand={selectedBrand}
            onBrandChange={setSelectedBrand}
            onGigSelect={setSelectedGig}
          />
        </div>

        {/* Gig Details Modal */}
        <GigDetailsModal
          isOpen={!!selectedGig}
          onClose={() => {
            setSelectedGig(null);
            setGigDetails(null);
          }}
          loading={loadingGigDetails}
          details={gigDetails}
        />
      </div>
    </Layout>
  );
}
