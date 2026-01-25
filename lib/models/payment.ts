export interface Payment {
  id: string;
  gigId: string;
  brandId: string;
  creatorId: string;

  basePayout: number;
  bonusAmount?: number;
  reimbursementAmount?: number;

  platformFee: number; // Applied to base only
  recruiterFee?: number; // Paid from brand side
  creatorNet: number; // After all deductions

  stripe: {
    checkoutSessionId?: string;
    paymentIntentId?: string;
    transferId?: string;
  };

  status: "pending" | "captured" | "refunded" | "transferred";
  createdAt: Date;
  transferredAt?: Date;
}
