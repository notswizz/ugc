import { INSTANT_WITHDRAWAL_TRUST_SCORE_THRESHOLD } from './types';

/**
 * Check if creator is eligible for instant withdrawal
 */
export function canUseInstantWithdrawal(trustScore: number): boolean {
  return trustScore >= INSTANT_WITHDRAWAL_TRUST_SCORE_THRESHOLD;
}

/**
 * Validate withdrawal amount
 */
export function validateWithdrawalAmount(amount: number): { valid: boolean; error?: string } {
  if (amount <= 0) {
    return { valid: false, error: 'Withdrawal amount must be positive' };
  }

  if (amount < 1) {
    return { valid: false, error: 'Minimum withdrawal amount is $1.00' };
  }

  return { valid: true };
}

/**
 * Validate balance for withdrawal
 */
export function validateBalance(balance: number, amount: number): { valid: boolean; error?: string } {
  if (balance < amount) {
    return {
      valid: false,
      error: `Insufficient balance. Available: $${balance.toFixed(2)}, Requested: $${amount.toFixed(2)}`,
    };
  }

  return { valid: true };
}
