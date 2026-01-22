// Core user types
export type UserRole = "creator" | "brand" | "admin" | "recruiter";

export interface User {
  uid: string;
  role: UserRole;
  name: string;
  email: string;
  username?: string; // Unique username (required for creators)
  photoURL?: string;
  phone?: string;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  createdAt: Date;
  lastActiveAt: Date;
}

// Things/Categories (replaces brand-centric model)
export interface Thing {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  createdAt: Date;
}

// Creator types - Updated per plan.txt
export interface Creator {
  uid: string;
  username: string; // Unique username for invitations
  bio: string;
  location: string;
  languages: string[];
  
  // Three tag groups per plan
  interests: string[]; // What I like (boosts feed ranking)
  experience: string[]; // What I'm good at (qualifies creators)
  hardNos: string[]; // What I won't promote (hard filters)
  
  // Social connections for Trust Score
  socials: {
    tiktok?: string;
    instagram?: string;
    youtube?: string;
    x?: string;
    linkedin?: string;
  };
  
  // Following count for each platform
  followingCount?: {
    tiktok?: number;
    instagram?: number;
    youtube?: number;
    x?: number;
    linkedin?: number;
  };
  
  // Social verification metadata
  socialVerification?: {
    tiktok?: {
      verified: boolean;
      verifiedAt?: Date;
      followerCount?: number;
      username?: string;
      displayName?: string;
    };
    instagram?: {
      verified: boolean;
      verifiedAt?: Date;
      followerCount?: number;
      username?: string;
    };
    youtube?: {
      verified: boolean;
      verifiedAt?: Date;
      subscriberCount?: number;
      username?: string;
    };
    x?: {
      verified: boolean;
      verifiedAt?: Date;
      followerCount?: number;
      username?: string;
    };
  };
  
  // Trust Score (0-100)
  trustScore: number;
  
  // Rep (reputation points)
  rep: number;
  
  // Community (school/group)
  communityId?: string; // Assigned community ID (cannot be changed)

  phoneVerified?: boolean;

  rates: {
    perGigSuggested?: number;
  };
  turnaroundDays: number;
  portfolioLinks: string[];
  
  // Metrics updated per plan
  metrics: {
    ratingAvg: number;
    ratingCount: number;
    gigsCompleted: number;
    onTimeRate: number;
    disputeRate: number;
    refundRate: number;
    responseTimeHoursAvg: number;
    acceptanceRate: number;
  };
  
  stripe: {
    connectAccountId?: string;
    onboardingComplete?: boolean;
    identityVerified?: boolean;
  };
  
  balance?: number; // Account balance in USD
  
  status: "draft" | "active";
  accountAge: number; // Days since account creation
}

// Brand types
export interface Brand {
  uid: string;
  companyName: string;
  website: string;
  industry: string;
  brandVoice: {
    casualToPolished: number; // 1-10 scale
  };
  defaultUsageRightsId?: string;
  stripe: {
    customerId?: string;
  };
  
  balance?: number; // Account balance in USD
  
  status: "draft" | "active";
}

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

// Thread/Message types
export interface Thread {
  id: string;
  participants: string[]; // [brandId, creatorId] or [recruiterId, creatorId]
  gigId?: string;
  lastMessageAt: Date;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  createdAt: Date;
}

// Squad and Recruiter types
export interface Squad {
  id: string;
  name: string;
  description: string;
  recruiterId: string; // Squad Lead
  tags: string[]; // Thing-based tags
  style?: string; // e.g. "POV", "Review", "Tutorial"
  
  memberIds: string[]; // Creator UIDs
  inviteOnly: boolean;
  trustScoreMin?: number;
  
  stats: {
    completionRate: number;
    avgAIScore: number;
    gigsCompleted: number;
  };
  
  recruiterCut?: number; // Percentage from brand side
  createdAt: Date;
  updatedAt: Date;
}

export interface Recruiter {
  uid: string;
  name: string;
  squadsManaged: string[]; // Squad IDs
  totalEarnings: number;
  stats: {
    jobSuccessRate: number;
    brandSatisfaction: number;
    squadQuality: number;
  };
  createdAt: Date;
}

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

// Admin log types
export interface AdminLog {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}