import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Admin Rep Service - Uses Firebase Admin SDK for server-side operations
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
 * Award rep to a creator (admin/server-side)
 */
export async function awardRepAdmin(creatorId: string, amount: number, reason: string): Promise<void> {
  try {
    const creatorRef = adminDb.collection('creators').doc(creatorId);

    const creatorDoc = await creatorRef.get();
    if (!creatorDoc.exists) {
      console.error('Creator not found:', creatorId);
      return;
    }

    const currentRep = creatorDoc.data()?.rep || 0;
    const newRep = Math.max(0, currentRep + amount);

    await creatorRef.update({
      rep: newRep,
    });

    console.log(`Rep updated for ${creatorId}: ${currentRep} -> ${newRep} (${amount >= 0 ? '+' : ''}${amount}) - ${reason}`);
  } catch (error) {
    console.error('Error awarding rep:', error);
    throw error;
  }
}

/**
 * Award rep for completing a gig (admin/server-side)
 */
export async function awardGigCompletionRepAdmin(creatorId: string): Promise<void> {
  await awardRepAdmin(creatorId, REP_REWARDS.GIG_COMPLETED, 'Gig completed');
}

/**
 * Award rep for joining a squad (admin/server-side)
 */
export async function awardSquadJoinRepAdmin(creatorId: string): Promise<void> {
  await awardRepAdmin(creatorId, REP_REWARDS.SQUAD_JOINED, 'Joined squad');
}

/**
 * Award rep based on AI score (admin/server-side)
 */
export async function awardAIScoreRepAdmin(creatorId: string, aiScore: number): Promise<void> {
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
    await awardRepAdmin(creatorId, repAmount, reason);
  }
}

/**
 * Deduct rep for failed submission (admin/server-side)
 */
export async function deductFailedSubmissionRepAdmin(creatorId: string): Promise<void> {
  await awardRepAdmin(creatorId, REP_REWARDS.SUBMISSION_FAILED, 'Submission failed');
}
