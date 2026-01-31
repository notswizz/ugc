import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getRepLevel } from '@/lib/rep/service';

interface LevelCardProps {
  rep: number;
}

export default function LevelCard({ rep }: LevelCardProps) {
  const { level, title, nextLevelRep } = getRepLevel(rep);

  const getNextUnlock = () => {
    if (level === 1) return 'Reimbursement jobs + higher payouts';
    if (level === 2) return 'Priority gig access';
    return 'Premium features';
  };

  return (
    <Card className="border border-zinc-200 shadow-sm bg-white">
      <CardHeader className="pb-3 pt-4 px-5">
        <CardTitle className="text-sm font-bold text-zinc-900">Level {level} — {title}</CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="space-y-3">
          {/* Progress Bar */}
          {level < 7 && (
            <div>
              <div className="flex justify-between text-xs text-zinc-600 mb-2">
                <span>Progress to Level {level + 1}</span>
                <span className="font-semibold">{rep} / {nextLevelRep}</span>
              </div>
              <div className="w-full bg-zinc-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-brand-600 to-accent-600 h-2 rounded-full transition-[width] duration-300"
                  style={{ width: `${Math.min((rep / nextLevelRep) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Next unlock: {getNextUnlock()}
              </p>
            </div>
          )}

          {/* Daily Bonus */}
          <div className="pt-3 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-zinc-900">Daily Streak</p>
                <p className="text-xs text-zinc-500">Complete 1 job today for +10 bonus rep</p>
              </div>
              <span className="text-xs font-bold text-orange-600">0/7</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
