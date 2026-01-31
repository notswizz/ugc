import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { logger } from '@/lib/utils/logger';

/**
 * Hook to fetch and subscribe to user balance
 * Replaces duplicate balance fetching logic across dashboards
 * @param userId - User ID
 * @returns Balance object with amount and loading state
 */
export function useBalance(userId: string | null | undefined) {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setBalance(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    logger.debug('useBalance: Setting up balance listener', { userId });

    const unsubscribe = onSnapshot(
      doc(db, 'users', userId),
      (snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.data();
          setBalance(userData?.premiumBalance || 0);
          setError(null);
        } else {
          setBalance(0);
          setError('User not found');
        }
        setLoading(false);
      },
      (err) => {
        logger.error('useBalance: Error fetching balance', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      logger.debug('useBalance: Cleaning up balance listener');
      unsubscribe();
    };
  }, [userId]);

  return {
    balance,
    loading,
    error,
  };
}

export default useBalance;
