import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Creator } from '@/lib/models/types';
import { THINGS, EXPERIENCE_TYPES, HARD_NO_CATEGORIES } from '@/lib/things/constants';
import toast from 'react-hot-toast';

interface CreatorFormData {
  username: string; // Unique username
  intro: string;
  interests: string[]; // What I like
  location: string;
  languages: string[];
  portfolioLinks: string[];
  socials: {
    tiktok?: string;
    instagram?: string;
    x?: string;
  };
  followingCount: {
    tiktok?: number;
    instagram?: number;
    x?: number;
  };
  communityCode: string; // Optional community code
}

const COMMON_LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
  'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi'
];

export default function CreatorOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  // Check if creator profile already exists and redirect to dashboard
  useEffect(() => {
    const checkExistingProfile = async () => {
      if (!user) return;

      try {
        const creatorDoc = await getDoc(doc(db, 'creators', user.uid));
        if (creatorDoc.exists()) {
          router.push('/creator/dashboard');
        }
      } catch (error) {
        console.error('Error checking existing creator profile:', error);
      }
    };

    checkExistingProfile();
  }, [user, router]);

  const [formData, setFormData] = useState<CreatorFormData>({
    username: '',
    intro: '',
    interests: [],
    location: '',
    languages: ['English'],
    portfolioLinks: [],
    socials: {},
    followingCount: {},
    communityCode: '',
  });
  const [usernameError, setUsernameError] = useState<string>('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [communityError, setCommunityError] = useState<string>('');
  const [checkingCommunity, setCheckingCommunity] = useState(false);
  const [communityName, setCommunityName] = useState<string>('');

  // Helper to format follower count for display
  const formatFollowerCount = (count: number | undefined): string => {
    if (!count) return '';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Helper to parse follower input (handles K, M suffixes)
  const parseFollowerInput = (value: string): number | undefined => {
    if (!value) return undefined;
    const cleaned = value.replace(/,/g, '').trim().toUpperCase();
    const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*(K|M)?$/);
    if (!match) {
      const num = parseInt(cleaned);
      return isNaN(num) ? undefined : num;
    }
    const num = parseFloat(match[1]);
    if (match[2] === 'K') return Math.round(num * 1000);
    if (match[2] === 'M') return Math.round(num * 1000000);
    return Math.round(num);
  };

  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    if (!username.trim()) return false;
    
    const normalizedUsername = username.trim().toLowerCase();
    
    // Check username format (alphanumeric and underscores only, 3-20 chars)
    if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
      return false;
    }
    
    try {
      // Check in creators collection
      const creatorsQuery = query(
        collection(db, 'creators'),
        where('username', '==', normalizedUsername)
      );
      const creatorsSnapshot = await getDocs(creatorsQuery);
      
      if (!creatorsSnapshot.empty) {
        return false;
      }
      
      // Check in users collection
      const usersQuery = query(
        collection(db, 'users'),
        where('username', '==', normalizedUsername)
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      return usersSnapshot.empty;
    } catch (error) {
      console.error('Error checking username:', error);
      return false;
    }
  };

  const handleUsernameChange = async (value: string) => {
    const normalized = value.trim().toLowerCase();
    setFormData(prev => ({ ...prev, username: value }));
    setUsernameError('');
    
    if (!normalized) {
      setUsernameError('Username is required');
      return;
    }
    
    if (!/^[a-z0-9_]{3,20}$/.test(normalized)) {
      setUsernameError('Username must be 3-20 characters (letters, numbers, underscores only)');
      return;
    }
    
    setCheckingUsername(true);
    const isAvailable = await checkUsernameAvailability(normalized);
    setCheckingUsername(false);
    
    if (!isAvailable) {
      setUsernameError('Username is already taken');
    }
  };

  const checkCommunityCode = async (code: string): Promise<{ valid: boolean; name?: string; communityId?: string }> => {
    if (!code.trim()) return { valid: false };
    
    try {
      const communityCodesQuery = query(
        collection(db, 'communityCodes'),
        where('code', '==', code.trim().toUpperCase())
      );
      const snapshot = await getDocs(communityCodesQuery);
      
      if (snapshot.empty) {
        return { valid: false };
      }
      
      const communityCodeData = snapshot.docs[0].data();
      return { 
        valid: true, 
        name: communityCodeData.communityName,
        communityId: communityCodeData.communityId
      };
    } catch (error) {
      console.error('Error checking community code:', error);
      return { valid: false };
    }
  };

  const handleCommunityCodeChange = async (value: string) => {
    setFormData(prev => ({ ...prev, communityCode: value }));
    setCommunityError('');
    setCommunityName('');
    
    const code = value.trim().toUpperCase();
    if (!code || code.length < 3) {
      return;
    }
    
    setCheckingCommunity(true);
    const result = await checkCommunityCode(code);
    setCheckingCommunity(false);
    
    if (!result.valid) {
      setCommunityError('Invalid community code');
    } else {
      setCommunityName(result.name || 'Community');
    }
  };

  const handleNext = () => {
    // Validate username on step 1
    if (currentStep === 1) {
      if (!formData.username.trim()) {
        toast.error('Please enter a username');
        return;
      }
      if (usernameError) {
        toast.error('Please fix username errors');
        return;
      }
    }
    
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Validate username
    if (!formData.username.trim()) {
      toast.error('Username is required');
      return;
    }
    
    const normalizedUsername = formData.username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
      toast.error('Username must be 3-20 characters (letters, numbers, underscores only)');
      return;
    }
    
    // Final check if username is available
    const isAvailable = await checkUsernameAvailability(normalizedUsername);
    if (!isAvailable) {
      toast.error('Username is already taken. Please choose another.');
      return;
    }

    setIsLoading(true);
    try {
      // Validate and process community code if provided
      let communityId: string | null = null;
      if (formData.communityCode.trim()) {
        const communityResult = await checkCommunityCode(formData.communityCode);
        if (communityResult.valid && communityResult.communityId) {
          communityId = communityResult.communityId;
        }
      }

      // Calculate initial Trust Score
      const accountAge = 0; // New account
      const trustScore = 20 + (formData.socials.tiktok ? 7 : 0) + 
                         (formData.socials.instagram ? 7 : 0) + 
                         (formData.socials.x ? 6 : 0);

      const creatorData: Omit<Creator, 'id'> = {
        uid: user.uid,
        username: normalizedUsername,
        bio: formData.intro,
        interests: formData.interests,
        experience: [],
        hardNos: [],
        location: formData.location,
        languages: formData.languages,
        socials: formData.socials,
        followingCount: formData.followingCount,
        trustScore,
        rep: 0, // Initialize rep at 0
        ...(communityId && { communityId }), // Only include communityId if it has a value
        rates: {}, // Rates managed by admin
        turnaroundDays: 7, // Default value
        portfolioLinks: formData.portfolioLinks,
        metrics: {
          ratingAvg: 0,
          ratingCount: 0,
          gigsCompleted: 0,
          onTimeRate: 100,
          disputeRate: 0,
          refundRate: 0,
          responseTimeHoursAvg: 24,
          acceptanceRate: 100,
        },
        stripe: {},
        balance: 0, // Initialize balance to 0
        status: 'active',
        accountAge,
      };

      // Save creator profile
      await setDoc(doc(db, 'creators', user.uid), creatorData);
      
      // Also update username in users collection
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          ...userDoc.data(),
          username: normalizedUsername,
        }, { merge: true });
      }

      toast.success('Profile created successfully!');
      router.push('/creator/dashboard');
    } catch (error) {
      console.error('Error creating creator profile:', error);
      toast.error('Failed to create profile');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (updates: Partial<CreatorFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const toggleInterest = (thing: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(thing)
        ? prev.interests.filter(t => t !== thing)
        : [...prev.interests, thing]
    }));
  };

  const toggleLanguage = (language: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(l => l !== language)
        : [...prev.languages, language]
    }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-900">Username *</label>
              <Input
                type="text"
                value={formData.username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="johndoe"
                required
                className={`h-12 text-lg ${usernameError ? 'border-red-500' : ''}`}
              />
              {checkingUsername && (
                <p className="text-xs text-gray-500 mt-2">⏳ Checking availability...</p>
              )}
              {usernameError && (
                <p className="text-xs text-red-600 mt-2">❌ {usernameError}</p>
              )}
              {!usernameError && formData.username.trim() && !checkingUsername && (
                <p className="text-xs text-green-600 mt-2 font-medium">✓ Username available!</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                3-20 characters (letters, numbers, underscores)
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-900">Intro</label>
              <textarea
                className="w-full p-4 border-2 rounded-lg min-h-[120px] text-base focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                placeholder="Tell brands about yourself, your style, and what makes you unique..."
                value={formData.intro}
                onChange={(e) => updateFormData({ intro: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-900">Location</label>
              <Input
                placeholder="City, Country"
                value={formData.location}
                onChange={(e) => updateFormData({ location: e.target.value })}
                className="h-12 text-lg"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-gray-900">Pick Your Niches</label>
                <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                  formData.interests.length === 0 
                    ? 'bg-gray-100 text-gray-500' 
                    : formData.interests.length < 3 
                      ? 'bg-yellow-100 text-yellow-700'
                      : formData.interests.length <= 8
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                }`}>
                  {formData.interests.length} selected
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3">Select 3-8 niches that match your content style</p>
              <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto p-2 border rounded-lg bg-gray-50">
                {THINGS.map(thing => (
                  <button
                    key={thing.id}
                    type="button"
                    onClick={() => toggleInterest(thing.id)}
                    className={`px-3 py-2 rounded-full text-sm border flex items-center gap-1.5 transition-all ${
                      formData.interests.includes(thing.id)
                        ? 'bg-green-100 text-green-800 border-green-300 shadow-sm'
                        : 'bg-white hover:bg-gray-100 border-gray-200'
                    }`}
                  >
                    <span>{thing.icon}</span>
                    <span>{thing.name}</span>
                  </button>
                ))}
              </div>
              {formData.interests.length > 0 && formData.interests.length < 3 && (
                <p className="text-xs text-yellow-600 mt-2">⚠️ Select at least 3 niches for better gig matches</p>
              )}
            </div>
          </div>
        );

      case 3:
        const connectedCount = [formData.socials.tiktok, formData.socials.instagram, formData.socials.x].filter(Boolean).length;
        return (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-gray-900">Connect Your Socials</label>
                <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                  connectedCount === 0 
                    ? 'bg-gray-100 text-gray-500' 
                    : connectedCount >= 2
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {connectedCount}/3 connected
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-4">Link at least one account. Type followers like "5K" or "1.2M"</p>
              <div className="space-y-4">
                {/* TikTok */}
                <div className={`p-4 border-2 rounded-lg transition-all ${
                  formData.socials.tiktok ? 'border-green-300 bg-green-50' : 'bg-white hover:border-orange-300'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                    </svg>
                    <span className="font-semibold text-gray-900">TikTok</span>
                    {formData.socials.tiktok && <span className="text-green-600 text-sm">✓</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="@username"
                      value={formData.socials.tiktok || ''}
                      onChange={(e) => updateFormData({
                        socials: { ...formData.socials, tiktok: e.target.value }
                      })}
                      className="h-11"
                    />
                    <div className="relative">
                      <Input
                        placeholder="e.g. 10K, 1.5M"
                        defaultValue={formatFollowerCount(formData.followingCount.tiktok)}
                        onBlur={(e) => updateFormData({
                          followingCount: { 
                            ...formData.followingCount, 
                            tiktok: parseFollowerInput(e.target.value)
                          }
                        })}
                        className="h-11"
                      />
                      {formData.followingCount.tiktok && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          {formData.followingCount.tiktok.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Instagram */}
                <div className={`p-4 border-2 rounded-lg transition-all ${
                  formData.socials.instagram ? 'border-green-300 bg-green-50' : 'bg-white hover:border-orange-300'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>
                    </svg>
                    <span className="font-semibold text-gray-900">Instagram</span>
                    {formData.socials.instagram && <span className="text-green-600 text-sm">✓</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="@username"
                      value={formData.socials.instagram || ''}
                      onChange={(e) => updateFormData({
                        socials: { ...formData.socials, instagram: e.target.value }
                      })}
                      className="h-11"
                    />
                    <div className="relative">
                      <Input
                        placeholder="e.g. 10K, 1.5M"
                        defaultValue={formatFollowerCount(formData.followingCount.instagram)}
                        onBlur={(e) => updateFormData({
                          followingCount: { 
                            ...formData.followingCount, 
                            instagram: parseFollowerInput(e.target.value)
                          }
                        })}
                        className="h-11"
                      />
                      {formData.followingCount.instagram && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          {formData.followingCount.instagram.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* X (Twitter) */}
                <div className={`p-4 border-2 rounded-lg transition-all ${
                  formData.socials.x ? 'border-green-300 bg-green-50' : 'bg-white hover:border-orange-300'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span className="font-semibold text-gray-900">X</span>
                    {formData.socials.x && <span className="text-green-600 text-sm">✓</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="@username"
                      value={formData.socials.x || ''}
                      onChange={(e) => updateFormData({
                        socials: { ...formData.socials, x: e.target.value }
                      })}
                      className="h-11"
                    />
                    <div className="relative">
                      <Input
                        placeholder="e.g. 10K, 1.5M"
                        defaultValue={formatFollowerCount(formData.followingCount.x)}
                        onBlur={(e) => updateFormData({
                          followingCount: { 
                            ...formData.followingCount, 
                            x: parseFollowerInput(e.target.value)
                          }
                        })}
                        className="h-11"
                      />
                      {formData.followingCount.x && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          {formData.followingCount.x.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">🏫</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Join a Community</h3>
              <p className="text-sm text-gray-600">
                Enter a community code to join your school or group and compete for prizes!
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-900">Community Code (Optional)</label>
              <Input
                type="text"
                value={formData.communityCode}
                onChange={(e) => handleCommunityCodeChange(e.target.value)}
                placeholder="Enter code (e.g., HARVARD2024)"
                className={`h-12 text-lg uppercase ${communityError ? 'border-red-500' : ''}`}
              />
              {checkingCommunity && (
                <p className="text-xs text-gray-500 mt-2">⏳ Validating code...</p>
              )}
              {communityError && (
                <p className="text-xs text-red-600 mt-2">❌ {communityError}</p>
              )}
              {communityName && !communityError && !checkingCommunity && (
                <p className="text-xs text-green-600 mt-2 font-medium">✓ Joining {communityName}!</p>
              )}
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex gap-3">
                <span className="text-blue-600 text-xl">ℹ️</span>
                <div className="flex-1">
                  <p className="text-sm text-blue-900 font-semibold mb-1">Why join a community?</p>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• Compete with peers for prizes and recognition</li>
                    <li>• Track your ranking on community leaderboards</li>
                    <li>• Win cash rewards and bonus points</li>
                    <li>• Can only join once - choose wisely!</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={handleNext}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Skip for now →
              </button>
            </div>
          </div>
        );

      case 5:
        const socialsList = [];
        if (formData.socials.tiktok) socialsList.push({ name: 'TikTok', handle: formData.socials.tiktok, followers: formData.followingCount.tiktok });
        if (formData.socials.instagram) socialsList.push({ name: 'Instagram', handle: formData.socials.instagram, followers: formData.followingCount.instagram });
        if (formData.socials.x) socialsList.push({ name: 'X', handle: formData.socials.x, followers: formData.followingCount.x });
        const selectedNiches = THINGS.filter(t => formData.interests.includes(t.id));
        
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <div className="text-5xl mb-3">🎉</div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-1">
                Review Your Profile
              </h3>
              <p className="text-gray-500 text-sm">Make sure everything looks good</p>
            </div>

            <div className="space-y-4">
              {/* Basic Info */}
              <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Profile</span>
                  <button onClick={() => setCurrentStep(1)} className="text-xs text-orange-600 hover:underline">Edit</button>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900">@{formData.username}</p>
                  {formData.intro && <p className="text-sm text-gray-600 line-clamp-2">{formData.intro}</p>}
                  {formData.location && <p className="text-xs text-gray-500">📍 {formData.location}</p>}
                </div>
              </div>

              {/* Niches */}
              <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Niches ({selectedNiches.length})</span>
                  <button onClick={() => setCurrentStep(2)} className="text-xs text-orange-600 hover:underline">Edit</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedNiches.length > 0 ? selectedNiches.map(niche => (
                    <span key={niche.id} className="px-2 py-1 bg-white border rounded-full text-xs">
                      {niche.icon} {niche.name}
                    </span>
                  )) : (
                    <span className="text-xs text-gray-400">No niches selected</span>
                  )}
                </div>
              </div>

              {/* Socials */}
              <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Socials ({socialsList.length})</span>
                  <button onClick={() => setCurrentStep(3)} className="text-xs text-orange-600 hover:underline">Edit</button>
                </div>
                {socialsList.length > 0 ? (
                  <div className="space-y-1.5">
                    {socialsList.map(s => (
                      <div key={s.name} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{s.name}: <span className="font-medium">{s.handle}</span></span>
                        {s.followers && <span className="text-gray-500">{formatFollowerCount(s.followers)} followers</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">No socials connected</span>
                )}
              </div>

              {/* Community */}
              {communityName && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🏆</span>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Community</p>
                      <p className="font-semibold text-green-700">{communityName}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 py-6">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="inline-block px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
              ✨ Creator Setup
            </div>
            <span className="text-sm font-medium text-gray-500">
              {currentStep} of 5
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-orange-600 to-red-600 h-3 rounded-full transition-all shadow-md"
              style={{ width: `${(currentStep / 5) * 100}%` }}
            />
          </div>
        </div>

        <Card className="shadow-xl border-2">
          <CardContent className="p-6 pt-6">
            {renderStep()}
          </CardContent>
        </Card>

        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            size="lg"
            className="px-8 h-12"
          >
            ← Back
          </Button>
          {currentStep < 5 ? (
            <Button 
              onClick={handleNext} 
              size="lg"
              className="px-8 h-12 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
            >
              Next →
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading}
              size="lg"
              className="px-8 h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              {isLoading ? 'Creating Profile...' : '🚀 Complete Setup'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}