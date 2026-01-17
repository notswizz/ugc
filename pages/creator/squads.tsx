import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { Plus, Users, Mail, Check, X, UserPlus, ChevronUp, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function CreatorSquads() {
  const { user, appUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [squads, setSquads] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSquadName, setNewSquadName] = useState('');
  const [creating, setCreating] = useState(false);
  const [isSquadsExpanded, setIsSquadsExpanded] = useState(true);

  useEffect(() => {
    if (user && appUser) {
      fetchSquads();
      fetchInvitations();
    }
  }, [user, appUser]);

  const fetchSquads = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
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
                const role = data.memberRoles?.[memberId] || (memberId === data.creatorId ? 'creator' : 'member');
                if (creatorDoc.exists()) {
                  return {
                    uid: memberId,
                    username: creatorDoc.data().username || 'unknown',
                    role: role,
                  };
                }
                return {
                  uid: memberId,
                  username: 'unknown',
                  role: role,
                };
              } catch {
                return {
                  uid: memberId,
                  username: 'unknown',
                  role: data.memberRoles?.[memberId] || (memberId === data.creatorId ? 'creator' : 'member'),
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
      toast.error('Failed to load squads');
    } finally {
      setLoading(false);
    }
  };

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
          
          // Fetch inviter name
          let inviterName = 'Unknown';
          try {
            const inviterDoc = await getDoc(doc(db, 'users', data.inviterId));
            if (inviterDoc.exists()) {
              inviterName = inviterDoc.data().name || 'Unknown';
            }
          } catch {}
          
          return {
            id: invDoc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            squadName,
            inviterName,
          };
        })
      );
      
      setInvitations(invitationsData);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  };

  const createSquad = async () => {
    if (!user || !newSquadName.trim()) {
      toast.error('Please enter a squad name');
      return;
    }
    
    try {
      setCreating(true);
      
      const squadData = {
        name: newSquadName.trim(),
        creatorId: user.uid,
        memberIds: [user.uid],
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
    } finally {
      setCreating(false);
    }
  };

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
        if (!memberIds.includes(user.uid)) {
          await updateDoc(doc(db, 'squads', squadId), {
            memberIds: [...memberIds, user.uid],
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

  const inviteCreator = async (squadId: string, username: string) => {
    if (!user || !username.trim()) {
      toast.error('Please enter a username');
      return;
    }
    
    try {
      const normalizedUsername = username.trim().toLowerCase().replace('@', '');
      
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
      const squadDoc = await getDoc(doc(db, 'squads', squadId));
      if (squadDoc.exists()) {
        const memberIds = squadDoc.data().memberIds || [];
        if (memberIds.includes(creatorId)) {
          toast.error('Creator is already in this squad');
          return;
        }
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
      
      // Get creator name from users collection
      let creatorName = normalizedUsername;
      try {
        const userDoc = await getDoc(doc(db, 'users', creatorId));
        if (userDoc.exists()) {
          creatorName = userDoc.data().name || normalizedUsername;
        }
      } catch {}
      
      toast.success(`Invitation sent to @${normalizedUsername}`);
    } catch (error) {
      console.error('Error inviting creator:', error);
      toast.error('Failed to send invitation');
    }
  };

  const assignRole = async (squadId: string, memberId: string, role: 'president' | 'vp' | 'member') => {
    if (!user) return;
    
    try {
      const squadDoc = await getDoc(doc(db, 'squads', squadId));
      if (!squadDoc.exists()) {
        toast.error('Squad not found');
        return;
      }
      
      const squadData = squadDoc.data();
      
      // Only creator can assign roles
      if (squadData.creatorId !== user.uid) {
        toast.error('Only the squad creator can assign roles');
        return;
      }
      
      // Don't allow changing creator role
      if (memberId === squadData.creatorId) {
        toast.error('Cannot change creator role');
        return;
      }
      
      const memberRoles = squadData.memberRoles || {};
      memberRoles[memberId] = role;
      
      await updateDoc(doc(db, 'squads', squadId), {
        memberRoles,
        updatedAt: new Date(),
      });
      
      toast.success('Role assigned successfully');
      fetchSquads();
    } catch (error) {
      console.error('Error assigning role:', error);
      toast.error('Failed to assign role');
    }
  };

  if (!user || !appUser) {
    return <LoadingSpinner fullScreen text="Loading..." />;
  }

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner text="Loading squads..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Scout Button */}
        <div className="mb-4">
          <Link href="/creator/scout">
            <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white h-12 text-base font-semibold">
              <Users className="w-5 h-5 mr-2" />
              Scout
            </Button>
          </Link>
        </div>

        {/* Squads Section */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <button
              onClick={() => setIsSquadsExpanded(!isSquadsExpanded)}
              className="flex items-center justify-between w-full text-left"
            >
              <h2 className="text-lg font-bold">Squads</h2>
              {isSquadsExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </CardHeader>
          
          {isSquadsExpanded && (
            <CardContent className="pt-0 space-y-3">
              {/* Create Squad Button */}
              {!showCreateForm ? (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 px-4 flex items-center justify-center gap-2 text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Create Squad</span>
                </button>
              ) : (
                <div className="border-2 border-gray-300 rounded-lg p-4 space-y-3">
                  <Input
                    value={newSquadName}
                    onChange={(e) => setNewSquadName(e.target.value)}
                    placeholder="Enter squad name"
                    className="w-full"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={createSquad}
                      disabled={creating || !newSquadName.trim()}
                      className="bg-orange-600 hover:bg-orange-700 flex-1"
                    >
                      {creating ? 'Creating...' : 'Create Squad'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewSquadName('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Invitations */}
              {invitations.length > 0 && (
                <div className="pt-2 border-t border-gray-200">
                  <h3 className="text-sm font-semibold mb-2 text-gray-700">Pending Invitations</h3>
                  <div className="space-y-2">
                    {invitations.map((invitation) => (
                      <Card key={invitation.id} className="border border-gray-200">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold">{invitation.squadName}</p>
                              <p className="text-xs text-gray-600">
                                Invited by {invitation.inviterName}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                onClick={() => acceptInvitation(invitation.id, invitation.squadId)}
                                className="bg-green-600 hover:bg-green-700 h-7 text-xs px-2"
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => declineInvitation(invitation.id)}
                                className="h-7 text-xs px-2"
                              >
                                <X className="w-3 h-3 mr-1" />
                                Decline
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Squads List */}
              {squads.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">You're not in any squads yet.</p>
                  <p className="text-xs mt-1">Create a squad or accept an invitation to get started!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {squads.map((squad) => {
                    const currentUserRole = squad.memberData?.find((m: any) => m.uid === user.uid)?.role || 
                                          (squad.creatorId === user.uid ? 'creator' : 'member');
                    return (
                      <SquadCard
                        key={squad.id}
                        squad={squad}
                        onInviteCreator={inviteCreator}
                        onAssignRole={assignRole}
                        currentUserId={user.uid}
                        currentUserRole={currentUserRole}
                      />
                    );
                  })}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </Layout>
  );
}

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

  const isCreator = currentUserRole === 'creator' || currentUserId === squad.creatorId;
  const canInvite = isCreator || currentUserRole === 'president' || currentUserRole === 'vp';
  const canAssignRoles = isCreator;

  const memberData = squad.memberData || (squad.memberUsernames?.map((username: string, index: number) => {
    const memberId = squad.memberIds?.[index] || '';
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
    if (canAssignRoles && member.uid !== squad.creatorId) {
      setSelectedMember(member);
      setShowRoleModal(true);
    }
  };

  const handleAssignRole = async (role: 'president' | 'vp' | 'member') => {
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
    return '👍';
  };

  const getRoleName = (role: string) => {
    if (role === 'creator') return 'Creator';
    if (role === 'president') return 'President';
    if (role === 'vp') return 'VP';
    return 'Member';
  };

  return (
    <>
      <Card className="border border-gray-200 hover:shadow-sm transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-base font-bold">{squad.name}</CardTitle>
                {canInvite && (
                  <button
                    onClick={() => setShowInviteForm(!showInviteForm)}
                    className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100 transition-colors"
                    title="Add member"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-2">{squad.memberIds?.length || 0} members</p>
              
              {showInviteForm && (
                <div className="mb-3 p-2 bg-gray-50 rounded border border-gray-200">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={inviteUsername}
                      onChange={(e) => setInviteUsername(e.target.value)}
                      placeholder="@username"
                      className="flex-1 text-xs h-8"
                    />
                    <Button
                      size="sm"
                      onClick={handleInvite}
                      disabled={inviting || !inviteUsername.trim()}
                      className="bg-orange-600 hover:bg-orange-700 h-8 text-xs px-2"
                    >
                      {inviting ? 'Sending...' : 'Send'}
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="flex flex-wrap gap-1.5">
                {memberData.map((member: any, index: number) => {
                  const isCreatorRole = member.uid === squad.creatorId;
                  const canClick = canAssignRoles && !isCreatorRole;
                  return (
                    <button
                      key={member.uid || index}
                      type="button"
                      onClick={() => canClick && handleMemberClick(member)}
                      disabled={!canClick}
                      className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                        canClick
                          ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer'
                          : 'bg-blue-100 text-blue-800 cursor-default'
                      }`}
                      title={canClick ? `Click to change role (Current: ${getRoleName(member.role)})` : `${getRoleName(member.role)}`}
                    >
                      {getRoleBadge(member.role)} @{member.username}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
            className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-1">Assign Role</h3>
            <p className="text-sm text-gray-600 mb-6">
              Select a role for @{selectedMember.username}
            </p>
            <div className="space-y-2 mb-4">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAssignRole('president');
                }}
                className="w-full p-3 text-left border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 active:bg-blue-100 transition-all"
              >
                <div className="text-sm font-semibold">⭐ President</div>
                <div className="text-xs text-gray-500 mt-0.5">Can invite members</div>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAssignRole('vp');
                }}
                className="w-full p-3 text-left border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 active:bg-blue-100 transition-all"
              >
                <div className="text-sm font-semibold">💼 VP</div>
                <div className="text-xs text-gray-500 mt-0.5">Can invite members</div>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAssignRole('member');
                }}
                className="w-full p-3 text-left border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 active:bg-blue-100 transition-all"
              >
                <div className="text-sm font-semibold">Member</div>
                <div className="text-xs text-gray-500 mt-0.5">Regular member</div>
              </button>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowRoleModal(false);
                setSelectedMember(null);
              }}
              className="w-full text-sm text-gray-600 hover:text-gray-800 py-2 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}