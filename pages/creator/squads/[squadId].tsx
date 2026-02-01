'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/auth/AuthContext';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, DollarSign, Briefcase, TrendingUp, Crown, Star, Award, Pencil, Save, X } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function SquadDetail() {
  const router = useRouter();
  const { squadId } = router.query;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [squad, setSquad] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalEarned: 0,
    totalGigs: 0,
    avgScore: 0,
  });
  
  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (squadId && user) {
      fetchSquadData();
    }
  }, [squadId, user]);

  const fetchSquadData = async () => {
    if (!squadId || typeof squadId !== 'string') return;

    try {
      setLoading(true);

      const squadDoc = await getDoc(doc(db, 'squads', squadId));
      if (!squadDoc.exists()) {
        router.push('/creator/squads');
        return;
      }

      const squadData = { id: squadDoc.id, ...squadDoc.data() } as any;
      setSquad(squadData);
      setEditName(squadData.name || '');
      setEditBio(squadData.bio || '');

      const memberIds = squadData.memberIds || [];
      let totalEarned = 0;
      let totalGigs = 0;
      let totalScores = 0;
      let scoreCount = 0;

      const memberDetails = await Promise.all(
        memberIds.map(async (memberId: string) => {
          const creatorDoc = await getDoc(doc(db, 'creators', memberId));
          const creatorData = creatorDoc.exists() ? creatorDoc.data() : {};

          const submissionsQuery = query(
            collection(db, 'submissions'),
            where('creatorId', '==', memberId),
            where('status', 'in', ['approved', 'paid'])
          );
          const submissionsSnap = await getDocs(submissionsQuery);
          
          let memberEarned = 0;
          let memberGigs = submissionsSnap.size;
          let memberScores: number[] = [];

          submissionsSnap.forEach((doc) => {
            const data = doc.data();
            if (data.payout) memberEarned += data.payout;
            if (data.aiEvaluation?.qualityScore) {
              memberScores.push(data.aiEvaluation.qualityScore);
            }
          });

          totalEarned += memberEarned;
          totalGigs += memberGigs;
          if (memberScores.length > 0) {
            totalScores += memberScores.reduce((a, b) => a + b, 0);
            scoreCount += memberScores.length;
          }

          const role = squadData.memberRoles?.[memberId] || 
                      (memberId === squadData.creatorId ? 'creator' : 'member');

          return {
            uid: memberId,
            username: creatorData.username || 'unknown',
            rep: creatorData.rep || 0,
            role,
            earned: memberEarned,
            gigs: memberGigs,
            avgScore: memberScores.length > 0 
              ? Math.round(memberScores.reduce((a, b) => a + b, 0) / memberScores.length) 
              : 0,
          };
        })
      );

      memberDetails.sort((a, b) => b.earned - a.earned);
      setMembers(memberDetails);

      setStats({
        totalEarned,
        totalGigs,
        avgScore: scoreCount > 0 ? Math.round(totalScores / scoreCount) : 0,
      });

    } catch (error) {
      console.error('Error fetching squad:', error);
    } finally {
      setLoading(false);
    }
  };

  const canEdit = user && squad && (
    squad.creatorId === user.uid ||
    squad.memberRoles?.[user.uid] === 'president' ||
    squad.memberRoles?.[user.uid] === 'vp'
  );

  const handleSave = async () => {
    if (!squadId || typeof squadId !== 'string') return;
    
    setSaving(true);
    try {
      await updateDoc(doc(db, 'squads', squadId), {
        name: editName.trim(),
        bio: editBio.trim(),
        updatedAt: new Date(),
      });
      
      setSquad({ ...squad, name: editName.trim(), bio: editBio.trim() });
      setEditing(false);
      toast.success('Squad updated!');
    } catch (error) {
      console.error('Error updating squad:', error);
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const getRoleIcon = (role: string) => {
    if (role === 'creator') return <Crown className="w-4 h-4 text-amber-500" />;
    if (role === 'president') return <Star className="w-4 h-4 text-violet-500" />;
    if (role === 'vp') return <Award className="w-4 h-4 text-blue-500" />;
    return null;
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner text="Loading squad..." />
      </Layout>
    );
  }

  if (!squad) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-zinc-500">Squad not found</p>
          <Link href="/creator/squads">
            <Button className="mt-4">Back to Squads</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-600" />
          </button>
          <div className="flex-1">
            {editing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-xl font-bold text-zinc-900 bg-zinc-100 rounded-lg px-2 py-1 w-full"
                placeholder="Squad name"
              />
            ) : (
              <h1 className="text-xl font-bold text-zinc-900">{squad.name}</h1>
            )}
            <p className="text-sm text-zinc-500">{members.length} members</p>
          </div>
          {canEdit && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center hover:bg-violet-200 transition-colors"
            >
              <Pencil className="w-4 h-4 text-violet-600" />
            </button>
          )}
        </div>

        {/* Bio */}
        {editing ? (
          <div className="space-y-3">
            <textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              placeholder="Add a squad bio..."
              rows={3}
              className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-violet-400 resize-none"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saving || !editName.trim()}
                className="flex-1 h-10 bg-violet-600 hover:bg-violet-700"
              >
                {saving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Save</>}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setEditName(squad.name || '');
                  setEditBio(squad.bio || '');
                }}
                className="h-10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : squad.bio ? (
          <p className="text-sm text-zinc-600 bg-zinc-50 rounded-xl p-3">{squad.bio}</p>
        ) : canEdit ? (
          <button
            onClick={() => setEditing(true)}
            className="w-full text-sm text-zinc-400 bg-zinc-50 rounded-xl p-3 text-left hover:bg-zinc-100 transition-colors"
          >
            + Add squad bio...
          </button>
        ) : null}

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-3 text-center">
            <DollarSign className="w-5 h-5 text-white/80 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">${stats.totalEarned.toFixed(0)}</p>
            <p className="text-[10px] text-emerald-100">Total Earned</p>
          </div>
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl p-3 text-center">
            <Briefcase className="w-5 h-5 text-white/80 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{stats.totalGigs}</p>
            <p className="text-[10px] text-violet-100">Gigs Done</p>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-3 text-center">
            <TrendingUp className="w-5 h-5 text-white/80 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{stats.avgScore || '—'}</p>
            <p className="text-[10px] text-orange-100">Avg Score</p>
          </div>
        </div>

        {/* Members Leaderboard */}
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-zinc-600" />
            <h2 className="font-bold text-zinc-900">Members</h2>
          </div>
          <div className="divide-y divide-zinc-100">
            {members.map((member, index) => (
              <div key={member.uid} className="px-4 py-3 flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold ${
                  index === 0 ? 'bg-amber-100 text-amber-600' :
                  index === 1 ? 'bg-zinc-200 text-zinc-600' :
                  index === 2 ? 'bg-orange-100 text-orange-600' :
                  'bg-zinc-100 text-zinc-500'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-zinc-900 text-sm truncate">@{member.username}</span>
                    {getRoleIcon(member.role)}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                    <span>{member.gigs} gigs</span>
                    <span>•</span>
                    <span>{member.rep.toLocaleString()} rep</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-600 text-sm">${member.earned.toFixed(0)}</p>
                  {member.avgScore > 0 && (
                    <p className="text-[10px] text-zinc-400">{member.avgScore} avg</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
