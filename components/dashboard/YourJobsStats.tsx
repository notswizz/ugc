import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

interface YourJobsStatsProps {
  stats: {
    pendingSubmissions: number;
    acceptedGigs: number;
    submittedGigs: number;
  };
  loadingStats: boolean;
}

export default function YourJobsStats({ stats, loadingStats }: YourJobsStatsProps) {
  const hasAnyJobs = stats.pendingSubmissions > 0 || stats.acceptedGigs > 0 || stats.submittedGigs > 0;

  return (
    <Card className="border border-gray-200 shadow-sm bg-white">
      <CardHeader className="pb-3 pt-4 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-gray-900">Your Jobs</CardTitle>
          {hasAnyJobs && (
            <Link href="/creator/gigs/history" className="text-xs text-brand-600 font-semibold flex items-center gap-1">
              View all
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {loadingStats ? (
          <div className="text-center py-4">
            <div className="text-xs text-gray-500">Loading...</div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 text-xs font-semibold bg-orange-100 text-orange-700 rounded-lg border border-orange-200">
              Pending {stats.pendingSubmissions}
            </span>
            <span className="px-3 py-1.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-lg border border-blue-200">
              Accepted {stats.acceptedGigs}
            </span>
            <span className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-700 rounded-lg border border-gray-200">
              Submitted {stats.submittedGigs}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
