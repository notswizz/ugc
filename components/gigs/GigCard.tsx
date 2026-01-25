import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Clock, Video, Image, Lock, Sparkles, Users, Mail } from 'lucide-react';

export interface GigCardProps {
  id: string;
  brandName: string;
  brandLogoUrl?: string;
  title: string;
  categoryTag: string;
  visibilityType: 'open' | 'squad' | 'invite';
  payoutCents: number;
  timeLeftMinutes: number;
  deliverablesText: string;
  isNew?: boolean;
  payoutType?: 'fixed' | 'dynamic';
  href?: string;
  onClick?: () => void;
  isLocked?: boolean;
  unlockAtTimestamp?: number | null;
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatTimeLeft(minutes: number): string {
  if (minutes < 60) {
    return minutes < 1 ? 'Ends soon' : `${Math.floor(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

function parseDeliverables(text: string): { videos: number; photos: number } {
  const videoMatch = text.match(/(\d+)\s*video/i);
  const photoMatch = text.match(/(\d+)\s*photo/i);
  return {
    videos: videoMatch ? parseInt(videoMatch[1]) : 0,
    photos: photoMatch ? parseInt(photoMatch[1]) : 0,
  };
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

  useEffect(() => {
    if (!isLocked || unlockAtTimestamp === null) {
      setCurrentUnlockMinutes(null);
      return;
    }

    const calculateMinutes = () => {
      const now = Date.now();
      const diff = unlockAtTimestamp - now;
      return Math.max(0, Math.ceil(diff / (1000 * 60)));
    };

    setCurrentUnlockMinutes(calculateMinutes());

    const interval = setInterval(() => {
      const newMinutes = calculateMinutes();
      setCurrentUnlockMinutes(newMinutes);
      if (newMinutes <= 0) {
        clearInterval(interval);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isLocked, unlockAtTimestamp]);

  const isUrgent = timeLeftMinutes < 120;
  const cardHref = href || `/creator/gigs/${id}`;
  const brandInitial = brandName.charAt(0).toUpperCase();
  const deliverables = parseDeliverables(deliverablesText);

  const visibilityConfig = {
    open: { icon: Sparkles, label: 'Open', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    squad: { icon: Users, label: 'Squad', color: 'text-violet-600', bg: 'bg-violet-50' },
    invite: { icon: Mail, label: 'Invite', color: 'text-amber-600', bg: 'bg-amber-50' },
  };

  const vis = visibilityConfig[visibilityType];

  const content = (
    <div
      className={`
        group relative overflow-hidden rounded-2xl
        bg-white border border-zinc-200/80
        ${isLocked ? 'opacity-60' : 'hover:border-zinc-300 hover:shadow-lg hover:shadow-zinc-200/50'}
        transition-all duration-300 ease-out
      `}
      onClick={isLocked ? undefined : onClick}
    >
      {/* Locked Overlay */}
      {isLocked && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mb-2">
            <Lock className="w-5 h-5 text-zinc-500" />
          </div>
          <p className="text-sm font-semibold text-zinc-700">Locked</p>
          {currentUnlockMinutes !== null && currentUnlockMinutes > 0 && (
            <p className="text-xs text-zinc-500 mt-1">
              Unlocks in{' '}
              {currentUnlockMinutes < 60
                ? `${currentUnlockMinutes}m`
                : `${Math.floor(currentUnlockMinutes / 60)}h ${currentUnlockMinutes % 60}m`}
            </p>
          )}
        </div>
      )}

      <div className="p-4">
        {/* Header: Brand + Payout */}
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Brand */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center overflow-hidden shadow-sm">
                {brandLogoUrl ? (
                  <img src={brandLogoUrl} alt={brandName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-sm font-bold">{brandInitial}</span>
                )}
              </div>
              {isNew && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-zinc-500 font-medium truncate">{brandName}</p>
              <h3 className="text-[15px] font-semibold text-zinc-900 leading-snug line-clamp-1 group-hover:text-zinc-700 transition-colors">
                {title}
              </h3>
            </div>
          </div>

          {/* Payout */}
          <div className="flex-shrink-0">
            <div className="text-right">
              <div className="text-2xl font-bold text-zinc-900 tracking-tight">
                {formatMoney(payoutCents)}
              </div>
              <div className="text-[10px] font-medium text-emerald-600 uppercase tracking-wide">
                {payoutType === 'dynamic' ? 'Dynamic' : 'Payout'}
              </div>
            </div>
          </div>
        </div>

        {/* Tags Row */}
        <div className="flex items-center gap-2 mb-3">
          {/* Category */}
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-zinc-600 bg-zinc-100 rounded-lg">
            {categoryTag}
          </span>

          {/* Visibility */}
          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg ${vis.bg} ${vis.color}`}>
            <vis.icon className="w-3 h-3" />
            {vis.label}
          </span>
        </div>

        {/* Footer: Time + Deliverables */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
          {/* Time */}
          <div className={`flex items-center gap-1.5 ${isUrgent ? 'text-orange-500' : 'text-zinc-500'}`}>
            <Clock className={`w-3.5 h-3.5 ${isUrgent ? 'animate-pulse' : ''}`} />
            <span className="text-xs font-medium">{formatTimeLeft(timeLeftMinutes)}</span>
          </div>

          {/* Deliverables */}
          <div className="flex items-center gap-3">
            {deliverables.videos > 0 && (
              <div className="flex items-center gap-1 text-zinc-500">
                <Video className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{deliverables.videos}</span>
              </div>
            )}
            {deliverables.photos > 0 && (
              <div className="flex items-center gap-1 text-zinc-500">
                <Image className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{deliverables.photos}</span>
              </div>
            )}
            {deliverables.videos === 0 && deliverables.photos === 0 && (
              <span className="text-xs text-zinc-400">{deliverablesText}</span>
            )}
          </div>
        </div>
      </div>

      {/* Hover accent line */}
      <div
        className={`
          absolute bottom-0 left-0 right-0 h-0.5
          ${visibilityType === 'open' ? 'bg-emerald-500' : visibilityType === 'squad' ? 'bg-violet-500' : 'bg-amber-500'}
          transform scale-x-0 group-hover:scale-x-100
          transition-transform duration-300 origin-left
        `}
      />
    </div>
  );

  if (onClick) {
    return content;
  }

  if (isLocked) {
    return <div className="block cursor-not-allowed">{content}</div>;
  }

  return (
    <Link href={cardHref} className="block">
      {content}
    </Link>
  );
}
