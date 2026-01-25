import type { NextApiRequest, NextApiResponse } from 'next';
import { processWithdrawal, canUseInstantWithdrawal } from '@/lib/payments/withdrawal';
import { calculateTrustScore } from '@/lib/trustScore/calculator';
import admin, { adminDb, adminAuth } from '@/lib/firebase/admin';
import { getBalance } from '@/lib/payments/balance';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!adminDb || !adminAuth) {
      return res.status(500).json({ error: 'Server not initialized' });
    }

    // Verify authentication - expect userId in body for now (client will pass it)
    // TODO: Implement proper token verification
    const { userId } = req.body;
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }
    const creatorId = userId;

    // Get creator data to verify role
    if (!adminDb) {
      return res.status(500).json({ error: 'Database not initialized' });
    }

    const creatorDoc = await adminDb.collection('creators').doc(creatorId).get();
    if (!creatorDoc.exists) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    const creatorData = creatorDoc.data();

    // Parse request
    const { amount, forceMethod } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (amount < 1) {
      return res.status(400).json({ error: 'Minimum withdrawal amount is $1.00' });
    }

    // Check balance
    const balance = await getBalance(creatorId, 'creator');
    if (balance < amount) {
      return res.status(400).json({
        error: `Insufficient balance. Available: $${balance.toFixed(2)}, Requested: $${amount.toFixed(2)}`,
      });
    }

    // Calculate trust score and determine method
    const trustScore = calculateTrustScore(creatorData);
    const canUseInstant = canUseInstantWithdrawal(trustScore);

    // Determine withdrawal method
    let destination: 'instant' | 'ach' = canUseInstant ? 'instant' : 'ach';
    if (forceMethod === 'instant' && !canUseInstant) {
      return res.status(400).json({
        error: 'Instant withdrawals require trust score >= 50. Please complete identity verification.',
        trustScore,
        requiredTrustScore: 50,
      });
    }
    if (forceMethod === 'ach') {
      destination = 'ach';
    }

    // Process withdrawal
    const result = await processWithdrawal({
      creatorId,
      amount,
      destination,
    });

    return res.status(200).json({
      success: true,
      withdrawalId: result.withdrawalId,
      method: result.method,
      estimatedArrival: result.estimatedArrival,
      message: result.method === 'instant'
        ? 'Withdrawal initiated. Funds should arrive within minutes.'
        : 'Withdrawal initiated. Funds will arrive in 2-3 business days.',
    });
  } catch (error: any) {
    console.error('Withdrawal API error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process withdrawal',
    });
  }
}
