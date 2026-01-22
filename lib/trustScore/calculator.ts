import { Creator } from '../models/types';

/**
 * Calculate Trust Score (0-100) based on verification and account connections only
 * 
 * Trust Score inputs:
 * - Email verified (10 points)
 * - Phone verified (10 points)
 * - Stripe Connect onboarded (15 points)
 * - Identity verification via Stripe (20 points)
 * - Connected socials (TikTok, IG, YouTube, LinkedIn optional) - max 20 points
 * 
 * Total possible: 75 points (can be adjusted to reach 100 if needed)
 */
export function calculateTrustScore(creator: Creator | Partial<Creator>): number {
  if (!creator) return 0;
  
  let score = 0;
  
  // Email verification (10 points)
  if (creator.uid) { // Assuming verified if account exists
    score += 10;
  }
  
  // Phone verification (10 points)
  if (creator.phoneVerified) {
    score += 10;
  }
  
  // Stripe Connect onboarded (15 points)
  if (creator.stripe?.onboardingComplete) {
    score += 15;
  }
  
  // Identity verification via Stripe (20 points)
  if (creator.stripe?.identityVerified) {
    score += 20;
  }
  
  // Connected socials (max 20 points)
  const socials = creator.socials || {};
  let socialScore = 0;
  if (socials?.tiktok) socialScore += 7;
  if (socials?.instagram) socialScore += 7;
  if (socials?.youtube) socialScore += 5;
  if (socials?.linkedin) socialScore += 1; // Optional
  score += Math.min(socialScore, 20);
  
  return Math.min(Math.max(score, 0), 100);
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
