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
import { Zap, ArrowDownToLine, ArrowRight, User, Trophy } from 'lucide-react';
import { useCreatorData } from '@/components/dashboard/useCreatorData';
import { useDashboardData } from '@/components/dashboard/useDashboardData';
import { useCommunityLeaderboard } from '@/components/dashboard/useCommunityLeaderboard';
import ProfileModal from '@/components/dashboard/ProfileModal';
import CommunityModal from '@/components/dashboard/CommunityModal';

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
  const [communityModalOpen, setCommunityModalOpen] = useState(false);
  const [verifyingTikTok, setVerifyingTikTok] = useState(false);

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

  // Handle TikTok verification
  useEffect(() => {
    if (router.query.tiktok_verified === 'true') {
      const count = router.query.count || '0';
      toast.success(`TikTok verified! Follower count: ${Number(count).toLocaleString()}`);
      refetchCreatorData();
      router.replace('/creator/dashboard', undefined, { shallow: true });
    }
    if (router.query.tiktok_error) {
      toast.error(`TikTok verification failed: ${router.query.tiktok_error}`);
      router.replace('/creator/dashboard', undefined, { shallow: true });
    }
  }, [router.query, router, refetchCreatorData]);

  const handleVerifyTikTok = () => {
    if (!user || !creatorData?.socials?.tiktok) {
      toast.error('Please add your TikTok username first');
      return;
    }
    setVerifyingTikTok(true);
    const clientKey = process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY;
    const redirectUri = `${window.location.origin}/api/tiktok-callback`;
    const state = JSON.stringify({
      userId: user.uid,
      username: creatorData.socials.tiktok,
    });
    const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&response_type=code&scope=user.info.basic&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
    window.location.href = authUrl;
  };

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
  const trustScore = creatorData?.trustScore || 20;
  const isTrusted = trustScore >= 50;
  const balanceCents = balance !== null ? Math.round(balance * 100) : 0;
  const hasInstantPayout = balanceCents >= 0; // Simplified - can be enhanced
  
  // Calculate rep delta (mock for now - would come from recent activity)
  const repDelta = 0; // Could track last rep change

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
                variant="outline"
                className={`${
                  balanceCents === 0
                    ? 'border-gray-600 text-gray-500 cursor-not-allowed'
                    : 'border-gray-500 text-gray-300 hover:bg-white/10 hover:border-gray-400'
                } text-xs font-medium`}
              >
                <ArrowDownToLine className="w-3 h-3 mr-1.5" />
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
                <Zap className="w-3.5 h-3.5 text-orange-400" />
                <span>Instant payout enabled</span>
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

          {/* Community */}
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
        </div>

        {/* Profile Modal */}
        <ProfileModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          creatorData={creatorData}
          onVerifyTikTok={handleVerifyTikTok}
          verifyingTikTok={verifyingTikTok}
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
      </div>
    </Layout>
  );
}
