/**
 * Calculate payout based on follower count and gig payout structure
 * @param gig - The job/gig object
 * @param creatorFollowingCount - Creator's total following count (sum of all platforms)
 * @returns The calculated payout amount
 */
export function calculatePayout(gig: any, creatorFollowingCount: number = 0): number {
  // If gig has dynamic follower ranges
  if (gig.payoutType === 'dynamic' && gig.followerRanges && gig.followerRanges.length > 0) {
    // Sort ranges by min follower count (ascending)
    const sortedRanges = [...gig.followerRanges].sort((a, b) => (a.min || 0) - (b.min || 0));
    
    // Find the matching range
    for (const range of sortedRanges) {
      const min = range.min || 0;
      const max = range.max;
      
      if (creatorFollowingCount >= min) {
        // If max is null, it means "and above" - use this range
        if (max === null || max === undefined) {
          return range.payout || 0;
        }
        // If creator's count is within this range
        if (creatorFollowingCount <= max) {
          return range.payout || 0;
        }
      }
    }
    
    // If no range matches, return 0 (or could return the lowest range)
    return 0;
  }
  
  // Default to basePayout for fixed payout type
  return gig.basePayout || 0;
}

/**
 * Get creator's total following count across all platforms
 * @param creator - The creator object
 * @returns Total following count
 */
export function getCreatorFollowingCount(creator: any): number {
  if (!creator || !creator.followingCount) {
    return 0;
  }
  
  const counts = creator.followingCount;
  return (counts.tiktok || 0) + 
         (counts.instagram || 0) + 
         (counts.youtube || 0) + 
         (counts.linkedin || 0);
}
