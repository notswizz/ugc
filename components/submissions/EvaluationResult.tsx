import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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
      <div className="max-w-4xl mx-auto py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="mb-8 animate-bounce">
            <div className="text-8xl mb-4">💰</div>
            <div className="text-6xl mb-4 font-bold text-green-600 animate-pulse">CHA CHING!</div>
            <h2 className="text-4xl font-bold mb-2 text-green-600">APPROVED!</h2>
            <p className="text-xl text-gray-700 mb-4">Your submission has been approved!</p>
          </div>

          <Card className="w-full max-w-md mb-6">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    ${payout || 0}
                  </div>
                  <div className="text-sm text-gray-600">You'll be paid this amount</div>
                </div>

                {qualityScore !== undefined && (
                  <div className="pt-4 border-t">
                    <div className="text-sm text-gray-600 mb-1">AI Quality Score</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {qualityScore}/100
                    </div>
                  </div>
                )}

                {evaluation?.quality?.improvementTips &&
                 evaluation.quality.improvementTips.length > 0 && (
                  <div className="pt-4 border-t text-left">
                    <div className="text-sm font-medium text-gray-700 mb-2">Tips for Next Time:</div>
                    <ul className="space-y-1">
                      {evaluation.quality.improvementTips.map((tip, idx) => (
                        <li key={idx} className="text-sm text-gray-600">• {tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              onClick={() => router.push('/creator/gigs')}
              className="bg-green-600 hover:bg-green-700"
              size="lg"
            >
              View My Gigs
            </Button>
            <Button
              onClick={() => router.push('/creator/gigs/history')}
              variant="outline"
              size="lg"
            >
              View History
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="mb-8">
            <div className="text-8xl mb-4">❌</div>
            <h2 className="text-4xl font-bold mb-2 text-red-600">NOT APPROVED</h2>
          </div>

          <Card className="w-full max-w-md mb-6">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {qualityScore !== undefined && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">AI Quality Score</div>
                    <div className="text-2xl font-bold text-red-600">
                      {qualityScore}/100
                    </div>
                  </div>
                )}

                {evaluation?.quality?.improvementTips &&
                 evaluation.quality.improvementTips.length > 0 && (
                  <div className="pt-4 border-t text-left">
                    <div className="text-sm font-medium text-gray-700 mb-2">Improvement Tips:</div>
                    <ul className="space-y-1">
                      {evaluation.quality.improvementTips.map((tip, idx) => (
                        <li key={idx} className="text-sm text-gray-600">• {tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              onClick={() => router.push('/creator/gigs')}
              variant="outline"
              size="lg"
            >
              Back to Gigs
            </Button>
            <Button
              onClick={() => router.push('/creator/gigs/history')}
              variant="outline"
              size="lg"
            >
              View History
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="mb-8">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-3xl font-bold mb-2">Evaluation Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Something went wrong during evaluation'}</p>
        </div>

        <Button
          onClick={() => router.push('/creator/gigs')}
          size="lg"
        >
          Back to Gigs
        </Button>
      </div>
    </div>
  );
}
