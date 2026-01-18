import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

export function useCreatorData(user: any, appUser: any) {
  const [creatorData, setCreatorData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchCreatorData = async () => {
    if (!user || !appUser || appUser.role !== 'creator') return;
    
    try {
      setLoading(true);
      const creatorDoc = await getDoc(doc(db, 'creators', user.uid));
      if (creatorDoc.exists()) {
        const data = creatorDoc.data();
        setCreatorData(data);
      }
    } catch (error) {
      console.error('Error fetching creator data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && appUser) {
      fetchCreatorData();
    }
  }, [user, appUser]);

  return {
    creatorData,
    loading,
    refetch: fetchCreatorData,
  };
}
