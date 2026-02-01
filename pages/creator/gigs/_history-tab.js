import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, where, orderBy, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Star,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  FileVideo,
  AlertCircle,
  TrendingUp,
  Loader2,
  DollarSign
} from 'lucide-react';

export default function HistoryTab({ user }) {
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, completed: 0, earned: 0, avgScore: 0 });

  useEffect(() => {
    if (user) {
      fetchGigHistory();
    }
  }, [user]);

  const fetchGigHistory = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const acceptedGigsQuery = query(
        collection(db, 'gigs'),
        where('acceptedBy', '==', user.uid)
      );
      const acceptedGigsSnapshot = await getDocs(acceptedGigsQuery);

      const submissionsQuery = query(
        collection(db, 'submissions'),
        where('creatorId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      const submissionsSnapshot = await getDocs(submissionsQuery);
      const submissionDocs = submissionsSnapshot.docs.map(subDoc => ({
        id: subDoc.id,
        ...subDoc.data(),
        createdAt: subDoc.data().createdAt?.toDate ? subDoc.data().createdAt.toDate() : new Date(subDoc.data().createdAt),
      }));

      const submittedGigIds = new Set(submissionDocs.map(sub => sub.gigId));

      const acceptedNotSubmittedGigs = await Promise.all(
        acceptedGigsSnapshot.docs
          .filter(gigDoc => !submittedGigIds.has(gigDoc.id))
          .map(async (gigDoc) => {
            const gigData = gigDoc.data();
            let brandName = 'Brand';
            try {
              const brandDoc = await getDoc(doc(db, 'brands', gigData.brandId));
              if (brandDoc.exists()) {
                brandName = brandDoc.data().companyName || 'Brand';
              } else {
                const userDoc = await getDoc(doc(db, 'users', gigData.brandId));
                if (userDoc.exists()) brandName = userDoc.data().companyName || 'Brand';
              }
            } catch (err) {}

            return {
              id: gigDoc.id,
              title: gigData.title,
              brandName,
              status: 'accepted',
              payout: gigData.basePayout || 0,
              createdAt: gigData.createdAt?.toDate ? gigData.createdAt.toDate() : new Date(),
              submission: null,
              payment: null,
            };
          })
      );

      const gigsWithSubmissions = await Promise.all(
        submissionDocs.map(async (submission) => {
          const gigDoc = await getDoc(doc(db, 'gigs', submission.gigId));
          if (!gigDoc.exists()) return null;

          const gigData = gigDoc.data();
          let brandName = 'Brand';
          try {
            const brandDoc = await getDoc(doc(db, 'brands', gigData.brandId));
            if (brandDoc.exists()) {
              brandName = brandDoc.data().companyName || 'Brand';
            } else {
              const userDoc = await getDoc(doc(db, 'users', gigData.brandId));
              if (userDoc.exists()) brandName = userDoc.data().companyName || 'Brand';
            }
          } catch (err) {}

          const paymentsQuery = query(
            collection(db, 'payments'),
            where('gigId', '==', submission.gigId),
            where('creatorId', '==', user.uid)
          );
          const paymentsSnapshot = await getDocs(paymentsQuery);
          const payment = paymentsSnapshot.docs[0]?.data() || null;

          return {
            id: gigDoc.id,
            title: gigData.title,
            brandName,
            status: payment?.status === 'transferred' || payment?.status === 'balance_transferred'
              ? 'paid'
              : submission.status,
            payout: payment?.creatorNet || gigData.basePayout || 0,
            createdAt: submission.createdAt,
            submission: {
              id: submission.id,
              status: submission.status,
              aiEvaluation: submission.aiEvaluation,
            },
            payment,
          };
        })
      );

      let allGigs = [...acceptedNotSubmittedGigs, ...gigsWithSubmissions.filter(Boolean)];

      const uniqueGigs = {};
      allGigs.forEach(gig => {
        if (!uniqueGigs[gig.id] || (gig.submission && !uniqueGigs[gig.id].submission)) {
          uniqueGigs[gig.id] = gig;
        }
      });

      const gigsList = Object.values(uniqueGigs).sort((a, b) => b.createdAt - a.createdAt);
      setGigs(gigsList);

      const completed = gigsList.filter(g => g.status === 'paid' || g.status === 'approved').length;
      const earned = gigsList.reduce((sum, g) =>
        (g.status === 'paid' || g.status === 'approved') ? sum + (g.payment?.creatorNet || 0) : sum, 0
      );
      const scores = gigsList
        .filter(g => g.submission?.aiEvaluation?.qualityScore)
        .map(g => g.submission.aiEvaluation.qualityScore);
      const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

      setStats({ total: gigsList.length, completed, earned, avgScore });
    } catch (error) {
      console.error('Error fetching gig history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'paid':
        return { icon: CheckCircle2, bg: 'bg-emerald-500', text: 'Paid', color: 'text-emerald-600' };
      case 'approved':
        return { icon: CheckCircle2, bg: 'bg-emerald-500', text: 'Approved', color: 'text-emerald-600' };
      case 'submitted':
        return { icon: Clock, bg: 'bg-blue-500', text: 'Reviewing', color: 'text-blue-600' };
      case 'rejected':
        return { icon: XCircle, bg: 'bg-red-500', text: 'Rejected', color: 'text-red-600' };
      case 'needs_changes':
        return { icon: AlertCircle, bg: 'bg-amber-500', text: 'Changes', color: 'text-amber-600' };
      case 'accepted':
        return { icon: FileVideo, bg: 'bg-violet-500', text: 'To Submit', color: 'text-violet-600' };
      default:
        return { icon: Clock, bg: 'bg-zinc-400', text: status, color: 'text-zinc-600' };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
        <p className="text-sm text-zinc-500 mt-3">Loading history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-zinc-50 -mx-4 px-4 pt-1 pb-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-zinc-200 p-3 text-center">
            <p className="text-2xl font-bold text-zinc-900">{stats.completed}</p>
            <p className="text-xs text-zinc-500">Completed</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-white">${stats.earned.toFixed(0)}</p>
            <p className="text-xs text-emerald-100">Earned</p>
          </div>
          <div className="bg-white rounded-2xl border border-zinc-200 p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <Star className="w-4 h-4 text-amber-500" />
              <p className="text-2xl font-bold text-zinc-900">{stats.avgScore || '-'}</p>
            </div>
            <p className="text-xs text-zinc-500">Avg Score</p>
          </div>
        </div>

      </div>

      {/* Sections by Status */}
      {gigs.length > 0 ? (
        <div className="space-y-6">
          {/* Completed Section */}
          {gigs.filter(g => g.status === 'paid' || g.status === 'approved').length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Completed ({gigs.filter(g => g.status === 'paid' || g.status === 'approved').length})
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {gigs.filter(g => g.status === 'paid' || g.status === 'approved').map((gig) => {
                  const statusConfig = getStatusConfig(gig.status);
                  const StatusIcon = statusConfig.icon;
                  const qualityScore = gig.submission?.aiEvaluation?.qualityScore;
                  return (
                    <div key={gig.id} className="flex-shrink-0 w-64 bg-white rounded-2xl border border-emerald-200 p-4">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                          <StatusIcon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-zinc-900 text-sm truncate">{gig.title}</h4>
                          <p className="text-xs text-zinc-500">{gig.brandName}</p>
                        </div>
                      </div>
                      {gig.payment?.creatorNet && (
                        <p className="text-xl font-bold text-emerald-600">${gig.payment.creatorNet.toFixed(2)}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
                        {qualityScore && (
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-500" />
                            {qualityScore}/100
                          </span>
                        )}
                        <span>{gig.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pending Section */}
          {gigs.filter(g => g.status === 'submitted' || g.status === 'accepted' || g.status === 'needs_changes').length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                Pending ({gigs.filter(g => g.status === 'submitted' || g.status === 'accepted' || g.status === 'needs_changes').length})
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {gigs.filter(g => g.status === 'submitted' || g.status === 'accepted' || g.status === 'needs_changes').map((gig) => {
                  const statusConfig = getStatusConfig(gig.status);
                  const StatusIcon = statusConfig.icon;
                  const qualityScore = gig.submission?.aiEvaluation?.qualityScore;
                  return (
                    <div key={gig.id} className="flex-shrink-0 w-64 bg-white rounded-2xl border border-blue-200 p-4">
                      <div className="flex items-start gap-3 mb-2">
                        <div className={`w-9 h-9 rounded-xl ${statusConfig.bg} flex items-center justify-center flex-shrink-0`}>
                          <StatusIcon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-zinc-900 text-sm truncate">{gig.title}</h4>
                          <p className="text-xs text-zinc-500">{gig.brandName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs">
                        <span className={`font-medium ${statusConfig.color}`}>{statusConfig.text}</span>
                        {qualityScore && (
                          <span className="flex items-center gap-1 text-zinc-500">
                            <Star className="w-3 h-3 text-amber-500" />
                            {qualityScore}/100
                          </span>
                        )}
                      </div>
                      {(gig.status === 'accepted' || gig.status === 'needs_changes') && (
                        <Link href={`/creator/gigs/${gig.id}/submit`} className="block mt-3">
                          <Button size="sm" className={`w-full h-8 text-xs rounded-xl ${gig.status === 'accepted' ? 'bg-violet-600 hover:bg-violet-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
                            {gig.status === 'accepted' ? 'Submit' : 'Resubmit'}
                          </Button>
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rejected Section */}
          {gigs.filter(g => g.status === 'rejected').length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                Rejected ({gigs.filter(g => g.status === 'rejected').length})
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {gigs.filter(g => g.status === 'rejected').map((gig) => {
                  const qualityScore = gig.submission?.aiEvaluation?.qualityScore;
                  return (
                    <div key={gig.id} className="flex-shrink-0 w-64 bg-white rounded-2xl border border-red-200 p-4">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-9 h-9 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0">
                          <XCircle className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-zinc-900 text-sm truncate">{gig.title}</h4>
                          <p className="text-xs text-zinc-500">{gig.brandName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs">
                        <span className="font-medium text-red-600">Rejected</span>
                        {qualityScore && (
                          <span className="flex items-center gap-1 text-zinc-500">
                            <Star className="w-3 h-3 text-amber-500" />
                            {qualityScore}/100
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-100 flex items-center justify-center">
            <FileVideo className="w-8 h-8 text-zinc-400" />
          </div>
          <h3 className="font-semibold text-zinc-900 mb-1">No gigs yet</h3>
          <p className="text-sm text-zinc-500 mb-4">
            Accept gigs to see them here
          </p>
          <Link href="/creator/gigs">
            <Button className="rounded-xl">Browse Gigs</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
