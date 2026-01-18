import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowDownToLine, Zap, ArrowRight } from 'lucide-react';

interface BalanceCardProps {
  balance: number | null;
  loadingBalance: boolean;
}

export default function BalanceCard({ balance, loadingBalance }: BalanceCardProps) {
  if (balance === null) return null;

  return (
    <Card className="border border-gray-200 shadow-sm bg-white">
      <CardContent className="p-5">
        {balance === 0 ? (
          <>
            <div className="text-center py-2 mb-4">
              <p className="text-sm text-gray-600 mb-1">Complete 1 job to unlock your first payout</p>
              <Link href="/creator/gigs">
                <Button className="mt-3 w-full">
                  Browse Jobs
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Available Balance</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-gray-900">
                    ${balance.toFixed(2)}
                  </span>
                  <span className="text-sm text-gray-500">USD</span>
                </div>
              </div>
              <Button className="bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-md hover:shadow-lg">
                <ArrowDownToLine className="w-4 h-4 mr-2" />
                Withdraw
              </Button>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 pt-2 border-t border-gray-100">
              <Zap className="w-3.5 h-3.5 text-orange-500" />
              <span>Instant payout enabled</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
