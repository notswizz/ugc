import { useState } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import type { CreatorExperienceLevel } from '@/lib/models/waitlist';

interface WaitlistFormProps {
  onSuccess?: () => void;
  onClose?: () => void;
}

interface FormData {
  name: string;
  email: string;
  socials: {
    tiktok: string;
    instagram: string;
    youtube: string;
    x: string;
  };
  experienceLevel: CreatorExperienceLevel | null;
}

const EXPERIENCE_OPTIONS: { value: CreatorExperienceLevel; label: string; desc: string }[] = [
  { value: 'beginner', label: 'Beginner', desc: 'Just starting out' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Some paid work' },
  { value: 'experienced', label: 'Experienced', desc: 'Regular paid work' },
  { value: 'professional', label: 'Professional', desc: 'Full-time creator' },
];

export default function WaitlistForm({ onSuccess, onClose }: WaitlistFormProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    socials: { tiktok: '', instagram: '', youtube: '', x: '' },
    experienceLevel: null,
  });

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!validateEmail(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!formData.experienceLevel) {
      toast.error('Please select your experience level');
      return;
    }

    setIsSubmitting(true);

    try {
      const normalizedEmail = formData.email.trim().toLowerCase();

      // Check for duplicate
      const emailQuery = query(collection(db, 'waitlist'), where('email', '==', normalizedEmail));
      const snapshot = await getDocs(emailQuery);

      if (!snapshot.empty) {
        toast.error("You're already on the waitlist! We'll be in touch soon.");
        setIsSubmitting(false);
        return;
      }

      // Build the document
      const socials: Record<string, string> = {};
      (['tiktok', 'instagram', 'youtube', 'x'] as const).forEach(platform => {
        const handle = formData.socials[platform].trim();
        if (handle) {
          socials[platform] = handle.startsWith('@') ? handle : `@${handle}`;
        }
      });

      const waitlistDoc: Record<string, unknown> = {
        email: normalizedEmail,
        name: formData.name.trim(),
        userType: 'creator',
        experienceLevel: formData.experienceLevel,
        status: 'pending',
        createdAt: serverTimestamp(),
      };

      if (Object.keys(socials).length > 0) {
        waitlistDoc.socials = socials;
      }

      await addDoc(collection(db, 'waitlist'), waitlistDoc);

      // Success!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f97316', '#ec4899', '#8b5cf6'],
      });

      setStep(2);
      onSuccess?.();
    } catch (error) {
      console.error('Waitlist signup error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = formData.name.trim() && formData.email.trim() && formData.experienceLevel;

  // Step 1: Form
  if (step === 1) {
    return (
      <div className="space-y-5">
        {/* Header with $10 bonus */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-bold mb-3">
            <span>🎁</span> Get $10 free when you sign up
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-1">Join the Waitlist</h2>
          <p className="text-gray-500 text-sm">Be first to get paid gigs + $10 bonus</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Your name</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => updateField('name', e.target.value)}
              placeholder="Jane Smith"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
            <input
              type="email"
              value={formData.email}
              onChange={e => updateField('email', e.target.value)}
              placeholder="jane@example.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-gray-900"
            />
          </div>

          {/* Experience level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Experience level</label>
            <div className="grid grid-cols-2 gap-2">
              {EXPERIENCE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateField('experienceLevel', opt.value)}
                  className={`p-3 rounded-xl border-2 transition-all text-left ${
                    formData.experienceLevel === opt.value
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-sm text-gray-900">{opt.label}</div>
                  <div className="text-xs text-gray-500">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Social handles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Your socials (optional)</label>
            <div className="space-y-2">
              {/* TikTok */}
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                  </svg>
                </div>
                <input
                  type="text"
                  value={formData.socials.tiktok}
                  onChange={e => updateField('socials', { ...formData.socials, tiktok: e.target.value })}
                  placeholder="@username"
                  className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 focus:border-orange-500 outline-none text-sm text-gray-900"
                />
              </div>

              {/* Instagram */}
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                </div>
                <input
                  type="text"
                  value={formData.socials.instagram}
                  onChange={e => updateField('socials', { ...formData.socials, instagram: e.target.value })}
                  placeholder="@username"
                  className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 focus:border-orange-500 outline-none text-sm text-gray-900"
                />
              </div>

              {/* YouTube */}
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </div>
                <input
                  type="text"
                  value={formData.socials.youtube}
                  onChange={e => updateField('socials', { ...formData.socials, youtube: e.target.value })}
                  placeholder="@channel"
                  className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 focus:border-orange-500 outline-none text-sm text-gray-900"
                />
              </div>

              {/* X (Twitter) */}
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </div>
                <input
                  type="text"
                  value={formData.socials.x}
                  onChange={e => updateField('socials', { ...formData.socials, x: e.target.value })}
                  placeholder="@username"
                  className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 focus:border-orange-500 outline-none text-sm text-gray-900"
                />
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!canProceed || isSubmitting}
          className="w-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white py-6 rounded-xl font-bold disabled:opacity-50"
        >
          {isSubmitting ? 'Joining...' : 'Join Waitlist + Get $10'}
        </Button>
      </div>
    );
  }

  // Step 2: Success
  return (
    <div className="text-center py-6">
      <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5">
        <span className="text-4xl">💰</span>
      </div>
      <h2 className="text-2xl font-black text-gray-900 mb-2">You're on the list!</h2>
      <p className="text-gray-500 mb-2">We'll email you when it's time to claim your <span className="font-bold text-green-600">$10 bonus</span>.</p>
      <p className="text-sm text-gray-400 mb-6">Get ready to start earning.</p>
      {onClose && (
        <Button onClick={onClose} variant="outline" className="px-8 py-3 rounded-xl">
          Done
        </Button>
      )}
    </div>
  );
}
