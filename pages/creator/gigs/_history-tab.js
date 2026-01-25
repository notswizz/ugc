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
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
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

  const filteredGigs = gigs.filter(gig => {
    if (filter === 'all') return true;
    if (filter === 'completed') return gig.status === 'paid' || gig.status === 'approved';
    if (filter === 'pending') return gig.status === 'submitted' || gig.status === 'accepted' || gig.status === 'needs_changes';
    return true;
  });

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

        {/* Filter Pills */}
        <div className="flex gap-2">
          {['all', 'completed', 'pending'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-zinc-900 text-white'
                  : 'bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-300'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Gigs List */}
      {filteredGigs.length > 0 ? (
        <div className="space-y-3">
          {filteredGigs.map((gig) => {
            const statusConfig = getStatusConfig(gig.status);
            const StatusIcon = statusConfig.icon;
            const isExpanded = expandedId === gig.id;
            const hasAIFeedback = gig.submission?.aiEvaluation;
            const qualityScore = gig.submission?.aiEvaluation?.qualityScore;

            return (
              <div key={gig.id} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl ${statusConfig.bg} flex items-center justify-center flex-shrink-0`}>
                      <StatusIcon className="w-5 h-5 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-zinc-900 text-sm truncate">{gig.title}</h3>
                          <p className="text-xs text-zinc-500 mt-0.5">{gig.brandName}</p>
                        </div>
                        {(gig.status === 'paid' || gig.status === 'approved') && gig.payment?.creatorNet && (
                          <div className="text-right flex-shrink-0">
                            <p className="text-lg font-bold text-emerald-600">${gig.payment.creatorNet.toFixed(2)}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-2">
                        <span className={`text-xs font-medium ${statusConfig.color}`}>
                          {statusConfig.text}
                        </span>
                        {qualityScore && (
                          <span className="flex items-center gap-1 text-xs text-zinc-500">
                            <Star className="w-3 h-3 text-amber-500" />
                            {qualityScore}/100
                          </span>
                        )}
                        <span className="text-xs text-zinc-400">
                          {gig.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    {gig.status === 'accepted' && (
                      <Link href={`/creator/gigs/${gig.id}/submit`} className="flex-1">
                        <Button size="sm" className="w-full h-9 text-xs rounded-xl bg-violet-600 hover:bg-violet-700">
                          Submit Content
                        </Button>
                      </Link>
                    )}
                    {gig.status === 'needs_changes' && (
                      <Link href={`/creator/gigs/${gig.id}/submit`} className="flex-1">
                        <Button size="sm" className="w-full h-9 text-xs rounded-xl bg-amber-600 hover:bg-amber-700">
                          Resubmit
                        </Button>
                      </Link>
                    )}
                    {hasAIFeedback && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : gig.id)}
                        className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-zinc-600 bg-zinc-100 rounded-xl hover:bg-zinc-200 transition-colors"
                      >
                        <Lightbulb className="w-3.5 h-3.5" />
                        AI Feedback
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && hasAIFeedback && (
                  <div className="px-4 pb-4">
                    <div className={`p-4 rounded-xl ${
                      gig.status === 'rejected' ? 'bg-red-50' :
                      gig.status === 'approved' || gig.status === 'paid' ? 'bg-emerald-50' : 'bg-blue-50'
                    }`}>
                      {qualityScore !== undefined && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-zinc-700">Quality Score</span>
                            <span className={`text-sm font-bold ${
                              qualityScore >= 80 ? 'text-emerald-600' :
                              qualityScore >= 60 ? 'text-blue-600' :
                              'text-amber-600'
                            }`}>{qualityScore}/100</span>
                          </div>
                          <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                qualityScore >= 80 ? 'bg-emerald-500' :
                                qualityScore >= 60 ? 'bg-blue-500' :
                                'bg-amber-500'
                              }`}
                              style={{ width: `${qualityScore}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {gig.submission.aiEvaluation.qualityBreakdown && (
                        <div className="grid grid-cols-5 gap-2 mb-4">
                          {Object.entries(gig.submission.aiEvaluation.qualityBreakdown).map(([key, value]) => (
                            <div key={key} className="text-center">
                              <div className="text-lg font-bold text-zinc-900">{value}</div>
                              <div className="text-[10px] text-zinc-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {gig.submission.aiEvaluation.compliancePassed !== undefined && (
                        <div className="flex items-center gap-2 mb-3">
                          {gig.submission.aiEvaluation.compliancePassed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span className="text-xs font-medium text-zinc-700">
                            Compliance {gig.submission.aiEvaluation.compliancePassed ? 'Passed' : 'Failed'}
                          </span>
                        </div>
                      )}

                      {gig.submission.aiEvaluation.improvementTips?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-zinc-700 mb-2">Tips for Improvement</p>
                          <ul className="space-y-1.5">
                            {gig.submission.aiEvaluation.improvementTips.map((tip, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-xs text-zinc-600">
                                <TrendingUp className="w-3 h-3 text-zinc-400 mt-0.5 flex-shrink-0" />
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-100 flex items-center justify-center">
            <FileVideo className="w-8 h-8 text-zinc-400" />
          </div>
          <h3 className="font-semibold text-zinc-900 mb-1">No gigs yet</h3>
          <p className="text-sm text-zinc-500 mb-4">
            {filter === 'all'
              ? "Accept gigs to see them here"
              : `No ${filter} gigs found`}
          </p>
          <Link href="/creator/gigs">
            <Button className="rounded-xl">Browse Gigs</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
