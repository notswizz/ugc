// This file exports the SquadsTab component for use in jobs/index.js
// It's extracted from pages/creator/squads.tsx to be used as a tab

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { Plus, Users, Check, X, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SquadsTab({ user, appUser }) {
  const [loading, setLoading] = useState(true);
  const [squads, setSquads] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSquadName, setNewSquadName] = useState('');
  const [creating, setCreating] = useState(false);

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
      
      const squadsQuery = query(
        collection(db, 'squads'),
        where('memberIds', 'array-contains', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const squadsSnapshot = await getDocs(squadsQuery);
      const squadsData = await Promise.all(
        squadsSnapshot.docs.map(async (squadDoc) => {
          const data = squadDoc.data();
          
          const memberUsernames = await Promise.all(
            (data.memberIds || []).map(async (memberId) => {
              try {
                const creatorDoc = await getDoc(doc(db, 'creators', memberId));
                if (creatorDoc.exists()) {
                  return creatorDoc.data().username || 'unknown';
                }
                return 'unknown';
              } catch {
                return 'unknown';
              }
            })
          );
          
          return {
            id: squadDoc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            memberUsernames,
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
          
          let squadName = 'Unknown Squad';
          try {
            const squadDoc = await getDoc(doc(db, 'squads', data.squadId));
            if (squadDoc.exists()) {
              squadName = squadDoc.data().name || 'Unknown Squad';
            }
          } catch {}
          
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

  const acceptInvitation = async (invitationId, squadId) => {
    if (!user) return;
    
    try {
      await updateDoc(doc(db, 'squadInvitations', invitationId), {
        status: 'accepted',
        respondedAt: new Date(),
      });
      
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

  const declineInvitation = async (invitationId) => {
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

  const inviteCreator = async (squadId, username) => {
    if (!user || !username.trim()) {
      toast.error('Please enter a username');
      return;
    }
    
    try {
      const normalizedUsername = username.trim().toLowerCase().replace('@', '');
      
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
      const creatorId = creatorDoc.id;
      
      if (creatorId === user.uid) {
        toast.error('You cannot invite yourself');
        return;
      }
      
      const squadDoc = await getDoc(doc(db, 'squads', squadId));
      if (squadDoc.exists()) {
        const memberIds = squadDoc.data().memberIds || [];
        if (memberIds.includes(creatorId)) {
          toast.error('Creator is already in this squad');
          return;
        }
      }
      
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

  if (loading) {
    return <LoadingSpinner text="Loading squads..." />;
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">My Squads</h1>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Squad
          </Button>
        </div>
      </div>

      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Squad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Squad Name</label>
                <Input
                  value={newSquadName}
                  onChange={(e) => setNewSquadName(e.target.value)}
                  placeholder="Enter squad name"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={createSquad}
                  disabled={creating}
                  className="bg-orange-600 hover:bg-orange-700"
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
          </CardContent>
        </Card>
      )}

      {invitations.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Pending Invitations</h2>
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <Card key={invitation.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{invitation.squadName}</p>
                      <p className="text-sm text-gray-600">
                        Invited by {invitation.inviterName}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => acceptInvitation(invitation.id, invitation.squadId)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => declineInvitation(invitation.id)}
                      >
                        <X className="w-4 h-4 mr-1" />
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

      <div>
        <h2 className="text-xl font-semibold mb-3">Your Squads</h2>
        {squads.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>You're not in any squads yet.</p>
              <p className="text-sm mt-2">Create a squad or accept an invitation to get started!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {squads.map((squad) => (
              <SquadCard
                key={squad.id}
                squad={squad}
                onInviteCreator={inviteCreator}
                currentUserId={user.uid}
                isCreator={squad.creatorId === user.uid}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SquadCard({ squad, onInviteCreator, currentUserId, isCreator }) {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviting, setInviting] = useState(false);

  const handleInvite = async () => {
    setInviting(true);
    await onInviteCreator(squad.id, inviteUsername);
    setInviteUsername('');
    setShowInviteForm(false);
    setInviting(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{squad.name}</CardTitle>
          {isCreator && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowInviteForm(!showInviteForm)}
            >
              <UserPlus className="w-4 h-4 mr-1" />
              Invite
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {showInviteForm && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium mb-2">Creator Username</label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={inviteUsername}
                onChange={(e) => setInviteUsername(e.target.value)}
                placeholder="@username"
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={handleInvite}
                disabled={inviting}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {inviting ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        )}
        
        <div>
          <p className="text-sm font-medium mb-2">Members ({squad.memberIds?.length || 0})</p>
          <div className="flex flex-wrap gap-2">
            {squad.memberUsernames?.map((username, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
              >
                @{username}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
