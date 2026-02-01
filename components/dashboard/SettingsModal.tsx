import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Settings as SettingsIcon, X as XIcon, Save, AtSign, FileText, LogOut } from 'lucide-react';
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
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SettingsIcon className="w-6 h-6 text-white" />
              <h2 className="text-lg font-bold text-white">Settings</h2>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg">
              <XIcon className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Username */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
              <AtSign className="w-4 h-4" /> Username
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">@</span>
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
                className={`w-full h-11 pl-8 pr-3 text-sm bg-zinc-50 border rounded-xl focus:outline-none ${
                  usernameError ? 'border-red-400' : 'border-zinc-200 focus:border-blue-400'
                }`}
                disabled={saving}
              />
            </div>
            {usernameError && <p className="text-xs text-red-500">{usernameError}</p>}
            {checkingUsername && <p className="text-xs text-zinc-400">Checking...</p>}
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
              <FileText className="w-4 h-4" /> Bio
            </label>
            <textarea
              placeholder="Tell brands about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={saving}
              rows={3}
              className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-blue-400 resize-none"
            />
          </div>

          {/* Logout */}
          <button
            onClick={async () => {
              await signOut();
              router.push('/auth/login');
            }}
            disabled={saving}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-red-500 text-white flex items-center justify-center">
              <LogOut className="w-4 h-4" />
            </div>
            <span className="font-semibold text-red-600">Log Out</span>
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 pt-2 flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving} className="flex-1 h-12 rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || checkingUsername}
            className="flex-1 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold"
          >
            {saving ? 'Saving…' : <><Save className="w-4 h-4 mr-2" /> Save</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
