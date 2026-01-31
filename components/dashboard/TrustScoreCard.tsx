import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle2, Circle, Lock } from 'lucide-react';
import Link from 'next/link';

interface TrustScoreCardProps {
  score: number;
  verification: number;
  socials: number;
  performance: number;
  maxScore?: number;
  nextMilestone: number | null;
  milestoneLabel: string | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  stripeOnboardingComplete?: boolean;
  identityVerified?: boolean;
  socialConnections?: {
    tiktok?: boolean;
    instagram?: boolean;
    youtube?: boolean;
    linkedin?: boolean;
  };
}

export default function TrustScoreCard({
  score,
  verification,
  socials,
  performance,
  maxScore = 100,
  nextMilestone,
  milestoneLabel,
  emailVerified,
  phoneVerified,
  stripeOnboardingComplete,
  identityVerified,
  socialConnections,
}: TrustScoreCardProps) {
  // Calculate percentage for progress ring
  const percentage = (score / maxScore) * 100;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Get color based on score
  const getScoreColor = () => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-zinc-500';
  };

  const getRingColor = () => {
    if (score >= 85) return 'stroke-green-600';
    if (score >= 70) return 'stroke-blue-600';
    if (score >= 50) return 'stroke-yellow-600';
    return 'stroke-zinc-400';
  };

  return (
    <Card className="border-zinc-200 bg-gradient-to-br from-white to-zinc-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-600" />
            Trust Score
          </CardTitle>
          <Link
            href="/creator/settings"
            className="text-xs text-brand-600 hover:text-brand-700 font-medium"
          >
            Improve →
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Ring */}
        <div className="flex items-center justify-between">
          <div className="relative w-24 h-24">
            <svg className="transform -rotate-90" width="96" height="96">
              {/* Background circle */}
              <circle
                cx="48"
                cy="48"
                r="45"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-zinc-200"
              />
              {/* Progress circle */}
              <circle
                cx="48"
                cy="48"
                r="45"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className={`${getRingColor()} transition-[width,stroke-dashoffset] duration-500`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className={`text-2xl font-bold ${getScoreColor()}`}>
                  {score}
                </div>
                <div className="text-[10px] text-zinc-500">of {maxScore}</div>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="flex-1 ml-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-600">Verification</span>
              <span className="font-medium">{verification}/55</span>
            </div>
            <div className="w-full bg-zinc-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-[width,stroke-dashoffset] duration-500"
                style={{ width: `${(verification / 55) * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-zinc-600">Socials</span>
              <span className="font-medium">{socials}/20</span>
            </div>
            <div className="w-full bg-zinc-200 rounded-full h-1.5">
              <div
                className="bg-purple-600 h-1.5 rounded-full transition-[width,stroke-dashoffset] duration-500"
                style={{ width: `${(socials / 20) * 100}%` }}
              />
            </div>

            {performance > 0 && (
              <>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-zinc-600">Performance</span>
                  <span className="font-medium">{performance}/25</span>
                </div>
                <div className="w-full bg-zinc-200 rounded-full h-1.5">
                  <div
                    className="bg-green-600 h-1.5 rounded-full transition-[width,stroke-dashoffset] duration-500"
                    style={{ width: `${(performance / 25) * 100}%` }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Next Milestone */}
        {nextMilestone && milestoneLabel && (
          <div className="bg-zinc-100 rounded-lg p-3 border border-zinc-200">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-zinc-500" />
              <span className="text-xs font-medium text-zinc-700">
                Next Unlock: {milestoneLabel}
              </span>
            </div>
            <div className="text-xs text-zinc-600 mb-2">
              Reach {nextMilestone} points to unlock
            </div>
            <div className="w-full bg-zinc-200 rounded-full h-2">
              <div
                className="bg-brand-600 h-2 rounded-full transition-[width,stroke-dashoffset] duration-500"
                style={{ width: `${(score / nextMilestone) * 100}%` }}
              />
            </div>
            <div className="text-xs text-zinc-500 mt-1 text-right">
              {nextMilestone - score} points to go
            </div>
          </div>
        )}

        {/* Verification Checklist */}
        <div className="space-y-2 pt-2 border-t border-zinc-200">
          <div className="text-xs font-medium text-zinc-700 mb-2">
            Boost Your Score
          </div>

          <div className="flex items-center gap-2 text-xs">
            {emailVerified ? (
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-zinc-300 flex-shrink-0" />
            )}
            <span className={emailVerified ? 'text-zinc-500 line-through' : 'text-zinc-700'}>
              Email verified
            </span>
            {!emailVerified && (
              <span className="ml-auto text-zinc-500">+10</span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs">
            {phoneVerified ? (
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-zinc-300 flex-shrink-0" />
            )}
            <span className={phoneVerified ? 'text-zinc-500 line-through' : 'text-zinc-700'}>
              Phone verified
            </span>
            {!phoneVerified && (
              <span className="ml-auto text-zinc-500">+10</span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs">
            {stripeOnboardingComplete ? (
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-zinc-300 flex-shrink-0" />
            )}
            <span className={stripeOnboardingComplete ? 'text-zinc-500 line-through' : 'text-zinc-700'}>
              Payment setup
            </span>
            {!stripeOnboardingComplete && (
              <span className="ml-auto text-zinc-500">+15</span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs">
            {identityVerified ? (
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-zinc-300 flex-shrink-0" />
            )}
            <span className={identityVerified ? 'text-zinc-500 line-through' : 'text-zinc-700'}>
              Identity verified
            </span>
            {!identityVerified && (
              <span className="ml-auto text-zinc-500">+20</span>
            )}
          </div>

          {socialConnections && (
            <>
              <div className="flex items-center gap-2 text-xs">
                {socialConnections.tiktok ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-zinc-300 flex-shrink-0" />
                )}
                <span className={socialConnections.tiktok ? 'text-zinc-500 line-through' : 'text-zinc-700'}>
                  Connect TikTok
                </span>
                {!socialConnections.tiktok && (
                  <span className="ml-auto text-zinc-500">+7</span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs">
                {socialConnections.instagram ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-zinc-300 flex-shrink-0" />
                )}
                <span className={socialConnections.instagram ? 'text-zinc-500 line-through' : 'text-zinc-700'}>
                  Connect Instagram
                </span>
                {!socialConnections.instagram && (
                  <span className="ml-auto text-zinc-500">+7</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Milestones Info */}
        <div className="text-xs text-zinc-500 pt-2 border-t border-zinc-200">
          <div className="font-medium text-zinc-700 mb-1">Score Benefits:</div>
          <div className="space-y-0.5">
            <div>• 50+ Instant payouts & reimbursement gigs</div>
            <div>• 70+ High-value gigs ($500+)</div>
            <div>• 85+ Premium exclusive opportunities</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
