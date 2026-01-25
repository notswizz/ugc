# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev              # Start dev server (localhost:3000)
npm run build            # Build for production
npm run lint             # Run ESLint
```

**Firebase Functions:**
```bash
cd functions && npm install && npm run serve   # Local functions emulator
firebase deploy --only functions               # Deploy functions
```

**Admin Scripts:**
```bash
npm run delete-db                    # Delete database
npm run set-gigs-open                # Open all gigs
npm run process-approved-payments    # Process approved payments
```

## Architecture

**Giglet** is a Next.js (Pages Router) marketplace connecting brands with content creators for UGC gigs.

### Core Stack
- Next.js 16 + React 19 + TypeScript
- Firebase (Firestore, Auth, Storage, Functions)
- Stripe Connect for payments
- Replicate VideoLLaMA for AI content evaluation
- Tailwind CSS + Radix UI components

### Directory Structure

| Directory | Purpose |
|-----------|---------|
| `/pages/creator` | Creator dashboard, gig browsing, submissions |
| `/pages/brand` | Brand dashboard, gig creation/management |
| `/pages/admin` | Admin dashboard |
| `/pages/api` | API routes (Stripe webhooks, verification, evaluation) |
| `/components` | React components organized by feature (dashboard, gigs, submissions, ui) |
| `/lib` | Business logic: `/ai`, `/payments`, `/trustScore`, `/firebase`, `/models` |
| `/functions` | Firebase Cloud Functions (separate package.json, Node 18) |
| `/scripts` | Admin/maintenance scripts |

### Key Systems

**Two-Sided Marketplace Flow:**
1. Brands create gigs with deliverables, payouts, and briefs
2. Creators browse/accept gigs based on trust score requirements
3. Creators submit content → AI evaluates quality
4. Brand approves → Stripe Connect processes payout

**Trust Score (0-100):** Calculated from verification status, connected socials, Stripe onboarding, completed gigs, delivery rate, content quality, and dispute history. See `/lib/trustScore/`.

**Squad System:** Recruiter-managed creator groups with squad-only gig access.

**AI Evaluation:** VideoLLaMA integration in `/lib/ai/` scores content quality, checks compliance, and provides component breakdowns.

### Database Collections (Firestore)
`users`, `creators`, `brands`, `gigs`, `submissions`, `payments`, `squads`, `squadInvitations`, `ratings`, `communities`, `communityCodes`

### Path Aliases
Uses `@/*` for imports (configured in tsconfig.json).

### Legacy Routes
Old "campaigns" routes redirect to "jobs" routes (configured in next.config.mjs).
