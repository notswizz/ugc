import { useState } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

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
    <form onSubmit={handleCreateCommunity} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-2 text-purple-900">Community Name</label>
          <Input
            type="text"
            value={communityName}
            onChange={(e) => setCommunityName(e.target.value)}
            placeholder="Harvard University"
            className="h-11"
            disabled={creating}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2 text-purple-900">Community Code</label>
          <Input
            type="text"
            value={communityCode}
            onChange={(e) => setCommunityCode(e.target.value.toUpperCase())}
            placeholder="HARVARD2024"
            className="h-11 uppercase"
            disabled={creating}
          />
          <p className="text-xs text-purple-700 mt-1">3-20 characters (letters & numbers)</p>
        </div>
      </div>
      <Button
        type="submit"
        disabled={creating || !communityName.trim() || !communityCode.trim()}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
      >
        {creating ? 'Creating...' : 'Create Community'}
      </Button>
    </form>
  );
}
