import Link from 'next/link';
import { Bell, Settings, Zap, CheckCircle2, TrendingUp, DollarSign } from 'lucide-react';

interface DashboardHeaderProps {
  level: number;
  isTrusted: boolean;
  hasInstantPayout: boolean;
  balance?: number;
}

export default function DashboardHeader({ level, isTrusted, hasInstantPayout, balance = 0 }: DashboardHeaderProps) {
  return (
    <div className="sticky top-0 z-50 bg-gradient-to-r from-white via-orange-50/40 to-white backdrop-blur-xl border-b border-zinc-100/80 -mx-4 px-4 pb-4 pt-1 mb-4 shadow-sm">
      {/* Main Row */}
      <div className="flex items-center justify-between mb-3">
        <Link href="/creator/dashboard" className="flex items-center gap-2.5 group">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-400 rounded-xl blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
            <img src="/logo1.png" alt="Giglet" className="h-9 w-auto relative z-10 drop-shadow-sm" />
          </div>
          <span className="text-xl font-black tracking-tight bg-gradient-to-r from-orange-600 via-red-500 to-pink-500 bg-clip-text text-transparent">
            Giglet
          </span>
        </Link>
        <div className="flex items-center gap-1.5">
          <button
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-zinc-50 hover:bg-zinc-100 transition-all duration-200 group"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-zinc-500 group-hover:text-zinc-700 transition-colors" />
          </button>
          <button
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-zinc-50 hover:bg-zinc-100 transition-all duration-200 group"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5 text-zinc-500 group-hover:text-zinc-700 transition-colors" />
          </button>
        </div>
      </div>
      
      {/* Status Badges */}
      <div className="flex items-center justify-between gap-2">
        {/* Left badges */}
        <div className="flex items-center gap-2">
          {isTrusted && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200/60 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[11px] font-bold text-emerald-700 tracking-tight">Verified</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-200/60 shadow-sm">
            <TrendingUp className="w-3.5 h-3.5 text-violet-600" />
            <span className="text-[11px] font-bold text-violet-700 tracking-tight">Level {level}</span>
          </div>
        </div>

        {/* Center - Earned */}
        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl shadow-lg shadow-emerald-500/20">
          <DollarSign className="w-4 h-4 text-white" />
          <span className="text-sm font-black text-white">{balance.toFixed(2)}</span>
        </div>

        {/* Right badges */}
        <div className="flex items-center gap-2">
          {hasInstantPayout && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200/60 shadow-sm">
              <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
              <span className="text-[11px] font-bold text-amber-700 tracking-tight">Instant</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
