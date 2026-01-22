import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, X as XIcon, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gradient-to-r from-slate-600 to-slate-700 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <h2 className="text-lg font-bold text-white">Settings</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <XIcon className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(85vh-80px)]">
          <div className="p-5 space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-900 mb-1.5 block">Username</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
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
                  className={`pl-8 ${usernameError ? 'border-red-500' : ''}`}
                  disabled={saving}
                />
              </div>
              {usernameError && (
                <p className="text-xs text-red-600 mt-1">{usernameError}</p>
              )}
              {!usernameError && normalized && USERNAME_REGEX.test(normalized) && !checkingUsername && lastCheckedAvailable && (
                <p className="text-xs text-green-600 mt-1">
                  {usernameUnchanged ? 'No change' : 'Available'}
                </p>
              )}
              {checkingUsername && (
                <p className="text-xs text-gray-500 mt-1">Checking…</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-900 mb-1.5 block">Bio</label>
              <textarea
                placeholder="Tell brands about yourself, your style, and what makes you unique..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={saving}
                rows={4}
                className="w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-medium placeholder:text-gray-400 placeholder:font-normal transition-colors focus-visible:outline-none focus-visible:border-brand-500 focus-visible:ring-4 focus-visible:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50 resize-y min-h-[100px]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-900 mb-1.5 block">Interests</label>
              <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto p-2 border-2 border-gray-200 rounded-lg bg-gray-50">
                {THINGS.map((thing) => (
                  <button
                    key={thing.id}
                    type="button"
                    onClick={() => toggleInterest(thing.id)}
                    disabled={saving}
                    className={`px-3 py-2 rounded-full text-sm border flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                      interests.includes(thing.id)
                        ? 'bg-green-100 text-green-800 border-green-300'
                        : 'bg-white hover:bg-gray-100 border-gray-200'
                    }`}
                  >
                    <span>{thing.icon}</span>
                    <span>{thing.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!canSave} className="flex-1">
              {saving ? (
                'Saving…'
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Save
                </>
              )}
            </Button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
