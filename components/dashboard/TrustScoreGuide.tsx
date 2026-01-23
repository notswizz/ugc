import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Zap, Link2, ArrowRight } from 'lucide-react';
import { calculateTrustScore } from '@/lib/trustScore/calculator';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import PhoneVerificationDialog from './PhoneVerificationDialog';

interface TrustScoreGuideProps {
  creatorData: any;
  userId?: string;
  onStripeConnect?: () => void;
  onIdentityVerify?: () => void;
  onPhoneVerify?: () => void;
  onOpenProfile?: () => void;
  onRefresh?: () => void;
  /** When true, only show Stripe, ID, and phone verification (for Verify modal) */
  verifyOnly?: boolean;
}

const VERIFY_ONLY_IDS = ['stripe', 'identity', 'phone'];

export default function TrustScoreGuide({
  creatorData,
  userId,
  onStripeConnect,
  onIdentityVerify,
  onPhoneVerify,
  onOpenProfile,
  onRefresh,
  verifyOnly = false,
}: TrustScoreGuideProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);

  if (!creatorData) return null;

  const currentScore = calculateTrustScore(creatorData);
  const socials = creatorData.socials || {};
  const hasStripeConnect = !!creatorData.stripe?.connectAccountId;
  const isStripeComplete = !!creatorData.stripe?.onboardingComplete;
  
  // Debug logging when data changes
  useEffect(() => {
    if (hasStripeConnect) {
      console.log('TrustScoreGuide - Stripe Connect status:', {
        connectAccountId: creatorData.stripe?.connectAccountId,
        onboardingComplete: creatorData.stripe?.onboardingComplete,
        isStripeComplete,
        fullStripe: creatorData.stripe
      });
    }
  }, [creatorData.stripe?.onboardingComplete, hasStripeConnect, isStripeComplete]);

  const handleStripeConnect = async () => {
    if (!userId) {
      toast.error('Please sign in');
      return;
    }

    if (onStripeConnect) {
      onStripeConnect();
      return;
    }

    setLoading('stripe');
    try {
      const response = await fetch('/api/stripe-connect-onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Failed to create setup link');
        setLoading(null);
      }
    } catch (error) {
      toast.error('Failed to start setup');
      setLoading(null);
    }
  };

  const handleIdentityVerify = async () => {
    if (!userId || !hasStripeConnect) {
      toast.error('Please complete Stripe Connect setup first');
      return;
    }

    if (onIdentityVerify) {
      onIdentityVerify();
      return;
    }

    setLoading('identity');
    try {
      const response = await fetch('/api/stripe-identity-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Failed to create verification session');
        setLoading(null);
      }
    } catch (error) {
      toast.error('Failed to start verification');
      setLoading(null);
    }
  };

  const handlePhoneVerify = () => {
    if (onPhoneVerify) {
      onPhoneVerify();
    } else {
      setPhoneDialogOpen(true);
    }
  };

  const handleSocialConnect = () => {
    if (onOpenProfile) {
      onOpenProfile();
    }
  };

  const handleRefreshStatus = async () => {
    if (!userId) {
      toast.error('Please sign in');
      return;
    }

    setLoading('refresh');
    try {
      const response = await fetch('/api/check-stripe-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success('Status refreshed!');
        if (onRefresh) {
          onRefresh();
        }
      } else {
        toast.error(data.error || 'Failed to refresh status');
      }
    } catch (error) {
      toast.error('Failed to refresh status');
    } finally {
      setLoading(null);
    }
  };

  // Calculate potential improvements - verification & connections (filter by mode)
  const allImprovements = [
    {
      id: 'stripe',
      title: 'Complete Stripe Connect Setup',
      points: 15,
      completed: isStripeComplete,
      description: 'Link your payment account to withdraw earnings',
      action: 'Set up payment account',
      onClick: handleStripeConnect,
      loading: loading === 'stripe',
    },
    {
      id: 'identity',
      title: 'Complete Identity Verification',
      points: 20,
      completed: !!creatorData.stripe?.identityVerified,
      description: 'Submit ID documents for verification',
      action: 'Verify identity',
      onClick: handleIdentityVerify,
      disabled: !hasStripeConnect,
      loading: loading === 'identity',
    },
    {
      id: 'tiktok',
      title: 'Connect & Verify TikTok',
      points: 7,
      completed: !!socials.tiktok,
      description: 'Link your TikTok account',
      action: 'Add TikTok',
      onClick: () => {
        if (onOpenProfile) {
          onOpenProfile();
          // Scroll after modal is shown
          setTimeout(() => {
            document.getElementById('social-links-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        } else {
          window.location.href = '/onboarding/creator';
        }
      },
    },
    {
      id: 'instagram',
      title: 'Connect Instagram',
      points: 7,
      completed: !!socials.instagram,
      description: 'Link your Instagram account',
      action: 'Add Instagram',
      onClick: () => {
        if (onOpenProfile) {
          onOpenProfile();
          setTimeout(() => {
            document.getElementById('social-links-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        } else {
          window.location.href = '/onboarding/creator';
        }
      },
    },
    {
      id: 'youtube',
      title: 'Connect YouTube',
      points: 5,
      completed: !!socials.youtube,
      description: 'Link your YouTube channel',
      action: 'Add YouTube',
      onClick: () => {
        if (onOpenProfile) {
          onOpenProfile();
          setTimeout(() => {
            document.getElementById('social-links-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        } else {
          window.location.href = '/onboarding/creator';
        }
      },
    },
    {
      id: 'phone',
      title: 'Verify Phone Number',
      points: 10,
      completed: !!creatorData.phoneVerified,
      description: 'Add and verify your phone number',
      action: 'Verify phone',
      onClick: handlePhoneVerify,
      comingSoon: false,
    },
  ];

  const improvements = verifyOnly
    ? allImprovements.filter((i) => VERIFY_ONLY_IDS.includes(i.id))
    : allImprovements;

  const getItemTitle = (id: string, title: string) => {
    if (!verifyOnly) return title;
    if (id === 'stripe') return 'Payment account';
    if (id === 'identity') return 'Verify ID';
    if (id === 'phone') return 'Phone';
    return title;
  };

  const getItemAction = (id: string, action: string) => {
    if (!verifyOnly) return action;
    if (id === 'stripe') return 'Set up';
    if (id === 'identity') return 'Verify';
    if (id === 'phone') return 'Verify';
    return action;
  };

  const availablePoints = improvements
    .filter((i) => !i.completed && !i.comingSoon)
    .reduce((sum, i) => sum + i.points, 0);

  const maxPossibleScore = currentScore + availablePoints;

  return (
    <Card className="border border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-zinc-900">
            {verifyOnly ? 'Identity & payments' : 'Build Your Trust Score'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRefreshStatus}
              disabled={loading === 'refresh'}
              className="h-6 px-2 text-xs"
            >
              {loading === 'refresh' ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Badge variant="outline" className="bg-white">
              {currentScore}/100
            </Badge>
          </div>
        </div>
        {!verifyOnly && (
          <p className="text-xs text-zinc-600 mt-1">
            Verify your identity and connect accounts to build trust score
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Verification & Connections */}
        <div>
          {!verifyOnly && (
            <h4 className="text-sm font-semibold text-zinc-900 mb-2 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-blue-500" />
              Verification & Connections ({availablePoints} points available)
            </h4>
          )}
          <div className="space-y-2">
            {improvements.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-3 p-2.5 rounded-lg border ${
                  item.completed
                    ? 'bg-green-50 border-green-200'
                    : item.comingSoon
                    ? 'bg-gray-50 border-gray-200 opacity-60'
                    : 'bg-white border-zinc-200'
                }`}
              >
                {item.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-5 h-5 text-zinc-300 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-zinc-900">{getItemTitle(item.id, item.title)}</p>
                    {!verifyOnly && (
                      <Badge
                        variant={item.completed ? 'default' : 'outline'}
                        className={`text-xs ${
                          item.completed ? 'bg-green-600' : item.comingSoon ? 'bg-gray-200' : ''
                        }`}
                      >
                        +{item.points} pts
                      </Badge>
                    )}
                  </div>
                  {!verifyOnly && <p className="text-xs text-zinc-600 mb-1">{item.description}</p>}
                  {!item.completed && !item.comingSoon && item.onClick && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={item.onClick}
                      disabled={item.disabled || item.loading}
                      className="mt-1.5 h-7 text-xs px-3"
                    >
                      {item.loading ? 'Loading...' : getItemAction(item.id, item.action)}
                      {!item.loading && <ArrowRight className="w-3 h-3 ml-1" />}
                    </Button>
                  )}
                  {item.disabled && !item.completed && item.id === 'identity' && (
                    <p className="text-xs text-orange-600 mt-1">
                      {verifyOnly ? 'Stripe first' : 'Complete Stripe Connect first'}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary - hidden in verify-only */}
        {!verifyOnly && availablePoints > 0 && (
          <div className="pt-3 border-t border-zinc-200">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-zinc-700">
                Potential Score After Verification:
              </p>
              <p className="text-sm font-bold text-blue-600">
                {maxPossibleScore}/100
              </p>
            </div>
          </div>
        )}

        {/* Benefits - hidden in verify-only */}
        {!verifyOnly && (
          <div className="pt-3 border-t border-zinc-200">
            <p className="text-xs font-semibold text-zinc-900 mb-2">Trust Score Benefits:</p>
            <ul className="space-y-1.5 text-xs text-zinc-600">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span><strong>50+:</strong> Unlock instant withdrawals</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span><strong>50+:</strong> Access reimbursement gigs</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span><strong>70+:</strong> Access high-value gigs ($500+)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Better matching with premium brands</span>
              </li>
            </ul>
          </div>
        )}
      </CardContent>

      {/* Phone Verification Dialog (Bland AI) */}
      <PhoneVerificationDialog
        isOpen={phoneDialogOpen}
        onClose={() => setPhoneDialogOpen(false)}
        userId={userId}
        creatorData={creatorData}
        onVerified={() => {
          setPhoneDialogOpen(false);
          onRefresh?.();
        }}
      />
    </Card>
  );
}
