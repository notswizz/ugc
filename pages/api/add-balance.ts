import type { NextApiRequest, NextApiResponse } from 'next';
import { updateBalance } from '@/lib/payments/balance';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, userType, amount } = req.body;

  if (!userId || !userType || !amount) {
    return res.status(400).json({ error: 'Missing required fields: userId, userType, amount' });
  }

  if (userType !== 'brand' && userType !== 'creator') {
    return res.status(400).json({ error: 'userType must be "brand" or "creator"' });
  }

  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  try {
    const newBalance = await updateBalance(
      userId,
      userType,
      amountNum,
      `Manual balance addition`,
      {
        source: 'dashboard',
        addedAt: new Date().toISOString(),
      }
    );

    return res.status(200).json({ 
      success: true, 
      newBalance,
      amount: amountNum
    });
  } catch (error: any) {
    console.error('Error adding balance:', error);
    return res.status(500).json({ 
      error: 'Failed to add balance', 
      message: error.message
    });
  }
}
