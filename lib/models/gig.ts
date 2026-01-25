// Usage rights template
export interface UsageRightsTemplate {
  id: string;
  createdByBrandId: string;
  termMonths: number;
  channels: {
    paidSocial: boolean;
    organicSocial: boolean;
    website: boolean;
    email: boolean;
    whitelisting: boolean;
  };
  rawFootageIncluded: boolean;
  exclusivity: {
    enabled: boolean;
    category?: string;
    months?: number;
  };
  geo: string[] | "global";
  notes: string;
}

// Gig types - Updated per plan.txt
export type GigStatus =
  | "open"
  | "accepted"
  | "submitted"
  | "needs_changes"
  | "approved"
  | "paid"
  | "expired"
  | "cancelled"
  | "disputed";

export type GigVisibility = "open" | "squad" | "invite";

export interface Gig {
  id: string;
  brandId: string;
  title: string;
  description: string;
  productDescription?: string; // Specific product description for AI evaluation

  // Things-based (not brand-centric)
  primaryThing: string; // e.g. "Gambling", "NFL", "Fitness"
  secondaryTags: string[];

  deliverables: {
    videos: number;
    photos: number;
    raw: boolean;
    notes: string;
  };

  basePayout: number;
  bonusPool?: number;
  bonusThresholds?: {
    score80?: number; // e.g. +$25
    score90?: number; // e.g. +$50
  };

  deadlineAt: Date;
  usageRightsTemplateId: string;
  usageRightsSnapshot: UsageRightsTemplate;

  // Visibility and gating
  visibility: GigVisibility;
  targetTags?: string[]; // For squad visibility
  trustScoreMin?: number; // Minimum Trust Score required
  minFollowers?: number; // Minimum followers required
  minFollowersPlatform?: string; // Platform for follower requirement (TikTok, Instagram, X)
  experienceRequirements?: string[]; // e.g. ["paid_ads", "on_camera"]
  invitedCreatorIds?: string[]; // For invite visibility

  // Accepted submissions limit
  acceptedSubmissionsLimit: number; // How many accepted submissions are needed (each creator gets paid when approved)

  // Product-in-video requirements
  productInVideoRequired: boolean;
  reimbursementMode?: "reimbursement" | "shipping";
  reimbursementCap?: number;
  purchaseWindowHours?: number; // For reimbursement

  // AI evaluation
  aiComplianceRequired: boolean;
  autoApproveWindowHours?: number; // Brand auto-approve if inactive

  status: GigStatus;
  acceptedBy?: string;
  acceptedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

// Gig Brief (creative requirements)
export interface GigBrief {
  hooks: string[];
  angles: string[];
  talkingPoints: string[];
  do: string[];
  dont: string[];
  references: string[];
  brandAssets: {
    logos: string[];
    productPhotos: string[];
    docs: string[];
  };
}
