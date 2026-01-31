import { useMemo } from 'react';
import { calculateTrustScore } from '@/lib/trustScore/calculator';

interface Creator {
  emailVerified?: boolean;
  phoneVerified?: boolean;
  stripeOnboardingComplete?: boolean;
  identityVerified?: boolean;
  socialConnections?: {
    tiktok?: boolean;
    instagram?: boolean;
    youtube?: boolean;
    linkedin?: boolean;
  };
  completedGigs?: number;
  onTimeDeliveryRate?: number;
  avgContentQuality?: number;
}

interface TrustScoreBreakdown {
  score: number;
  verification: number;
  socials: number;
  performance: number;
  maxScore: number;
  nextMilestone: number | null;
  milestoneLabel: string | null;
}

/**
 * Hook to calculate trust score with memoization
 * Prevents recalculation on every render
 * @param creator - Creator data
 * @returns Trust score with breakdown
 */
export function useTrustScore(creator: Creator | null): TrustScoreBreakdown {
  return useMemo(() => {
    if (!creator) {
      return {
        score: 0,
        verification: 0,
        socials: 0,
        performance: 0,
        maxScore: 100,
        nextMilestone: 50,
        milestoneLabel: 'Instant Payouts',
      };
    }

    const score = calculateTrustScore(creator);

    // Calculate breakdown
    const verification =
      (creator.emailVerified ? 10 : 0) +
      (creator.phoneVerified ? 10 : 0) +
      (creator.stripeOnboardingComplete ? 15 : 0) +
      (creator.identityVerified ? 20 : 0);

    const socials =
      (creator.socialConnections?.tiktok ? 7 : 0) +
      (creator.socialConnections?.instagram ? 7 : 0) +
      (creator.socialConnections?.youtube ? 5 : 0) +
      (creator.socialConnections?.linkedin ? 1 : 0);

    // Performance score (future expansion)
    const performance = 0; // TODO: Add performance metrics

    // Determine next milestone
    let nextMilestone: number | null = null;
    let milestoneLabel: string | null = null;

    if (score < 50) {
      nextMilestone = 50;
      milestoneLabel = 'Instant Payouts';
    } else if (score < 70) {
      nextMilestone = 70;
      milestoneLabel = 'High-Value Gigs';
    } else if (score < 85) {
      nextMilestone = 85;
      milestoneLabel = 'Premium Gigs';
    }

    return {
      score,
      verification,
      socials,
      performance,
      maxScore: 100,
      nextMilestone,
      milestoneLabel,
    };
  }, [creator]);
}

export default useTrustScore;
