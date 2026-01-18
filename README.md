# Giglet

A marketplace platform connecting brands with content creators for user-generated content (UGC) gigs.

## Overview

Giglet is a two-sided marketplace where:
- **Brands** post gigs for content creation
- **Creators** browse, accept, and complete gigs
- **AI evaluation** ensures content quality
- **Squads** allow recruiters to manage groups of creators

## Features

- **Gig Management**: Create, browse, and accept gigs
- **AI-Powered Evaluation**: Automated content quality assessment using VideoLLaMA
- **Trust Score System**: Creator reputation based on performance
- **Squad System**: Recruiter-managed creator groups
- **Dynamic Payouts**: Follower-based compensation
- **Social Verification**: TikTok, Instagram, YouTube integration
- **Usage Rights**: Flexible content licensing

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Firebase (Firestore, Storage, Auth, Functions)
- **Payments**: Stripe Connect
- **AI**: Replicate VideoLLaMA for content evaluation
- **Deployment**: Vercel

## Quick Start

### 1. Prerequisites

- Node.js 18+
- Firebase project
- Stripe account
- Replicate API key

### 2. Installation

```bash
npm install
```

### 3. Environment Variables

Create a `.env.local` file:

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Replicate AI
REPLICATE_API_TOKEN=r8_...

# TikTok Verification
TIKTOK_CLIENT_KEY=your_client_key
TIKTOK_CLIENT_SECRET=your_client_secret
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
/pages
  /creator          # Creator dashboard and gig browsing
  /brand            # Brand dashboard and gig creation
  /admin            # Admin dashboard
  /api              # API routes
/components         # Reusable React components
  /gigs             # Gig-specific components
  /layout           # Layout components
  /ui               # UI components
/lib
  /ai               # AI evaluation services
  /payments         # Stripe integration
  /trustScore       # Trust score calculations
  /firebase         # Firebase client/admin
  /models           # TypeScript types
```

## Key Concepts

### Gigs

Gigs are content creation opportunities posted by brands:
- **Deliverables**: Videos, photos, raw footage
- **Payout**: Fixed or dynamic based on follower count
- **Brief**: Hooks, angles, talking points, dos/don'ts
- **Requirements**: Trust score, experience, tags
- **Visibility**: Open, squad-only, or invite-only

### Trust Score

Creators earn a trust score (0-100) based on:
- ✅ Verified email and phone
- ✅ Connected social accounts
- ✅ Stripe Connect onboarded
- ✅ Gigs completed
- ✅ On-time delivery rate
- ✅ Content quality scores
- ❌ Dispute and refund rates

### Squads

Groups of creators managed by recruiters:
- Curated teams for specific niches
- Squad-only gig access
- Quality control and coordination
- Recruiter commission structure

### AI Evaluation

Automated content quality assessment:
- Compliance checking
- Quality scoring (0-100)
- Component breakdowns (hook, lighting, clarity, etc.)
- Improvement suggestions
- Product verification

## Database Collections

- `users` - User profiles
- `creators` - Creator profiles and metrics
- `brands` - Brand profiles
- `gigs` - Gig listings
- `submissions` - Content submissions
- `payments` - Payment records
- `squads` - Creator squads
- `squadInvitations` - Squad invitations
- `ratings` - Performance ratings

## API Routes

- `/api/evaluate-submission` - AI evaluation endpoint
- `/api/verify-tiktok` - TikTok OAuth verification
- `/api/add-balance` - Account balance management

## Firebase Functions

Deploy functions:

```bash
cd functions
npm install
firebase deploy --only functions
```

## Security Rules

Update Firestore and Storage rules:

```bash
firebase deploy --only firestore:rules
firebase deploy --only storage
```

## Deployment

### Vercel

1. Connect GitHub repository to Vercel
2. Add environment variables
3. Deploy

### Firebase Functions

```bash
firebase deploy --only functions
```

## License

Private - All rights reserved

## Support

For questions or issues, contact the development team.
