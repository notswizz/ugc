# UGC Dock

A production-ready marketplace connecting brands with UGC creators. Built with Next.js, Firebase, and Stripe.

## Features

- **Two-sided marketplace**: Brands post campaigns, creators apply and get hired
- **Secure payments**: Stripe-powered escrow system with automatic payouts
- **Smart matching**: AI-powered creator recommendations based on tags and performance
- **Contract management**: End-to-end campaign lifecycle with deliverables tracking
- **Ratings & reviews**: Performance metrics and feedback system
- **Admin dashboard**: Dispute resolution and platform management

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Firebase (Auth, Firestore, Storage, Functions)
- **Payments**: Stripe (Checkout, Connect, Webhooks)
- **Deployment**: Vercel (recommended)

## Quick Start

### 1. Prerequisites

- Node.js 18+
- npm or yarn
- Firebase CLI (`npm install -g firebase-tools`)
- Stripe CLI (optional, for webhook testing)

### 2. Firebase Setup

1. Create a new Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication with Google and Email providers
3. Enable Firestore Database
4. Enable Firebase Storage
5. Enable Firebase Functions
6. Create a service account and download the key file

### 3. Stripe Setup

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Enable Connect for creator payouts
3. Set up webhook endpoints (see below)

### 4. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (Server-side)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your_project.appspot.com

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Platform Configuration
PLATFORM_FEE_PERCENTAGE=15
```

### 5. Installation

```bash
# Install dependencies
npm install

# Install Firebase Functions dependencies
cd functions && npm install && cd ..

# Start Firebase emulators (in one terminal)
firebase emulators:start

# Start the development server (in another terminal)
npm run dev
```

### 6. Firebase Configuration

1. Login to Firebase CLI:
```bash
firebase login
```

2. Initialize the project:
```bash
firebase init
# Select: Functions, Firestore, Storage, Hosting
```

3. Deploy Firestore security rules:
```bash
firebase deploy --only firestore:rules
```

4. Deploy Storage security rules:
```bash
firebase deploy --only storage
```

### 7. Stripe Webhook Setup

1. Install Stripe CLI and login:
```bash
stripe login
```

2. Forward webhooks to your local development:
```bash
stripe listen --forward-to localhost:5001/ugc-dock/us-central1/stripeWebhook
```

3. Copy the webhook signing secret to your `.env.local` file

## Database Schema

### Firestore Collections

- `/users/{uid}` - User profiles
- `/creators/{uid}` - Creator profiles and metrics
- `/brands/{uid}` - Brand profiles
- `/campaigns/{id}` - Campaign listings
- `/contracts/{id}` - Active contracts
- `/applications/{id}` - Campaign applications
- `/threads/{id}` - Messaging threads
- `/ratings/{id}` - User ratings
- `/disputes/{id}` - Dispute cases
- `/adminLogs/{id}` - Admin activity logs

### Required Indexes

Create these composite indexes in the Firebase console:

```
campaigns: status ASC, createdAt DESC
contracts: brandId ASC, createdAt DESC
contracts: creatorId ASC, createdAt DESC
threads: participants ARRAY, lastMessageAt DESC
```

## Development

### Seed Data

Run the seed script to populate development data:

```bash
npm run seed
```

### Testing

```bash
# Run all tests
npm test

# Run e2e tests
npm run test:e2e
```

### Linting

```bash
npm run lint
```

## Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy Functions to Firebase:
```bash
firebase deploy --only functions
```

### Firebase Hosting (Alternative)

```bash
# Build for production
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

## Security Rules

### Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Creators can be read by anyone, edited by owner
    match /creators/{creatorId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == creatorId;
    }

    // Similar rules for other collections...
  }
}
```

### Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Users can upload to their own directories
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Contract deliverables
    match /contracts/{contractId}/{allPaths=**} {
      allow read, write: if canAccessContract(contractId);
    }
  }

  function canAccessContract(contractId) {
    return request.auth != null &&
           (get(/databases/$(database)/documents/contracts/$(contractId)).data.brandId == request.auth.uid ||
            get(/databases/$(database)/documents/contracts/$(contractId)).data.creatorId == request.auth.uid);
  }
}
```

## API Reference

### Firebase Functions

- `stripeWebhook` - Handles Stripe webhook events
- `transitionContract` - Secure contract state transitions

### Client SDK

See `/lib/firebase/client.ts` and `/lib/db/queries.ts` for available methods.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support, email support@ugc-dock.com or join our Discord community.