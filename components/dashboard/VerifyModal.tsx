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
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[90vh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/30">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Verify Your Account</h2>
                <p className="text-sm text-white/80 mt-0.5">{completedSteps}/{totalSteps} steps completed</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors duration-200"
              aria-label="Close"
            >
              <XIcon className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-5 pb-32 space-y-4 bg-gradient-to-b from-zinc-50 to-white">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={loading === 'refresh'}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors duration-200 rounded-xl hover:bg-zinc-50"
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
                className={`bg-white rounded-2xl border-2 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 ${
                  step.completed
                    ? 'border-emerald-300 shadow-emerald-100'
                    : step.disabled
                    ? 'border-zinc-200/60 opacity-60'
                    : 'border-zinc-200/80 hover:border-violet-200'
                }`}
              >
                <div className="flex items-center gap-4 p-5">
                  {/* Status Icon */}
                  <div className="relative">
                    <div className={`w-14 h-14 rounded-xl ${step.completed ? 'bg-gradient-to-br from-emerald-100 to-teal-100 ring-2 ring-emerald-200/50' : step.iconBg} flex items-center justify-center shadow-md`}>
                      {step.completed ? (
                        <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                      ) : (
                        <Icon className="w-7 h-7 text-white" />
                      )}
                    </div>
                    {/* Step number */}
                    <div className={`absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full ${step.completed ? 'bg-gradient-to-br from-emerald-500 to-teal-500' : 'bg-zinc-400'} text-white text-xs font-bold flex items-center justify-center shadow-sm ring-2 ring-white`}>
                      {step.completed ? '✓' : index + 1}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-zinc-900">{step.title}</h3>
                      {!step.completed && (
                        <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-1 rounded-full ring-1 ring-violet-200/50">
                          +{step.points} pts
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-600">{step.description}</p>
                    {step.disabled && step.disabledReason && (
                      <p className="text-xs text-amber-600 font-medium mt-1.5 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-amber-500"></span>
                        {step.disabledReason}
                      </p>
                    )}
                  </div>

                  {/* Action */}
                  {step.completed ? (
                    <div className="px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl ring-2 ring-emerald-200/50">
                      <span className="text-sm font-bold text-emerald-700 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Done
                      </span>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={step.onClick}
                      disabled={step.disabled || isLoading}
                      className="h-10 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold shadow-md shadow-violet-500/30 disabled:opacity-50 disabled:shadow-none transition-all duration-200"
                    >
                      {isLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Start
                          <ArrowRight className="w-4 h-4 ml-1.5" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Benefits */}
          <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-2xl border-2 border-amber-200/80 p-5 mt-2 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-bold text-amber-900">Verification Benefits</h3>
            </div>
            <ul className="space-y-3 text-sm text-amber-900">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0"></span>
                <span><strong className="font-semibold">Complete all steps:</strong> Unlock instant withdrawals & premium gigs</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0"></span>
                <span><strong className="font-semibold">Higher verification:</strong> Access high-value gigs ($500+)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0"></span>
                <span>Better matching with premium brands and exclusive opportunities</span>
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
