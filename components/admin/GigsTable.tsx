import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Brand {
  id: string;
  name: string;
}

interface Gig {
  id: string;
  title: string;
  description?: string;
  brandId: string;
  brandName?: string;
  status: string;
  basePayout?: number;
  approvedSubmissionsCount?: number;
  acceptedSubmissionsLimit?: number;
  createdAt?: Date;
}

interface GigsTableProps {
  gigs: Gig[];
  brandsList: Brand[];
  selectedBrand: string;
  onBrandChange: (brandId: string) => void;
  onGigSelect: (gig: Gig) => void;
}

export default function GigsTable({
  gigs,
  brandsList,
  selectedBrand,
  onBrandChange,
  onGigSelect,
}: GigsTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Gigs</CardTitle>
          <select
            value={selectedBrand}
            onChange={(e) => onBrandChange(e.target.value)}
            className="text-sm border-2 border-gray-300 rounded px-3 py-1.5 bg-white min-w-[200px] font-medium"
          >
            <option value="all">All Brands</option>
            {brandsList.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent className="max-h-[600px] overflow-y-auto">
        {gigs.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No gigs found for this brand</p>
        ) : (
          <>
            <div className="mb-3 text-sm text-gray-600">
              Showing {gigs.length} gig{gigs.length !== 1 ? 's' : ''}
              {selectedBrand !== 'all' && (
                <span className="ml-1">
                  from <span className="font-semibold">{brandsList.find((b) => b.id === selectedBrand)?.name}</span>
                </span>
              )}
            </div>
            <div className="space-y-3">
              {gigs.map((gig) => (
                <div
                  key={gig.id}
                  className="border-b pb-3 last:border-0 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                  onClick={() => onGigSelect(gig)}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="font-semibold text-sm mb-1">{gig.title}</h3>
                      {gig.brandName && <p className="text-xs text-gray-600 mb-1">{gig.brandName}</p>}
                      {gig.description && (
                        <p
                          className="text-xs text-gray-500 mb-2 overflow-hidden"
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            lineHeight: '1.4',
                            maxHeight: '2.8em',
                          }}
                        >
                          {gig.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded text-xs whitespace-nowrap ${
                            gig.status === 'open'
                              ? 'bg-green-100 text-green-800'
                              : gig.status === 'closed'
                              ? 'bg-gray-100 text-gray-800'
                              : gig.status === 'paid'
                              ? 'bg-purple-100 text-purple-800'
                              : gig.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : gig.status === 'expired'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {gig.status?.toUpperCase()}
                        </span>
                        {gig.approvedSubmissionsCount !== undefined && (
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {gig.approvedSubmissionsCount}/{gig.acceptedSubmissionsLimit || 1} approved
                          </span>
                        )}
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {gig.createdAt?.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-sm">${gig.basePayout?.toFixed(2) || '0.00'}</p>
                      <p className="text-xs text-gray-500">Payout</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
