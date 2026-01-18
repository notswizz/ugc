/**
 * Usage Example for GigCard Component
 * 
 * This file demonstrates how to use the GigCard component
 * in a scrolling list of available gigs.
 */

import GigCard from './GigCard';

// Example usage in a list
export default function GigCardExample() {
  const exampleGigs = [
    {
      id: 'gig-1',
      brandName: 'TEST COMPANY',
      brandLogoUrl: undefined, // Will use fallback initial
      title: 'Test Gig',
      categoryTag: 'Fitness',
      visibilityType: 'open' as const,
      payoutCents: 5000, // $50
      timeLeftMinutes: 1178, // 19h 38m
      deliverablesText: '1 video required',
      isNew: false,
      payoutType: 'fixed' as const,
    },
    {
      id: 'gig-2',
      brandName: 'Premium Brand',
      brandLogoUrl: 'https://example.com/logo.png',
      title: 'Create Amazing Fitness Content',
      categoryTag: 'Wellness',
      visibilityType: 'squad' as const,
      payoutCents: 7500, // $75
      timeLeftMinutes: 45, // Ends soon (< 60m)
      deliverablesText: '2 videos required',
      isNew: true,
      payoutType: 'dynamic' as const,
    },
    {
      id: 'gig-3',
      brandName: 'Elite Partner',
      title: 'Exclusive Invite-Only Campaign',
      categoryTag: 'Lifestyle',
      visibilityType: 'invite' as const,
      payoutCents: 10000, // $100
      timeLeftMinutes: 2880, // 2 days
      deliverablesText: '1 video + 3 photos',
      isNew: false,
      payoutType: 'fixed' as const,
    },
  ];

  return (
    <div className="max-w-[428px] mx-auto p-4 space-y-3">
      <h1 className="text-2xl font-bold text-zinc-900 mb-4">Available Gigs</h1>
      
      {/* Scrolling list of gig cards */}
      <div className="space-y-3">
        {exampleGigs.map((gig) => (
          <GigCard
            key={gig.id}
            id={gig.id}
            brandName={gig.brandName}
            brandLogoUrl={gig.brandLogoUrl}
            title={gig.title}
            categoryTag={gig.categoryTag}
            visibilityType={gig.visibilityType}
            payoutCents={gig.payoutCents}
            timeLeftMinutes={gig.timeLeftMinutes}
            deliverablesText={gig.deliverablesText}
            isNew={gig.isNew}
            payoutType={gig.payoutType}
          />
        ))}
      </div>
    </div>
  );
}
