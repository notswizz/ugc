export interface WithdrawalRequest {
  creatorId: string;
  amount: number; // in dollars
  destination: 'instant' | 'ach'; // Will be determined by trust score, but can be forced
}

export interface WithdrawalResult {
  success: boolean;
  withdrawalId?: string;
  method: 'instant' | 'ach';
  estimatedArrival?: string;
  error?: string;
}

// Trust score threshold for instant withdrawals (debit card)
// Creators with trust score >= 50 get instant withdrawals
// Below 50 get ACH (2-3 business days)
export const INSTANT_WITHDRAWAL_TRUST_SCORE_THRESHOLD = 50;
