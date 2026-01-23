import { useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
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
        setCreatorData(creatorDoc.data());
      } else {
        setCreatorData(null);
      }
    } catch (error) {
      console.error('Error fetching creator data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !appUser || appUser.role !== 'creator') {
      setCreatorData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const creatorRef = doc(db, 'creators', user.uid);
    const unsub = onSnapshot(
      creatorRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setCreatorData(data);
          // Log when Stripe status changes
          if (data?.stripe?.onboardingComplete) {
            console.log('Stripe Connect onboarding detected as complete in Firestore:', data.stripe);
          }
        } else {
          setCreatorData(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error subscribing to creator data:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid, appUser?.role]);

  return {
    creatorData,
    loading,
    refetch: fetchCreatorData,
  };
}
