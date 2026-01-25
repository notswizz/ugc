export interface CreatorFilters {
  locationFilter: string;
  interestFilter: string[];
  socialFilter: string;
  followingCountFilter: { platform: string; min: number };
  sortBy: string;
}

export interface Creator {
  uid: string;
  username: string;
  bio?: string;
  location?: string;
  interests?: string[];
  experience?: string[];
  hardNos?: string[];
  languages?: string[];
  socials?: {
    tiktok?: string;
    instagram?: string;
    youtube?: string;
    linkedin?: string;
  };
  portfolioLinks?: string[];
  trustScore?: number;
  followingCount?: {
    tiktok?: number;
    instagram?: number;
    youtube?: number;
    linkedin?: number;
  };
  metrics?: {
    gigsCompleted?: number;
    ratingAvg?: number;
  };
  submissions?: any[];
}

export function filterCreators(creators: Creator[], filters: CreatorFilters): Creator[] {
  let filtered = creators.filter((creator) => {
    // Location filter
    if (filters.locationFilter && creator.location?.toLowerCase() !== filters.locationFilter.toLowerCase()) {
      return false;
    }

    // Interest filter
    if (filters.interestFilter.length > 0) {
      const creatorInterests = creator.interests || [];
      const hasAllInterests = filters.interestFilter.every((interest) => creatorInterests.includes(interest));
      if (!hasAllInterests) {
        return false;
      }
    }

    // Social filter
    if (filters.socialFilter) {
      const hasSocial = creator.socials?.[filters.socialFilter as keyof typeof creator.socials];
      if (!hasSocial) {
        return false;
      }
    }

    // Following count filter
    if (filters.followingCountFilter.platform && filters.followingCountFilter.min > 0) {
      const count =
        creator.followingCount?.[filters.followingCountFilter.platform as keyof typeof creator.followingCount] || 0;
      if (count < filters.followingCountFilter.min) {
        return false;
      }
    }

    return true;
  });

  // Sort creators
  filtered = [...filtered].sort((a, b) => {
    switch (filters.sortBy) {
      case 'username':
        return (a.username || '').localeCompare(b.username || '');
      case 'location':
        return (a.location || '').localeCompare(b.location || '');
      case 'followingCount':
        const aTotal = Object.values(a.followingCount || {}).reduce((sum: number, count) => sum + ((count as number) || 0), 0);
        const bTotal = Object.values(b.followingCount || {}).reduce((sum: number, count) => sum + ((count as number) || 0), 0);
        return bTotal - aTotal;
      case 'submissions':
        return (b.submissions?.length || 0) - (a.submissions?.length || 0);
      default:
        return 0;
    }
  });

  return filtered;
}

export function getUniqueLocations(creators: Creator[]): string[] {
  return Array.from(new Set(creators.map((c) => c.location).filter(Boolean) as string[])).sort();
}

export function getAllInterests(creators: Creator[]): string[] {
  return Array.from(new Set(creators.flatMap((c) => c.interests || []))).sort();
}

export const DEFAULT_FILTERS: CreatorFilters = {
  locationFilter: '',
  interestFilter: [],
  socialFilter: '',
  followingCountFilter: { platform: '', min: 0 },
  sortBy: 'username',
};
