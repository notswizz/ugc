import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { doc, getDoc, collection, query, where, getDocs, orderBy, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { ChevronDown, ChevronUp, MapPin, Heart, Briefcase, XCircle, Globe, Link as LinkIcon, Instagram, Youtube, Linkedin, UsersRound, Plus, Mail, Check, X, UserPlus } from 'lucide-react';
import { THINGS, EXPERIENCE_TYPES, HARD_NO_CATEGORIES } from '@/lib/things/constants';
import toast from 'react-hot-toast';
import { Input } from '@/components/ui/input';

export default function CreatorDashboard() {
  const { user, appUser } = useAuth();
  const [statsOpen, setStatsOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [squadsOpen, setSquadsOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [creatorData, setCreatorData] = useState<any>(null);
  const [squads, setSquads] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loadingSquads, setLoadingSquads] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSquadName, setNewSquadName] = useState('');
  const [stats, setStats] = useState({
    totalEarnings: 0,
    completedJobs: 0,
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
      const completedJobs = payments.length; // Jobs that have been paid
      const pendingSubmissions = submissions.filter(
        (sub: any) => sub.status === 'submitted' || sub.status === 'needs_changes'
      ).length;
      const activeJobs = submissions.filter(
        (sub: any) => sub.status === 'approved'
      ).length;

      setStats({
        totalEarnings,
        completedJobs,
        pendingSubmissions,
        activeJobs,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({
        totalEarnings: 0,
        completedJobs: 0,
        pendingSubmissions: 0,
        activeJobs: 0,
      });
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch squads
  const fetchSquads = async () => {
    if (!user) return;
    
    try {
      setLoadingSquads(true);
      
      // Fetch squads where user is a member
      const squadsQuery = query(
        collection(db, 'squads'),
        where('memberIds', 'array-contains', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const squadsSnapshot = await getDocs(squadsQuery);
      const squadsData = await Promise.all(
        squadsSnapshot.docs.map(async (squadDoc) => {
          const data = squadDoc.data();
          
          // Fetch creator usernames and roles for members
          const memberData = await Promise.all(
            (data.memberIds || []).map(async (memberId: string) => {
              try {
                const creatorDoc = await getDoc(doc(db, 'creators', memberId));
                if (creatorDoc.exists()) {
                  const role = data.memberRoles?.[memberId] || 'member';
                  return {
                    uid: memberId,
                    username: creatorDoc.data().username || 'unknown',
                    role: role,
                  };
                }
                return {
                  uid: memberId,
                  username: 'unknown',
                  role: data.memberRoles?.[memberId] || 'member',
                };
              } catch {
                return {
                  uid: memberId,
                  username: 'unknown',
                  role: data.memberRoles?.[memberId] || 'member',
                };
              }
            })
          );
          
          return {
            id: squadDoc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            memberData,
            memberUsernames: memberData.map(m => m.username), // Keep for backward compatibility
          };
        })
      );
      
      setSquads(squadsData);
    } catch (error) {
      console.error('Error fetching squads:', error);
    } finally {
      setLoadingSquads(false);
    }
  };

  // Fetch invitations
  const fetchInvitations = async () => {
    if (!user) return;
    
    try {
      // Fetch invitations for this creator
      const invitationsQuery = query(
        collection(db, 'squadInvitations'),
        where('inviteeId', '==', user.uid),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      
      const invitationsSnapshot = await getDocs(invitationsQuery);
      const invitationsData = await Promise.all(
        invitationsSnapshot.docs.map(async (invDoc) => {
          const data = invDoc.data();
          
          // Fetch squad name
          let squadName = 'Unknown Squad';
          try {
            const squadDoc = await getDoc(doc(db, 'squads', data.squadId));
            if (squadDoc.exists()) {
              squadName = squadDoc.data().name || 'Unknown Squad';
            }
          } catch {}
          
          // Fetch inviter username
          let inviterUsername = 'unknown';
          try {
            const inviterCreatorDoc = await getDoc(doc(db, 'creators', data.inviterId));
            if (inviterCreatorDoc.exists()) {
              inviterUsername = inviterCreatorDoc.data().username || 'unknown';
            }
          } catch {}
          
          return {
            id: invDoc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            squadName,
            inviterUsername,
          };
        })
      );
      
      setInvitations(invitationsData);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  };

  // Create squad
  const createSquad = async () => {
    if (!user || !newSquadName.trim()) {
      toast.error('Please enter a squad name');
      return;
    }
    
    try {
      const squadData = {
        name: newSquadName.trim(),
        creatorId: user.uid,
        memberIds: [user.uid],
        memberRoles: {
          [user.uid]: 'creator'
        },
        createdAt: new Date(),
      };
      
      await addDoc(collection(db, 'squads'), squadData);
      
      toast.success('Squad created successfully!');
      setNewSquadName('');
      setShowCreateForm(false);
      fetchSquads();
    } catch (error) {
      console.error('Error creating squad:', error);
      toast.error('Failed to create squad');
    }
  };

  // Accept invitation
  const acceptInvitation = async (invitationId: string, squadId: string) => {
    if (!user) return;
    
    try {
      // Update invitation status
      await updateDoc(doc(db, 'squadInvitations', invitationId), {
        status: 'accepted',
        respondedAt: new Date(),
      });
      
      // Add user to squad
      const squadDoc = await getDoc(doc(db, 'squads', squadId));
      if (squadDoc.exists()) {
        const squadData = squadDoc.data();
        const memberIds = squadData.memberIds || [];
        const memberRoles = squadData.memberRoles || {};
        if (!memberIds.includes(user.uid)) {
          await updateDoc(doc(db, 'squads', squadId), {
            memberIds: [...memberIds, user.uid],
            memberRoles: {
              ...memberRoles,
              [user.uid]: 'member', // Default role for new members
            },
            updatedAt: new Date(),
          });
        }
      }
      
      toast.success('Joined squad successfully!');
      fetchSquads();
      fetchInvitations();
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error('Failed to accept invitation');
    }
  };

  // Decline invitation
  const declineInvitation = async (invitationId: string) => {
    try {
      await updateDoc(doc(db, 'squadInvitations', invitationId), {
        status: 'declined',
        respondedAt: new Date(),
      });
      
      toast.success('Invitation declined');
      fetchInvitations();
    } catch (error) {
      console.error('Error declining invitation:', error);
      toast.error('Failed to decline invitation');
    }
  };

  // Invite creator to squad
  const inviteCreator = async (squadId: string, username: string) => {
    if (!user || !username.trim()) {
      toast.error('Please enter a username');
      return;
    }
    
    try {
      // Check if user has permission to invite (creator, president, or VP)
      const squadDoc = await getDoc(doc(db, 'squads', squadId));
      if (!squadDoc.exists()) {
        toast.error('Squad not found');
        return;
      }
      
      const squadData = squadDoc.data();
      const memberRoles = squadData.memberRoles || {};
      let userRole = memberRoles[user.uid] || 'member';
      
      // Fallback: check if user is creator
      if (squadData.creatorId === user.uid && userRole === 'member') {
        userRole = 'creator';
      }
      
      if (userRole !== 'creator' && userRole !== 'president' && userRole !== 'vp') {
        toast.error('Only creators, presidents, and VPs can invite members');
        return;
      }
      
      const normalizedUsername = username.trim().toLowerCase();
      
      // Find creator by username
      const creatorsQuery = query(
        collection(db, 'creators'),
        where('username', '==', normalizedUsername)
      );
      const creatorsSnapshot = await getDocs(creatorsQuery);
      
      if (creatorsSnapshot.empty) {
        toast.error('Creator not found with that username');
        return;
      }
      
      const creatorDoc = creatorsSnapshot.docs[0];
      const creatorId = creatorDoc.id; // Document ID is the uid
      const creatorData = creatorDoc.data();
      
      // Don't invite yourself
      if (creatorId === user.uid) {
        toast.error('You cannot invite yourself');
        return;
      }
      
      // Check if already in squad
      const memberIds = squadData.memberIds || [];
      if (memberIds.includes(creatorId)) {
        toast.error('Creator is already in this squad');
        return;
      }
      
      // Check for existing pending invitation
      const existingInvQuery = query(
        collection(db, 'squadInvitations'),
        where('squadId', '==', squadId),
        where('inviteeId', '==', creatorId),
        where('status', '==', 'pending')
      );
      const existingInvSnapshot = await getDocs(existingInvQuery);
      if (!existingInvSnapshot.empty) {
        toast.error('Invitation already sent');
        return;
      }
      
      // Create invitation
      await addDoc(collection(db, 'squadInvitations'), {
        squadId,
        inviterId: user.uid,
        inviteeId: creatorId,
        status: 'pending',
        createdAt: new Date(),
      });
      
      toast.success(`Invitation sent to @${normalizedUsername}`);
    } catch (error) {
      console.error('Error inviting creator:', error);
      toast.error('Failed to send invitation');
    }
  };

  // Assign role to squad member
  const assignRole = async (squadId: string, memberId: string, newRole: 'president' | 'vp' | 'member') => {
    if (!user) return;
    
    try {
      // Check if user has permission (only creator can assign roles)
      const squadDoc = await getDoc(doc(db, 'squads', squadId));
      if (!squadDoc.exists()) {
        toast.error('Squad not found');
        return;
      }
      
      const squadData = squadDoc.data();
      const memberRoles = squadData.memberRoles || {};
      const userRole = memberRoles[user.uid] || 'member';
      
      if (userRole !== 'creator') {
        toast.error('Only the squad creator can assign roles');
        return;
      }
      
      // Don't change creator role
      if (memberId === squadData.creatorId) {
        toast.error('Cannot change creator role');
        return;
      }
      
      // Update role
      await updateDoc(doc(db, 'squads', squadId), {
        memberRoles: {
          ...memberRoles,
          [memberId]: newRole,
        },
        updatedAt: new Date(),
      });
      
      toast.success(`Role updated successfully`);
      fetchSquads();
    } catch (error) {
      console.error('Error assigning role:', error);
      toast.error('Failed to assign role');
    }
  };

  useEffect(() => {
    if (user && appUser) {
      fetchCreatorData();
      fetchStats();
      fetchSquads();
      fetchInvitations();
    }
  }, [user, appUser]);

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
                    <div className="text-lg font-bold text-blue-600">{stats.completedJobs}</div>
                    <p className="text-[10px] text-gray-600 mt-0.5">Completed</p>
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Squads Section - Collapsible */}
        <Card className="mb-3">
          <button
            onClick={() => setSquadsOpen(!squadsOpen)}
            className="w-full"
          >
            <CardHeader className="py-2 px-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Squads</CardTitle>
                {squadsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </CardHeader>
          </button>
          {squadsOpen && (
            <CardContent className="pt-0 px-3 pb-3 space-y-3">
              {/* Pending Invitations */}
              {invitations.length > 0 && (
                <div className="pb-3 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Pending Invitations ({invitations.length})</p>
                  <div className="space-y-2">
                    {invitations.map((invitation) => (
                      <div key={invitation.id} className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800">{invitation.squadName}</p>
                            <p className="text-[10px] text-gray-600">Invited by @{invitation.inviterUsername}</p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => acceptInvitation(invitation.id, invitation.squadId)}
                              className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
                              title="Accept"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => declineInvitation(invitation.id)}
                              className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
                              title="Decline"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Create Squad Form */}
              {showCreateForm && (
                <div className="pb-3 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Create New Squad</p>
                  <div className="flex gap-2">
                    <Input
                      value={newSquadName}
                      onChange={(e) => setNewSquadName(e.target.value)}
                      placeholder="Squad name"
                      className="text-xs h-8"
                    />
                    <Button
                      size="sm"
                      onClick={createSquad}
                      disabled={!newSquadName.trim()}
                      className="bg-orange-600 hover:bg-orange-700 h-8 text-xs px-3"
                    >
                      Create
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewSquadName('');
                      }}
                      className="h-8 text-xs px-3"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Scout Button */}
              <Link href="/creator/scout" className="block">
                <button
                  className="w-full flex items-center justify-center gap-2 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-xs font-medium mb-2"
                >
                  <UsersRound className="w-4 h-4" />
                  Scout
                </button>
              </Link>

              {/* Create Squad Button */}
              {!showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full flex items-center justify-center gap-2 p-2 border border-dashed border-gray-300 rounded-lg hover:bg-gray-50 text-xs text-gray-600"
                >
                  <Plus className="w-4 h-4" />
                  Create Squad
                </button>
              )}

              {/* Squads List */}
              {loadingSquads ? (
                <div className="text-center py-2">
                  <div className="text-xs text-gray-500">Loading squads...</div>
                </div>
              ) : squads.length === 0 ? (
                <div className="text-center py-2">
                  <UsersRound className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-xs text-gray-500">No squads yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {squads.map((squad) => {
                    // Determine user role: check memberRoles first, then fall back to checking if they're the creator
                    let userRole = squad.memberRoles?.[user?.uid || ''] || 'member';
                    if (squad.creatorId === user?.uid && userRole === 'member') {
                      userRole = 'creator'; // Fallback for old squads without memberRoles
                    }
                    return (
                      <SquadCard
                        key={squad.id}
                        squad={squad}
                        onInviteCreator={inviteCreator}
                        onAssignRole={assignRole}
                        currentUserId={user?.uid}
                        currentUserRole={userRole}
                      />
                    );
                  })}
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
                        <a 
                          href={`https://tiktok.com/@${creatorData.socials.tiktok}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs text-gray-700 hover:text-orange-600 transition-colors"
                        >
                          <span className="text-base">🎵</span>
                          <span>@{creatorData.socials.tiktok}</span>
                        </a>
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

// Squad Card Component
function SquadCard({ squad, onInviteCreator, onAssignRole, currentUserId, currentUserRole }: any) {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviting, setInviting] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);

  const handleInvite = async () => {
    setInviting(true);
    await onInviteCreator(squad.id, inviteUsername);
    setInviteUsername('');
    setShowInviteForm(false);
    setInviting(false);
  };

  // Check if user is creator (either by role or by creatorId for backward compatibility)
  const isCreator = currentUserRole === 'creator' || currentUserId === squad.creatorId;
  const canInvite = isCreator || currentUserRole === 'president' || currentUserRole === 'vp';
  const canAssignRoles = isCreator;

  // Create memberData if it doesn't exist (for backward compatibility)
  const memberData = squad.memberData || (squad.memberUsernames?.map((username: string, index: number) => {
    const memberId = squad.memberIds?.[index] || '';
    // Determine role: check memberRoles first, then check if they're the creator, then default to member
    let role = squad.memberRoles?.[memberId];
    if (!role) {
      role = (memberId === squad.creatorId) ? 'creator' : 'member';
    }
    return {
      uid: memberId,
      username: username,
      role: role,
    };
  }) || []);

  const handleMemberClick = (member: any) => {
    console.log('Member clicked:', member);
    console.log('canAssignRoles:', canAssignRoles, 'currentUserRole:', currentUserRole);
    console.log('member.uid:', member.uid, 'squad.creatorId:', squad.creatorId);
    if (canAssignRoles && member.uid !== squad.creatorId) {
      console.log('Opening modal for member:', member.username);
      setSelectedMember(member);
      setShowRoleModal(true);
    } else {
      console.log('Cannot assign role - canAssignRoles:', canAssignRoles, 'isCreator:', member.uid === squad.creatorId);
    }
  };

  const handleAssignRoleClick = async (role: 'president' | 'vp' | 'member') => {
    if (selectedMember) {
      await onAssignRole(squad.id, selectedMember.uid, role);
      setShowRoleModal(false);
      setSelectedMember(null);
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'creator') return '👑';
    if (role === 'president') return '⭐';
    if (role === 'vp') return '💼';
    return '';
  };

  return (
    <>
      <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-800">{squad.name}</p>
            <p className="text-[10px] text-gray-600">{squad.memberIds?.length || 0} members</p>
          </div>
          {canInvite && (
            <button
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
              title="Invite"
            >
              <UserPlus className="w-3 h-3" />
            </button>
          )}
        </div>
        
        {showInviteForm && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div className="flex gap-1">
              <Input
                type="text"
                value={inviteUsername}
                onChange={(e) => setInviteUsername(e.target.value)}
                placeholder="@username"
                className="text-xs h-7 flex-1"
              />
              <Button
                size="sm"
                onClick={handleInvite}
                disabled={inviting || !inviteUsername.trim()}
                className="bg-orange-600 hover:bg-orange-700 h-7 text-xs px-2"
              >
                Send
              </Button>
            </div>
          </div>
        )}
        
        <div className="mt-2 flex flex-wrap gap-1">
          {memberData.map((member: any, index: number) => {
            const isCreator = member.uid === squad.creatorId;
            const canClick = canAssignRoles && !isCreator;
            return (
              <button
                key={member.uid || index}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Button clicked:', member.username, 'canClick:', canClick);
                  if (canClick) {
                    handleMemberClick(member);
                  }
                }}
                disabled={!canClick}
                className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                  canClick
                    ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 active:bg-blue-300 cursor-pointer'
                    : 'bg-blue-100 text-blue-800 cursor-default opacity-75'
                }`}
                title={canClick ? 'Click to assign role' : isCreator ? 'Creator (cannot change)' : 'You cannot assign roles'}
              >
                {getRoleBadge(member.role)} @{member.username}
              </button>
            );
          })}
        </div>
      </div>

      {/* Role Assignment Modal */}
      {showRoleModal && selectedMember && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowRoleModal(false);
              setSelectedMember(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg p-4 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold mb-2">Assign Role</h3>
            <p className="text-xs text-gray-600 mb-4">
              Select a role for @{selectedMember.username}
            </p>
            <div className="space-y-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAssignRoleClick('president');
                }}
                className="w-full p-2 text-left border rounded hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="text-xs font-medium">⭐ President</div>
                <div className="text-[10px] text-gray-500">Can invite members</div>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAssignRoleClick('vp');
                }}
                className="w-full p-2 text-left border rounded hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="text-xs font-medium">💼 VP</div>
                <div className="text-[10px] text-gray-500">Can invite members</div>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAssignRoleClick('member');
                }}
                className="w-full p-2 text-left border rounded hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="text-xs font-medium">Member</div>
                <div className="text-[10px] text-gray-500">Regular member</div>
              </button>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowRoleModal(false);
                setSelectedMember(null);
              }}
              className="mt-4 w-full text-xs text-gray-600 hover:text-gray-800 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}