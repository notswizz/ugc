import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { ChevronDown, ChevronUp, MapPin, Heart, Briefcase, XCircle, Globe, Link as LinkIcon, Instagram, Youtube, Linkedin, CheckCircle } from 'lucide-react';
import { THINGS, EXPERIENCE_TYPES, HARD_NO_CATEGORIES } from '@/lib/things/constants';
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';

export default function CreatorDashboard() {
  const { user, appUser } = useAuth();
  const router = useRouter();
  const [statsOpen, setStatsOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [creatorData, setCreatorData] = useState<any>(null);
  const [verifyingTikTok, setVerifyingTikTok] = useState(false);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    acceptedJobs: 0,
    pendingSubmissions: 0,
    activeJobs: 0,
  });

  // Fetch creator data
  const fetchCreatorData = async () => {
    if (!user || !appUser || appUser.role !== 'creator') return;
    
    try {
      const creatorDoc = await getDoc(doc(db, 'creators', user.uid));
      if (creatorDoc.exists()) {
        const data = creatorDoc.data();
        setCreatorData(data);
        setBalance(data.balance || 0);
      } else {
        setBalance(0);
      }
    } catch (error) {
      console.error('Error fetching creator data:', error);
      setBalance(0);
    } finally {
      setLoadingBalance(false);
    }
  };

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
      const acceptedJobs = submissions.filter(
        (sub: any) => sub.status === 'approved'
      ).length; // Submissions that have been accepted/approved
      const pendingSubmissions = submissions.filter(
        (sub: any) => sub.status === 'submitted' || sub.status === 'needs_changes'
      ).length;
      const activeJobs = submissions.filter(
        (sub: any) => sub.status === 'approved'
      ).length;

      setStats({
        totalEarnings,
        acceptedJobs,
        pendingSubmissions,
        activeJobs,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({
        totalEarnings: 0,
        acceptedJobs: 0,
        pendingSubmissions: 0,
        activeJobs: 0,
      });
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (user && appUser) {
      fetchCreatorData();
      fetchStats();
    }
  }, [user, appUser]);

  // Handle TikTok verification success/error messages
  useEffect(() => {
    if (router.query.tiktok_verified === 'true') {
      const count = router.query.count || '0';
      toast.success(`TikTok verified! Follower count: ${Number(count).toLocaleString()}`);
      fetchCreatorData(); // Refresh data
      // Clean up URL
      router.replace('/creator/dashboard', undefined, { shallow: true });
    }
    if (router.query.tiktok_error) {
      toast.error(`TikTok verification failed: ${router.query.tiktok_error}`);
      // Clean up URL
      router.replace('/creator/dashboard', undefined, { shallow: true });
    }
  }, [router.query, router]);

  const handleVerifyTikTok = () => {
    if (!user || !creatorData?.socials?.tiktok) {
      toast.error('Please add your TikTok username first');
      return;
    }

    if (verifyingTikTok) return;

    setVerifyingTikTok(true);

    // TikTok OAuth URL
    const TIKTOK_CLIENT_KEY = process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY;
    const TIKTOK_REDIRECT_URI = `${window.location.origin}/api/tiktok-callback`;
    
    if (!TIKTOK_CLIENT_KEY) {
      toast.error('TikTok integration not configured. Please contact support.');
      setVerifyingTikTok(false);
      return;
    }

    // Generate state parameter (store creatorId)
    const state = user.uid;
    
    // Build TikTok OAuth URL
    const scope = 'user.info.basic,user.info.profile,user.info.stats';
    const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${TIKTOK_CLIENT_KEY}&scope=${encodeURIComponent(scope)}&response_type=code&redirect_uri=${encodeURIComponent(TIKTOK_REDIRECT_URI)}&state=${encodeURIComponent(state)}`;

    // Redirect to TikTok OAuth
    window.location.href = authUrl;
  };

  if (!user || !appUser) {
    return <LoadingSpinner fullScreen text="Loading dashboard..." />;
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-2 sm:px-4">
        {/* Compact Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold truncate">Hey {creatorData?.username || 'there'}!</h1>
            </div>
          </div>
        </div>

        {/* Balance Display */}
        <Card className="mb-3 border-green-200 bg-green-50/50">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold text-green-800">Account Balance</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            {loadingBalance ? (
              <div className="text-center py-2">
                <div className="text-xs text-gray-500">Loading...</div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-3xl font-bold text-green-700">
                  ${(balance ?? 0).toFixed(2)}
                </div>
                <p className="text-xs text-green-600 mt-1">Available balance</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats - Collapsible */}
        <Card className="mb-3">
          <button
            onClick={() => setStatsOpen(!statsOpen)}
            className="w-full"
          >
            <CardHeader className="py-2 px-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Stats</CardTitle>
                {statsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </CardHeader>
          </button>
          {statsOpen && (
            <CardContent className="pt-0 px-3 pb-3">
              {loadingStats ? (
                <div className="text-center py-2">
                  <div className="text-xs text-gray-500">Loading stats...</div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-orange-50 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-orange-600">{stats.pendingSubmissions}</div>
                    <p className="text-[10px] text-gray-600 mt-0.5">Pending</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-green-600">${stats.totalEarnings.toFixed(2)}</div>
                    <p className="text-[10px] text-gray-600 mt-0.5">Earned</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-blue-600">{stats.acceptedJobs}</div>
                    <p className="text-[10px] text-gray-600 mt-0.5">Accepted</p>
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Profile Information - Collapsible */}
        {creatorData && (
          <Card className="mb-3">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="w-full"
            >
              <CardHeader className="py-2 px-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Profile</CardTitle>
                  {profileOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </CardHeader>
            </button>
            {profileOpen && (
              <CardContent className="pt-0 px-4 pb-4 space-y-4">
                {/* Bio */}
                {creatorData.bio && (
                  <div className="pb-3 border-b border-gray-100">
                    <p className="text-xs text-gray-700 leading-relaxed">{creatorData.bio}</p>
                  </div>
                )}

                {/* Location */}
                {creatorData.location && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-700">{creatorData.location}</p>
                  </div>
                )}

                {/* Interests */}
                {creatorData.interests && creatorData.interests.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="w-4 h-4 text-pink-500" />
                      <p className="text-xs font-semibold text-gray-700">Interests</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {creatorData.interests.map((interestId: string) => {
                        const thing = THINGS.find(t => t.id === interestId);
                        return thing ? (
                          <span key={interestId} className="px-2.5 py-1 text-[11px] rounded-full bg-pink-50 text-pink-700 border border-pink-200 font-medium">
                            {thing.icon} {thing.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {/* Experience */}
                {creatorData.experience && creatorData.experience.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Briefcase className="w-4 h-4 text-blue-500" />
                      <p className="text-xs font-semibold text-gray-700">Experience</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {creatorData.experience.map((exp: string) => (
                        <span key={exp} className="px-2.5 py-1 text-[11px] rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium capitalize">
                          {exp.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hard No's */}
                {creatorData.hardNos && creatorData.hardNos.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <p className="text-xs font-semibold text-gray-700">Hard No's</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {creatorData.hardNos.map((no: string) => {
                        const thing = THINGS.find(t => t.id === no);
                        return (
                          <span key={no} className="px-2.5 py-1 text-[11px] rounded-full bg-red-50 text-red-700 border border-red-200 font-medium">
                            {thing ? `${thing.icon} ${thing.name}` : no}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Languages */}
                {creatorData.languages && creatorData.languages.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-4 h-4 text-orange-500" />
                      <p className="text-xs font-semibold text-gray-700">Languages</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {creatorData.languages.map((lang: string) => (
                        <span key={lang} className="px-2.5 py-1 text-[11px] rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-medium">
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Social Links */}
                {creatorData.socials && (creatorData.socials.tiktok || creatorData.socials.instagram || creatorData.socials.youtube || creatorData.socials.linkedin) && (
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-2">Social Links</p>
                    <div className="space-y-2">
                      {creatorData.socials.tiktok && (
                        <div className="flex items-center justify-between gap-2">
                          <a 
                            href={`https://tiktok.com/@${creatorData.socials.tiktok}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs text-gray-700 hover:text-orange-600 transition-colors flex-1"
                          >
                            <span className="text-base">🎵</span>
                            <span>@{creatorData.socials.tiktok}</span>
                            {creatorData.socialVerification?.tiktok?.verified && (
                              <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" title="Verified" />
                            )}
                          </a>
                          {creatorData.followingCount?.tiktok && (
                            <span className="text-xs text-gray-600 font-medium">
                              {creatorData.followingCount.tiktok.toLocaleString()} followers
                            </span>
                          )}
                          {!creatorData.socialVerification?.tiktok?.verified && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[10px] flex-shrink-0"
                              onClick={handleVerifyTikTok}
                              disabled={verifyingTikTok}
                            >
                              {verifyingTikTok ? 'Verifying...' : 'Verify'}
                            </Button>
                          )}
                        </div>
                      )}
                      {creatorData.socials.instagram && (
                        <a 
                          href={`https://instagram.com/${creatorData.socials.instagram}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs text-gray-700 hover:text-orange-600 transition-colors"
                        >
                          <Instagram className="w-4 h-4" />
                          <span>@{creatorData.socials.instagram}</span>
                        </a>
                      )}
                      {creatorData.socials.youtube && (
                        <a 
                          href={`https://youtube.com/${creatorData.socials.youtube}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs text-gray-700 hover:text-orange-600 transition-colors"
                        >
                          <Youtube className="w-4 h-4" />
                          <span>{creatorData.socials.youtube}</span>
                        </a>
                      )}
                      {creatorData.socials.linkedin && (
                        <a 
                          href={`https://linkedin.com/in/${creatorData.socials.linkedin}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs text-gray-700 hover:text-orange-600 transition-colors"
                        >
                          <Linkedin className="w-4 h-4" />
                          <span>{creatorData.socials.linkedin}</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Portfolio Links */}
                {creatorData.portfolioLinks && creatorData.portfolioLinks.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <LinkIcon className="w-4 h-4 text-orange-500" />
                      <p className="text-xs font-semibold text-gray-700">Portfolio</p>
                    </div>
                    <div className="space-y-2">
                      {creatorData.portfolioLinks.map((link: string, index: number) => (
                        <a 
                          key={index} 
                          href={link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs text-orange-600 hover:text-orange-700 hover:underline block truncate"
                        >
                          {link}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        )}

      </div>
    </Layout>
  );
}