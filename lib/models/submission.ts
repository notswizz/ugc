// Submission types (replaces Deliverables)
export interface Submission {
  id: string;
  gigId: string;
  creatorId: string;
  version: number;

  files: {
    videos?: string[]; // Storage URLs
    photos?: string[];
    raw?: string[];
  };

  // Product purchase (for reimbursement)
  productPurchase?: {
    receiptUrl: string;
    productPhotoUrl: string;
    amount: number;
    purchaseDate: Date;
    ocrVerified: boolean;
  };

  // AI evaluation
  aiEvaluation?: {
    compliancePassed: boolean;
    complianceIssues?: string[];
    qualityScore: number; // 0-100
    qualityBreakdown: {
      hook: number;
      lighting: number;
      productClarity: number;
      authenticity: number;
      editing: number;
    };
    improvementTips?: string[];
  };

  status: "submitted" | "needs_changes" | "approved" | "rejected";
  changeRequestsCount: number; // Max 2 per plan
  changeRequestNotes?: string[];

  createdAt: Date;
  updatedAt: Date;
}

// Rating types - Updated per plan
export interface Rating {
  id: string;
  fromId: string;
  toId: string;
  gigId: string;

  // Creator ratings
  onTimeDelivery?: number; // 1-5
  compliance?: number; // 1-5
  quality?: number; // 1-5

  // Recruiter ratings (from brands)
  jobSuccessRate?: number;
  squadQuality?: number;
  brandSatisfaction?: number;

  comment?: string;
  createdAt: Date;
}

// Dispute types
export type DisputeStatus = "open" | "reviewing" | "resolved";

export interface Dispute {
  id: string;
  gigId: string;
  openedById: string;
  reason: string;
  evidenceUrls: string[];
  status: DisputeStatus;
  createdAt: Date;
  resolvedAt?: Date;
}
