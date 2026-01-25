import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Payment {
  id: string;
  creatorId: string;
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
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Payments ({payments.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {payments.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-xs text-gray-500">No payments yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-2 font-semibold text-gray-700">Creator</th>
                  <th className="text-right p-2 font-semibold text-gray-700">Base</th>
                  <th className="text-right p-2 font-semibold text-gray-700">Platform Fee</th>
                  <th className="text-right p-2 font-semibold text-gray-700">Net</th>
                  <th className="text-center p-2 font-semibold text-gray-700">Status</th>
                  <th className="text-left p-2 font-semibold text-gray-700">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-2">
                      <p className="font-mono text-[10px] text-gray-600">{payment.creatorId.substring(0, 12)}...</p>
                    </td>
                    <td className="p-2 text-right font-semibold">${(payment.basePayout || 0).toFixed(2)}</td>
                    <td className="p-2 text-right">
                      <span className="font-semibold text-green-600">${(payment.platformFee || 0).toFixed(2)}</span>
                    </td>
                    <td className="p-2 text-right font-semibold text-gray-900">${(payment.creatorNet || 0).toFixed(2)}</td>
                    <td className="p-2 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          payment.status === 'transferred' || payment.status === 'balance_transferred'
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : payment.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}
                      >
                        {payment.status === 'balance_transferred' ? 'SENT' : payment.status?.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-2 text-gray-500">{payment.createdAt?.toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
