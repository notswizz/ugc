import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import VisibilityBadge from '@/components/gigs/VisibilityBadge';
import { Clock, Play, ChevronRight } from 'lucide-react';

export interface GigCardProps {
  id: string;
  brandName: string;
  brandLogoUrl?: string;
  title: string;
  categoryTag: string;
  visibilityType: 'open' | 'squad' | 'invite';
  payoutCents: number;
  timeLeftMinutes: number;
  deliverablesText: string; // e.g. "1 video"
  isNew?: boolean;
  payoutType?: 'fixed' | 'dynamic'; // 'dynamic' means based on followers
  href?: string; // Optional custom href, defaults to `/creator/gigs/${id}`
  onClick?: () => void; // Optional click handler
}

// Utility: Format money from cents
function formatMoney(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

// Utility: Format time left smartly
function formatTimeLeft(minutes: number): string {
  if (minutes < 60) {
    return minutes < 1 ? 'Ends soon' : `${Math.floor(minutes)}m left`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m left` : `${hours}h left`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h left` : `${days}d left`;
}

export default function GigCard({
  id,
  brandName,
  brandLogoUrl,
  title,
  categoryTag,
  visibilityType,
  payoutCents,
  timeLeftMinutes,
  deliverablesText,
  isNew = false,
  payoutType = 'fixed',
  href,
  onClick,
}: GigCardProps) {
  const isUrgent = timeLeftMinutes < 120;
  const cardHref = href || `/creator/gigs/${id}`;
  const brandInitial = brandName.charAt(0).toUpperCase();

  const content = (
    <Card
      className={`
        group relative overflow-hidden
        border border-zinc-200 bg-white
        rounded-2xl shadow-sm
        hover:shadow-md hover:border-zinc-300 hover:-translate-y-0.5
        active:translate-y-0 active:shadow-sm
        transition-all duration-200
        cursor-pointer
        ${isUrgent ? 'ring-1 ring-orange-200' : ''}
      `}
      onClick={onClick}
    >
      {/* Slim left accent bar for visibility type */}
      <div
        className={`
          absolute left-0 top-0 bottom-0 w-1
          ${
            visibilityType === 'open'
              ? 'bg-green-500'
              : visibilityType === 'squad'
              ? 'bg-purple-500'
              : 'bg-orange-500'
          }
        `}
      />

      <CardContent className="p-4">
        {/* Top Row: Brand + Title | Payout */}
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Left: Brand + Title */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Brand Avatar */}
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-zinc-400 to-zinc-600 flex items-center justify-center shadow-sm overflow-hidden">
              {brandLogoUrl ? (
                <img src={brandLogoUrl} alt={brandName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-xs font-bold">{brandInitial}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {/* Brand Name */}
              <p className="text-xs text-zinc-500 font-medium mb-0.5 truncate">{brandName}</p>
              {/* Gig Title */}
              <h3 className="text-base font-semibold text-zinc-900 leading-tight line-clamp-2 group-hover:text-zinc-700 transition-colors">
                {title}
              </h3>
            </div>
          </div>

          {/* Right: Payout Module */}
          <div className="flex-shrink-0 text-right">
            <div className="mb-0.5">
              <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide">Payout</span>
            </div>
            <div className="text-2xl font-bold text-zinc-900 leading-none">
              {formatMoney(payoutCents)}
            </div>
            {payoutType === 'dynamic' && (
              <p className="text-[10px] text-zinc-500 mt-0.5">dynamic</p>
            )}
            {payoutType === 'fixed' && (
              <p className="text-[10px] text-zinc-500 mt-0.5">instant</p>
            )}
          </div>
        </div>

        {/* Middle Row: Category + Visibility Badge | New Badge */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Chip */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-zinc-100 text-zinc-700 rounded-full border border-zinc-200">
              <span className="w-1 h-1 rounded-full bg-zinc-400"></span>
              {categoryTag}
            </span>

            {/* Visibility Badge */}
            <VisibilityBadge visibility={visibilityType} className="text-[10px] px-2 py-0.5" />
          </div>

          {/* New Badge */}
          {isNew && (
            <span className="flex-shrink-0 px-2 py-0.5 text-[10px] font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-sm">
              NEW
            </span>
          )}
        </div>

        {/* Bottom Row: Meta Info */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
          {/* Left: Time + Deliverables */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Time Left */}
            <div
              className={`flex items-center gap-1.5 ${
                isUrgent ? 'text-orange-600' : 'text-zinc-600'
              }`}
            >
              <Clock className={`w-3.5 h-3.5 ${isUrgent ? 'animate-pulse' : ''}`} />
              <span className="text-xs font-semibold">{formatTimeLeft(timeLeftMinutes)}</span>
            </div>

            {/* Deliverables */}
            <div className="flex items-center gap-1.5 text-zinc-500">
              <Play className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{deliverablesText}</span>
            </div>
          </div>

          {/* Right: Details Chevron */}
          <div className="flex-shrink-0 flex items-center gap-1 text-zinc-400 group-hover:text-zinc-600 transition-colors">
            <span className="text-xs font-medium">Details</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Wrap in Link if onClick is not provided
  if (onClick) {
    return content;
  }

  return (
    <Link href={cardHref} className="block">
      {content}
    </Link>
  );
}
