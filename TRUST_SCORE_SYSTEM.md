# Trust Score System

## Overview
Trust Score is an **internal spam prevention and risk management system** that is **hidden from all users** (both creators and brands). It works alongside the visible **Reputation (Rep) system** to ensure platform quality and safety.

---

## Trust Score vs Reputation

| Feature | Trust Score | Reputation (Rep) |
|---------|-------------|------------------|
| **Visibility** | ❌ Hidden (internal only) | ✅ Visible to users |
| **Purpose** | Spam prevention, fraud protection | Reward system, early access |
| **How Earned** | Account verification, platform integrations | Completing gigs, AI scores, squad participation |
| **Range** | 0-100 | 0-∞ (unlimited) |
| **Used For** | Gating reimbursement gigs, high-value gigs | Tiered early access to new gigs |

---

## How Trust Score is Earned

Creators build trust score through legitimate account actions:

### Initial Score (20 points)
- Base score assigned during onboarding

### Verified Accounts (+5-7 points each)
- ✅ Email verification
- ✅ TikTok account linked and verified (+7)
- ✅ Instagram account linked (+7)
- ✅ X (Twitter) account linked (+6)

### Payment Setup (+10 points)
- ✅ Stripe Connect account linked and verified

### Platform Activity (+variable)
- Approved gig submissions
- Time on platform (account age)
- Consistent activity patterns

---

## Trust Score Gating

### What Trust Score Gates:
1. **Reimbursement Gigs** - Creators with low trust scores cannot accept gigs where they need to purchase products for reimbursement (fraud risk)
2. **High-Value Gigs** - Brands can set minimum trust score requirements
3. **Instant Payouts** - May require higher trust scores in the future

### Recommended Minimums:
- **Standard Gigs**: 20+ (default, no gating)
- **Product Reimbursement Gigs**: 50+ (recommended)
- **High-Value Reimbursement**: 70+ (strongly recommended)

---

## Implementation Details

### Database
Trust score is stored in the `creators` collection:
```javascript
{
  uid: "creator_id",
  trustScore: 65,
  // ... other fields
}
```

### Gig Filtering
When fetching gigs, creators are filtered out if:
```javascript
if (gig.trustScoreMin && creatorTrustScore < gig.trustScoreMin) {
  // Hide this gig from creator
}
```

### UI Removed From:
- ✅ Creator Dashboard (never shown)
- ✅ Brand Creator Detail Page (removed)
- ✅ Creator Scout Page (removed from display and sort)
- ✅ All creator-facing pages

### UI Kept In:
- ✅ Brand Gig Creation Form (with helper text explaining it's internal)

---

## Why Hidden?

1. **Reduces Gaming** - Users can't artificially inflate scores if they don't see them
2. **Better UX** - One visible metric (Rep) is cleaner than two
3. **Reduces Anxiety** - Creators focus on earning rep, not worrying about hidden scores
4. **Flexibility** - We can adjust trust score algorithms without user confusion

---

## Future Enhancements

Potential trust score improvements:
- ID verification integration
- Bank account verification
- AI detection of suspicious patterns
- Progressive trust building over time
- Trust score decay for inactive accounts
