'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { useRouter } from 'next/router';
import { getRepLevel } from '@/lib/rep/service';
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
  Settings,
  Briefcase,
  TrendingUp,
  ChevronRight,
  Sparkles,
  Star,
  Link2,
  CheckCircle2,
} from 'lucide-react';
import { useCreatorData } from '@/components/dashboard/useCreatorData';
import { useDashboardData } from '@/components/dashboard/useDashboardData';
import { useCommunityLeaderboard } from '@/components/dashboard/useCommunityLeaderboard';
import ProfileModal from '@/components/dashboard/ProfileModal';
import VerifyModal from '@/components/dashboard/VerifyModal';
import SettingsModal from '@/components/dashboard/SettingsModal';
import CommunityModal from '@/components/dashboard/CommunityModal';
import { calculateTrustScore } from '@/lib/trustScore/calculator';
import { canUseInstantWithdrawal, INSTANT_WITHDRAWAL_TRUST_SCORE_THRESHOLD } from '@/lib/payments/withdrawal';

const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
};

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
        console.error('Error checking Stripe status:', error);
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
  }, [router.query, router, refetchCreatorData, user]);

  useEffect(() => {
    if (appUser && appUser.role !== 'creator') {
      router.push('/creator/dashboard');
    }
  }, [appUser, router]);

  if (!user || !appUser) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  if (appUser.role !== 'creator') {
    return null;
  }

  const rep = creatorData?.rep || 0;
  const { level, title: levelLabel, nextLevelRep, prevLevelRep } = getRepLevel(rep);
  const trustScore = creatorData ? calculateTrustScore(creatorData) : 20;
  const balanceCents = balance !== null ? Math.round(balance * 100) : 0;
  const balanceDollars = balance || 0;
  const canUseInstant = canUseInstantWithdrawal(trustScore);

  const progressPercent = nextLevelRep > prevLevelRep ? ((rep - prevLevelRep) / (nextLevelRep - prevLevelRep)) * 100 : 100;

  // Count linked socials
  const socials = creatorData?.socials || {};
  const linkedSocials = [socials.tiktok, socials.instagram, socials.youtube, socials.x].filter(Boolean).length;

  // Count verifications
  const verifications = [
    creatorData?.stripe?.onboardingComplete,
    creatorData?.stripe?.identityVerified,
    creatorData?.phoneVerified,
  ].filter(Boolean).length;

  const handleWithdraw = async () => {
    if (!user) return;

    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (amount < 1) {
      toast.error('Minimum withdrawal is $1.00');
      return;
    }
    if (amount > balanceDollars) {
      toast.error(`Insufficient balance`);
      return;
    }

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
      <div className="min-h-screen bg-gradient-to-b from-zinc-100 to-zinc-50 -mt-4">
        <div className="max-w-lg mx-auto px-4 pb-6 space-y-5">

          {/* Profile Header */}
          <div className="relative">
            {/* Decorative background blur circles */}
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-gradient-to-br from-violet-400/20 to-purple-400/20 rounded-full blur-2xl" />
            <div className="absolute -top-2 right-8 w-20 h-20 bg-gradient-to-br from-violet-400/15 to-purple-400/15 rounded-full blur-2xl" />

            <div className="relative flex items-center gap-2">
              {/* Level Badge */}
              {creatorData && (
                <div className="flex-1 relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl blur opacity-50 group-hover:opacity-70 transition-opacity" />
                  <div className="relative flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl border border-white/10">
                    <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">{level}</span>
                    </div>
                    <span className="text-white text-xs font-semibold flex-shrink-0">{levelLabel}</span>
                    <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden mx-2">
                      <div
                        className="h-full bg-gradient-to-r from-amber-300 to-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(progressPercent, 100)}%` }}
                      />
                    </div>
                    <span className="text-violet-200 text-xs flex-shrink-0">{rep.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Settings */}
              <button
                onClick={() => setSettingsModalOpen(true)}
                className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 hover:border-zinc-300 hover:shadow-md transition-all shadow-sm"
              >
                <Settings className="w-5 h-5 text-zinc-500" />
              </button>
            </div>
          </div>

          {/* Balance Card - Premium Design */}
          <div className="relative overflow-hidden rounded-2xl">
            {/* Background with mesh gradient effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-violet-500/10 via-transparent to-transparent" />

            <div className="relative p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-widest mb-1">Available Balance</p>
                  {loadingBalance ? (
                    <div className="h-9 w-32 bg-zinc-700/50 animate-pulse rounded-lg" />
                  ) : (
                    <p className="text-3xl font-bold text-white tracking-tight">
                      {formatCurrency(balanceCents)}
                    </p>
                  )}
                </div>
                {balanceCents > 0 && (
                  <button
                    onClick={() => setWithdrawModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white text-zinc-900 rounded-xl font-semibold text-xs hover:bg-zinc-100 transition-all shadow-lg shadow-black/20"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    Withdraw
                  </button>
                )}
              </div>

              {balanceCents === 0 ? (
                <Link href="/creator/gigs" className="block">
                  <div className="flex items-center justify-between p-3 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <Briefcase className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-white">Find your first gig</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                  {canUseInstant ? (
                    <>
                      <div className="w-5 h-5 rounded-md bg-amber-500/20 flex items-center justify-center">
                        <Zap className="w-3 h-3 text-amber-400" />
                      </div>
                      <span className="text-xs font-medium text-zinc-300">Instant payout enabled</span>
                    </>
                  ) : (
                    <>
                      <div className="w-5 h-5 rounded-md bg-blue-500/20 flex items-center justify-center">
                        <Clock className="w-3 h-3 text-blue-400" />
                      </div>
                      <span className="text-xs text-zinc-400">ACH (2-3 days) • Verify for instant</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats Row - Glass Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative overflow-hidden bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-emerald-100 to-transparent rounded-bl-full" />
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/20">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Earned</p>
                {loadingStats ? (
                  <div className="h-8 w-24 bg-zinc-100 animate-pulse rounded" />
                ) : (
                  <p className="text-2xl font-black text-zinc-900">
                    {formatCurrency(Math.round((stats.totalEarnings || 0) * 100))}
                  </p>
                )}
              </div>
            </div>

            <div className="relative overflow-hidden bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-blue-100 to-transparent rounded-bl-full" />
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-3 shadow-lg shadow-blue-500/20">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Completed</p>
                {loadingStats ? (
                  <div className="h-8 w-12 bg-zinc-100 animate-pulse rounded" />
                ) : (
                  <p className="text-2xl font-black text-zinc-900">{stats.acceptedGigs || 0}</p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions - Enhanced Cards */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1">Quick Actions</p>

            {/* Link Socials */}
            <button
              onClick={() => setProfileModalOpen(true)}
              className="w-full group relative overflow-hidden bg-white rounded-2xl border border-zinc-200/80 hover:border-orange-200 transition-all shadow-sm hover:shadow-lg hover:shadow-orange-500/10"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 via-pink-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/25 group-hover:shadow-orange-500/40 group-hover:scale-105 transition-all">
                    <Link2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-base font-bold text-zinc-900">Link Socials</p>
                    <p className="text-xs text-zinc-500">{linkedSocials}/4 connected</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {linkedSocials === 4 && (
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                  )}
                  <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </button>

            {/* Verify Account */}
            <button
              onClick={() => setVerifyModalOpen(true)}
              className="w-full group relative overflow-hidden bg-white rounded-2xl border border-zinc-200/80 hover:border-emerald-200 transition-all shadow-sm hover:shadow-lg hover:shadow-emerald-500/10"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:shadow-emerald-500/40 group-hover:scale-105 transition-all">
                    <ShieldCheck className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-base font-bold text-zinc-900">Verify Account</p>
                    <p className="text-xs text-zinc-500">{verifications}/3 verified</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {verifications === 3 && (
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                  )}
                  <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </button>

            {/* Community */}
            {creatorData?.communityId && (
              <button
                onClick={() => setCommunityModalOpen(true)}
                className="w-full group relative overflow-hidden bg-white rounded-2xl border border-zinc-200/80 hover:border-amber-200 transition-all shadow-sm hover:shadow-lg hover:shadow-amber-500/10"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25 group-hover:shadow-amber-500/40 group-hover:scale-105 transition-all">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-base font-bold text-zinc-900">Community</p>
                      <p className="text-xs text-zinc-500">{communityName || 'View leaderboard'}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            )}
          </div>

          {/* Find Gigs CTA - Enhanced */}
          <Link href="/creator/gigs" className="block group">
            <div className="relative overflow-hidden rounded-2xl">
              {/* Animated gradient background */}
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 bg-[length:200%_100%] group-hover:animate-[shimmer_2s_linear_infinite]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

              {/* Sparkle decorations */}
              <div className="absolute top-3 right-12 w-2 h-2 bg-white/40 rounded-full" />
              <div className="absolute top-6 right-6 w-1.5 h-1.5 bg-white/30 rounded-full" />
              <div className="absolute bottom-4 right-20 w-1 h-1 bg-white/40 rounded-full" />

              <div className="relative p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">Browse Gigs</p>
                    <p className="text-emerald-100 text-sm">Find your next opportunity</p>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20 group-hover:translate-x-1 transition-transform">
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
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 mb-2">Payment Setup Required</p>
                <p className="text-xs text-blue-700 mb-3">Set up your payment method to withdraw funds.</p>
                <Button
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/stripe/connect-onboard', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: user?.uid }),
                      });
                      const data = await response.json();
                      if (data.url) {
                        window.location.href = data.url;
                      } else {
                        toast.error('Failed to create setup link');
                      }
                    } catch {
                      toast.error('Failed to start setup');
                    }
                  }}
                  className="w-full"
                >
                  Set Up Payment Method
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
                      className="px-3 py-1 text-xs font-medium text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(balanceDollars.toFixed(2))}
                      className="px-3 py-1 text-xs font-medium text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200"
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
                        <span className="text-sm font-semibold text-zinc-900">Instant Withdrawal</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-semibold text-zinc-900">ACH Withdrawal</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-zinc-600">
                    {canUseInstant
                      ? 'Arrives within minutes to your debit card.'
                      : 'Arrives in 2-3 business days. Verify identity for instant.'}
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
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : canUseInstant ? (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Withdraw Instantly
                </>
              ) : (
                'Withdraw'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </Layout>
  );
}
