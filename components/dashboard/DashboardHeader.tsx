import Link from 'next/link';
import { Bell, Settings, Zap } from 'lucide-react';

interface DashboardHeaderProps {
  level: number;
  isTrusted: boolean;
  hasInstantPayout: boolean;
}

export default function DashboardHeader({ level, isTrusted, hasInstantPayout }: DashboardHeaderProps) {
  return (
    <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 -mx-4 px-4 pb-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <Link href="/creator/dashboard" className="flex items-center gap-2">
          <img src="/logo1.png" alt="Giglet" className="h-8 w-auto" />
          <span className="text-lg font-bold bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">Giglet</span>
        </Link>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
      {/* Status Line */}
      <div className="flex items-center gap-2 flex-wrap">
        {isTrusted && (
          <span className="px-2.5 py-1 text-[10px] font-semibold bg-green-100 text-green-700 rounded-full border border-green-200">
            Trusted
          </span>
        )}
        <span className="px-2.5 py-1 text-[10px] font-semibold bg-purple-100 text-purple-700 rounded-full border border-purple-200">
          Level {level}
        </span>
        {hasInstantPayout && (
          <span className="px-2.5 py-1 text-[10px] font-semibold bg-orange-100 text-orange-700 rounded-full border border-orange-200 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Instant Payout
          </span>
        )}
      </div>
    </div>
  );
}
