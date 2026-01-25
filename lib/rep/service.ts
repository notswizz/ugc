import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

/**
 * Rep System
 * 
 * Earn Rep:
 * - Complete a gig: +50 rep
 * - Join a squad: +10 rep
 * - AI score 90-100: +30 rep
 * - AI score 80-89: +20 rep
 * - AI score 70-79: +10 rep
 * 
 * Lose Rep:
 * - Failed submission: -20 rep
 * 
 * Min rep: 0 (can't go negative)
 */

export const REP_REWARDS = {
  GIG_COMPLETED: 50,
  SQUAD_JOINED: 10,
  AI_SCORE_90_PLUS: 30,
  AI_SCORE_80_89: 20,
  AI_SCORE_70_79: 10,
  SUBMISSION_FAILED: -20,
} as const;

/**
 * Award rep to a creator
 */
export async function awardRep(creatorId: string, amount: number, reason: string): Promise<void> {
  try {
    const creatorRef = doc(db, 'creators', creatorId);
    
    // Get current rep to ensure it doesn't go negative
    const creatorDoc = await getDoc(creatorRef);
    if (!creatorDoc.exists()) {
      console.error('Creator not found:', creatorId);
      return;
    }
    
    const currentRep = creatorDoc.data().rep || 0;
    const newRep = Math.max(0, currentRep + amount);
    
    await updateDoc(creatorRef, {
      rep: newRep,
    });
    
    console.log(`Rep updated for ${creatorId}: ${currentRep} -> ${newRep} (${amount >= 0 ? '+' : ''}${amount}) - ${reason}`);
  } catch (error) {
    console.error('Error awarding rep:', error);
    throw error;
  }
}

/**
 * Award rep for completing a gig
 */
export async function awardGigCompletionRep(creatorId: string): Promise<void> {
  await awardRep(creatorId, REP_REWARDS.GIG_COMPLETED, 'Gig completed');
}

/**
 * Award rep for joining a squad
 */
export async function awardSquadJoinRep(creatorId: string): Promise<void> {
  await awardRep(creatorId, REP_REWARDS.SQUAD_JOINED, 'Joined squad');
}

/**
 * Award rep based on AI score
 */
export async function awardAIScoreRep(creatorId: string, aiScore: number): Promise<void> {
  let repAmount = 0;
  let reason = '';
  
  if (aiScore >= 90) {
    repAmount = REP_REWARDS.AI_SCORE_90_PLUS;
    reason = `AI Score ${aiScore} (90+)`;
  } else if (aiScore >= 80) {
    repAmount = REP_REWARDS.AI_SCORE_80_89;
    reason = `AI Score ${aiScore} (80-89)`;
  } else if (aiScore >= 70) {
    repAmount = REP_REWARDS.AI_SCORE_70_79;
    reason = `AI Score ${aiScore} (70-79)`;
  }
  
  if (repAmount > 0) {
    await awardRep(creatorId, repAmount, reason);
  }
}

/**
 * Deduct rep for failed submission
 */
export async function deductFailedSubmissionRep(creatorId: string): Promise<void> {
  await awardRep(creatorId, REP_REWARDS.SUBMISSION_FAILED, 'Submission failed');
}

/**
 * Get rep level based on total rep points
 */
export function getRepLevel(rep: number): { level: number; title: string; nextLevelRep: number; prevLevelRep: number } {
  const levels = [
    { level: 1, title: 'Rookie', minRep: 0 },
    { level: 2, title: 'Amateur', minRep: 100 },
    { level: 3, title: 'Rising Star', minRep: 300 },
    { level: 4, title: 'Pro', minRep: 600 },
    { level: 5, title: 'Expert', minRep: 1000 },
    { level: 6, title: 'Master', minRep: 1500 },
    { level: 7, title: 'Legend', minRep: 2500 },
  ];

  // Find current level
  let currentLevel = levels[0];
  for (const level of levels) {
    if (rep >= level.minRep) {
      currentLevel = level;
    } else {
      break;
    }
  }

  // Find next level
  const currentIndex = levels.findIndex(l => l.level === currentLevel.level);
  const nextLevel = levels[currentIndex + 1];
  const nextLevelRep = nextLevel ? nextLevel.minRep : currentLevel.minRep;
  const prevLevelRep = currentLevel.minRep;

  return {
    level: currentLevel.level,
    title: currentLevel.title,
    nextLevelRep,
    prevLevelRep,
  };
}

/**
 * Check if a creator can see a gig based on their rep level and gig creation time
 * Higher level creators get early access to gigs:
 * - Level 7 (Legend): Immediate access
 * - Level 6 (Master): 10 minutes after posting
 * - Level 5 (Expert): 20 minutes after posting
 * - Level 4 (Pro): 30 minutes after posting
 * - Level 3 (Rising Star): 40 minutes after posting
 * - Level 2 (Amateur): 50 minutes after posting
 * - Level 1 (Rookie): 60 minutes after posting
 */
export function canAccessGig(creatorRep: number, gigCreatedAt: Date): { canAccess: boolean; unlockAt?: Date; minutesUntilUnlock?: number } {
  const { level } = getRepLevel(creatorRep);
  
  // Minutes delay based on level (7 = 0 mins, 6 = 10 mins, etc.)
  const delayMinutes = (7 - level) * 10;
  
  const gigTime = gigCreatedAt instanceof Date ? gigCreatedAt : new Date(gigCreatedAt);
  const unlockTime = new Date(gigTime.getTime() + delayMinutes * 60 * 1000);
  const now = new Date();
  
  const canAccess = now >= unlockTime;
  const minutesUntilUnlock = canAccess ? 0 : Math.ceil((unlockTime.getTime() - now.getTime()) / (60 * 1000));
  
  return {
    canAccess,
    unlockAt: canAccess ? undefined : unlockTime,
    minutesUntilUnlock: canAccess ? undefined : minutesUntilUnlock,
  };
}

/**
 * Get the access delay in minutes for a given rep level
 */
export function getAccessDelayForLevel(level: number): number {
  return (7 - level) * 10;
}
