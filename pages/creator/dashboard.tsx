'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Zap,
  ArrowDownToLine,
  ArrowRight,
  Trophy,
  Clock,
  Loader2,
  ShieldCheck,
  Briefcase,
  ChevronRight,
  Star,
  Link2,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { useCreatorData } from '@/components/dashboard/useCreatorData';
import { useDashboardData } from '@/components/dashboard/useDashboardData';
import { useCommunityLeaderboard } from '@/components/dashboard/useCommunityLeaderboard';
import ProfileModal from '@/components/dashboard/ProfileModal';
import VerifyModal from '@/components/dashboard/VerifyModal';
import SettingsModal from '@/components/dashboard/SettingsModal';
import CommunityModal from '@/components/dashboard/CommunityModal';
import { calculateTrustScore } from '@/lib/trustScore/calculator';
import { canUseInstantWithdrawal } from '@/lib/payments/withdrawal';
import { formatCurrency as formatCurrencyUtil } from '@/lib/utils/formatters';
import { logger } from '@/lib/utils/logger';

const formatCurrency = (cents: number) => formatCurrencyUtil(cents);

export default function CreatorDashboard() {
  const { user, appUser } = useAuth();
  const router = useRouter();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [communityModalOpen, setCommunityModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const { creatorData, refetch: refetchCreatorData } = useCreatorData(user, appUser);
  const { balance, loadingBalance, stats, loadingStats } = useDashboardData(user, appUser, creatorData);
  const { leaderboard: communityLeaderboard, communityName, loading: loadingLeaderboard } = useCommunityLeaderboard(
    creatorData,
    user,
    communityModalOpen
  );

  useEffect(() => {
    const checkStripeStatus = async () => {
      if (!user?.uid) return;
      try {
        const response = await fetch('/api/stripe/check-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.uid }),
        });
        const data = await response.json();
        if (data.success) {
          if (data.status?.onboardingComplete) {
            toast.success('Stripe Connect setup complete!');
            await refetchCreatorData();
            setTimeout(() => refetchCreatorData(), 500);
          } else {
            await refetchCreatorData();
          }
        }
      } catch (error) {
        logger.error('Error checking Stripe status', error);
      }
    };

    if (router.query.stripe_return === 'true') {
      checkStripeStatus();
      toast.success('Payment method setup complete!');
      router.replace('/creator/dashboard', undefined, { shallow: true });
    }
    if (router.query.stripe_refresh === 'true') {
      toast.error('Please complete the payment setup.');
      router.replace('/creator/dashboard', undefined, { shallow: true });
    }
    if (router.query.identity_verified === 'true') {
      checkStripeStatus();
      toast.success('Identity verification submitted!');
      router.replace('/creator/dashboard', undefined, { shallow: true });
    }
    if (router.query.settings === 'true') {
      setSettingsModalOpen(true);
      router.replace('/creator/dashboard', undefined, { shallow: true });
    }
  }, [router.query, router, refetchCreatorData, user]);

  useEffect(() => {
    if (appUser && appUser.role !== 'creator') {
      router.push('/creator/dashboard');
    }
  }, [appUser, router]);

  if (!user || !appUser) {
    return <Layout><LoadingSpinner /></Layout>;
  }

  if (appUser.role !== 'creator') {
    return null;
  }

  const trustScore = creatorData ? calculateTrustScore(creatorData) : 20;
  const balanceCents = balance !== null ? Math.round(balance * 100) : 0;
  const balanceDollars = balance || 0;
  const canUseInstant = canUseInstantWithdrawal(trustScore);

  // Profile completion
  const socials = creatorData?.socials || {};
  const linkedSocials = [socials.tiktok, socials.instagram, socials.youtube, socials.x].filter(Boolean).length;
  const hasPayment = !!creatorData?.stripe?.onboardingComplete;
  const hasIdentity = !!creatorData?.stripe?.identityVerified;
  const hasPhone = !!creatorData?.phoneVerified;
  
  const profileSteps = [
    { id: 'socials', label: 'Link socials', done: linkedSocials >= 2, action: () => setProfileModalOpen(true) },
    { id: 'payment', label: 'Add payment', done: hasPayment, action: () => setVerifyModalOpen(true) },
    { id: 'identity', label: 'Verify identity', done: hasIdentity, action: () => setVerifyModalOpen(true) },
  ];
  const completedSteps = profileSteps.filter(s => s.done).length;
  const profileComplete = completedSteps === profileSteps.length;

  const pendingEarnings = stats?.pendingEarnings || 0;
  const totalEarnings = stats?.totalEarnings || 0;
  const completedGigs = stats?.acceptedGigs || 0;

  const handleWithdraw = async () => {
    if (!user) return;
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    if (amount < 1) { toast.error('Minimum withdrawal is $1.00'); return; }
    if (amount > balanceDollars) { toast.error('Insufficient balance'); return; }

    setWithdrawing(true);
    try {
      const response = await fetch('/api/stripe/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, userId: user.uid }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Withdrawal failed');
      toast.success(data.message || 'Withdrawal initiated!');
      setWithdrawModalOpen(false);
      setWithdrawAmount('');
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || 'Withdrawal failed');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen -mt-4">
        <div className="max-w-lg mx-auto px-4 pb-6 space-y-4">
          
          {/* Balance Hero Card */}
          <div className="relative overflow-hidden rounded-2xl bg-zinc-900">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/15 via-transparent to-transparent" />
            
            <div className="relative p-5">
              {/* Balance */}
              <div className="text-center mb-3">
                <p className="text-zinc-500 text-[10px] font-medium uppercase tracking-wider mb-1">Available Balance</p>
                {loadingBalance ? (
                  <div className="h-12 w-36 mx-auto bg-zinc-800 animate-pulse rounded-lg" />
                ) : (
                  <p className="text-4xl font-black text-white tracking-tight">
                    {formatCurrency(balanceCents)}
                  </p>
                )}
              </div>

              {/* Pending row */}
              {pendingEarnings > 0 && (
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span className="text-xs text-zinc-400">
                    <span className="text-amber-400 font-semibold">{formatCurrency(Math.round(pendingEarnings * 100))}</span> pending
                  </span>
                </div>
              )}

              {/* Instant badge */}
              <div className="flex items-center justify-center gap-1.5 mb-4">
                {canUseInstant ? (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-medium text-amber-400">Instant withdrawals unlocked</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-xs text-zinc-500">ACH 2-3 days • Verify for instant</span>
                  </>
                )}
              </div>

              {/* Withdraw Button */}
              {balanceCents > 0 ? (
                <button
                  onClick={() => setWithdrawModalOpen(true)}
                  className="w-full py-3 bg-white text-zinc-900 rounded-xl font-semibold text-sm hover:bg-zinc-100 transition-all flex items-center justify-center gap-2"
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  Withdraw
                </button>
              ) : (
                <Link href="/creator/gigs" className="block">
                  <div className="w-full py-3 bg-emerald-500 text-white rounded-xl font-semibold text-sm hover:bg-emerald-600 transition-all flex items-center justify-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Find Your First Gig
                  </div>
                </Link>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl border border-zinc-200 p-3 text-center">
              <p className="text-lg font-bold text-zinc-900">{completedGigs}</p>
              <p className="text-[10px] text-zinc-500">Completed</p>
            </div>
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-3 text-center">
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(Math.round(totalEarnings * 100))}</p>
              <p className="text-[10px] text-emerald-500 font-medium">Earned</p>
            </div>
            <div className="bg-white rounded-xl border border-zinc-200 p-3 text-center">
              <p className="text-lg font-bold text-zinc-900">{stats?.avgScore ? `${stats.avgScore}` : '—'}</p>
              <p className="text-[10px] text-zinc-500">Avg Score</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setProfileModalOpen(true)}
              className={`rounded-xl border p-3 flex items-center gap-3 transition-all ${
                linkedSocials >= 1 
                  ? 'bg-white border-zinc-200 hover:border-zinc-300' 
                  : 'bg-orange-50 border-orange-200 hover:border-orange-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                linkedSocials >= 1 ? 'bg-orange-100' : 'bg-orange-200'
              }`}>
                <Link2 className="w-5 h-5 text-orange-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-zinc-900 text-sm">Socials</p>
                <p className={`text-[10px] ${linkedSocials >= 1 ? 'text-zinc-500' : 'text-orange-600 font-medium'}`}>
                  {linkedSocials >= 1 ? `${linkedSocials}/4 linked` : 'Link now'}
                </p>
              </div>
            </button>
            <button
              onClick={() => setVerifyModalOpen(true)}
              className={`rounded-xl border p-3 flex items-center gap-3 transition-all ${
                hasPayment && hasIdentity && hasPhone
                  ? 'bg-white border-zinc-200 hover:border-zinc-300' 
                  : 'bg-violet-50 border-violet-200 hover:border-violet-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                hasPayment && hasIdentity && hasPhone ? 'bg-violet-100' : 'bg-violet-200'
              }`}>
                <ShieldCheck className="w-5 h-5 text-violet-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-zinc-900 text-sm">Verify</p>
                <p className={`text-[10px] ${hasPayment && hasIdentity && hasPhone ? 'text-emerald-600' : 'text-violet-600 font-medium'}`}>
                  {hasPayment && hasIdentity && hasPhone 
                    ? 'Complete ✓' 
                    : `${[hasPayment, hasIdentity, hasPhone].filter(Boolean).length}/3 done`}
                </p>
              </div>
            </button>
          </div>

          {/* Community (if enrolled) */}
          {creatorData?.communityId && (
            <button
              onClick={() => setCommunityModalOpen(true)}
              className="w-full bg-white rounded-2xl border border-zinc-200 p-4 flex items-center gap-4 hover:border-zinc-300 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-zinc-900">{communityName || 'Community'}</p>
                <p className="text-xs text-zinc-500">View leaderboard</p>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-400" />
            </button>
          )}

          {/* Browse Gigs CTA */}
          <Link href="/creator/gigs" className="block">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 p-5">
              <div className="absolute top-2 right-8 w-2 h-2 bg-white/30 rounded-full" />
              <div className="absolute top-5 right-4 w-1.5 h-1.5 bg-white/20 rounded-full" />
              <div className="absolute bottom-3 right-16 w-1 h-1 bg-white/30 rounded-full" />
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-lg">Browse Gigs</p>
                  <p className="text-orange-100 text-sm">Find your next opportunity</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Modals */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        creatorData={creatorData}
        userId={user?.uid}
        onRefresh={refetchCreatorData}
      />
      <VerifyModal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        creatorData={creatorData}
        userId={user?.uid}
        onRefresh={refetchCreatorData}
      />
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        creatorData={creatorData}
        userId={user?.uid}
        onRefresh={refetchCreatorData}
      />
      <CommunityModal
        isOpen={communityModalOpen}
        onClose={() => setCommunityModalOpen(false)}
        communityName={communityName}
        leaderboard={communityLeaderboard}
        loadingLeaderboard={loadingLeaderboard}
        currentUserId={user?.uid || ''}
      />

      {/* Withdrawal Dialog */}
      <Dialog open={withdrawModalOpen} onOpenChange={setWithdrawModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
            <DialogDescription>Available: {formatCurrency(balanceCents)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!creatorData?.stripe?.connectAccountId ? (
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                <p className="text-sm font-semibold text-zinc-900 mb-2">Payment Setup Required</p>
                <p className="text-xs text-zinc-600 mb-3">Set up your payment method to withdraw.</p>
                <Button
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/stripe/connect-onboard', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: user?.uid }),
                      });
                      const data = await response.json();
                      if (data.url) window.location.href = data.url;
                      else toast.error('Failed to create setup link');
                    } catch {
                      toast.error('Failed to start setup');
                    }
                  }}
                  className="w-full"
                >
                  Set Up Payment
                </Button>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium text-zinc-900 mb-2 block">Amount</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    min="1"
                    max={balanceDollars.toFixed(2)}
                    step="0.01"
                    className="text-lg font-semibold"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount((balanceDollars * 0.5).toFixed(2))}
                      className="px-3 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(balanceDollars.toFixed(2))}
                      className="px-3 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200"
                    >
                      Max
                    </button>
                  </div>
                </div>
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                  <div className="flex items-center gap-2 mb-1">
                    {canUseInstant ? (
                      <>
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-semibold text-zinc-900">Instant</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-semibold text-zinc-900">ACH Transfer</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-zinc-600">
                    {canUseInstant ? 'Arrives within minutes.' : 'Arrives in 2-3 business days.'}
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawModalOpen(false)} disabled={withdrawing}>
              Cancel
            </Button>
            <Button
              onClick={handleWithdraw}
              disabled={withdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || !creatorData?.stripe?.connectAccountId}
            >
              {withdrawing ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Processing...</>
              ) : canUseInstant ? (
                <><Zap className="w-4 h-4 mr-2" />Withdraw Instantly</>
              ) : (
                'Withdraw'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
