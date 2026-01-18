# Community System

## Overview
The Community System allows creators to join schools, universities, or niche groups where they can compete against each other for prizes, cash rewards, and recognition through leaderboards.

---

## Key Features

### 1. **One Community Per Creator**
- Creators can join **only ONE community** during onboarding
- Community assignment is **permanent** and cannot be changed
- Joining a community is **optional** during signup

### 2. **Community Codes**
- Admins create unique community codes for each community
- Codes are distributed to community members (e.g., students, group members)
- Codes are case-insensitive but stored in uppercase (e.g., `HARVARD2024`, `FITNESSGURUS`)

### 3. **Competition & Leaderboards**
- Creators within a community compete against each other
- Rankings based on rep points, gigs completed, earnings, and AI scores
- Prizes and rewards are distributed to top performers

---

## Database Structure

### `communities` Collection
```javascript
{
  id: "community_id",
  name: "Harvard University",
  type: "university", // "university", "school", "niche", "company"
  description: "Harvard students creating content",
  createdAt: Date,
  createdBy: "admin_uid",
  settings: {
    prizesEnabled: true,
    leaderboardEnabled: true,
  },
  stats: {
    memberCount: 0,
    totalEarnings: 0,
    totalGigsCompleted: 0,
  }
}
```

### `communityCodes` Collection
```javascript
{
  id: "code_doc_id",
  code: "HARVARD2024", // Uppercase unique code
  communityId: "community_id",
  communityName: "Harvard University",
  createdAt: Date,
  createdBy: "admin_uid",
  isActive: true,
  usageCount: 0, // Track how many creators joined with this code
}
```

### `creators` Collection (Updated)
```javascript
{
  uid: "creator_id",
  username: "johndoe",
  communityId: "community_id", // Optional, assigned once during onboarding
  // ... other fields
}
```

### `communityLeaderboard` Collection (Future)
```javascript
{
  id: "leaderboard_entry_id",
  communityId: "community_id",
  creatorId: "creator_uid",
  username: "johndoe",
  rank: 1,
  rep: 1250,
  gigsCompleted: 25,
  totalEarnings: 5000,
  avgAIScore: 87,
  updatedAt: Date,
}
```

---

## Onboarding Flow

### Step 4: Community Code (New)
1. Creator is shown a community code input field
2. Field is **optional** - they can skip and continue
3. Code validation happens in real-time:
   - Check if code exists in `communityCodes` collection
   - If valid, show community name
   - If invalid, show error message
4. Benefits of joining are explained:
   - Compete with peers for prizes
   - Track ranking on community leaderboards
   - Win cash rewards and bonus points
   - **Can only join once - choose wisely!**

### Backend Logic on Submit
```javascript
// In creator onboarding submit handler:
if (formData.communityCode.trim()) {
  const communityResult = await checkCommunityCode(formData.communityCode);
  if (communityResult.valid && communityResult.communityId) {
    creatorData.communityId = communityResult.communityId;
    
    // Increment usage count for the code
    await updateDoc(communityCodeDoc, {
      usageCount: increment(1),
    });
  }
}
```

---

## Admin Functions

### Creating a Community Code
```javascript
// Admin dashboard or Firebase Function
await addDoc(collection(db, 'communityCodes'), {
  code: 'HARVARD2024',
  communityId: 'harvard_community_id',
  communityName: 'Harvard University',
  createdAt: serverTimestamp(),
  createdBy: adminUid,
  isActive: true,
  usageCount: 0,
});
```

### Viewing Community Stats
- Total members
- Total earnings across all members
- Total gigs completed
- Average AI score
- Top performers

---

## Future Enhancements

### 1. **Community Leaderboards**
- Real-time rankings updated after each gig completion
- Multiple leaderboard categories:
  - Most rep points
  - Highest earnings
  - Most gigs completed
  - Highest average AI score
  - Most consistent (on-time rate)

### 2. **Community Prizes**
- Monthly/Seasonal competitions
- Cash prizes for top 3 performers
- Bonus rep points for winners
- Special badges and recognition

### 3. **Community Challenges**
- Time-limited challenges (e.g., "Complete 5 gigs this week")
- Community-wide goals (e.g., "50 gigs completed as a community")
- Extra rewards for participation

### 4. **Community Analytics**
- Dashboard showing community performance
- Member growth over time
- Earnings distribution
- Activity heatmaps

### 5. **Community Verification**
- Optional email domain verification (e.g., @harvard.edu)
- Ensures only legitimate community members can join

---

## Use Cases

### Universities & Schools
- **Harvard University**: Students compete for prizes, showcase their content creation skills
- **High Schools**: Students learn content creation while earning money
- **Boot Camps**: Students build portfolios while competing

### Niche Communities
- **Fitness Creators**: Compete within the fitness content niche
- **Gaming Creators**: Gaming-focused content competition
- **Beauty Creators**: Beauty and skincare content community

### Companies
- **Marketing Agencies**: Internal teams competing for performance
- **Franchises**: Different locations competing against each other

---

## Benefits

### For Creators
1. **Motivation**: Compete against peers for recognition
2. **Community**: Feel part of a group with similar goals
3. **Prizes**: Win cash and rewards for top performance
4. **Transparency**: See where they rank among peers

### For Giglet
1. **Engagement**: Higher retention through gamification
2. **Growth**: Viral growth through communities sharing codes
3. **Quality**: Competition drives higher-quality content
4. **Segmentation**: Better targeting for brands (e.g., "college students")

### For Brands
1. **Targeting**: Reach specific demographics (e.g., college students, fitness enthusiasts)
2. **Quality**: Community competition drives better content
3. **Authenticity**: Community members create authentic content for their peers

---

## Implementation Checklist

- [x] Add `communityCode` field to creator onboarding form
- [x] Add community code validation logic
- [x] Add new onboarding step (Step 4) for community code
- [x] Update Creator type with `communityId` field
- [x] Update onboarding submit logic to assign community
- [ ] Create admin interface for creating communities
- [ ] Create admin interface for generating community codes
- [ ] Build community leaderboards
- [ ] Add community analytics dashboard
- [ ] Implement prize distribution system
- [ ] Add community challenges feature
