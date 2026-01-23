import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import VisibilityBadge from '@/components/gigs/VisibilityBadge';
import { Clock, Play, ChevronRight, Lock } from 'lucide-react';

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
  isLocked?: boolean; // Whether gig is locked due to rep requirements
  unlockAtTimestamp?: number | null; // Timestamp (ms) when gig will unlock
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
  isLocked = false,
  unlockAtTimestamp = null,
}: GigCardProps) {
  const [currentUnlockMinutes, setCurrentUnlockMinutes] = useState<number | null>(null);
  
  // Update unlock countdown in real-time
  useEffect(() => {
    if (!isLocked || unlockAtTimestamp === null) {
      setCurrentUnlockMinutes(null);
      return;
    }
    
    // Calculate minutes until unlock
    const calculateMinutes = () => {
      const now = Date.now();
      const diff = unlockAtTimestamp - now;
      return Math.max(0, Math.ceil(diff / (1000 * 60)));
    };
    
    // Set initial value
    setCurrentUnlockMinutes(calculateMinutes());
    
    // Update every 30 seconds to keep it relatively accurate
    const interval = setInterval(() => {
      const newMinutes = calculateMinutes();
      setCurrentUnlockMinutes(newMinutes);
      if (newMinutes <= 0) {
        clearInterval(interval);
        // Gig should unlock - could trigger a refresh here if needed
      }
    }, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, [isLocked, unlockAtTimestamp]);
  
  const isUrgent = timeLeftMinutes < 120;
  const cardHref = href || `/creator/gigs/${id}`;
  const brandInitial = brandName.charAt(0).toUpperCase();

  const content = (
    <Card
      className={`
        group relative overflow-hidden
        border ${isLocked ? 'border-zinc-300 bg-zinc-50' : 'border-zinc-200 bg-white'}
        rounded-2xl shadow-sm
        ${isLocked ? 'opacity-75 cursor-not-allowed' : 'hover:shadow-md hover:border-zinc-300 hover:-translate-y-0.5 cursor-pointer'}
        active:translate-y-0 active:shadow-sm
        transition-all duration-200
        ${isUrgent ? 'ring-1 ring-orange-200' : ''}
      `}
      onClick={isLocked ? undefined : onClick}
    >
      {/* Slim left accent bar for visibility type */}
      <div
        className={`
          absolute left-0 top-0 bottom-0 w-1
          ${
            isLocked
              ? 'bg-zinc-400'
              : visibilityType === 'open'
              ? 'bg-green-500'
              : visibilityType === 'squad'
              ? 'bg-purple-500'
              : 'bg-orange-500'
          }
        `}
      />
      
      {/* Locked overlay */}
      {isLocked && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-2xl">
          <div className="text-center px-4">
            <Lock className="w-6 h-6 text-zinc-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-zinc-700 mb-1">Unlocks Soon</p>
            {currentUnlockMinutes !== null && currentUnlockMinutes > 0 && (
              <p className="text-xs text-zinc-600">
                {currentUnlockMinutes < 60 
                  ? `${currentUnlockMinutes}m` 
                  : `${Math.floor(currentUnlockMinutes / 60)}h ${currentUnlockMinutes % 60}m`}
              </p>
            )}
          </div>
        </div>
      )}

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
            <div className="inline-flex flex-col items-end bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg px-3 py-2 border border-green-200/50">
              <div className="mb-0.5">
                <span className="text-[9px] text-green-700 font-semibold uppercase tracking-wider">Payout</span>
              </div>
              <div className="text-2xl font-extrabold text-green-700 leading-none tracking-tight">
                {formatMoney(payoutCents)}
              </div>
              {payoutType === 'dynamic' && (
                <p className="text-[9px] text-green-600 font-medium mt-1 px-1.5 py-0.5 bg-green-100/60 rounded-full">dynamic</p>
              )}
              {payoutType === 'fixed' && (
                <p className="text-[9px] text-green-600 font-medium mt-1 px-1.5 py-0.5 bg-green-100/60 rounded-full">instant</p>
              )}
            </div>
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
            {/* Unlock Time (if locked) */}
            {isLocked && currentUnlockMinutes !== null && currentUnlockMinutes > 0 ? (
              <div className="flex items-center gap-1.5 text-zinc-600">
                <Lock className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">
                  Unlocks in {currentUnlockMinutes < 60 
                    ? `${currentUnlockMinutes}m` 
                    : `${Math.floor(currentUnlockMinutes / 60)}h ${currentUnlockMinutes % 60}m`}
                </span>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>

          {/* Right: Details Chevron */}
          {!isLocked && (
            <div className="flex-shrink-0 flex items-center gap-1 text-zinc-400 group-hover:text-zinc-600 transition-colors">
              <span className="text-xs font-medium">Details</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Wrap in Link if onClick is not provided and not locked
  if (onClick) {
    return content;
  }

  if (isLocked) {
    return <div className="block">{content}</div>;
  }

  return (
    <Link href={cardHref} className="block">
      {content}
    </Link>
  );
}
