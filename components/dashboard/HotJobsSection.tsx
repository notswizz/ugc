import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, ArrowRight } from 'lucide-react';
import VisibilityBadge from '@/components/gigs/VisibilityBadge';
import { THINGS } from '@/lib/things/constants';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';

interface HotJobsSectionProps {
  hotJobs: any[];
  loadingHotJobs: boolean;
}

export default function HotJobsSection({ hotJobs, loadingHotJobs }: HotJobsSectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-gray-900">Hot Jobs</h2>
        <Link href="/creator/gigs" className="text-xs text-brand-600 font-semibold flex items-center gap-1">
          View all
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      {loadingHotJobs ? (
        <div className="text-center py-8">
          <LoadingSpinner />
        </div>
      ) : hotJobs.length === 0 ? (
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-gray-600 mb-2">No jobs yet</p>
            <p className="text-xs text-gray-500 mb-4">Join a squad or set interests to see jobs</p>
            <Link href="/creator/gigs">
              <Button variant="outline" size="sm">
                Browse Jobs
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {hotJobs.map((gig) => {
            const deadlineAt = gig.deadlineAt?.toDate ? gig.deadlineAt.toDate() : new Date(gig.deadlineAt);
            const hoursLeft = Math.max(0, Math.floor((deadlineAt.getTime() - Date.now()) / (1000 * 60 * 60)));
            
            return (
              <Link key={gig.id} href={`/creator/gigs/${gig.id}`}>
                <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-gray-900 mb-1">{gig.title}</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <VisibilityBadge visibility={gig.visibility || 'open'} />
                          {gig.primaryThing && (
                            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                              {THINGS.find(t => t.id === gig.primaryThing)?.name || gig.primaryThing}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-brand-600">${gig.basePayout?.toFixed(0) || '0'}</div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                          <Clock className="w-3 h-3" />
                          {hoursLeft}h left
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
