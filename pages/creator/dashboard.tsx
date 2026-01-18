import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { doc, getDoc, collection, query, where, getDocs, orderBy, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { ChevronDown, ChevronUp, MapPin, Heart, Briefcase, XCircle, Globe, Link as LinkIcon, Instagram, Youtube, Linkedin, CheckCircle, Award, X as XIcon, User, Trophy, ArrowDownToLine } from 'lucide-react';
import { THINGS, EXPERIENCE_TYPES, HARD_NO_CATEGORIES } from '@/lib/things/constants';
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';
import { getRepLevel } from '@/lib/rep/service';

export default function CreatorDashboard() {
  const { user, appUser } = useAuth();
  const router = useRouter();
  const [statsOpen, setStatsOpen] = useState(true);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [communityModalOpen, setCommunityModalOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [creatorData, setCreatorData] = useState<any>(null);
  const [verifyingTikTok, setVerifyingTikTok] = useState(false);
  const [communityLeaderboard, setCommunityLeaderboard] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [communityName, setCommunityName] = useState<string>('');
  const [stats, setStats] = useState({
    totalEarnings: 0,
    acceptedGigs: 0,
    pendingSubmissions: 0,
    activeGigs: 0,
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
      const acceptedGigs = submissions.filter(
        (sub: any) => sub.status === 'approved'
      ).length;
      const pendingSubmissions = submissions.filter(
        (sub: any) => sub.status === 'submitted' || sub.status === 'needs_changes'
      ).length;
      const activeGigs = submissions.filter(
        (sub: any) => sub.status === 'approved'
      ).length;

      setStats({
        totalEarnings,
        acceptedGigs,
        pendingSubmissions,
        activeGigs,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch community leaderboard
  const fetchCommunityLeaderboard = async () => {
    if (!creatorData?.communityId || !user) return;
    
    setLoadingLeaderboard(true);
    try {
      // First get the community name
      const communityDoc = await getDoc(doc(db, 'communities', creatorData.communityId));
      if (communityDoc.exists()) {
        setCommunityName(communityDoc.data().name);
      }

      // Get all creators in this community
      const creatorsQuery = query(
        collection(db, 'creators'),
        where('communityId', '==', creatorData.communityId)
      );
      const creatorsSnapshot = await getDocs(creatorsQuery);
      
      // Map and sort by rep points
      const leaderboard = creatorsSnapshot.docs
        .map(doc => ({
          uid: doc.id,
          username: doc.data().username,
          rep: doc.data().rep || 0,
        }))
        .sort((a, b) => b.rep - a.rep)
        .map((creator, index) => ({
          ...creator,
          rank: index + 1,
        }));

      setCommunityLeaderboard(leaderboard);
    } catch (error) {
      console.error('Error fetching community leaderboard:', error);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  // Fetch leaderboard when opening community modal
  useEffect(() => {
    if (communityModalOpen && creatorData?.communityId && communityLeaderboard.length === 0) {
      fetchCommunityLeaderboard();
    }
  }, [communityModalOpen, creatorData?.communityId]);

  // Handle TikTok verification success/error messages
  useEffect(() => {
    if (router.query.tiktok_verified === 'true') {
      const count = router.query.count || '0';
      toast.success(`TikTok verified! Follower count: ${Number(count).toLocaleString()}`);
      fetchCreatorData();
      router.replace('/creator/dashboard', undefined, { shallow: true });
    }
    if (router.query.tiktok_error) {
      toast.error(`TikTok verification failed: ${router.query.tiktok_error}`);
      router.replace('/creator/dashboard', undefined, { shallow: true });
    }
  }, [router.query, router]);

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

  const handleAddTestRep = async () => {
    if (!user) return;
    
    try {
      const creatorRef = doc(db, 'creators', user.uid);
      await updateDoc(creatorRef, {
        rep: increment(50)
      });
      toast.success('+50 rep!');
      fetchCreatorData();
    } catch (error) {
      console.error('Error adding rep:', error);
      toast.error('Failed to add rep');
    }
  };

  useEffect(() => {
    if (appUser && appUser.role !== 'creator') {
      router.push('/creator/dashboard');
    } else if (user && appUser) {
      fetchCreatorData();
      fetchStats();
    }
  }, [user, appUser, router]);

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

  return (
    <Layout>
      <div className="space-y-4">
        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
          <CardHeader className="pb-1 pt-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs text-gray-600">Available Balance</CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 px-3 font-semibold border-2 border-green-600 text-green-700 hover:bg-green-600 hover:text-white transition-all shadow-sm"
              >
                <ArrowDownToLine className="w-3.5 h-3.5 mr-1" />
                Withdraw
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-green-700">
                ${loadingBalance ? '...' : balance?.toFixed(2) || '0.00'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Reputation Card */}
        {creatorData && (() => {
          const rep = creatorData.rep || 0;
          const { level, title, nextLevelRep } = getRepLevel(rep);
          
          return (
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
              <CardHeader className="pb-1 pt-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs text-gray-600">Reputation</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddTestRep}
                    className="text-[10px] h-6 px-2"
                  >
                    +50
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-600" />
                    <span className="text-xl font-bold text-purple-700">{rep}</span>
                    <span className="text-xs text-purple-600">rep</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-purple-800">Level {level}</div>
                    <p className="text-[10px] text-purple-600">{title}</p>
                  </div>
                </div>
                
                {level < 7 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-[10px] text-purple-600 mb-1">
                      <span>Progress to Level {level + 1}</span>
                      <span>{rep} / {nextLevelRep}</span>
                    </div>
                    <div className="w-full bg-purple-200 rounded-full h-1.5">
                      <div 
                        className="bg-gradient-to-r from-purple-600 to-pink-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${((rep / nextLevelRep) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}

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
                    <div className="text-lg font-bold text-blue-600">{stats.acceptedGigs}</div>
                    <p className="text-[10px] text-gray-600 mt-0.5">Accepted</p>
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {/* Profile Information - Button to open modal */}
          {creatorData && (
            <Card 
              className="cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-200 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200" 
              onClick={() => setProfileModalOpen(true)}
            >
              <CardHeader className="py-4 px-3">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                    <User className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </div>
                  <CardTitle className="text-sm font-bold text-gray-900 text-center">Profile</CardTitle>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Community Leaderboard - Button to open modal */}
          {creatorData?.communityId && (
            <Card 
              className="cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-200 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200"
              onClick={() => setCommunityModalOpen(true)}
            >
              <CardHeader className="py-4 px-3">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-md">
                    <Trophy className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </div>
                  <CardTitle className="text-sm font-bold text-gray-900 text-center">Community</CardTitle>
                </div>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>

      {/* Profile Modal */}
      {profileModalOpen && creatorData && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setProfileModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with gradient */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-indigo-600 p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <User className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">@{creatorData.username}</h2>
                  {creatorData.location && (
                    <p className="text-xs text-white/80 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {creatorData.location}
                    </p>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setProfileModalOpen(false)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <XIcon className="w-5 h-5 text-white" />
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-[calc(85vh-80px)]">
              <div className="p-5 space-y-5">
                {/* Bio */}
                {creatorData.bio && (
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                    <p className="text-sm text-gray-700 leading-relaxed italic">&ldquo;{creatorData.bio}&rdquo;</p>
                  </div>
                )}

                {/* Social Links - Featured */}
                {creatorData.socials && (creatorData.socials.tiktok || creatorData.socials.instagram || creatorData.socials.x) && (
                  <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border-2 border-orange-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                        <span className="text-lg">🔗</span>
                      </div>
                      <p className="text-sm font-bold text-gray-900">Social Profiles</p>
                    </div>
                    <div className="space-y-2.5">
                      {creatorData.socials.tiktok && (
                        <div className="flex items-center justify-between gap-3 bg-white rounded-lg p-3 border border-orange-100">
                          <a 
                            href={`https://tiktok.com/@${creatorData.socials.tiktok}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-gray-900 hover:text-orange-600 transition-colors flex-1 font-medium"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                            </svg>
                            <span>@{creatorData.socials.tiktok}</span>
                            {creatorData.socialVerification?.tiktok?.verified && (
                              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                            )}
                          </a>
                          <div className="flex items-center gap-2">
                            {creatorData.followingCount?.tiktok && (
                              <span className="text-xs text-gray-600 font-semibold bg-gray-100 px-2 py-1 rounded-full">
                                {creatorData.followingCount.tiktok.toLocaleString()}
                              </span>
                            )}
                            {!creatorData.socialVerification?.tiktok?.verified && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleVerifyTikTok}
                                disabled={verifyingTikTok}
                                className="text-xs h-7 px-2"
                              >
                                {verifyingTikTok ? 'Verifying...' : 'Verify'}
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      {creatorData.socials.instagram && (
                        <div className="flex items-center justify-between gap-3 bg-white rounded-lg p-3 border border-orange-100">
                          <a 
                            href={`https://instagram.com/${creatorData.socials.instagram}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-gray-900 hover:text-orange-600 transition-colors flex-1 font-medium"
                          >
                            <Instagram className="w-5 h-5" />
                            <span>@{creatorData.socials.instagram}</span>
                          </a>
                          {creatorData.followingCount?.instagram && (
                            <span className="text-xs text-gray-600 font-semibold bg-gray-100 px-2 py-1 rounded-full">
                              {creatorData.followingCount.instagram.toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}

                      {creatorData.socials.x && (
                        <div className="flex items-center justify-between gap-3 bg-white rounded-lg p-3 border border-orange-100">
                          <a 
                            href={`https://x.com/${creatorData.socials.x}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-gray-900 hover:text-orange-600 transition-colors flex-1 font-medium"
                          >
                            <span className="text-lg">𝕏</span>
                            <span>@{creatorData.socials.x}</span>
                          </a>
                          {creatorData.followingCount?.x && (
                            <span className="text-xs text-gray-600 font-semibold bg-gray-100 px-2 py-1 rounded-full">
                              {creatorData.followingCount.x.toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Interests */}
                {creatorData.interests && creatorData.interests.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                        <Heart className="w-3 h-3 text-white" fill="white" />
                      </div>
                      <p className="text-xs font-bold text-gray-900">Interests</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {creatorData.interests.map((interestId: string) => {
                        const thing = THINGS.find(t => t.id === interestId);
                        return thing ? (
                          <span key={interestId} className="px-2 py-0.5 text-[10px] rounded-md bg-gradient-to-r from-pink-50 to-rose-50 text-pink-700 border border-pink-200 font-semibold">
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
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                        <Briefcase className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-sm font-bold text-gray-900">Experience</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {creatorData.experience.map((exp: string) => (
                        <span key={exp} className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-2 border-blue-200 font-semibold shadow-sm capitalize">
                          {exp.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hard No's */}
                {creatorData.hardNos && creatorData.hardNos.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center">
                        <XCircle className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-sm font-bold text-gray-900">Hard No's</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {creatorData.hardNos.map((no: string) => {
                        const thing = THINGS.find(t => t.id === no);
                        return (
                          <span key={no} className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-2 border-red-200 font-semibold shadow-sm">
                            {thing ? `${thing.icon} ${thing.name}` : no}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Portfolio Links */}
                {creatorData.portfolioLinks && creatorData.portfolioLinks.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                        <LinkIcon className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-sm font-bold text-gray-900">Portfolio</p>
                    </div>
                    <div className="space-y-2">
                      {creatorData.portfolioLinks.map((link: string, index: number) => (
                        <a 
                          key={index} 
                          href={link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 font-medium bg-violet-50 hover:bg-violet-100 rounded-lg p-3 border-2 border-violet-200 transition-all"
                        >
                          <LinkIcon className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{link}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Community Modal */}
      {communityModalOpen && creatorData?.communityId && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setCommunityModalOpen(false)}
        >
          <div 
            className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Community Leaderboard</h2>
              <button 
                onClick={() => setCommunityModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4">
              {loadingLeaderboard ? (
                <div className="text-center py-4">
                  <div className="text-xs text-gray-500">Loading...</div>
                </div>
              ) : communityLeaderboard.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-xs text-gray-500">No leaderboard data</p>
                </div>
              ) : (
                <div>
                  {/* Community Name */}
                  {communityName && (
                    <div className="text-center mb-4">
                      <p className="text-lg font-bold text-purple-700">{communityName}</p>
                      <p className="text-xs text-gray-600">{communityLeaderboard.length} members</p>
                    </div>
                  )}

                  {/* Leaderboard List */}
                  <div className="space-y-2">
                    {communityLeaderboard.map((creator) => {
                      const isCurrentUser = creator.uid === user.uid;
                      const { level } = getRepLevel(creator.rep);
                      
                      return (
                        <div
                          key={creator.uid}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            isCurrentUser 
                              ? 'bg-gradient-to-r from-brand-50 to-accent-50 border-2 border-brand-300' 
                              : 'bg-gray-50 border border-gray-200'
                          }`}
                        >
                          {/* Rank & User */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Rank Badge */}
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              creator.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' :
                              creator.rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800' :
                              creator.rank === 3 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' :
                              isCurrentUser ? 'bg-brand-500 text-white' :
                              'bg-gray-300 text-gray-700'
                            }`}>
                              {creator.rank}
                            </div>

                            {/* Username */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={`text-sm font-bold truncate ${isCurrentUser ? 'text-brand-900' : 'text-gray-900'}`}>
                                  @{creator.username}
                                </p>
                                {isCurrentUser && (
                                  <span className="text-[10px] bg-brand-600 text-white px-1.5 py-0.5 rounded-full font-semibold">
                                    You
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600">Lvl {level}</p>
                            </div>
                          </div>

                          {/* Rep Points */}
                          <div className="text-right flex-shrink-0">
                            <div className={`text-lg font-bold ${isCurrentUser ? 'text-brand-700' : 'text-purple-700'}`}>
                              {creator.rep}
                            </div>
                            <p className="text-xs text-gray-600">rep</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Info */}
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-800">
                      🎯 Complete gigs to climb the ranks and win prizes!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
