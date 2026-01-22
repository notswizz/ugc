import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

interface PhoneVerificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  /** Creator profile: username, interests, bio — passed to Bland for the call */
  creatorData?: { username?: string; interests?: string[]; bio?: string } | null;
  onVerified?: () => void;
}

export default function PhoneVerificationDialog({
  isOpen,
  onClose,
  userId,
  creatorData,
  onVerified,
}: PhoneVerificationDialogProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const raw = phoneNumber.trim().replace(/\D/g, '');
    const e164 = raw.length === 10 ? `+1${raw}` : raw.startsWith('1') ? `+${raw}` : `+1${raw}`;
    if (!/^\+1\d{10}$/.test(e164)) {
      toast.error('Enter a valid US number (e.g. +12345678901 or 2345678901)');
      return;
    }

    if (!userId) {
      toast.error('Please sign in');
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        userId,
        phoneNumber: e164,
      };
      if (creatorData?.username) body.username = creatorData.username;
      if (Array.isArray(creatorData?.interests) && creatorData.interests.length) body.interests = creatorData.interests;
      if (creatorData?.bio) body.bio = creatorData.bio;

      const response = await fetch('/api/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("We're calling you now. Answer to verify your username and chat about your interests.");
        onVerified?.();
        onClose();
        setPhoneNumber('');
      } else {
        toast.error(data.message || data.error || 'Could not start verification call');
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err?.message || 'Failed to start verification call');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Verify phone</DialogTitle>
          <DialogDescription>
            Bland AI will call you to confirm your username and chat about your interests and hobbies.
            This helps us match you with the right brands.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium text-zinc-900 mb-2 block">Phone number</label>
            <Input
              type="tel"
              placeholder="+12345678901"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            <p className="text-xs text-zinc-500 mt-2">US number: +1 followed by 10 digits</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !phoneNumber.trim()}>
            {loading ? 'Calling…' : 'Request call'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
