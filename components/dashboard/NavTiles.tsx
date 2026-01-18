import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { User, Users as UsersIcon, Trophy } from 'lucide-react';

interface NavTilesProps {
  hasProfile: boolean;
  hasCommunity: boolean;
  onProfileClick: () => void;
  onCommunityClick: () => void;
}

export default function NavTiles({ hasProfile, hasCommunity, onProfileClick, onCommunityClick }: NavTilesProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Profile */}
      {hasProfile && (
        <Card 
          className="cursor-pointer hover:shadow-md transition-all border border-gray-200 shadow-sm"
          onClick={onProfileClick}
        >
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-2">
              <User className="w-5 h-5 text-white" />
            </div>
            <p className="text-xs font-bold text-gray-900 mb-1">Profile</p>
            <p className="text-[10px] text-gray-500 leading-tight">Edit socials, unlock trust</p>
          </CardContent>
        </Card>
      )}

      {/* Squads */}
      <Link href="/creator/squads">
        <Card className="cursor-pointer hover:shadow-md transition-all border border-gray-200 shadow-sm h-full">
          <CardContent className="p-4 text-center h-full flex flex-col justify-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mx-auto mb-2">
              <UsersIcon className="w-5 h-5 text-white" />
            </div>
            <p className="text-xs font-bold text-gray-900 mb-1">Squads</p>
            <p className="text-[10px] text-gray-500 leading-tight">Join squads for invited gigs</p>
          </CardContent>
        </Card>
      </Link>

      {/* Community */}
      {hasCommunity && (
        <Card 
          className="cursor-pointer hover:shadow-md transition-all border border-gray-200 shadow-sm"
          onClick={onCommunityClick}
        >
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-2">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <p className="text-xs font-bold text-gray-900 mb-1">Community</p>
            <p className="text-[10px] text-gray-500 leading-tight">Climb leaderboard</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
