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
  User,
  Trophy,
  Clock,
  Loader2,
  ShieldCheck,
  Settings,
  Briefcase,
  TrendingUp,
  ChevronRight,
  Sparkles,
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
      <div className="min-h-screen bg-zinc-50">
        <div className="max-w-lg mx-auto px-4 pt-3 pb-6 space-y-4">
          {/* Greeting */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-500 text-sm">Welcome back</p>
              <h1 className="text-xl font-bold text-zinc-900">@{creatorData?.username || 'Creator'}</h1>
            </div>
            <button
              onClick={() => setSettingsModalOpen(true)}
              className="w-10 h-10 rounded-full bg-white border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 transition-colors"
            >
              <Settings className="w-5 h-5 text-zinc-600" />
            </button>
          </div>

          {/* Balance Card */}
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl p-5 text-white">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-1">Available Balance</p>
                {loadingBalance ? (
                  <div className="h-10 w-32 bg-zinc-700 animate-pulse rounded" />
                ) : (
                  <p className="text-4xl font-bold tracking-tight">{formatCurrency(balanceCents)}</p>
                )}
              </div>
              {balanceCents > 0 && (
                <button
                  onClick={() => setWithdrawModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-zinc-900 rounded-xl font-semibold text-sm hover:bg-zinc-100 transition-colors"
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  Withdraw
                </button>
              )}
            </div>

            {balanceCents === 0 ? (
              <Link href="/creator/gigs" className="block">
                <div className="flex items-center justify-between p-3 bg-white/10 rounded-xl hover:bg-white/15 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                      <Briefcase className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium">Find your first gig</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-400" />
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                {canUseInstant ? (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Instant payout enabled</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5" />
                    <span>ACH (2-3 days) • Verify for instant</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Level Progress */}
          {creatorData && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{level}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{levelLabel}</p>
                    <p className="text-xs text-zinc-500">{rep.toLocaleString()} rep</p>
                  </div>
                </div>
                {level < 7 && (
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">Next level</p>
                    <p className="text-sm font-semibold text-zinc-900">{nextLevelRep.toLocaleString()}</p>
                  </div>
                )}
              </div>
              {level < 7 && (
                <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-violet-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(progressPercent, 100)}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-zinc-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Earned</span>
              </div>
              {loadingStats ? (
                <div className="h-7 w-20 bg-zinc-100 animate-pulse rounded" />
              ) : (
                <p className="text-2xl font-bold text-zinc-900">
                  {formatCurrency(Math.round((stats.totalEarnings || 0) * 100))}
                </p>
              )}
            </div>
            <div className="bg-white rounded-2xl border border-zinc-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Completed</span>
              </div>
              {loadingStats ? (
                <div className="h-7 w-12 bg-zinc-100 animate-pulse rounded" />
              ) : (
                <p className="text-2xl font-bold text-zinc-900">{stats.acceptedGigs || 0}</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide px-1">Quick Actions</p>

            <button
              onClick={() => setProfileModalOpen(true)}
              className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-zinc-200 hover:border-zinc-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-zinc-900">Edit Profile</p>
                  <p className="text-xs text-zinc-500">Bio, interests, socials</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-400" />
            </button>

            <button
              onClick={() => setVerifyModalOpen(true)}
              className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-zinc-200 hover:border-zinc-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-zinc-900">Verify Account</p>
                  <p className="text-xs text-zinc-500">
                    Trust score: {trustScore}/100
                    {trustScore < 50 && ' • Verify to unlock perks'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-400" />
            </button>

            {creatorData?.communityId && (
              <button
                onClick={() => setCommunityModalOpen(true)}
                className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-zinc-200 hover:border-zinc-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-zinc-900">Community</p>
                    <p className="text-xs text-zinc-500">{communityName || 'View leaderboard'}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-400" />
              </button>
            )}
          </div>

          {/* Find Gigs CTA */}
          <Link href="/creator/gigs" className="block">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-4 flex items-center justify-between hover:shadow-lg hover:shadow-emerald-500/20 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold">Browse Available Gigs</p>
                  <p className="text-emerald-100 text-xs">Find your next opportunity</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-white" />
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
    </Layout>
  );
}
