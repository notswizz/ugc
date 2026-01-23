import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, X } from "lucide-react";

interface ComparisonRow {
  dimension: string;
  giglet: string | React.ReactNode;
  traditional: string | React.ReactNode;
}

const comparisonData: ComparisonRow[] = [
  {
    dimension: "Who can join",
    giglet: "Anyone with a real social account (normal people + creators)",
    traditional: '"Creators" only (often gatekept by follower count)',
  },
  {
    dimension: "Creator identity",
    giglet: "Human-verified (phone + AI call + Stripe ID)",
    traditional: "Email + socials (easy to fake)",
  },
  {
    dimension: "Trust system",
    giglet: "Hidden Trust Score (fraud, payouts, reimbursements)",
    traditional: "Basic ratings or none",
  },
  {
    dimension: "Reputation system",
    giglet: "Gamified, visible (levels, perks, unlocks)",
    traditional: "Static profiles, little progression",
  },
  {
    dimension: "Payout speed",
    giglet: "Instant withdrawals unlocked via trust",
    traditional: "Fixed delays (often 7–30 days)",
  },
  {
    dimension: "Job flow",
    giglet: "Grab-and-go gigs (DoorDash style)",
    traditional: "Apply → wait → negotiate",
  },
  {
    dimension: "Negotiation",
    giglet: "None (fixed payouts)",
    traditional: "Common and slow",
  },
  {
    dimension: "Partial reimbursements",
    giglet: "Yes (subsidized purchases, creator choice)",
    traditional: "Rare or full gifting only",
  },
  {
    dimension: "Product selection",
    giglet: "Creator chooses what they like",
    traditional: "Brand sends product (logistics heavy)",
  },
  {
    dimension: "Gamification",
    giglet: "Levels, streaks, drops, lotteries, unlocks",
    traditional: "Minimal or none",
  },
  {
    dimension: "Community structure",
    giglet: "One community per user (schools, cities, cohorts)",
    traditional: "No real community layer",
  },
  {
    dimension: "Squads / groups",
    giglet: "Collaborative squads invited to gigs",
    traditional: "Usually none or competitive teams",
  },
  {
    dimension: "Growth engine",
    giglet: "Scouts + communities + virality",
    traditional: "Paid ads + outbound",
  },
  {
    dimension: "Verification depth",
    giglet: "Phone + AI interview + Stripe KYC",
    traditional: "Usually none beyond email",
  },
  {
    dimension: "Matching quality",
    giglet: "Interests + spoken preferences + performance",
    traditional: "Tags + follower count",
  },
  {
    dimension: "AI usage",
    giglet: "Compliance, quality, future custom models",
    traditional: "Light moderation at best",
  },
  {
    dimension: "Data advantage",
    giglet: "Labeled performance + compliance data",
    traditional: "Mostly unstructured content",
  },
  {
    dimension: "Brand value prop",
    giglet: "10–20 authentic voices, fast",
    traditional: "1–2 polished influencers",
  },
  {
    dimension: "Speed to content",
    giglet: "Hours",
    traditional: "Days or weeks",
  },
  {
    dimension: "Marketplace vibe",
    giglet: "Modern gig economy (Uber/DoorDash)",
    traditional: "Old freelance / influencer energy",
  },
];

interface ComparisonChartProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ComparisonChart({ open, onOpenChange }: ComparisonChartProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 sm:p-6">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-2xl font-bold text-center">
            Giglet vs Traditional UGC
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-2 px-6 pb-6">
          {/* Header Row */}
          <div className="grid grid-cols-3 gap-3 mb-4 sticky top-0 bg-white z-10 pb-3 border-b-2 border-gray-300 shadow-sm -mx-6 px-6">
            <div className="font-bold text-xs sm:text-sm text-gray-700 uppercase tracking-wide">
              Dimension
            </div>
            <div className="font-bold text-xs sm:text-sm text-orange-600 uppercase tracking-wide text-center">
              Giglet
            </div>
            <div className="font-bold text-xs sm:text-sm text-gray-600 uppercase tracking-wide text-center">
              Traditional UGC Marketplaces
            </div>
          </div>

          {/* Data Rows */}
          <div className="space-y-2">
            {comparisonData.map((row, index) => (
              <div
                key={index}
                className="grid grid-cols-3 gap-3 py-3 px-2 border-b border-gray-100 hover:bg-orange-50/50 transition-colors rounded-sm"
              >
                <div className="font-semibold text-xs sm:text-sm text-gray-900 pr-2 leading-tight">
                  {row.dimension}
                </div>
                <div className="text-xs sm:text-sm text-gray-700 flex items-start gap-1.5 leading-tight">
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="break-words">{row.giglet}</span>
                </div>
                <div className="text-xs sm:text-sm text-gray-600 flex items-start gap-1.5 leading-tight">
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="break-words">{row.traditional}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
