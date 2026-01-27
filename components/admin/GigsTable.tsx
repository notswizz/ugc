import { Briefcase, ChevronRight, DollarSign, Calendar, Filter } from 'lucide-react';

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
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'open':
        return { bg: 'bg-emerald-500', text: 'text-white' };
      case 'closed':
        return { bg: 'bg-zinc-500', text: 'text-white' };
      case 'paid':
        return { bg: 'bg-violet-500', text: 'text-white' };
      case 'cancelled':
        return { bg: 'bg-red-500', text: 'text-white' };
      case 'expired':
        return { bg: 'bg-amber-500', text: 'text-white' };
      default:
        return { bg: 'bg-zinc-400', text: 'text-white' };
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900">Gigs</h3>
            <p className="text-xs text-zinc-500">{gigs.length} total</p>
          </div>
        </div>
        {/* Brand Filter */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Filter className="w-4 h-4 text-zinc-400" />
          </div>
          <select
            value={selectedBrand}
            onChange={(e) => onBrandChange(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-zinc-200 rounded-xl bg-zinc-50 font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-200 min-w-[160px] appearance-none cursor-pointer"
          >
            <option value="all">All Brands</option>
            {brandsList.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Gigs List */}
      <div className="max-h-[500px] overflow-y-auto">
        {gigs.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-3">
              <Briefcase className="w-6 h-6 text-zinc-400" />
            </div>
            <p className="text-sm text-zinc-500">No gigs found</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {gigs.map((gig) => {
              const statusConfig = getStatusConfig(gig.status);
              return (
                <div
                  key={gig.id}
                  className="px-5 py-4 hover:bg-zinc-50 cursor-pointer transition-colors group"
                  onClick={() => onGigSelect(gig)}
                >
                  <div className="flex items-center gap-4">
                    {/* Gig Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm text-zinc-900 truncate">{gig.title}</h4>
                      </div>
                      {gig.brandName && (
                        <p className="text-xs text-zinc-500 mb-2">{gig.brandName}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${statusConfig.bg} ${statusConfig.text}`}>
                          {gig.status}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                          <span className="font-medium">{gig.approvedSubmissionsCount || 0}</span>
                          <span className="text-zinc-400">/</span>
                          <span>{gig.acceptedSubmissionsLimit || 1}</span>
                          <span className="text-zinc-400">approved</span>
                        </span>
                        <span className="flex items-center gap-1 text-xs text-zinc-400">
                          <Calendar className="w-3 h-3" />
                          {gig.createdAt?.toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Payout */}
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 justify-end mb-1">
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                        <span className="text-lg font-bold text-zinc-900">{gig.basePayout?.toFixed(2) || '0.00'}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Payout</p>
                    </div>

                    {/* Arrow */}
                    <div className="text-zinc-300 group-hover:text-zinc-500 transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
