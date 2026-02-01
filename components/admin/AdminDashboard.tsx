'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { collection, query, getDocs, orderBy, doc, getDoc, where } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/client';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/ui/loading-spinner';
import CommunityForm from './CommunityForm';
import GigsTable from './GigsTable';
import GigDetailsModal from './GigDetailsModal';
import WaitlistTable from './WaitlistTable';
import toast from 'react-hot-toast';
import { Shield, Wallet, Briefcase, FileVideo, CreditCard, Users, Plus, Mail } from 'lucide-react';
import type { WaitlistEntry } from '@/lib/models/waitlist';

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
  const [showCommunityForm, setShowCommunityForm] = useState(false);
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);

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

  const handleDeleteSubmission = async (submissionId: string) => {
    if (!appUser?.email) return;

    try {
      const response = await fetch('/api/admin/delete-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, adminEmail: appUser.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete submission');
      }

      toast.success('Submission deleted');

      // Refresh gig details to update the list
      if (selectedGig) {
        await fetchGigDetails(selectedGig);
      }

      // Update stats
      setStats((prev) => ({ ...prev, totalSubmissions: prev.totalSubmissions - 1 }));
    } catch (error: any) {
      console.error('Error deleting submission:', error);
      toast.error(error.message || 'Failed to delete submission');
      throw error;
    }
  };

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

      // Fetch waitlist entries
      const waitlistQuery = query(collection(db, 'waitlist'), orderBy('createdAt', 'desc'));
      const waitlistSnapshot = await getDocs(waitlistQuery);
      const waitlistData = waitlistSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        } as WaitlistEntry;
      });
      setWaitlistEntries(waitlistData);

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
      <div className="space-y-4 -mt-2">
        {/* Admin Header */}
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
            </div>
            {/* Platform Balance */}
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
              <Wallet className="w-5 h-5 text-emerald-400" />
              <p className="text-lg font-bold text-emerald-400">${(bankBalance ?? 0).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-3">
          {/* Gigs */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-medium text-zinc-500">Gigs</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900">{stats.totalGigs}</p>
          </div>

          {/* Submissions */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                <FileVideo className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-medium text-zinc-500">Submissions</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900">{stats.totalSubmissions}</p>
          </div>

          {/* Payments */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-medium text-zinc-500">Payments</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900">{stats.totalPayments}</p>
          </div>

          {/* Waitlist */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
                <Mail className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-medium text-zinc-500">Waitlist</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900">{waitlistEntries.length}</p>
          </div>
        </div>

        {/* Community Management - Collapsible */}
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
          <button
            onClick={() => setShowCommunityForm(!showCommunityForm)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-zinc-900">Community Management</h3>
                <p className="text-xs text-zinc-500">Create new communities</p>
              </div>
            </div>
            <div className={`w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center transition-transform ${showCommunityForm ? 'rotate-45' : ''}`}>
              <Plus className="w-4 h-4 text-zinc-600" />
            </div>
          </button>
          {showCommunityForm && (
            <div className="px-5 pb-5 border-t border-zinc-100">
              <CommunityForm />
            </div>
          )}
        </div>

        {/* Waitlist Table */}
        <WaitlistTable entries={waitlistEntries} />

        {/* Gigs Table */}
        <GigsTable
          gigs={sortedGigs}
          brandsList={brandsList}
          selectedBrand={selectedBrand}
          onBrandChange={setSelectedBrand}
          onGigSelect={setSelectedGig}
        />

        {/* Gig Details Modal */}
        <GigDetailsModal
          isOpen={!!selectedGig}
          onClose={() => {
            setSelectedGig(null);
            setGigDetails(null);
          }}
          loading={loadingGigDetails}
          details={gigDetails}
          onDeleteSubmission={handleDeleteSubmission}
        />
      </div>
    </Layout>
  );
}
