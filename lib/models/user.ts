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
