import { CreditCard, DollarSign, ArrowRight, CheckCircle2, Clock, User } from 'lucide-react';

interface Payment {
  id: string;
  creatorId: string;
  creatorName?: string;
  basePayout?: number;
  platformFee?: number;
  creatorNet?: number;
  status?: string;
  createdAt?: Date;
}

interface PaymentsTableProps {
  payments: Payment[];
}

export default function PaymentsTable({ payments }: PaymentsTableProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'transferred':
      case 'balance_transferred':
        return {
          bg: 'bg-emerald-500',
          text: 'text-white',
          label: 'Sent',
          icon: CheckCircle2
        };
      case 'pending':
        return {
          bg: 'bg-amber-400',
          text: 'text-amber-900',
          label: 'Pending',
          icon: Clock
        };
      default:
        return {
          bg: 'bg-zinc-400',
          text: 'text-white',
          label: status?.replace('_', ' ').toUpperCase() || 'Unknown',
          icon: Clock
        };
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-zinc-900">Payments</h3>
          <p className="text-xs text-zinc-500">{payments.length} total</p>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-3">
            <CreditCard className="w-6 h-6 text-zinc-400" />
          </div>
          <p className="text-sm text-zinc-500">No payments yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Creator</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Base</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Platform Fee</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Creator Net</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {payments.map((payment) => {
                const statusConfig = getStatusConfig(payment.status || '');
                const StatusIcon = statusConfig.icon;
                return (
                  <tr key={payment.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-zinc-500" />
                        </div>
                        <div>
                          {payment.creatorName ? (
                            <p className="font-semibold text-sm text-zinc-900">{payment.creatorName}</p>
                          ) : (
                            <p className="font-mono text-xs text-zinc-500">{payment.creatorId.substring(0, 12)}...</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-sm font-semibold text-zinc-900">${(payment.basePayout || 0).toFixed(2)}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-sm font-bold text-emerald-700">{(payment.platformFee || 0).toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-sm font-bold text-zinc-900">${(payment.creatorNet || 0).toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide ${statusConfig.bg} ${statusConfig.text}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-zinc-600">{payment.createdAt?.toLocaleDateString()}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
