import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import VisibilityBadge from '@/components/gigs/VisibilityBadge';
import { THINGS } from '@/lib/things/constants';
import toast from 'react-hot-toast';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { calculatePayout, getCreatorFollowingCount } from '@/lib/payments/calculate-payout';
import {
  Clock,
  Play,
  DollarSign,
  Activity,
  CheckCircle2,
  ShoppingBag,
  Upload,
  Shield,
  FileCheck,
  Zap,
  ArrowLeft,
  Share2,
  MessageCircle,
  Eye,
  Edit,
  CreditCard,
  Star,
  Package,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  Lock,
  XCircle,
} from 'lucide-react';

// Utility functions
function formatTimeLeft(deadline: Date): string {
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  if (diff < 0) return 'Ended';
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  
  if (minutes < 60) {
    return minutes < 1 ? 'Ends soon' : `Ends in ${minutes}m`;
  }
  if (hours < 24) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `Ends in ${hours}h ${remainingMinutes}m` : `Ends in ${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `Ends in ${days}d ${remainingHours}h` : `Ends in ${days}d`;
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
  const { user, appUser } = useAuth();
  const [gig, setGig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState<GigStatus>('open');

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

      // Fetch brand name
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

      // Calculate payout
      let creatorFollowingCount = 0;
      if (user && gigData.payoutType === 'dynamic') {
        try {
          const creatorDoc = await getDoc(doc(db, 'creators', user.uid));
          if (creatorDoc.exists()) {
            const creatorData = creatorDoc.data();
            creatorFollowingCount = getCreatorFollowingCount(creatorData);
          }
        } catch (err) {
          console.error('Error fetching creator data:', err);
        }
      }
      const calculatedPayout = calculatePayout(gigData, creatorFollowingCount);

      // Check submission status
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

      // Determine current status
      let status: GigStatus = 'open';
      if (submissionStatus === 'approved') status = 'paid';
      else if (submissionStatus === 'needs_changes') status = 'needs_changes';
      else if (submissionStatus === 'submitted') status = 'submitted';
      else if (hasCreatorSubmission || gigData.acceptedBy === user?.uid) status = 'accepted';
      else if (!gigData.status || gigData.status === 'open') status = 'open';
      else status = 'closed';

      const gig = {
        id: gigDoc.id,
        ...gigData,
        status,
        deadlineAt: gigData.deadlineAt?.toDate ? gigData.deadlineAt.toDate() : new Date(gigData.deadlineAt),
        createdAt: gigData.createdAt?.toDate ? gigData.createdAt.toDate() : new Date(gigData.createdAt),
        brandName,
        payout: calculatedPayout || gigData.basePayout || 0,
        calculatedPayout,
        hasCreatorSubmission,
        submissionStatus,
      };

      setGig(gig);
      setCurrentStatus(status);
    } catch (error) {
      console.error('Error fetching gig:', error);
      toast.error('Failed to load gig details');
      router.push('/creator/gigs');
    } finally {
      setLoading(false);
    }
  };

  // Placeholder handlers (no backend mutations)
  const handleAcceptGig = () => {
    toast.success('Gig accepted! (Placeholder - implement backend)');
    // router.push(`/creator/gigs/${gigId}/submit`);
  };

  const handleStartSubmission = () => {
    router.push(`/creator/gigs/${gigId}/submit`);
  };

  const handleViewSubmission = () => {
    router.push(`/creator/gigs/${gigId}/submit`);
  };

  const handleUploadRevision = () => {
    router.push(`/creator/gigs/${gigId}/submit`);
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner text="Loading gig details..." />
      </Layout>
    );
  }

  if (!gig) {
    return (
      <Layout>
        <div className="max-w-[430px] mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Gig Not Found</h1>
          <Link href="/creator/gigs">
            <Button>Back to Gigs</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const primaryThing = THINGS.find((t) => t.id === gig.primaryThing);
  const deliverables = gig.deliverables || { videos: 0, photos: 0 };
  const deadlineDate = gig.deadlineAt instanceof Date ? gig.deadlineAt : new Date(gig.deadlineAt);
  const timeLeftMinutes = Math.max(0, Math.floor((deadlineDate.getTime() - Date.now()) / (1000 * 60)));
  const isUrgent = timeLeftMinutes < 120;
  const brandInitial = gig.brandName?.charAt(0).toUpperCase() || 'B';

  // Format deliverables text
  const deliverableParts: string[] = [];
  if (deliverables.videos > 0) {
    deliverableParts.push(`${deliverables.videos} video${deliverables.videos > 1 ? 's' : ''}`);
  }
  if (deliverables.photos > 0) {
    deliverableParts.push(`${deliverables.photos} photo${deliverables.photos > 1 ? 's' : ''}`);
  }
  const deliverablesText = deliverableParts.length > 0 ? deliverableParts.join(', ') : 'No deliverables specified';

  return (
    <Layout>
      <div className="max-w-[430px] mx-auto min-h-screen flex flex-col pb-24">
        {/* Sticky Top Bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-zinc-200 px-4 py-3 flex items-center justify-between">
          <Link href="/creator/gigs" className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Gigs</span>
          </Link>
          <h1 className="text-sm font-semibold text-zinc-900 truncate flex-1 mx-4 text-center">
            {gig.title}
          </h1>
          <button className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Hero Gig Summary Card */}
          <Card className="border border-zinc-200 shadow-sm">
            <CardContent className="p-4">
              {/* Brand + Title + Payout Row */}
              <div className="flex items-start justify-between gap-3 mb-4">
                {/* Left: Brand + Title */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Brand Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-400 to-zinc-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="text-white text-sm font-bold">{brandInitial}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-500 font-medium mb-0.5 truncate">{gig.brandName}</p>
                    <h2 className="text-lg font-bold text-zinc-900 leading-tight">{gig.title}</h2>
                  </div>
                </div>

                {/* Right: Payout Module */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide mb-0.5">Payout</p>
                  <p className="text-2xl font-bold text-zinc-900 leading-none">{formatMoney(gig.payout)}</p>
                  {gig.payoutType === 'dynamic' ? (
                    <p className="text-[10px] text-zinc-500 mt-0.5">dynamic</p>
                  ) : (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-1 h-4 border-zinc-300 text-zinc-600">
                      Instant
                    </Badge>
                  )}
                </div>
              </div>

              {/* Badges Row */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <VisibilityBadge visibility={gig.visibility || 'open'} className="text-[10px] px-2 py-0.5" />
                {primaryThing && (
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-zinc-200 text-zinc-700">
                    {primaryThing.name}
                  </Badge>
                )}
                <div className={`flex items-center gap-1 text-[10px] font-semibold ${isUrgent ? 'text-orange-600' : 'text-zinc-600'}`}>
                  <Clock className={`w-3 h-3 ${isUrgent ? 'animate-pulse' : ''}`} />
                  <span>{formatTimeLeft(deadlineDate)}</span>
                </div>
              </div>

              {/* Quick Requirements Row */}
              <div className="space-y-2 pt-3 border-t border-zinc-100">
                <div className="flex items-center gap-2 text-xs text-zinc-600">
                  <Play className="w-3.5 h-3.5" />
                  <span className="font-medium">Deliver: {deliverablesText}</span>
                </div>
                {gig.productInVideoRequired && gig.reimbursementMode === 'reimbursement' && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-blue-200 text-blue-700 bg-blue-50">
                      Reimburse up to {formatMoney(gig.reimbursementCap || 0)}
                    </Badge>
                    {gig.purchaseWindowHours && (
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-blue-200 text-blue-700 bg-blue-50">
                        Buy within {gig.purchaseWindowHours}h
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Step-by-Step Timeline */}
          <Card className="border border-zinc-200 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-bold text-zinc-900 mb-4">Steps</h3>
              <div className="space-y-3">
                {/* Step 1: Accept */}
                <div className={`flex items-start gap-3 ${currentStatus === 'open' ? 'opacity-100' : 'opacity-60'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    currentStatus === 'open' ? 'bg-brand-600 text-white' : 'bg-zinc-200 text-zinc-500'
                  }`}>
                    {currentStatus !== 'open' ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">1</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900">Accept gig</p>
                    <p className="text-xs text-zinc-500">Locks your spot</p>
                  </div>
                </div>

                {/* Step 2: Get Product (conditional) */}
                {gig.productInVideoRequired && (
                  <div className={`flex items-start gap-3 ${['accepted', 'submitted', 'needs_changes', 'paid'].includes(currentStatus) ? 'opacity-100' : 'opacity-60'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      ['accepted', 'submitted', 'needs_changes', 'paid'].includes(currentStatus) ? 'bg-brand-600 text-white' : 'bg-zinc-200 text-zinc-500'
                    }`}>
                      {!['accepted', 'submitted', 'needs_changes', 'paid'].includes(currentStatus) ? (
                        <span className="text-xs font-bold">2</span>
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900">Get product</p>
                      <p className="text-xs text-zinc-500">Purchase & receive {gig.reimbursementMode === 'reimbursement' ? '(reimbursed)' : ''}</p>
                    </div>
                  </div>
                )}

                {/* Step 3: Create & Upload */}
                <div className={`flex items-start gap-3 ${['submitted', 'needs_changes', 'paid'].includes(currentStatus) ? 'opacity-100' : 'opacity-60'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    ['submitted', 'needs_changes', 'paid'].includes(currentStatus) ? 'bg-brand-600 text-white' : 'bg-zinc-200 text-zinc-500'
                  }`}>
                    {!['submitted', 'needs_changes', 'paid'].includes(currentStatus) ? (
                      <span className="text-xs font-bold">{gig.productInVideoRequired ? '3' : '2'}</span>
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900">Create & upload</p>
                    <p className="text-xs text-zinc-500">{deliverablesText}</p>
                  </div>
                </div>

                {/* Step 4: AI Compliance */}
                <div className={`flex items-start gap-3 ${['submitted', 'needs_changes', 'paid'].includes(currentStatus) ? 'opacity-100' : 'opacity-60'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    ['submitted', 'needs_changes', 'paid'].includes(currentStatus) ? 'bg-zinc-200 text-zinc-500' : 'bg-zinc-200 text-zinc-500'
                  }`}>
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900">AI compliance check</p>
                    <p className="text-xs text-zinc-500">Instant</p>
                  </div>
                </div>

                {/* Step 5: Brand Review */}
                <div className={`flex items-start gap-3 ${currentStatus === 'paid' ? 'opacity-100' : 'opacity-60'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    currentStatus === 'paid' ? 'bg-zinc-200 text-zinc-500' : 'bg-zinc-200 text-zinc-500'
                  }`}>
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900">Brand review</p>
                    <p className="text-xs text-zinc-500">Max 2 change requests</p>
                  </div>
                </div>

                {/* Step 6: Get Paid */}
                <div className={`flex items-start gap-3 ${currentStatus === 'paid' ? 'opacity-100' : 'opacity-60'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    currentStatus === 'paid' ? 'bg-green-500 text-white' : 'bg-zinc-200 text-zinc-500'
                  }`}>
                    {currentStatus === 'paid' ? <CheckCircle2 className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900">Get paid</p>
                    <p className="text-xs text-zinc-500">Instant payout</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for Details */}
          <Card className="border border-zinc-200 shadow-sm">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full grid grid-cols-4 h-10 bg-zinc-100 rounded-lg p-1">
                <TabsTrigger value="overview" className="text-[11px] px-2">Overview</TabsTrigger>
                <TabsTrigger value="deliverables" className="text-[11px] px-2">Deliverables</TabsTrigger>
                <TabsTrigger value="product" className="text-[11px] px-2">Product</TabsTrigger>
                <TabsTrigger value="rules" className="text-[11px] px-2">Rules</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4 mt-4">
                <div>
                  <h4 className="text-xs font-semibold text-zinc-900 mb-2">Brief Summary</h4>
                  <p className="text-sm text-zinc-600 leading-relaxed">{gig.description || 'No description provided.'}</p>
                </div>
                {gig.brief && (
                  <>
                    {gig.brief.hooks && gig.brief.hooks.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-900 mb-2">Hooks</h4>
                        <ul className="space-y-1">
                          {gig.brief.hooks.map((hook: string, idx: number) => (
                            <li key={idx} className="text-sm text-zinc-600 flex items-start gap-2">
                              <span className="text-zinc-400 mt-1">•</span>
                              <span>{hook}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {gig.brief.talkingPoints && gig.brief.talkingPoints.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-900 mb-2">Talking Points</h4>
                        <ul className="space-y-1">
                          {gig.brief.talkingPoints.map((point: string, idx: number) => (
                            <li key={idx} className="text-sm text-zinc-600 flex items-start gap-2">
                              <span className="text-zinc-400 mt-1">•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {gig.brief.do && gig.brief.do.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Do
                        </h4>
                        <ul className="space-y-1">
                          {gig.brief.do.map((item: string, idx: number) => (
                            <li key={idx} className="text-sm text-zinc-600 flex items-start gap-2">
                              <span className="text-green-500 mt-1">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {gig.brief.dont && gig.brief.dont.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-2">
                          <XCircle className="w-4 h-4" />
                          Don't
                        </h4>
                        <ul className="space-y-1">
                          {gig.brief.dont.map((item: string, idx: number) => (
                            <li key={idx} className="text-sm text-zinc-600 flex items-start gap-2">
                              <span className="text-red-500 mt-1">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Deliverables Tab */}
              <TabsContent value="deliverables" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-900 mb-2">Required Deliverables</h4>
                    <div className="space-y-2">
                      {deliverables.videos > 0 && (
                        <div className="flex items-center gap-2 p-2 bg-zinc-50 rounded-lg">
                          <Play className="w-4 h-4 text-zinc-600" />
                          <div>
                            <p className="text-sm font-medium text-zinc-900">{deliverables.videos} video{deliverables.videos > 1 ? 's' : ''}</p>
                            <p className="text-xs text-zinc-500">Format: MP4, 1080p minimum</p>
                          </div>
                        </div>
                      )}
                      {deliverables.photos > 0 && (
                        <div className="flex items-center gap-2 p-2 bg-zinc-50 rounded-lg">
                          <ImageIcon className="w-4 h-4 text-zinc-600" />
                          <div>
                            <p className="text-sm font-medium text-zinc-900">{deliverables.photos} photo{deliverables.photos > 1 ? 's' : ''}</p>
                            <p className="text-xs text-zinc-500">Format: JPEG, 1080p minimum</p>
                          </div>
                        </div>
                      )}
                      {deliverables.raw && (
                        <div className="flex items-center gap-2 p-2 bg-zinc-50 rounded-lg">
                          <FileText className="w-4 h-4 text-zinc-600" />
                          <div>
                            <p className="text-sm font-medium text-zinc-900">Raw files required</p>
                            <p className="text-xs text-zinc-500">Unedited original files</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {deliverables.notes && (
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-900 mb-2">Additional Notes</h4>
                      <p className="text-sm text-zinc-600">{deliverables.notes}</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Product Tab */}
              <TabsContent value="product" className="space-y-4 mt-4">
                {gig.productInVideoRequired ? (
                  <>
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-900 mb-2">Product Information</h4>
                      <p className="text-sm text-zinc-600">{gig.productDescription || 'Product details will be provided after acceptance.'}</p>
                    </div>
                    {gig.brief?.brandAssets && (
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-900 mb-2">Brand Assets</h4>
                        <div className="grid grid-cols-3 gap-2">
                          {gig.brief.brandAssets?.logos?.map((url: string, idx: number) => (
                            <div key={idx} className="aspect-square bg-zinc-100 rounded-lg flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-zinc-400" />
                            </div>
                          ))}
                          {gig.brief.brandAssets?.productPhotos?.map((url: string, idx: number) => (
                            <div key={idx} className="aspect-square bg-zinc-100 rounded-lg flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-zinc-400" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {gig.reimbursementMode && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="text-xs font-semibold text-blue-900 mb-1">Reimbursement</h4>
                        <p className="text-xs text-blue-700">
                          {gig.reimbursementMode === 'reimbursement'
                            ? `We'll reimburse up to ${formatMoney(gig.reimbursementCap || 0)} for product purchase.`
                            : 'Product will be shipped to you.'}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-zinc-500">No product required for this gig.</p>
                )}
              </TabsContent>

              {/* Rules Tab */}
              <TabsContent value="rules" className="space-y-4 mt-4">
                <div>
                  <h4 className="text-xs font-semibold text-zinc-900 mb-2">Compliance Requirements</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm text-zinc-600">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Content must comply with platform guidelines</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-zinc-600">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>AI compliance check required</span>
                    </li>
                    {gig.usageRightsSnapshot && (
                      <li className="flex items-start gap-2 text-sm text-zinc-600">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Usage rights: {gig.usageRightsSnapshot.licenseType || 'Standard'}</span>
                      </li>
                    )}
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="text-xs font-semibold text-zinc-900 mb-2">Review Policy</h4>
                  <p className="text-sm text-zinc-600">Brand may request up to 2 revisions. Changes must be requested within 48 hours of submission.</p>
                </div>
                <Separator />
                <div>
                  <h4 className="text-xs font-semibold text-zinc-900 mb-2">Payout Policy</h4>
                  <p className="text-sm text-zinc-600">Funds are held until brand approval. Payment is released instantly upon approval.</p>
                </div>
              </TabsContent>
            </Tabs>
          </Card>

          {/* Trust & Safety Footer */}
          <Card className="border border-zinc-200 shadow-sm bg-zinc-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-zinc-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-zinc-900">Giglet protects payouts</p>
                  <p className="text-xs text-zinc-600">Payments held until approval • Disputes handled by admin</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sticky Bottom Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 px-4 py-3 safe-area-bottom z-20">
          <div className="max-w-[430px] mx-auto flex gap-3">
            {currentStatus === 'open' && (
              <>
                <Button
                  onClick={handleAcceptGig}
                  className="flex-1 h-11 text-base font-semibold"
                  size="lg"
                >
                  Accept Gig
                </Button>
                <Button variant="outline" size="icon" className="h-11 w-11">
                  <Share2 className="w-4 h-4" />
                </Button>
              </>
            )}
            {currentStatus === 'accepted' && (
              <>
                <Button
                  onClick={handleStartSubmission}
                  className="flex-1 h-11 text-base font-semibold"
                  size="lg"
                >
                  Start / Upload Submission
                </Button>
                <Button variant="outline" size="icon" className="h-11 w-11">
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </>
            )}
            {currentStatus === 'submitted' && (
              <>
                <Button
                  onClick={handleViewSubmission}
                  className="flex-1 h-11 text-base font-semibold"
                  size="lg"
                >
                  View Submission
                </Button>
                <Button variant="outline" size="icon" className="h-11 w-11">
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </>
            )}
            {currentStatus === 'needs_changes' && (
              <>
                <Button
                  onClick={handleUploadRevision}
                  className="flex-1 h-11 text-base font-semibold"
                  size="lg"
                >
                  Upload Revision
                </Button>
                <Button variant="outline" size="lg" className="h-11">
                  View Feedback
                </Button>
              </>
            )}
            {currentStatus === 'paid' && (
              <>
                <Button
                  onClick={() => toast.info('View payout (placeholder)')}
                  className="flex-1 h-11 text-base font-semibold"
                  size="lg"
                >
                  View Payout
                </Button>
                <Button variant="outline" size="lg" className="h-11">
                  <Star className="w-4 h-4 mr-2" />
                  Rate Brand
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
