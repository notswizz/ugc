import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle } from 'lucide-react';

interface Squad {
  id: string;
  name: string;
  memberIds?: string[];
}

interface SquadInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorUsername: string;
  squads: Squad[];
  loading: boolean;
  onInvite: (squadId: string) => void;
}

export default function SquadInviteModal({
  isOpen,
  onClose,
  creatorUsername,
  squads,
  loading,
  onInvite,
}: SquadInviteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full max-h-[80vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Add @{creatorUsername} to Squad</CardTitle>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="text-center py-4">
              <div className="text-xs text-gray-500">Loading squads...</div>
            </div>
          ) : squads.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-xs text-gray-500 mb-2">You don't have any squads yet.</p>
              <p className="text-xs text-gray-400">Create a squad from your dashboard first.</p>
            </div>
          ) : (
            squads.map((squad) => (
              <button
                key={squad.id}
                onClick={() => onInvite(squad.id)}
                className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{squad.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {squad.memberIds?.length || 0} member{(squad.memberIds?.length || 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700">Invite</span>
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
