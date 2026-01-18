import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { canAccessGig } from '@/lib/rep/service';

export function useDashboardData(user: any, appUser: any, creatorData: any) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingHotJobs, setLoadingHotJobs] = useState(true);
  const [hotJobs, setHotJobs] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    acceptedGigs: 0,
    pendingSubmissions: 0,
    completedGigs: 0,
    submittedGigs: 0,
  });

  // Fetch balance from creator data
  useEffect(() => {
    if (creatorData) {
      setBalance(creatorData.balance || 0);
      setLoadingBalance(false);
    }
  }, [creatorData]);

  // Fetch creator stats
  const fetchStats = async () => {
    if (!user || !appUser || appUser.role !== 'creator') return;
    
    try {
      setLoadingStats(true);
      
      // Fetch all submissions by this creator
      const submissionsQuery = query(
        collection(db, 'submissions'),
        where('creatorId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const submissionsSnapshot = await getDocs(submissionsQuery);
      const submissions = submissionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as any[];

      // Fetch all payments for this creator
      const paymentsQuery = query(
        collection(db, 'payments'),
        where('creatorId', '==', user.uid),
        where('status', 'in', ['transferred', 'balance_transferred'])
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const payments = paymentsSnapshot.docs.map(doc => doc.data()) as any[];

      // Calculate stats
      const totalEarnings = payments.reduce((sum: number, payment: any) => sum + (payment.creatorNet || 0), 0);
      const acceptedGigs = submissions.filter(
        (sub: any) => sub.status === 'approved'
      ).length;
      const pendingSubmissions = submissions.filter(
        (sub: any) => sub.status === 'submitted' || sub.status === 'needs_changes'
      ).length;
      const completedGigs = submissions.filter(
        (sub: any) => sub.status === 'approved'
      ).length;
      const submittedGigs = submissions.length;

      setStats({
        totalEarnings,
        acceptedGigs,
        pendingSubmissions,
        completedGigs,
        submittedGigs,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch hot jobs (2-3 recent open gigs)
  const fetchHotJobs = async () => {
    if (!user || !appUser || appUser.role !== 'creator' || !creatorData) return;
    
    try {
      setLoadingHotJobs(true);
      
      // Fetch recent open gigs
      const gigsQuery = query(
        collection(db, 'gigs'),
        where('status', '==', 'open'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      
      const gigsSnapshot = await getDocs(gigsQuery);
      const fetchedGigs = gigsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt),
      })) as any[];

      // Filter based on creator eligibility
      const creatorRep = creatorData.rep || 0;
      const eligibleGigs = fetchedGigs
        .filter(gig => {
          // Basic filters
          if (gig.trustScoreMin && (creatorData.trustScore || 20) < gig.trustScoreMin) return false;
          if (gig.minFollowers && gig.minFollowersPlatform) {
            const platform = gig.minFollowersPlatform.toLowerCase();
            const creatorFollowers = creatorData.followingCount?.[platform] || 0;
            if (creatorFollowers < gig.minFollowers) return false;
          }
          // Check rep-based access
          if (gig.visibility !== 'squad') {
            const access = canAccessGig(creatorRep, gig.createdAt);
            if (!access.canAccess) return false;
          }
          return true;
        })
        .slice(0, 3);

      setHotJobs(eligibleGigs);
    } catch (error) {
      console.error('Error fetching hot jobs:', error);
    } finally {
      setLoadingHotJobs(false);
    }
  };

  useEffect(() => {
    if (user && appUser) {
      fetchStats();
    }
  }, [user, appUser]);

  useEffect(() => {
    if (creatorData && user) {
      fetchHotJobs();
    }
  }, [creatorData, user]);

  return {
    balance,
    loadingBalance,
    stats,
    loadingStats,
    hotJobs,
    loadingHotJobs,
    refetchStats: fetchStats,
    refetchHotJobs: fetchHotJobs,
  };
}
