import React, { useState } from 'react';
import { ShieldCheck, X as XIcon, CheckCircle2, CreditCard, UserCheck, Phone, RefreshCw, Sparkles } from 'lucide-react';
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
      className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative top gradient line */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />

        {/* Header */}
        <div className="px-6 pt-7 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Verification</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${i < completedCount ? 'bg-emerald-500' : 'bg-slate-200'}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-slate-400">{completedCount}/3</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-slate-100 rounded-xl transition-all duration-200 group"
            >
              <XIcon className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-3">
          {steps.map((step) => {
            const Icon = step.icon;
            const isLoading = loading === step.id;
            const bgColor = step.id === 'stripe' ? 'from-blue-500 to-blue-600' : step.id === 'identity' ? 'from-violet-500 to-purple-600' : 'from-emerald-500 to-teal-600';
            const shadowColor = step.id === 'stripe' ? 'shadow-blue-200' : step.id === 'identity' ? 'shadow-violet-200' : 'shadow-emerald-200';

            return (
              <div
                key={step.id}
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 ${
                  step.completed
                    ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50'
                    : step.disabled
                    ? 'border-slate-100 bg-slate-50/50 opacity-60'
                    : 'border-slate-100 bg-white hover:border-violet-200 hover:shadow-md'
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-lg ${
                  step.completed ? 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-200' : `bg-gradient-to-br ${bgColor} ${shadowColor}`
                }`}>
                  {step.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  ) : (
                    <Icon className="w-5 h-5 text-white" />
                  )}
                </div>

                <span className={`flex-1 font-semibold ${step.completed ? 'text-emerald-700' : 'text-slate-900'}`}>
                  {step.title}
                </span>

                {step.completed ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 rounded-lg">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-600">Complete</span>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={step.onClick}
                    disabled={step.disabled || isLoading}
                    className={`h-9 px-4 rounded-xl text-xs font-semibold shadow-md transition-all duration-200 ${
                      step.disabled
                        ? 'bg-slate-200 text-slate-400'
                        : `bg-gradient-to-r ${bgColor} text-white hover:shadow-lg`
                    }`}
                  >
                    {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Start'}
                  </Button>
                )}
              </div>
            );
          })}

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={loading === 'refresh'}
            className="w-full py-3 text-sm text-slate-400 hover:text-slate-600 flex items-center justify-center gap-2 rounded-xl hover:bg-slate-50 transition-all duration-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading === 'refresh' ? 'animate-spin' : ''}`} />
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
