// Gig creation schema and defaults

export interface GigFormData {
  title: string;
  platform: string;
  contentType: string;
  instagramFormat: string;
  description: string;
  productDescription: string;
  primaryThing: string;
  secondaryTags: string[];
  payoutType: 'fixed' | 'dynamic';
  basePayout: string;
  followerRanges: FollowerRange[];
  bonusPool: string;
  deadlineHours: number;
  visibility: 'open' | 'squad' | 'invite';
  targetTags: string[];
  squadIds: string[];
  trustScoreMin: string;
  minFollowers: string;
  experienceRequirements: string[];
  acceptedSubmissionsLimit: number;
  productInVideoRequired: boolean;
  reimbursementMode: 'reimbursement' | 'shipping';
  reimbursementCap: string;
  purchaseWindowHours: number;
  deliverables: {
    videos: number;
    photos: number;
    raw: boolean;
    notes: string;
  };
  brief: GigBrief;
  usageRightsTemplateId: string;
  aiComplianceRequired: boolean;
  autoApproveWindowHours: number;
}

export interface FollowerRange {
  min: number;
  max: number | null;
  payout: number;
}

export interface GigBrief {
  hooks: string[];
  angles: string[];
  talkingPoints: string[];
  do: string[];
  dont: string[];
  references: string[];
}

export const DEFAULT_GIG_DATA: GigFormData = {
  title: '',
  platform: '',
  contentType: '',
  instagramFormat: '',
  description: '',
  productDescription: '',
  primaryThing: '',
  secondaryTags: [],
  payoutType: 'fixed',
  basePayout: '',
  followerRanges: [{ min: 0, max: null, payout: 0 }],
  bonusPool: '',
  deadlineHours: 24,
  visibility: 'open',
  targetTags: [],
  squadIds: [],
  trustScoreMin: '',
  minFollowers: '',
  experienceRequirements: [],
  acceptedSubmissionsLimit: 1,
  productInVideoRequired: false,
  reimbursementMode: 'reimbursement',
  reimbursementCap: '',
  purchaseWindowHours: 24,
  deliverables: {
    videos: 0,
    photos: 0,
    raw: false,
    notes: '',
  },
  brief: {
    hooks: [''],
    angles: [''],
    talkingPoints: [''],
    do: [''],
    dont: [''],
    references: [''],
  },
  usageRightsTemplateId: '',
  aiComplianceRequired: false,
  autoApproveWindowHours: 0,
};

export function validateStep1(data: GigFormData): string | null {
  if (!data.title.trim()) return 'Please enter a gig title';
  if (!data.platform) return 'Please select a platform';
  if (!data.contentType) return 'Please select a content type';
  if (data.platform === 'instagram' && !data.instagramFormat) {
    return 'Please select an Instagram format';
  }
  if (!data.primaryThing) return 'Please select a category';
  return null;
}

export function validateStep2(data: GigFormData): string | null {
  if (data.payoutType === 'fixed') {
    if (!data.basePayout || parseFloat(data.basePayout) <= 0) {
      return 'Please enter a valid payout amount';
    }
  } else {
    const hasValidRanges = data.followerRanges.some(r => r.payout > 0);
    if (!hasValidRanges) {
      return 'Please configure at least one follower range with a payout';
    }
  }
  return null;
}
