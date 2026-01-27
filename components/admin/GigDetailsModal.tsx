import { X, Briefcase, Building2, Calendar, Target, Video, Image, FileCheck, Sparkles, Clock, Users } from 'lucide-react';
import LoadingSpinner from '@/components/ui/loading-spinner';
import SubmissionsTable from './SubmissionsTable';
import PaymentsTable from './PaymentsTable';

interface GigDetails {
  gig: any;
  brand: any;
  jobSubmissions: any[];
  jobPayments: any[];
}

interface GigDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  details: GigDetails | null;
  onDeleteSubmission?: (submissionId: string) => Promise<void>;
}

export default function GigDetailsModal({ isOpen, onClose, loading, details, onDeleteSubmission }: GigDetailsModalProps) {
  if (!isOpen) return null;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'open':
        return { bg: 'bg-emerald-500', text: 'text-white', glow: 'shadow-emerald-500/30' };
      case 'closed':
        return { bg: 'bg-zinc-500', text: 'text-white', glow: 'shadow-zinc-500/30' };
      case 'paid':
        return { bg: 'bg-violet-500', text: 'text-white', glow: 'shadow-violet-500/30' };
      case 'cancelled':
        return { bg: 'bg-red-500', text: 'text-white', glow: 'shadow-red-500/30' };
      case 'expired':
        return { bg: 'bg-amber-500', text: 'text-white', glow: 'shadow-amber-500/30' };
      default:
        return { bg: 'bg-zinc-500', text: 'text-white', glow: 'shadow-zinc-500/30' };
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-zinc-50 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 px-6 py-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Gig Details</h2>
              {details && <p className="text-sm text-zinc-400">{details.gig.title}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <LoadingSpinner text="Loading gig details..." />
          </div>
        ) : details ? (
          <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(90vh-88px)]">
            {/* Gig Header Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Gig Info Card */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-zinc-900">Gig Info</h3>
                </div>
                <div className="p-5 space-y-4">
                  {/* Status & Price Row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Status Badge */}
                    {details.gig.status && (
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide shadow-lg ${getStatusConfig(details.gig.status).bg} ${getStatusConfig(details.gig.status).text} ${getStatusConfig(details.gig.status).glow}`}>
                        {details.gig.status}
                      </span>
                    )}
                    {/* Price Badge */}
                    <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/30">
                      ${details.gig.basePayout?.toFixed(2) || '0.00'}
                    </span>
                    {/* Category */}
                    {details.gig.primaryThing && (
                      <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
                        {details.gig.primaryThing}
                      </span>
                    )}
                    {/* Limit */}
                    <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      Limit: {details.gig.acceptedSubmissionsLimit || 1}
                    </span>
                  </div>

                  {/* Deliverables */}
                  {details.gig.deliverables && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {details.gig.deliverables.videos > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200">
                          <Video className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-xs font-semibold text-blue-700">{details.gig.deliverables.videos} videos</span>
                        </div>
                      )}
                      {details.gig.deliverables.photos > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200">
                          <Image className="w-3.5 h-3.5 text-purple-600" />
                          <span className="text-xs font-semibold text-purple-700">{details.gig.deliverables.photos} photos</span>
                        </div>
                      )}
                      {details.gig.deliverables.raw && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
                          <FileCheck className="w-3.5 h-3.5 text-amber-600" />
                          <span className="text-xs font-semibold text-amber-700">Raw footage</span>
                        </div>
                      )}
                      {details.gig.aiComplianceRequired && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-xs font-semibold text-emerald-700">AI Compliance</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dates */}
                  <div className="flex items-center gap-6 pt-2 border-t border-zinc-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-zinc-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">Created</p>
                        <p className="text-sm font-semibold text-zinc-900">{details.gig.createdAt?.toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-red-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">Deadline</p>
                        <p className="text-sm font-semibold text-zinc-900">{details.gig.deadlineAt?.toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Brand Card */}
              <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-zinc-900">Brand</h3>
                </div>
                <div className="p-5 space-y-3">
                  {details.brand?.companyName && (
                    <div>
                      <p className="text-lg font-bold text-zinc-900">{details.brand.companyName}</p>
                    </div>
                  )}
                  {details.brand?.name && (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 flex items-center justify-center">
                        <span className="text-xs font-bold text-zinc-600">{details.brand.name.charAt(0)}</span>
                      </div>
                      <span className="text-sm text-zinc-700">{details.brand.name}</span>
                    </div>
                  )}
                  {details.brand?.email && (
                    <p className="text-xs text-zinc-500 truncate">{details.brand.email}</p>
                  )}
                  <div className="pt-3 border-t border-zinc-100">
                    <p className="text-[10px] font-mono text-zinc-400 bg-zinc-50 px-2 py-1 rounded inline-block">{details.gig.brandId.substring(0, 16)}...</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Submissions */}
            <SubmissionsTable submissions={details.jobSubmissions} onDelete={onDeleteSubmission} />

            {/* Payments */}
            <PaymentsTable payments={details.jobPayments} />
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-zinc-500">Error loading gig details</p>
          </div>
        )}
      </div>
    </div>
  );
}
