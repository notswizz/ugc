import { Creator } from '../models/types';

/**
 * Calculate Trust Score (0-100) based on plan.txt requirements
 * 
 * Trust Score inputs:
 * - Email + phone verified
 * - Stripe Connect onboarded
 * - Connected socials (TikTok, IG, YouTube, LinkedIn optional)
 * - Platform history: gigs completed, on-time rate, dispute rate, refund rate
 * - Account age
 */
export function calculateTrustScore(creator: Creator | Partial<Creator>): number {
  if (!creator) return 0;
  
  let score = 0;
  
  // Email verification (10 points)
  if (creator.uid) { // Assuming verified if account exists
    score += 10;
  }
  
  // Phone verification (10 points)
  // Would check if phoneVerified is true
  score += 0; // Placeholder - needs phone verification data
  
  // Stripe Connect onboarded (15 points)
  if (creator.stripe?.onboardingComplete) {
    score += 15;
  }
  
  // Connected socials (max 20 points)
  const socials = creator.socials || {};
  let socialScore = 0;
  if (socials?.tiktok) socialScore += 7;
  if (socials?.instagram) socialScore += 7;
  if (socials?.youtube) socialScore += 5;
  if (socials?.linkedin) socialScore += 1; // Optional
  score += Math.min(socialScore, 20);
  
  // Platform history (max 35 points)
  const historyScore = calculateHistoryScore(creator);
  score += historyScore;
  
  // Account age (max 10 points)
  const accountAgeDays = creator.accountAge || 0;
  if (accountAgeDays >= 365) {
    score += 10;
  } else if (accountAgeDays >= 180) {
    score += 7;
  } else if (accountAgeDays >= 90) {
    score += 5;
  } else if (accountAgeDays >= 30) {
    score += 2;
  }
  
  return Math.min(Math.max(score, 0), 100);
}

function calculateHistoryScore(creator: Creator | Partial<Creator>): number {
  const metrics = creator.metrics || {
    gigsCompleted: 0,
    onTimeRate: 100,
    disputeRate: 0,
    refundRate: 0,
  };
  let score = 0;
  
  // Gigs completed (max 10 points)
  const gigsCompleted = (metrics as any).gigsCompleted || 0;
  if (gigsCompleted >= 50) {
    score += 10;
  } else if (gigsCompleted >= 25) {
    score += 8;
  } else if (gigsCompleted >= 10) {
    score += 6;
  } else if (gigsCompleted >= 5) {
    score += 4;
  } else if (gigsCompleted >= 1) {
    score += 2;
  }
  
  // On-time rate (max 10 points)
  const onTimeRate = (metrics as any).onTimeRate || 100;
  score += (onTimeRate / 100) * 10;
  
  // Dispute rate penalty (max -5 points)
  const disputeRate = (metrics as any).disputeRate || 0;
  score -= (disputeRate / 100) * 5;
  
  // Refund rate penalty (max -5 points)
  const refundRate = (metrics as any).refundRate || 0;
  score -= (refundRate / 100) * 5;
  
  return Math.max(score, 0);
}

/**
 * Check if creator can accept a gig based on Trust Score requirements
 */
export function canAcceptGig(creator: Creator | Partial<Creator> | null | undefined, jobTrustScoreMin?: number): boolean {
  if (!creator) return false;
  const trustScore = calculateTrustScore(creator);
  
  // If gig has no Trust Score requirement, anyone can accept
  if (!jobTrustScoreMin) {
    return true;
  }
  
  return trustScore >= jobTrustScoreMin;
}

/**
 * Check if creator can accept reimbursement gigs
 */
export function canAcceptReimbursementGigs(creator: Creator): boolean {
  const trustScore = calculateTrustScore(creator);
  // Low-trust creators cannot accept reimbursement gigs
  // Threshold set at 50 (can be adjusted)
  return trustScore >= 50;
}

/**
 * Check if creator can accept high-payout gigs
 */
export function canAcceptHighPayoutGigs(creator: Creator, payout: number): boolean {
  const trustScore = calculateTrustScore(creator);
  
  // High payout threshold: $500+
  if (payout >= 500) {
    return trustScore >= 70;
  }
  
  return true;
}
