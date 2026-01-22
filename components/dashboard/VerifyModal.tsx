import React from 'react';
import { ShieldCheck, X as XIcon } from 'lucide-react';
import TrustScoreGuide from './TrustScoreGuide';

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
  if (!isOpen || !creatorData) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gradient-to-r from-emerald-500 to-teal-600 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <h2 className="text-lg font-bold text-white">Verify</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <XIcon className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(85vh-80px)]">
          <div className="p-5">
            <TrustScoreGuide
              creatorData={creatorData}
              userId={userId}
              onRefresh={onRefresh}
              verifyOnly
            />
          </div>
        </div>
      </div>
    </div>
  );
}
