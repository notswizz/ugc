import type { NextApiRequest, NextApiResponse } from 'next';
import admin, { adminDb } from '@/lib/firebase/admin';
import { calculateTrustScore, canAcceptGig, canAcceptReimbursementGigs, canAcceptHighPayoutGigs } from '@/lib/trustScore/calculator';
import { getCreatorFollowingCount } from '@/lib/payments/calculate-payout';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!adminDb) {
    return res.status(500).json({ error: 'Database not initialized' });
  }

  try {
    const { userId, gigId } = req.body;

    if (!userId || !gigId) {
      return res.status(400).json({ error: 'Missing userId or gigId' });
    }

    // Get creator data
    const creatorDoc = await adminDb.collection('creators').doc(userId).get();
    if (!creatorDoc.exists) {
      return res.status(404).json({ error: 'Creator not found' });
    }
    const creatorData = creatorDoc.data();

    // Get gig data
    const gigRef = adminDb.collection('gigs').doc(gigId);
    const gigDoc = await gigRef.get();
    if (!gigDoc.exists) {
      return res.status(404).json({ error: 'Gig not found' });
    }
    const gigData = gigDoc.data();

    // Check if gig is ended
    const deadline = gigData.deadlineAt?.toDate ? gigData.deadlineAt.toDate() : new Date(gigData.deadlineAt);
    if (deadline.getTime() < Date.now()) {
      return res.status(400).json({ error: 'This gig has ended' });
    }

    // Check if gig is already accepted by this creator
    if (gigData.acceptedBy === userId) {
      return res.status(200).json({ success: true, message: 'Gig already accepted', alreadyAccepted: true });
    }

    // Check if gig is closed (status check)
    if (gigData.status === 'closed') {
      return res.status(400).json({ error: 'This gig is no longer accepting submissions' });
    }

    // Check accepted submissions limit
    const acceptedSubmissionsLimit = gigData.acceptedSubmissionsLimit || 1;
    
    // Count current accepted submissions (submissions with status 'submitted', 'needs_changes', or 'approved')
    const submissionsQuery = await adminDb
      .collection('submissions')
      .where('gigId', '==', gigId)
      .where('status', 'in', ['submitted', 'needs_changes', 'approved'])
      .get();
    
    const acceptedCount = submissionsQuery.size;
    
    // For single-creator gigs, check if already accepted by someone else
    if (acceptedSubmissionsLimit === 1 && gigData.acceptedBy && gigData.acceptedBy !== userId) {
      return res.status(400).json({ error: 'This gig has already been accepted by another creator' });
    }

    // Check if we've reached the limit
    if (acceptedCount >= acceptedSubmissionsLimit) {
      return res.status(400).json({ error: 'This gig has reached its acceptance limit' });
    }

    // Check trust score requirement
    if (gigData.trustScoreMin) {
      if (!canAcceptGig(creatorData, gigData.trustScoreMin)) {
        return res.status(403).json({
          error: 'Trust score too low',
          message: `This gig requires a Trust Score of ${gigData.trustScoreMin}. Your current Trust Score is ${calculateTrustScore(creatorData)}.`,
        });
      }
    }

    // Check follower requirements
    if (gigData.minFollowers && gigData.minFollowersPlatform) {
      const creatorFollowingCount = getCreatorFollowingCount(creatorData);
      const platformFollowers = creatorData?.followingCount?.[gigData.minFollowersPlatform] || 0;
      if (platformFollowers < gigData.minFollowers) {
        return res.status(403).json({
          error: 'Follower requirement not met',
          message: `This gig requires at least ${gigData.minFollowers.toLocaleString()} followers on ${gigData.minFollowersPlatform}.`,
        });
      }
    }

    // Check reimbursement gig requirements
    if (gigData.productInVideoRequired && gigData.reimbursementMode === 'reimbursement') {
      if (!canAcceptReimbursementGigs(creatorData as any)) {
        return res.status(403).json({
          error: 'Cannot accept reimbursement gigs',
          message: 'You need a higher Trust Score to accept reimbursement gigs.',
        });
      }
    }

    // Check high payout requirements
    const basePayout = gigData.basePayout || 0;
    if (!canAcceptHighPayoutGigs(creatorData as any, basePayout)) {
      return res.status(403).json({
        error: 'Cannot accept high-payout gigs',
        message: 'You need a higher Trust Score to accept high-payout gigs.',
      });
    }

    // Use transaction to atomically accept the gig
    await adminDb.runTransaction(async (transaction) => {
      // Re-read gig to ensure we have latest data
      const currentGigDoc = await transaction.get(gigRef);
      if (!currentGigDoc.exists) {
        throw new Error('Gig not found');
      }
      const currentGigData = currentGigDoc.data();

      // Double-check if already accepted (race condition protection)
      if (currentGigData.acceptedBy === userId) {
        return; // Already accepted, nothing to do
      }

      // For single-creator gigs, check again if someone else accepted
      if (acceptedSubmissionsLimit === 1 && currentGigData.acceptedBy && currentGigData.acceptedBy !== userId) {
        throw new Error('Gig already accepted by another creator');
      }

      // Count accepted submissions again in transaction
      const currentSubmissionsQuery = await adminDb
        .collection('submissions')
        .where('gigId', '==', gigId)
        .where('status', 'in', ['submitted', 'needs_changes', 'approved'])
        .get();
      
      if (currentSubmissionsQuery.size >= acceptedSubmissionsLimit) {
        throw new Error('Gig has reached its acceptance limit');
      }

      // Update gig with acceptance
      transaction.update(gigRef, {
        acceptedBy: userId,
        acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        // Update status to 'accepted' if it was 'open'
        ...(currentGigData.status === 'open' && { status: 'accepted' }),
      });
    });

    return res.status(200).json({
      success: true,
      message: 'Gig accepted successfully!',
    });
  } catch (error: any) {
    console.error('[accept-gig] Error:', error);
    return res.status(500).json({
      error: 'Failed to accept gig',
      message: error.message || 'An error occurred while accepting the gig',
    });
  }
}
