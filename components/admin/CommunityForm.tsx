import { useState } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { Sparkles } from 'lucide-react';

export default function CommunityForm() {
  const { user } = useAuth();
  const [communityName, setCommunityName] = useState('');
  const [communityCode, setCommunityCode] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!communityName.trim() || !communityCode.trim()) {
      toast.error('Please enter both name and code');
      return;
    }

    const code = communityCode.trim().toUpperCase();

    // Validate code format (alphanumeric, 3-20 chars)
    if (!/^[A-Z0-9]{3,20}$/.test(code)) {
      toast.error('Code must be 3-20 characters (letters and numbers only)');
      return;
    }

    setCreating(true);
    try {
      // Check if code already exists
      const codeQuery = query(collection(db, 'communityCodes'), where('code', '==', code));
      const codeSnapshot = await getDocs(codeQuery);

      if (!codeSnapshot.empty) {
        toast.error('This code already exists');
        setCreating(false);
        return;
      }

      // Create community document
      const communityRef = await addDoc(collection(db, 'communities'), {
        name: communityName.trim(),
        type: 'general',
        description: `${communityName.trim()} community`,
        createdAt: serverTimestamp(),
        createdBy: user?.uid,
        settings: {
          prizesEnabled: true,
          leaderboardEnabled: true,
        },
        stats: {
          memberCount: 0,
          totalEarnings: 0,
          totalGigsCompleted: 0,
        },
      });

      // Create community code document
      await addDoc(collection(db, 'communityCodes'), {
        code: code,
        communityId: communityRef.id,
        communityName: communityName.trim(),
        createdAt: serverTimestamp(),
        createdBy: user?.uid,
        isActive: true,
        usageCount: 0,
      });

      toast.success(`Community "${communityName}" created with code: ${code}`);
      setCommunityName('');
      setCommunityCode('');
    } catch (error) {
      console.error('Error creating community:', error);
      toast.error('Failed to create community');
    } finally {
      setCreating(false);
    }
  };

  return (
    <form onSubmit={handleCreateCommunity} className="pt-4 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Community Name</label>
          <Input
            type="text"
            value={communityName}
            onChange={(e) => setCommunityName(e.target.value)}
            placeholder="Harvard University"
            className="h-11 bg-zinc-50 border-zinc-200 rounded-xl"
            disabled={creating}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Community Code</label>
          <Input
            type="text"
            value={communityCode}
            onChange={(e) => setCommunityCode(e.target.value.toUpperCase())}
            placeholder="HARVARD2024"
            className="h-11 uppercase bg-zinc-50 border-zinc-200 rounded-xl font-mono"
            disabled={creating}
          />
          <p className="text-[10px] text-zinc-400 mt-1.5">3-20 characters, letters & numbers only</p>
        </div>
      </div>
      <Button
        type="submit"
        disabled={creating || !communityName.trim() || !communityCode.trim()}
        className="w-full h-11 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-500/25"
      >
        {creating ? (
          'Creating...'
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Create Community
          </>
        )}
      </Button>
    </form>
  );
}
