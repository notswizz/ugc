import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertTriangle, DollarSign, Star, Lightbulb, ArrowRight, Home } from 'lucide-react';

interface EvaluationResultProps {
  status: 'approved' | 'rejected' | 'error';
  evaluation?: {
    quality?: {
      improvementTips?: string[];
    };
  };
  qualityScore?: number;
  payout?: number;
  error?: string;
}

export default function EvaluationResult({
  status,
  evaluation,
  qualityScore,
  payout,
  error,
}: EvaluationResultProps) {
  const router = useRouter();

  if (status === 'approved') {
    return (
      <div className="min-h-screen bg-zinc-50 pb-32">
        {/* Success Header */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-6 pt-12 pb-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          </div>
          <div className="relative">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Approved!</h1>
            <p className="text-emerald-100 text-sm">Your submission passed AI review</p>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
          {/* Payout Card */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <DollarSign className="w-7 h-7 text-emerald-500" />
                <span className="text-4xl font-bold text-zinc-900">{(payout || 0).toFixed(2)}</span>
              </div>
              <p className="text-zinc-500 text-sm">Payment processing</p>
            </div>
          </div>

          {/* Quality Score */}
          {qualityScore !== undefined && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center">
                    <Star className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Quality Score</p>
                    <p className="text-xl font-bold text-zinc-900">{qualityScore}/100</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  qualityScore >= 90 ? 'bg-emerald-100 text-emerald-700' :
                  qualityScore >= 70 ? 'bg-blue-100 text-blue-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {qualityScore >= 90 ? 'Excellent' : qualityScore >= 70 ? 'Good' : 'Fair'}
                </div>
              </div>
            </div>
          )}

          {/* Tips */}
          {evaluation?.quality?.improvementTips && evaluation.quality.improvementTips.length > 0 && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-zinc-900">Tips for Next Time</h3>
              </div>
              <ul className="space-y-2">
                {evaluation.quality.improvementTips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-zinc-600">
                    <span className="text-zinc-400 mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2">
            <Button
              onClick={() => router.push('/creator/gigs')}
              className="w-full h-14 text-base font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500"
            >
              <Home className="w-5 h-5 mr-2" />
              Back to Gigs
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="min-h-screen bg-zinc-50 pb-32">
        {/* Rejected Header */}
        <div className="bg-gradient-to-br from-red-500 to-rose-600 px-6 pt-12 pb-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          </div>
          <div className="relative">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <XCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Not Approved</h1>
            <p className="text-red-100 text-sm">Your submission didn't pass AI review</p>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
          {/* Quality Score */}
          {qualityScore !== undefined && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center">
                    <Star className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Quality Score</p>
                    <p className="text-xl font-bold text-zinc-900">{qualityScore}/100</p>
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                  Needs Work
                </div>
              </div>
            </div>
          )}

          {/* Tips */}
          {evaluation?.quality?.improvementTips && evaluation.quality.improvementTips.length > 0 && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-zinc-900">How to Improve</h3>
              </div>
              <ul className="space-y-2">
                {evaluation.quality.improvementTips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-zinc-600">
                    <span className="text-zinc-400 mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Info */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">What happens now?</p>
              <p className="text-xs text-amber-700 mt-1">This gig is no longer available. Browse other gigs to find your next opportunity.</p>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2">
            <Button
              onClick={() => router.push('/creator/gigs')}
              className="w-full h-14 text-base font-semibold rounded-xl"
            >
              <ArrowRight className="w-5 h-5 mr-2" />
              Find More Gigs
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-zinc-50 pb-32">
      {/* Error Header */}
      <div className="bg-gradient-to-br from-zinc-700 to-zinc-800 px-6 pt-12 pb-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
        </div>
        <div className="relative">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Something Went Wrong</h1>
          <p className="text-zinc-300 text-sm">We couldn't complete the evaluation</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Error Details */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-4">
          <p className="text-sm text-zinc-600">{error || 'An unexpected error occurred during evaluation. Please try again.'}</p>
        </div>

        {/* Actions */}
        <div className="pt-2">
          <Button
            onClick={() => router.push('/creator/gigs')}
            className="w-full h-14 text-base font-semibold rounded-xl"
          >
            <Home className="w-5 h-5 mr-2" />
            Back to Gigs
          </Button>
        </div>
      </div>
    </div>
  );
}
