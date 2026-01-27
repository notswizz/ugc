import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Settings as SettingsIcon, X as XIcon, Save, AtSign, FileText, Heart, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import toast from 'react-hot-toast';
import { THINGS } from '@/lib/things/constants';

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorData: { username?: string; bio?: string; interests?: string[] } | null;
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
  const [username, setUsername] = useState(creatorData?.username || '');
  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastCheckedAvailable, setLastCheckedAvailable] = useState(false);
  const [bio, setBio] = useState(creatorData?.bio || '');
  const [interests, setInterests] = useState<string[]>(creatorData?.interests || []);

  useEffect(() => {
    if (isOpen && creatorData) {
      setUsername(creatorData.username || '');
      setBio(creatorData.bio || '');
      setInterests(creatorData.interests || []);
      setUsernameError('');
      setLastCheckedAvailable(false);
    }
  }, [isOpen, creatorData?.username, creatorData?.bio, creatorData?.interests]);

  const toggleInterest = (thingId: string) => {
    setInterests((prev) =>
      prev.includes(thingId) ? prev.filter((id) => id !== thingId) : [...prev, thingId]
    );
  };

  const checkUsernameAvailability = async (value: string): Promise<boolean> => {
    const normalized = value.trim().toLowerCase();
    if (!normalized || !USERNAME_REGEX.test(normalized)) return false;
    if (!userId) return false;

    try {
      const [creatorsSnap, usersSnap] = await Promise.all([
        getDocs(query(collection(db, 'creators'), where('username', '==', normalized))),
        getDocs(query(collection(db, 'users'), where('username', '==', normalized))),
      ]);

      const creatorTaken = creatorsSnap.docs.some((d) => d.id !== userId);
      const userTaken = usersSnap.docs.some((d) => d.id !== userId);
      return !creatorTaken && !userTaken;
    } catch (e) {
      console.error('Error checking username:', e);
      return false;
    }
  };

  const handleUsernameBlur = async () => {
    const normalized = username.replace(/^@/, '').trim().toLowerCase();
    setUsernameError('');
    setLastCheckedAvailable(false);

    if (!normalized) return;
    if (!USERNAME_REGEX.test(normalized)) {
      setUsernameError('3–20 characters, letters, numbers, underscores only');
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
      setUsernameError('Username is taken');
    } else {
      setLastCheckedAvailable(true);
    }
  };

  const handleSave = async () => {
    if (!userId) {
      toast.error('Please sign in');
      return;
    }

    const normalized = username.replace(/^@/, '').trim().toLowerCase();
    const usernameChanged = normalized !== (creatorData?.username || '').toLowerCase();
    const bioChanged = bio.trim() !== (creatorData?.bio || '').trim();
    const interestsChanged =
      interests.length !== (creatorData?.interests || []).length ||
      interests.some((id) => !(creatorData?.interests || []).includes(id)) ||
      (creatorData?.interests || []).some((id) => !interests.includes(id));

    const hasChanges = usernameChanged || bioChanged || interestsChanged;
    if (!hasChanges) {
      toast.success('No changes');
      onClose();
      return;
    }

    if (usernameChanged) {
      if (!normalized) {
        toast.error('Enter a username');
        return;
      }
      if (!USERNAME_REGEX.test(normalized)) {
        toast.error('Username must be 3–20 characters (letters, numbers, underscores only)');
        return;
      }
      if (usernameError) {
        toast.error('Fix username errors first');
        return;
      }
      if (!lastCheckedAvailable) {
        const available = await checkUsernameAvailability(normalized);
        if (!available) {
          setUsernameError('Username is taken');
          toast.error('Username is taken');
          return;
        }
      }
    }

    setSaving(true);
    try {
      const creatorUpdates: Record<string, unknown> = {
        bio: bio.trim(),
        interests,
        updatedAt: new Date(),
      };
      if (usernameChanged) {
        creatorUpdates.username = normalized;
      }

      await updateDoc(doc(db, 'creators', userId), creatorUpdates);

      if (usernameChanged) {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          await updateDoc(userRef, {
            username: normalized,
            updatedAt: new Date(),
          });
        }
      }

      toast.success('Settings saved');
      onRefresh?.();
      onClose();
    } catch (e) {
      console.error('Error saving settings:', e);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const normalized = username.replace(/^@/, '').trim().toLowerCase();
  const usernameUnchanged = normalized === (creatorData?.username || '').toLowerCase();
  const bioUnchanged = bio.trim() === (creatorData?.bio || '').trim();
  const interestsUnchanged =
    interests.length === (creatorData?.interests || []).length &&
    interests.every((id) => (creatorData?.interests || []).includes(id)) &&
    (creatorData?.interests || []).every((id) => interests.includes(id));

  const hasChanges = !usernameUnchanged || !bioUnchanged || !interestsUnchanged;
  const usernameValid = !normalized || USERNAME_REGEX.test(normalized);
  const usernameOk =
    usernameUnchanged || (!!normalized && usernameValid && !usernameError && lastCheckedAvailable);

  const canSave =
    hasChanges &&
    !checkingUsername &&
    !saving &&
    usernameValid &&
    !usernameError &&
    usernameOk;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-zinc-50 w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-600 to-zinc-700 flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Settings</h2>
              <p className="text-xs text-zinc-400">Edit your profile details</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <XIcon className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {/* Username */}
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
              <div className="w-9 h-9 rounded-lg bg-violet-500 text-white flex items-center justify-center">
                <AtSign className="w-5 h-5" />
              </div>
              <span className="text-sm font-semibold text-zinc-900">Username</span>
            </div>
            <div className="p-4">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-medium">
                  @
                </span>
                <Input
                  type="text"
                  placeholder="username"
                  value={username}
                  onChange={(e) => {
                    const v = e.target.value.replace(/^@/, '').trim();
                    setUsername(v);
                    setUsernameError('');
                    setLastCheckedAvailable(false);
                  }}
                  onBlur={handleUsernameBlur}
                  className={`pl-8 h-12 text-base bg-zinc-50 ${usernameError ? 'border-red-500 focus-visible:ring-red-200' : 'border-zinc-200'}`}
                  disabled={saving}
                />
              </div>
              {usernameError && (
                <p className="text-xs text-red-600 mt-2">{usernameError}</p>
              )}
              {!usernameError && normalized && USERNAME_REGEX.test(normalized) && !checkingUsername && lastCheckedAvailable && (
                <p className="text-xs text-emerald-600 mt-2">
                  {usernameUnchanged ? 'No change' : 'Available'}
                </p>
              )}
              {checkingUsername && (
                <p className="text-xs text-zinc-500 mt-2">Checking…</p>
              )}
            </div>
          </div>

          {/* Bio */}
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
              <div className="w-9 h-9 rounded-lg bg-blue-500 text-white flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-sm font-semibold text-zinc-900">Bio</span>
            </div>
            <div className="p-4">
              <textarea
                placeholder="Tell brands about yourself, your style, and what makes you unique..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={saving}
                rows={4}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm placeholder:text-zinc-400 transition-colors focus-visible:outline-none focus-visible:border-zinc-400 focus-visible:ring-4 focus-visible:ring-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
              <p className="text-xs text-zinc-400 mt-2">{bio.length}/500 characters</p>
            </div>
          </div>

          {/* Interests */}
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
              <div className="w-9 h-9 rounded-lg bg-pink-500 text-white flex items-center justify-center">
                <Heart className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-semibold text-zinc-900">Interests</span>
                <p className="text-xs text-zinc-500">{interests.length} selected</p>
              </div>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-2 max-h-[180px] overflow-y-auto">
                {THINGS.map((thing) => (
                  <button
                    key={thing.id}
                    type="button"
                    onClick={() => toggleInterest(thing.id)}
                    disabled={saving}
                    className={`px-3 py-2 rounded-xl text-sm border-2 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                      interests.includes(thing.id)
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm'
                        : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700'
                    }`}
                  >
                    <span>{thing.icon}</span>
                    <span className="font-medium">{thing.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Logout */}
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.push('/auth/login');
            }}
            disabled={saving}
            className="w-full bg-white rounded-2xl border border-red-200 overflow-hidden hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="w-9 h-9 rounded-lg bg-red-500 text-white flex items-center justify-center">
                <LogOut className="w-5 h-5" />
              </div>
              <span className="text-sm font-semibold text-red-600">Log Out</span>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-zinc-200 p-4 pb-24 flex gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving} className="flex-1 h-12 rounded-xl">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave} className="flex-1 h-12 rounded-xl bg-zinc-900 hover:bg-zinc-800">
            {saving ? 'Saving…' : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
