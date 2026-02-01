import React, { useState } from 'react';
import { ShieldCheck, X as XIcon, CheckCircle2, CreditCard, UserCheck, Phone, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  const hasStripeConnect = !!creatorData.stripe?.connectAccountId;
  const isStripeComplete = !!creatorData.stripe?.onboardingComplete;
  const isIdentityVerified = !!creatorData.stripe?.identityVerified;
  const isPhoneVerified = !!creatorData.phoneVerified;

  const handleStripeConnect = async () => {
    if (!userId) return toast.error('Please sign in');
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
    } catch {
      toast.error('Failed to start setup');
      setLoading(null);
    }
  };

  const handleIdentityVerify = async () => {
    if (!userId || !hasStripeConnect) {
      return toast.error('Complete payment setup first');
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
        toast.error(data.error || 'Failed to start verification');
        setLoading(null);
      }
    } catch {
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
    } catch {
      toast.error('Failed to refresh');
    } finally {
      setLoading(null);
    }
  };

  const steps = [
    {
      id: 'stripe',
      title: 'Payment',
      icon: CreditCard,
      color: 'blue',
      completed: isStripeComplete,
      onClick: handleStripeConnect,
      disabled: false,
    },
    {
      id: 'identity',
      title: 'ID Verification',
      icon: UserCheck,
      color: 'violet',
      completed: isIdentityVerified,
      onClick: handleIdentityVerify,
      disabled: !isStripeComplete,
    },
    {
      id: 'phone',
      title: 'Phone',
      icon: Phone,
      color: 'emerald',
      completed: isPhoneVerified,
      onClick: () => setPhoneDialogOpen(true),
      disabled: false,
    },
  ];

  const completedCount = steps.filter(s => s.completed).length;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-white" />
              <div>
                <h2 className="text-lg font-bold text-white">Verification</h2>
                <p className="text-xs text-white/70">{completedCount}/3 complete</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg">
              <XIcon className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {steps.map((step) => {
            const Icon = step.icon;
            const isLoading = loading === step.id;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                  step.completed
                    ? 'border-emerald-200 bg-emerald-50'
                    : step.disabled
                    ? 'border-zinc-100 bg-zinc-50 opacity-50'
                    : 'border-zinc-200 bg-white hover:border-violet-200'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  step.completed ? 'bg-emerald-500' : `bg-${step.color}-500`
                }`}>
                  {step.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  ) : (
                    <Icon className="w-5 h-5 text-white" />
                  )}
                </div>

                <span className={`flex-1 font-semibold ${step.completed ? 'text-emerald-700' : 'text-zinc-900'}`}>
                  {step.title}
                </span>

                {step.completed ? (
                  <span className="text-xs font-medium text-emerald-600">Done</span>
                ) : (
                  <Button
                    size="sm"
                    onClick={step.onClick}
                    disabled={step.disabled || isLoading}
                    className="h-8 px-3 rounded-lg text-xs"
                  >
                    {isLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Start'}
                  </Button>
                )}
              </div>
            );
          })}

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={loading === 'refresh'}
            className="w-full py-2 text-xs text-zinc-400 hover:text-zinc-600 flex items-center justify-center gap-1.5"
          >
            <RefreshCw className={`w-3 h-3 ${loading === 'refresh' ? 'animate-spin' : ''}`} />
            Refresh status
          </button>
        </div>
      </div>

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
