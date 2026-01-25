'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { THINGS } from '@/lib/things/constants';
import toast from 'react-hot-toast';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { calculatePayout, getCreatorFollowingCount, getCreatorNetPayout } from '@/lib/payments/calculate-payout';
import {
  ArrowLeft,
  Clock,
  Video,
  Image as ImageIcon,
  CheckCircle2,
  Circle,
  Shield,
  Sparkles,
  Users,
  Mail,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Package,
  Upload,
  MessageCircle,
} from 'lucide-react';

function formatTimeLeft(deadline: Date): string {
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  if (diff < 0) return 'Ended';

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);

  if (minutes < 60) return minutes < 1 ? 'Ends soon' : `${minutes}m left`;
  if (hours < 24) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m left` : `${hours}h left`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h left` : `${days}d left`;
}

function formatMoney(dollars: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(dollars);
}

type GigStatus = 'open' | 'accepted' | 'submitted' | 'needs_changes' | 'approved' | 'paid' | 'closed';

export default function GigDetail() {
  const router = useRouter();
  const { gigId } = router.query;
  const { user } = useAuth();
  const [gig, setGig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<GigStatus>('open');
  const [expandedSection, setExpandedSection] = useState<string | null>('brief');

  useEffect(() => {
    if (gigId && typeof gigId === 'string') {
      fetchGig();
    }
  }, [gigId, user]);

  const fetchGig = async () => {
    if (!gigId || typeof gigId !== 'string') return;

    try {
      setLoading(true);

      const gigDoc = await getDoc(doc(db, 'gigs', gigId));
      if (!gigDoc.exists()) {
        toast.error('Gig not found');
        router.push('/creator/gigs');
        return;
      }

      const gigData = gigDoc.data();

      let brandName = 'Unknown Brand';
      if (gigData.brandId) {
        try {
          const brandDoc = await getDoc(doc(db, 'users', gigData.brandId));
          if (brandDoc.exists()) {
            brandName = brandDoc.data().name || brandDoc.data().companyName || 'Unknown Brand';
          }
        } catch (err) {
          console.error('Error fetching brand name:', err);
        }
      }

      let creatorFollowingCount = 0;
      if (user && gigData.payoutType === 'dynamic') {
        try {
          const creatorDoc = await getDoc(doc(db, 'creators', user.uid));
          if (creatorDoc.exists()) {
            creatorFollowingCount = getCreatorFollowingCount(creatorDoc.data());
          }
        } catch (err) {
          console.error('Error fetching creator data:', err);
        }
      }
      const calculatedPayout = calculatePayout(gigData, creatorFollowingCount);

      let hasCreatorSubmission = false;
      let submissionStatus: string | null = null;
      if (user) {
        const creatorSubmissionsQuery = query(
          collection(db, 'submissions'),
          where('gigId', '==', gigId),
          where('creatorId', '==', user.uid)
        );
        const creatorSubmissionsSnapshot = await getDocs(creatorSubmissionsQuery);
        hasCreatorSubmission = creatorSubmissionsSnapshot.size > 0;
        if (hasCreatorSubmission && !creatorSubmissionsSnapshot.empty) {
          submissionStatus = creatorSubmissionsSnapshot.docs[0].data().status || null;
        }
      }

      let status: GigStatus = 'open';
      if (submissionStatus === 'approved') status = 'paid';
      else if (submissionStatus === 'needs_changes') status = 'needs_changes';
      else if (submissionStatus === 'submitted') status = 'submitted';
      else if (hasCreatorSubmission || gigData.acceptedBy === user?.uid) status = 'accepted';
      else if (gigData.status === 'closed') status = 'closed';

      const basePayout = calculatedPayout || gigData.basePayout || 0;
      const creatorNetPayout = getCreatorNetPayout(basePayout);

      setGig({
        id: gigDoc.id,
        ...gigData,
        status,
        deadlineAt: gigData.deadlineAt?.toDate ? gigData.deadlineAt.toDate() : new Date(gigData.deadlineAt),
        createdAt: gigData.createdAt?.toDate ? gigData.createdAt.toDate() : new Date(gigData.createdAt),
        brandName,
        payout: creatorNetPayout,
        basePayout,
        calculatedPayout,
        hasCreatorSubmission,
        submissionStatus,
      });
      setCurrentStatus(status);
    } catch (error) {
      console.error('Error fetching gig:', error);
      toast.error('Failed to load gig details');
      router.push('/creator/gigs');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptGig = async () => {
    if (!user?.uid || !gigId || typeof gigId !== 'string') return;

    setAccepting(true);
    try {
      const response = await fetch('/api/gigs/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, gigId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(data.alreadyAccepted ? 'Gig already accepted' : 'Gig accepted!');
        await fetchGig();
      } else {
        toast.error(data.message || data.error || 'Failed to accept gig');
      }
    } catch (error: any) {
      console.error('Error accepting gig:', error);
      toast.error(error.message || 'Failed to accept gig');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner text="Loading gig..." />
      </Layout>
    );
  }

  if (!gig) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <p className="text-zinc-500 mb-4">Gig not found</p>
          <Link href="/creator/gigs">
            <Button variant="outline">Back to Gigs</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const primaryThing = THINGS.find((t) => t.id === gig.primaryThing);
  const deliverables = gig.deliverables || { videos: 0, photos: 0 };
  const deadlineDate = gig.deadlineAt instanceof Date ? gig.deadlineAt : new Date(gig.deadlineAt);
  const isEnded = deadlineDate.getTime() < Date.now();
  const isUrgent = !isEnded && Math.floor((deadlineDate.getTime() - Date.now()) / (1000 * 60)) < 120;
  const brandInitial = gig.brandName?.charAt(0).toUpperCase() || 'B';

  const visibilityConfig = {
    open: { icon: Sparkles, label: 'Open', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    squad: { icon: Users, label: 'Squad', color: 'text-violet-600', bg: 'bg-violet-50' },
    invite: { icon: Mail, label: 'Invite', color: 'text-amber-600', bg: 'bg-amber-50' },
  };
  const vis = visibilityConfig[gig.visibility as keyof typeof visibilityConfig] || visibilityConfig.open;

  const steps = [
    { id: 'accept', label: 'Accept', done: currentStatus !== 'open' },
    ...(gig.productInVideoRequired ? [{ id: 'product', label: 'Get Product', done: ['submitted', 'needs_changes', 'paid'].includes(currentStatus) }] : []),
    { id: 'create', label: 'Create & Upload', done: ['submitted', 'needs_changes', 'paid'].includes(currentStatus) },
    { id: 'review', label: 'Brand Review', done: currentStatus === 'paid' },
    { id: 'paid', label: 'Get Paid', done: currentStatus === 'paid' },
  ];

  const currentStepIndex = steps.findIndex((s) => !s.done);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-zinc-50 pb-40">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-lg border-b border-zinc-200">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            <Link href="/creator/gigs" className="p-2 -ml-2 rounded-full hover:bg-zinc-100 transition-colors">
              <ArrowLeft className="w-5 h-5 text-zinc-600" />
            </Link>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-500 font-medium">{gig.brandName}</p>
              <h1 className="text-sm font-semibold text-zinc-900 truncate">{gig.title}</h1>
            </div>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
          {/* Hero Card */}
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
            {/* Payout Hero */}
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 px-5 py-6 text-center">
              <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-1">Your Payout</p>
              <p className="text-4xl font-bold text-white tracking-tight">{formatMoney(gig.payout)}</p>
              <p className="text-emerald-400 text-xs font-medium mt-1">
                {gig.payoutType === 'dynamic' ? 'Dynamic rate' : 'Instant payout on approval'}
              </p>
            </div>

            {/* Quick Info */}
            <div className="p-4 space-y-3">
              {/* Brand Row */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center shadow-sm">
                  <span className="text-white text-sm font-bold">{brandInitial}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900">{gig.title}</p>
                  <p className="text-xs text-zinc-500">{gig.brandName}</p>
                </div>
              </div>

              {/* Tags */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg ${vis.bg} ${vis.color}`}>
                  <vis.icon className="w-3 h-3" />
                  {vis.label}
                </span>
                {primaryThing && (
                  <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-zinc-600 bg-zinc-100 rounded-lg">
                    {primaryThing.name}
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg ${isUrgent ? 'bg-orange-50 text-orange-600' : 'bg-zinc-100 text-zinc-600'}`}>
                  <Clock className={`w-3 h-3 ${isUrgent ? 'animate-pulse' : ''}`} />
                  {formatTimeLeft(deadlineDate)}
                </span>
              </div>

              {/* Deliverables */}
              <div className="flex items-center gap-4 pt-3 border-t border-zinc-100">
                {deliverables.videos > 0 && (
                  <div className="flex items-center gap-1.5 text-zinc-600">
                    <Video className="w-4 h-4" />
                    <span className="text-sm font-medium">{deliverables.videos} video{deliverables.videos > 1 ? 's' : ''}</span>
                  </div>
                )}
                {deliverables.photos > 0 && (
                  <div className="flex items-center gap-1.5 text-zinc-600">
                    <ImageIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">{deliverables.photos} photo{deliverables.photos > 1 ? 's' : ''}</span>
                  </div>
                )}
                {gig.productInVideoRequired && gig.reimbursementCap && (
                  <div className="flex items-center gap-1.5 text-blue-600">
                    <Package className="w-4 h-4" />
                    <span className="text-sm font-medium">+{formatMoney(gig.reimbursementCap)} reimburse</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-4">
            <h3 className="text-sm font-semibold text-zinc-900 mb-4">Progress</h3>
            <div className="flex items-center justify-between">
              {steps.map((step, idx) => (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        step.done
                          ? 'bg-emerald-500 text-white'
                          : idx === currentStepIndex
                          ? 'bg-zinc-900 text-white'
                          : 'bg-zinc-200 text-zinc-500'
                      }`}
                    >
                      {step.done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    </div>
                    <span className={`text-[10px] font-medium mt-1.5 text-center max-w-[60px] ${step.done ? 'text-emerald-600' : idx === currentStepIndex ? 'text-zinc-900' : 'text-zinc-400'}`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className={`w-6 h-0.5 mx-1 mt-[-16px] ${step.done ? 'bg-emerald-500' : 'bg-zinc-200'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Accordion Sections */}
          <div className="space-y-2">
            {/* Brief Section */}
            <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
              <button
                onClick={() => toggleSection('brief')}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <span className="text-sm font-semibold text-zinc-900">Brief</span>
                {expandedSection === 'brief' ? (
                  <ChevronUp className="w-4 h-4 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                )}
              </button>
              {expandedSection === 'brief' && (
                <div className="px-4 pb-4 space-y-4">
                  <p className="text-sm text-zinc-600 leading-relaxed">{gig.description || 'No description provided.'}</p>

                  {gig.brief?.hooks && gig.brief.hooks.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-zinc-700 mb-2">Suggested Hooks</p>
                      <ul className="space-y-1.5">
                        {gig.brief.hooks.map((hook: string, idx: number) => (
                          <li key={idx} className="text-sm text-zinc-600 flex items-start gap-2">
                            <span className="text-emerald-500 mt-0.5">•</span>
                            <span>{hook}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {gig.brief?.talkingPoints && gig.brief.talkingPoints.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-zinc-700 mb-2">Talking Points</p>
                      <ul className="space-y-1.5">
                        {gig.brief.talkingPoints.map((point: string, idx: number) => (
                          <li key={idx} className="text-sm text-zinc-600 flex items-start gap-2">
                            <span className="text-zinc-400 mt-0.5">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(gig.brief?.do?.length > 0 || gig.brief?.dont?.length > 0) && (
                    <div className="grid grid-cols-2 gap-3">
                      {gig.brief?.do?.length > 0 && (
                        <div className="bg-emerald-50 rounded-xl p-3">
                          <p className="text-xs font-semibold text-emerald-700 mb-2">Do</p>
                          <ul className="space-y-1">
                            {gig.brief.do.map((item: string, idx: number) => (
                              <li key={idx} className="text-xs text-emerald-700">{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {gig.brief?.dont?.length > 0 && (
                        <div className="bg-red-50 rounded-xl p-3">
                          <p className="text-xs font-semibold text-red-700 mb-2">Don't</p>
                          <ul className="space-y-1">
                            {gig.brief.dont.map((item: string, idx: number) => (
                              <li key={idx} className="text-xs text-red-700">{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Product Section */}
            {gig.productInVideoRequired && (
              <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
                <button
                  onClick={() => toggleSection('product')}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <span className="text-sm font-semibold text-zinc-900">Product</span>
                  {expandedSection === 'product' ? (
                    <ChevronUp className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  )}
                </button>
                {expandedSection === 'product' && (
                  <div className="px-4 pb-4 space-y-3">
                    <p className="text-sm text-zinc-600">{gig.productDescription || 'Product details will be provided.'}</p>
                    {gig.reimbursementMode === 'reimbursement' && (
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                        <DollarSign className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-blue-900">Reimbursement up to {formatMoney(gig.reimbursementCap || 0)}</p>
                          {gig.purchaseWindowHours && (
                            <p className="text-xs text-blue-700">Purchase within {gig.purchaseWindowHours} hours of accepting</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Rules Section */}
            <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
              <button
                onClick={() => toggleSection('rules')}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <span className="text-sm font-semibold text-zinc-900">Rules & Payout</span>
                {expandedSection === 'rules' ? (
                  <ChevronUp className="w-4 h-4 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                )}
              </button>
              {expandedSection === 'rules' && (
                <div className="px-4 pb-4 space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-zinc-600">AI compliance check on upload</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-zinc-600">Brand may request up to 2 revisions</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-zinc-600">Instant payout on approval</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Trust Badge */}
          <div className="flex items-center gap-3 px-4 py-3 bg-zinc-100 rounded-xl">
            <Shield className="w-5 h-5 text-zinc-500" />
            <p className="text-xs text-zinc-600">
              <span className="font-medium">Payment protected.</span> Funds held until approval.
            </p>
          </div>
        </div>

        {/* Bottom Action Bar - positioned above bottom nav */}
        <div className="fixed bottom-[calc(60px+env(safe-area-inset-bottom))] left-0 right-0 max-w-[428px] mx-auto bg-white border-t border-zinc-200 px-4 py-3 z-40">
          <div className="flex gap-3">
            {currentStatus === 'open' ? (
              isEnded ? (
                <Button disabled className="flex-1 h-14 text-base font-semibold bg-zinc-200 text-zinc-500 rounded-xl">
                  Gig Ended
                </Button>
              ) : (
                <Button onClick={handleAcceptGig} disabled={accepting} className="flex-1 h-14 text-base font-semibold rounded-xl">
                  {accepting ? 'Accepting...' : 'Accept Gig'}
                </Button>
              )
            ) : currentStatus === 'accepted' ? (
              <>
                <Button
                  onClick={() => router.push(`/creator/gigs/${gigId}/submit`)}
                  disabled={isEnded}
                  className="flex-1 h-14 text-base font-semibold rounded-xl"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Upload Submission
                </Button>
                <Button variant="outline" size="icon" className="h-14 w-14 rounded-xl">
                  <MessageCircle className="w-5 h-5" />
                </Button>
              </>
            ) : currentStatus === 'submitted' ? (
              <>
                <Button
                  onClick={() => router.push(`/creator/gigs/${gigId}/submit`)}
                  variant="outline"
                  className="flex-1 h-14 text-base font-semibold rounded-xl"
                >
                  View Submission
                </Button>
                <Button variant="outline" size="icon" className="h-14 w-14 rounded-xl">
                  <MessageCircle className="w-5 h-5" />
                </Button>
              </>
            ) : currentStatus === 'needs_changes' ? (
              <Button
                onClick={() => router.push(`/creator/gigs/${gigId}/submit`)}
                className="flex-1 h-14 text-base font-semibold rounded-xl"
              >
                Upload Revision
              </Button>
            ) : currentStatus === 'paid' ? (
              <Button variant="outline" className="flex-1 h-14 text-base font-semibold text-emerald-600 border-emerald-200 bg-emerald-50 rounded-xl">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Paid - {formatMoney(gig.payout)}
              </Button>
            ) : currentStatus === 'closed' ? (
              <Button disabled className="flex-1 h-14 text-base font-semibold bg-zinc-200 text-zinc-500 rounded-xl">
                Gig Closed
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </Layout>
  );
}
