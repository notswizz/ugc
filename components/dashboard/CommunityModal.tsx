import { X as XIcon } from 'lucide-react';
import { getRepLevel } from '@/lib/rep/service';

interface CommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityName: string;
  leaderboard: any[];
  loadingLeaderboard: boolean;
  currentUserId: string;
}

export default function CommunityModal({ 
  isOpen, 
  onClose, 
  communityName, 
  leaderboard, 
  loadingLeaderboard, 
  currentUserId 
}: CommunityModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Community Leaderboard</h2>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4">
          {loadingLeaderboard ? (
            <div className="text-center py-4">
              <div className="text-xs text-gray-500">Loading...</div>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-xs text-gray-500">No leaderboard data</p>
            </div>
          ) : (
            <div>
              {communityName && (
                <div className="text-center mb-4">
                  <p className="text-lg font-bold text-purple-700">{communityName}</p>
                  <p className="text-xs text-gray-600">{leaderboard.length} members</p>
                </div>
              )}
              <div className="space-y-2">
                {leaderboard.map((creator) => {
                  const isCurrentUser = creator.uid === currentUserId;
                  const { level } = getRepLevel(creator.rep);
                  
                  return (
                    <div
                      key={creator.uid}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        isCurrentUser 
                          ? 'bg-gradient-to-r from-brand-50 to-accent-50 border-2 border-brand-300' 
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          creator.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' :
                          creator.rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800' :
                          creator.rank === 3 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' :
                          isCurrentUser ? 'bg-brand-500 text-white' :
                          'bg-gray-300 text-gray-700'
                        }`}>
                          {creator.rank}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-bold truncate ${isCurrentUser ? 'text-brand-900' : 'text-gray-900'}`}>
                              @{creator.username}
                            </p>
                            {isCurrentUser && (
                              <span className="text-[10px] bg-brand-600 text-white px-1.5 py-0.5 rounded-full font-semibold">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600">Lvl {level}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`text-lg font-bold ${isCurrentUser ? 'text-brand-700' : 'text-purple-700'}`}>
                          {creator.rep}
                        </div>
                        <p className="text-xs text-gray-600">rep</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-800">
                  🎯 Complete gigs to climb the ranks and win prizes!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
