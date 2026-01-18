import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

export function useCommunityLeaderboard(creatorData: any, user: any, isModalOpen: boolean) {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [communityName, setCommunityName] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchLeaderboard = async () => {
    if (!creatorData?.communityId || !user) return;
    
    setLoading(true);
    try {
      const communityDoc = await getDoc(doc(db, 'communities', creatorData.communityId));
      if (communityDoc.exists()) {
        setCommunityName(communityDoc.data().name);
      }

      const creatorsQuery = query(
        collection(db, 'creators'),
        where('communityId', '==', creatorData.communityId)
      );
      const creatorsSnapshot = await getDocs(creatorsQuery);
      
      const leaderboardData = creatorsSnapshot.docs
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

      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Error fetching community leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isModalOpen && creatorData?.communityId && leaderboard.length === 0) {
      fetchLeaderboard();
    }
  }, [isModalOpen, creatorData?.communityId]);

  return {
    leaderboard,
    communityName,
    loading,
  };
}
