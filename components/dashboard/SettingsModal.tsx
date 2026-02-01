import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Settings as SettingsIcon, X as XIcon, Save, AtSign, FileText, LogOut, Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/AuthContext';
import { collection, doc, getDoc, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import toast from 'react-hot-toast';

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorData: { username?: string; bio?: string } | null;
  userId?: string;
  onRefresh?: () => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  creatorData,
  userId,
  onRefresh,
}: SettingsModalProps) {
  const { signOut } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastCheckedAvailable, setLastCheckedAvailable] = useState(false);
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (isOpen && creatorData) {
      setUsername(creatorData.username || '');
      setBio(creatorData.bio || '');
      setUsernameError('');
      setLastCheckedAvailable(false);
    }
  }, [isOpen, creatorData]);

  if (!isOpen) return null;

  const checkUsernameAvailability = async (value: string): Promise<boolean> => {
    const normalized = value.trim().toLowerCase();
    if (!normalized || !USERNAME_REGEX.test(normalized) || !userId) return false;
    try {
      const [creatorsSnap, usersSnap] = await Promise.all([
        getDocs(query(collection(db, 'creators'), where('username', '==', normalized))),
        getDocs(query(collection(db, 'users'), where('username', '==', normalized))),
      ]);
      const creatorTaken = creatorsSnap.docs.some((d) => d.id !== userId);
      const userTaken = usersSnap.docs.some((d) => d.id !== userId);
      return !creatorTaken && !userTaken;
    } catch {
      return false;
    }
  };

  const handleUsernameBlur = async () => {
    const normalized = username.replace(/^@/, '').trim().toLowerCase();
    setUsernameError('');
    setLastCheckedAvailable(false);
    if (!normalized) return;
    if (!USERNAME_REGEX.test(normalized)) {
      setUsernameError('3-20 chars, letters/numbers/underscores');
      return;
    }
    if (normalized === (creatorData?.username || '').toLowerCase()) {
      setLastCheckedAvailable(true);
      return;
    }
    setCheckingUsername(true);
    const available = await checkUsernameAvailability(normalized);
    setCheckingUsername(false);
    if (!available) {
      setUsernameError('Username taken');
    } else {
      setLastCheckedAvailable(true);
    }
  };

  const handleSave = async () => {
    if (!userId) return toast.error('Please sign in');
    const normalized = username.replace(/^@/, '').trim().toLowerCase();
    const usernameChanged = normalized !== (creatorData?.username || '').toLowerCase();
    const bioChanged = bio.trim() !== (creatorData?.bio || '').trim();

    if (!usernameChanged && !bioChanged) {
      toast.success('No changes');
      onClose();
      return;
    }

    if (usernameChanged) {
      if (!normalized || !USERNAME_REGEX.test(normalized)) {
        return toast.error('Invalid username');
      }
      if (usernameError) return toast.error('Fix username error');
      if (!lastCheckedAvailable) {
        const available = await checkUsernameAvailability(normalized);
        if (!available) {
          setUsernameError('Username taken');
          return toast.error('Username taken');
        }
      }
    }

    setSaving(true);
    try {
      const updates: Record<string, unknown> = { bio: bio.trim(), updatedAt: new Date() };
      if (usernameChanged) updates.username = normalized;

      await updateDoc(doc(db, 'creators', userId), updates);

      if (usernameChanged) {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          await updateDoc(userRef, { username: normalized, updatedAt: new Date() });
        }
      }

      toast.success('Saved!');
      onRefresh?.();
      onClose();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

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
                <SettingsIcon className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Settings</h2>
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
        <div className="px-6 pb-5 space-y-5">
          {/* Username */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <div className="w-5 h-5 rounded-md bg-violet-100 flex items-center justify-center">
                <AtSign className="w-3 h-3 text-violet-600" />
              </div>
              Username
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">@</span>
              <input
                type="text"
                placeholder="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.replace(/^@/, '').trim());
                  setUsernameError('');
                  setLastCheckedAvailable(false);
                }}
                onBlur={handleUsernameBlur}
                className={`w-full h-12 pl-9 pr-11 text-sm text-slate-900 placeholder-slate-300 bg-slate-50 border-2 rounded-xl focus:outline-none focus:bg-white transition-all duration-200 ${
                  usernameError
                    ? 'border-red-300 focus:border-red-400'
                    : lastCheckedAvailable && username
                    ? 'border-emerald-300 focus:border-emerald-400 bg-emerald-50/50'
                    : 'border-slate-100 focus:border-violet-300 focus:ring-4 focus:ring-violet-50'
                }`}
                disabled={saving}
              />
              {lastCheckedAvailable && username && !usernameError && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </div>
            {usernameError && (
              <p className="text-xs text-red-500 font-medium flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-red-500" />
                {usernameError}
              </p>
            )}
            {checkingUsername && (
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
                Checking availability...
              </p>
            )}
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <div className="w-5 h-5 rounded-md bg-violet-100 flex items-center justify-center">
                <FileText className="w-3 h-3 text-violet-600" />
              </div>
              Bio
            </label>
            <textarea
              placeholder="Tell brands about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={saving}
              rows={3}
              className="w-full px-4 py-3 text-sm text-slate-900 placeholder-slate-300 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-50 resize-none transition-all duration-200"
            />
            <p className="text-xs text-slate-400 text-right">{bio.length}/500</p>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

          {/* Logout */}
          <button
            onClick={async () => {
              await signOut();
              router.push('/auth/login');
            }}
            disabled={saving}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-red-50 to-rose-50 border border-red-100 hover:border-red-200 hover:from-red-100 hover:to-rose-100 transition-all duration-200 group"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-red-200 group-hover:shadow-red-300 transition-shadow">
              <LogOut className="w-5 h-5" />
            </div>
            <span className="font-semibold text-red-600 group-hover:text-red-700 transition-colors">Log Out</span>
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-1 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="flex-1 h-12 rounded-xl bg-slate-50 border-2 border-slate-200 text-slate-600 font-medium hover:bg-slate-100 hover:border-slate-300 transition-all duration-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || checkingUsername}
            className="relative flex-1 h-12 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold shadow-lg shadow-violet-200 hover:shadow-violet-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Save Changes
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
