import React, { useState } from 'react';
import { ShieldCheck, X as XIcon, CheckCircle2, CreditCard, UserCheck, Phone, ArrowRight, RefreshCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { calculateTrustScore } from '@/lib/trustScore/calculator';
import toast from 'react-hot-toast';
import PhoneVerificationDialog from './PhoneVerificationDialog';

interface VerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorData: any;
  userId?: string;
  onRefresh?: () => void;
}

export default function VerifyModal({
  isOpen,
  onClose,
  creatorData,
  userId,
  onRefresh,
}: VerifyModalProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);

  if (!isOpen || !creatorData) return null;

  const currentScore = calculateTrustScore(creatorData);
  const hasStripeConnect = !!creatorData.stripe?.connectAccountId;
  const isStripeComplete = !!creatorData.stripe?.onboardingComplete;
  const isIdentityVerified = !!creatorData.stripe?.identityVerified;
  const isPhoneVerified = !!creatorData.phoneVerified;

  const handleStripeConnect = async () => {
    if (!userId) {
      toast.error('Please sign in');
      return;
    }

    setLoading('stripe');
    try {
      const response = await fetch('/api/stripe/connect-onboard', {
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

    setLoading('identity');
    try {
      const response = await fetch('/api/stripe/identity-verify', {
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

  const handleRefresh = async () => {
    if (!userId) return;

    setLoading('refresh');
    try {
      const response = await fetch('/api/stripe/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await response.json();

      if (data.success) {
        toast.success('Status refreshed!');
        onRefresh?.();
      }
    } catch (error) {
      toast.error('Failed to refresh');
    } finally {
      setLoading(null);
    }
  };

  const verificationSteps = [
    {
      id: 'stripe',
      title: 'Payment Account',
      description: 'Link bank or card for payouts',
      icon: CreditCard,
      iconBg: 'bg-blue-500',
      completed: isStripeComplete,
      points: 15,
      onClick: handleStripeConnect,
      disabled: false,
    },
    {
      id: 'identity',
      title: 'Verify ID',
      description: 'Submit ID for verification',
      icon: UserCheck,
      iconBg: 'bg-violet-500',
      completed: isIdentityVerified,
      points: 20,
      onClick: handleIdentityVerify,
      disabled: !isStripeComplete,
      disabledReason: 'Complete payment setup first',
    },
    {
      id: 'phone',
      title: 'Phone Number',
      description: 'Verify via call or SMS',
      icon: Phone,
      iconBg: 'bg-emerald-500',
      completed: isPhoneVerified,
      points: 10,
      onClick: () => setPhoneDialogOpen(true),
      disabled: false,
    },
  ];

  const completedSteps = verificationSteps.filter(s => s.completed).length;
  const totalSteps = verificationSteps.length;
  const availablePoints = verificationSteps.filter(s => !s.completed).reduce((sum, s) => sum + s.points, 0);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-zinc-50 w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-br from-emerald-500 to-teal-600 px-5 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Verify Account</h2>
                <p className="text-xs text-emerald-100">{completedSteps}/{totalSteps} completed</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors"
            >
              <XIcon className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Trust Score */}
          <div className="bg-white/20 backdrop-blur rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-xs font-medium">Trust Score</p>
              <p className="text-white text-2xl font-bold">{currentScore}/100</p>
            </div>
            <div className="text-right">
              {availablePoints > 0 && (
                <>
                  <p className="text-emerald-100 text-xs">Available points</p>
                  <p className="text-white text-lg font-semibold">+{availablePoints}</p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-4 pb-24 space-y-3">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={loading === 'refresh'}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading === 'refresh' ? 'animate-spin' : ''}`} />
            {loading === 'refresh' ? 'Refreshing...' : 'Refresh status'}
          </button>

          {/* Steps */}
          {verificationSteps.map((step, index) => {
            const Icon = step.icon;
            const isLoading = loading === step.id;

            return (
              <div
                key={step.id}
                className={`bg-white rounded-2xl border overflow-hidden transition-all ${
                  step.completed
                    ? 'border-emerald-200'
                    : step.disabled
                    ? 'border-zinc-200 opacity-60'
                    : 'border-zinc-200'
                }`}
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Status Icon */}
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-xl ${step.completed ? 'bg-emerald-100' : step.iconBg} flex items-center justify-center`}>
                      {step.completed ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      ) : (
                        <Icon className="w-6 h-6 text-white" />
                      )}
                    </div>
                    {/* Step number */}
                    <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full ${step.completed ? 'bg-emerald-500' : 'bg-zinc-300'} text-white text-xs font-bold flex items-center justify-center`}>
                      {step.completed ? '✓' : index + 1}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-semibold text-zinc-900">{step.title}</h3>
                      {!step.completed && (
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                          +{step.points} pts
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500">{step.description}</p>
                    {step.disabled && step.disabledReason && (
                      <p className="text-xs text-amber-600 mt-1">{step.disabledReason}</p>
                    )}
                  </div>

                  {/* Action */}
                  {step.completed ? (
                    <div className="px-3 py-1.5 bg-emerald-100 rounded-lg">
                      <span className="text-xs font-semibold text-emerald-700">Done</span>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={step.onClick}
                      disabled={step.disabled || isLoading}
                      className="h-9 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800"
                    >
                      {isLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Go
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Benefits */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-amber-900">Verification Benefits</h3>
            </div>
            <ul className="space-y-2 text-xs text-amber-800">
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                <span><strong>50+ score:</strong> Instant withdrawals & reimbursement gigs</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                <span><strong>70+ score:</strong> Access high-value gigs ($500+)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                <span>Better matching with premium brands</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Phone Verification Dialog */}
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
    </div>
  );
}
