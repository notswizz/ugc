import { X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
}

export default function GigDetailsModal({ isOpen, onClose, loading, details }: GigDetailsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Gig Details</h2>
            {details && <p className="text-xs text-gray-500 mt-0.5">{details.gig.title}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <LoadingSpinner text="Loading gig details..." />
          </div>
        ) : details ? (
          <div className="p-4 space-y-3">
            {/* Gig Header - Compact */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Gig Info */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Gig Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        details.gig.status === 'open'
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : details.gig.status === 'closed'
                          ? 'bg-gray-100 text-gray-700 border border-gray-200'
                          : details.gig.status === 'paid'
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : details.gig.status === 'cancelled'
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : details.gig.status === 'expired'
                          ? 'bg-orange-100 text-orange-700 border border-orange-200'
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}
                    >
                      {details.gig.status?.toUpperCase()}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                      ${details.gig.basePayout?.toFixed(2) || '0.00'}
                    </span>
                    {details.gig.primaryThing && (
                      <span className="px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-200">
                        {details.gig.primaryThing}
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-200">
                      Limit: {details.gig.acceptedSubmissionsLimit || 1}
                    </span>
                  </div>
                  {details.gig.deliverables && (
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {details.gig.deliverables.videos > 0 && (
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                          {details.gig.deliverables.videos} videos
                        </span>
                      )}
                      {details.gig.deliverables.photos > 0 && (
                        <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700">
                          {details.gig.deliverables.photos} photos
                        </span>
                      )}
                      {details.gig.deliverables.raw && (
                        <span className="px-2 py-0.5 rounded bg-yellow-50 text-yellow-700">Raw footage</span>
                      )}
                      {details.gig.aiComplianceRequired && (
                        <span className="px-2 py-0.5 rounded bg-green-50 text-green-700">AI Compliance</span>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>
                      <span className="font-medium">Created:</span> {details.gig.createdAt?.toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Deadline:</span> {details.gig.deadlineAt?.toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Brand Info - Compact */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Brand</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 text-xs">
                  {details.brand?.companyName && (
                    <div>
                      <p className="font-semibold text-gray-900">{details.brand.companyName}</p>
                    </div>
                  )}
                  {details.brand?.name && <div className="text-gray-600">{details.brand.name}</div>}
                  {details.brand?.email && <div className="text-gray-500 truncate">{details.brand.email}</div>}
                  <div className="pt-1 border-t">
                    <p className="text-[10px] font-mono text-gray-400">{details.gig.brandId.substring(0, 12)}...</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Submissions */}
            <SubmissionsTable submissions={details.jobSubmissions} />

            {/* Payments */}
            <PaymentsTable payments={details.jobPayments} />
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-500">Error loading gig details</p>
          </div>
        )}
      </div>
    </div>
  );
}
