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
        communityId: communityId || undefined, // Add community ID if provided
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
              <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto p-2 border rounded-lg bg-gray-50">
                {THINGS.map(thing => (
                  <button
                    key={thing.id}
                    type="button"
                    onClick={() => toggleInterest(thing.id)}
                    className={`px-3 py-2 rounded-full text-sm border flex items-center gap-1.5 ${
                      formData.interests.includes(thing.id)
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
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <div className="space-y-4">
                {/* TikTok */}
                <div className="p-4 border-2 rounded-lg bg-white hover:border-orange-300 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                    </svg>
                    <span className="font-semibold text-gray-900">TikTok</span>
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
                    <Input
                      type="number"
                      placeholder="Followers"
                      value={formData.followingCount.tiktok || ''}
                      onChange={(e) => updateFormData({
                        followingCount: { 
                          ...formData.followingCount, 
                          tiktok: e.target.value ? parseInt(e.target.value) : undefined 
                        }
                      })}
                      className="h-11"
                    />
                  </div>
                </div>

                {/* Instagram */}
                <div className="p-4 border-2 rounded-lg bg-white hover:border-orange-300 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>
                    </svg>
                    <span className="font-semibold text-gray-900">Instagram</span>
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
                    <Input
                      type="number"
                      placeholder="Followers"
                      value={formData.followingCount.instagram || ''}
                      onChange={(e) => updateFormData({
                        followingCount: { 
                          ...formData.followingCount, 
                          instagram: e.target.value ? parseInt(e.target.value) : undefined 
                        }
                      })}
                      className="h-11"
                    />
                  </div>
                </div>

                {/* X (Twitter) */}
                <div className="p-4 border-2 rounded-lg bg-white hover:border-orange-300 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span className="font-semibold text-gray-900">X</span>
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
                    <Input
                      type="number"
                      placeholder="Followers"
                      value={formData.followingCount.x || ''}
                      onChange={(e) => updateFormData({
                        followingCount: { 
                          ...formData.followingCount, 
                          x: e.target.value ? parseInt(e.target.value) : undefined 
                        }
                      })}
                      className="h-11"
                    />
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
        return (
          <div className="text-center py-8">
            <div className="mb-6">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
                You're All Set!
              </h3>
              <p className="text-gray-600 text-lg">
                Welcome to Giglet, {formData.username}
              </p>
              {communityName && (
                <p className="text-sm text-green-600 font-semibold mt-2">
                  🏆 Community: {communityName}
                </p>
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