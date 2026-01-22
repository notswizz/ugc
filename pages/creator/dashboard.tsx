import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { useRouter } from 'next/router';
import { getRepLevel } from '@/lib/rep/service';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { Zap, ArrowDownToLine, ArrowRight, User, Trophy, Clock, Loader2, ShieldCheck, Settings } from 'lucide-react';
import { useCreatorData } from '@/components/dashboard/useCreatorData';
import { useDashboardData } from '@/components/dashboard/useDashboardData';
import { useCommunityLeaderboard } from '@/components/dashboard/useCommunityLeaderboard';
import ProfileModal from '@/components/dashboard/ProfileModal';
import VerifyModal from '@/components/dashboard/VerifyModal';
import SettingsModal from '@/components/dashboard/SettingsModal';
import CommunityModal from '@/components/dashboard/CommunityModal';
import { calculateTrustScore } from '@/lib/trustScore/calculator';
import { canUseInstantWithdrawal, INSTANT_WITHDRAWAL_TRUST_SCORE_THRESHOLD } from '@/lib/payments/withdrawal';

// Utility functions
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

  // Fetch creator profile data
  const { creatorData, refetch: refetchCreatorData } = useCreatorData(user, appUser);

  // Fetch dashboard data (balance, stats)
  const {
    balance,
    loadingBalance,
    stats,
    loadingStats,
  } = useDashboardData(user, appUser, creatorData);

  // Fetch community leaderboard when modal opens
  const {
    leaderboard: communityLeaderboard,
    communityName,
    loading: loadingLeaderboard,
  } = useCommunityLeaderboard(creatorData, user, communityModalOpen);

  // Handle Stripe Connect return
  useEffect(() => {
    const checkStripeStatus = async () => {
      if (!user?.uid) return;
      
      try {
        const response = await fetch('/api/check-stripe-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.uid }),
        });
        const data = await response.json();
        
        if (data.success) {
          // Refresh creator data after checking status
          await refetchCreatorData();
        }
      } catch (error) {
        console.error('Error checking Stripe status:', error);
      }
    };

    if (router.query.stripe_return === 'true') {
      checkStripeStatus();
      toast.success('Payment method setup complete! Checking status...');
      router.replace('/creator/dashboard', undefined, { shallow: true });
    }
    if (router.query.stripe_refresh === 'true') {
      // User needs to complete setup
      toast.error('Please complete the payment setup to continue.');
      router.replace('/creator/dashboard', undefined, { shallow: true });
    }
    if (router.query.identity_verified === 'true') {
      checkStripeStatus();
      toast.success('Identity verification submitted! Checking status...');
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
  const { level, title: levelLabel, nextLevelRep } = getRepLevel(rep);
  const trustScore = creatorData ? calculateTrustScore(creatorData) : 20;
  const isTrusted = trustScore >= 50;
  const balanceCents = balance !== null ? Math.round(balance * 100) : 0;
  const balanceDollars = balance || 0;
  const canUseInstant = canUseInstantWithdrawal(trustScore);
  const hasInstantPayout = canUseInstant;
  
  // Calculate rep delta (mock for now - would come from recent activity)
  const repDelta = 0; // Could track last rep change

  const handleWithdraw = async () => {
    if (!user) {
      toast.error('Please sign in');
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount < 1) {
      toast.error('Minimum withdrawal amount is $1.00');
      return;
    }

    if (amount > balanceDollars) {
      toast.error(`Insufficient balance. Available: $${balanceDollars.toFixed(2)}`);
      return;
    }

    setWithdrawing(true);
    try {
      const response = await fetch('/api/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          amount,
          userId: user.uid,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Withdrawal failed');
      }

      toast.success(data.message || 'Withdrawal initiated successfully!');
      setWithdrawModalOpen(false);
      setWithdrawAmount('');
      
      // Refresh balance
      if (refetchCreatorData) {
        refetchCreatorData();
      }
      
      // Reload page to refresh balance
      window.location.reload();
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      toast.error(error.message || 'Failed to process withdrawal');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-[430px] mx-auto px-4 pb-6 space-y-4">
        {/* HERO: Balance Card */}
        <Card className="border border-gray-200 bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-lg">
          <CardHeader className="pb-3 pt-5 px-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Available</p>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="flex items-baseline justify-between mb-4">
              <div>
                {loadingBalance ? (
                  <div className="text-4xl font-bold text-gray-300">...</div>
                ) : (
                  <div className="text-4xl font-bold">{formatCurrency(balanceCents)}</div>
                )}
              </div>
              <Button
                size="sm"
                disabled={balanceCents === 0}
                onClick={() => balanceCents > 0 && setWithdrawModalOpen(true)}
                className={
                  balanceCents === 0
                    ? 'bg-white/10 text-gray-500 border-0 cursor-not-allowed shadow-none'
                    : 'bg-white text-gray-900 hover:bg-gray-100 hover:text-gray-900 border-0 shadow-md hover:shadow-lg font-semibold px-4'
                }
              >
                <ArrowDownToLine className="w-3.5 h-3.5 mr-1.5" />
                Withdraw
              </Button>
            </div>
            {balanceCents === 0 ? (
              <div className="pt-4 border-t border-gray-700">
                <p className="text-sm text-gray-400 mb-3">Complete 1 job to unlock your first payout</p>
                <Link href="/creator/gigs">
                  <Button className="w-full bg-white text-gray-900 hover:bg-gray-100 font-semibold">
                    Browse Jobs
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-gray-400 pt-3 border-t border-gray-700">
                {canUseInstant ? (
                  <>
                    <Zap className="w-3.5 h-3.5 text-orange-400" />
                    <span>Instant payout enabled</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>ACH payout (2-3 business days) - Complete identity verification for instant</span>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress Card: Level / Reputation */}
        {creatorData && (
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-1">Level {level}</p>
                  <p className="text-xl font-bold text-gray-900">{levelLabel}</p>
                </div>
                {repDelta > 0 && (
                  <span className="px-2.5 py-1 text-xs font-bold bg-green-100 text-green-700 rounded-full border border-green-200">
                    +{repDelta} rep
                  </span>
                )}
              </div>
              {level < 7 && (
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-600">Progress to Level {level + 1}</span>
                    <span className="text-sm font-bold text-gray-900">{rep} / {nextLevelRep}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-brand-600 to-accent-600 h-2.5 rounded-full transition-all duration-500 shadow-sm"
                      style={{ width: `${Math.min((rep / nextLevelRep) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Income Card */}
          <Card className="border border-gray-200 shadow-sm bg-gradient-to-br from-gray-50 to-gray-100">
            <CardContent className="p-4">
              {loadingStats ? (
                <div className="text-center py-2">
                  <div className="text-xs text-gray-500">Loading...</div>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Income</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(Math.round((stats.totalEarnings || 0) * 100))}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Accepted Card */}
          <Card className="border border-green-200 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-4">
              {loadingStats ? (
                <div className="text-center py-2">
                  <div className="text-xs text-gray-500">Loading...</div>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-medium text-green-700 mb-1.5 uppercase tracking-wide">Accepted</p>
                  <p className="text-2xl font-bold text-green-700">
                    {stats.acceptedGigs || 0}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Nav Tiles */}
        <div className="grid grid-cols-2 gap-3">
          {/* Profile */}
          {creatorData && (
            <Card 
              className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all border border-gray-200 shadow-sm group"
              onClick={() => setProfileModalOpen(true)}
            >
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-2.5 shadow-md group-hover:shadow-lg transition-shadow">
                  <User className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm font-bold text-gray-900">Profile</p>
              </CardContent>
            </Card>
          )}

          {/* Verify */}
          {creatorData && (
            <Card 
              className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all border border-gray-200 shadow-sm group"
              onClick={() => setVerifyModalOpen(true)}
            >
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-2.5 shadow-md group-hover:shadow-lg transition-shadow">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm font-bold text-gray-900">Verify</p>
              </CardContent>
            </Card>
          )}

          {/* Community - left */}
          {creatorData?.communityId && (
            <Card 
              className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all border border-gray-200 shadow-sm group"
              onClick={() => setCommunityModalOpen(true)}
            >
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-2.5 shadow-md group-hover:shadow-lg transition-shadow">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm font-bold text-gray-900">Community</p>
              </CardContent>
            </Card>
          )}

          {/* Settings - right */}
          {creatorData && (
            <Card 
              className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all border border-gray-200 shadow-sm group"
              onClick={() => setSettingsModalOpen(true)}
            >
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center mx-auto mb-2.5 shadow-md group-hover:shadow-lg transition-shadow">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm font-bold text-gray-900">Settings</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Profile Modal */}
        <ProfileModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          creatorData={creatorData}
          userId={user?.uid}
          onRefresh={refetchCreatorData}
        />

        {/* Verify Modal */}
        <VerifyModal
          isOpen={verifyModalOpen}
          onClose={() => setVerifyModalOpen(false)}
          creatorData={creatorData}
          userId={user?.uid}
          onRefresh={refetchCreatorData}
        />

        {/* Settings Modal */}
        <SettingsModal
          isOpen={settingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
          creatorData={creatorData}
          userId={user?.uid}
          onRefresh={refetchCreatorData}
        />

        {/* Community Modal */}
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
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Withdraw Funds</DialogTitle>
              <DialogDescription>
                Available balance: {formatCurrency(balanceCents)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Check if Stripe Connect is set up */}
              {!creatorData?.stripe?.connectAccountId && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-semibold text-blue-900 mb-2">Payment Setup Required</p>
                  <p className="text-xs text-blue-700 mb-3">
                    You need to set up your payment method before withdrawing. This only takes a minute.
                  </p>
                  <Button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/stripe-connect-onboard', {
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
                      } catch (error) {
                        toast.error('Failed to start setup');
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Set Up Payment Method
                  </Button>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-zinc-900 mb-2 block">
                  Amount
                </label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  min="1"
                  max={balanceDollars.toFixed(2)}
                  step="0.01"
                />
                <div className="flex items-center justify-between mt-2">
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount((balanceDollars * 0.5).toFixed(2))}
                    className="text-xs text-zinc-500 hover:text-zinc-700"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(balanceDollars.toFixed(2))}
                    className="text-xs text-zinc-500 hover:text-zinc-700"
                  >
                    Max
                  </button>
                </div>
              </div>
              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <div className="flex items-center gap-2 mb-2">
                  {canUseInstant ? (
                    <>
                      <Zap className="w-4 h-4 text-orange-500" />
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
                    ? 'Funds will arrive within minutes to your debit card.'
                    : `Funds will arrive in 2-3 business days to your bank account. Complete identity verification to unlock instant withdrawals.`}
                </p>
                {!canUseInstant && (
                  <p className="text-xs text-blue-600 mt-1">
                    Trust Score: {trustScore} / {INSTANT_WITHDRAWAL_TRUST_SCORE_THRESHOLD} required for instant
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setWithdrawModalOpen(false);
                  setWithdrawAmount('');
                }}
                disabled={withdrawing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleWithdraw}
                disabled={
                  withdrawing ||
                  !withdrawAmount ||
                  parseFloat(withdrawAmount) <= 0 ||
                  !creatorData?.stripe?.connectAccountId
                }
                className={
                  creatorData?.stripe?.connectAccountId && !withdrawing
                    ? 'bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-brand hover:shadow-brand-lg hover:from-brand-700 hover:to-accent-700 min-w-[140px]'
                    : ''
                }
              >
                {withdrawing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : !creatorData?.stripe?.connectAccountId ? (
                  'Setup Required'
                ) : canUseInstant ? (
                  <>
                    <Zap className="w-4 h-4" />
                    Withdraw Instantly
                  </>
                ) : (
                  'Initiate Withdrawal'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
