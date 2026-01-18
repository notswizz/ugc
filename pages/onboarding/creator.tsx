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
  bio: string;
  interests: string[]; // What I like
  experience: string[]; // What I'm good at
  hardNos: string[]; // What I won't promote
  location: string;
  languages: string[];
  portfolioLinks: string[];
  socials: {
    tiktok?: string;
    instagram?: string;
    youtube?: string;
    linkedin?: string;
  };
  followingCount: {
    tiktok?: number;
    instagram?: number;
    youtube?: number;
    linkedin?: number;
  };
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
    bio: '',
    interests: [],
    experience: [],
    hardNos: [],
    location: '',
    languages: ['English'],
    portfolioLinks: [],
    socials: {},
    followingCount: {},
  });
  const [usernameError, setUsernameError] = useState<string>('');
  const [checkingUsername, setCheckingUsername] = useState(false);

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
      // Calculate initial Trust Score
      const accountAge = 0; // New account
      const trustScore = 20 + (formData.socials.tiktok ? 7 : 0) + 
                         (formData.socials.instagram ? 7 : 0) + 
                         (formData.socials.youtube ? 5 : 0);

      const creatorData: Omit<Creator, 'id'> = {
        uid: user.uid,
        username: normalizedUsername,
        bio: formData.bio,
        interests: formData.interests,
        experience: formData.experience,
        hardNos: formData.hardNos,
        location: formData.location,
        languages: formData.languages,
        socials: formData.socials,
        followingCount: formData.followingCount,
        trustScore,
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

  const toggleExperience = (exp: string) => {
    setFormData(prev => ({
      ...prev,
      experience: prev.experience.includes(exp)
        ? prev.experience.filter(e => e !== exp)
        : [...prev.experience, exp]
    }));
  };

  const toggleHardNo = (no: string) => {
    setFormData(prev => ({
      ...prev,
      hardNos: prev.hardNos.includes(no)
        ? prev.hardNos.filter(n => n !== no)
        : [...prev.hardNos, no]
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
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Username *</label>
              <Input
                type="text"
                value={formData.username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="johndoe"
                required
                className={usernameError ? 'border-red-500' : ''}
              />
              {checkingUsername && (
                <p className="text-xs text-gray-500 mt-1">Checking availability...</p>
              )}
              {usernameError && (
                <p className="text-xs text-red-600 mt-1">{usernameError}</p>
              )}
              {!usernameError && formData.username.trim() && !checkingUsername && (
                <p className="text-xs text-green-600 mt-1">✓ Username available</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                3-20 characters (letters, numbers, underscores only)
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Bio</label>
              <textarea
                className="w-full p-3 border rounded-md min-h-[100px]"
                placeholder="Tell brands about yourself, your style, and what makes you unique..."
                value={formData.bio}
                onChange={(e) => updateFormData({ bio: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Location</label>
              <Input
                placeholder="City, Country"
                value={formData.location}
                onChange={(e) => updateFormData({ location: e.target.value })}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Interests (What I Like)</label>
              <p className="text-sm text-muted-foreground mb-3">
                Select things you're interested in. This boosts your feed ranking.
              </p>
              <div className="flex flex-wrap gap-2">
                {THINGS.map(thing => (
                  <button
                    key={thing.id}
                    type="button"
                    onClick={() => toggleInterest(thing.id)}
                    className={`px-3 py-2 rounded-full text-sm border flex items-center gap-1.5 ${
                      formData.interests.includes(thing.id)
                        ? 'bg-green-100 text-green-800 border-green-300'
                        : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                    }`}
                  >
                    <span>{thing.icon}</span>
                    <span>{thing.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Experience (What I'm Good At)</label>
              <p className="text-sm text-muted-foreground mb-3">
                Skills that qualify you for gigs
              </p>
              <div className="flex flex-wrap gap-2">
                {EXPERIENCE_TYPES.map(exp => (
                  <button
                    key={exp}
                    type="button"
                    onClick={() => toggleExperience(exp)}
                    className={`px-3 py-1 rounded-full text-sm border ${
                      formData.experience.includes(exp)
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                    }`}
                  >
                    {exp.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Hard No's (What I Won't Promote)</label>
              <p className="text-sm text-muted-foreground mb-3">
                Categories you'll never see gigs from
              </p>
              <div className="flex flex-wrap gap-2">
                {HARD_NO_CATEGORIES.map(no => (
                  <button
                    key={no}
                    type="button"
                    onClick={() => toggleHardNo(no)}
                    className={`px-3 py-1 rounded-full text-sm border ${
                      formData.hardNos.includes(no)
                        ? 'bg-red-100 text-red-800 border-red-300'
                        : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                    }`}
                  >
                    {no}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Social Media Links</label>
              <p className="text-sm text-muted-foreground mb-3">
                Connect your accounts to boost your Trust Score
              </p>
              <div className="space-y-3">
                <Input
                  placeholder="TikTok @username"
                  value={formData.socials.tiktok || ''}
                  onChange={(e) => updateFormData({
                    socials: { ...formData.socials, tiktok: e.target.value }
                  })}
                />
                <Input
                  placeholder="Instagram @username"
                  value={formData.socials.instagram || ''}
                  onChange={(e) => updateFormData({
                    socials: { ...formData.socials, instagram: e.target.value }
                  })}
                />
                <Input
                  placeholder="YouTube channel URL"
                  value={formData.socials.youtube || ''}
                  onChange={(e) => updateFormData({
                    socials: { ...formData.socials, youtube: e.target.value }
                  })}
                />
                <Input
                  placeholder="LinkedIn profile URL (optional)"
                  value={formData.socials.linkedin || ''}
                  onChange={(e) => updateFormData({
                    socials: { ...formData.socials, linkedin: e.target.value }
                  })}
                />
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <label className="block text-sm font-medium mb-2">Following Count (Optional)</label>
                <p className="text-sm text-muted-foreground mb-3">
                  Enter your follower/following counts to help brands discover you
                </p>
                <div className="space-y-3">
                  {formData.socials.tiktok && (
                    <Input
                      type="number"
                      placeholder="TikTok followers"
                      value={formData.followingCount.tiktok || ''}
                      onChange={(e) => updateFormData({
                        followingCount: { 
                          ...formData.followingCount, 
                          tiktok: e.target.value ? parseInt(e.target.value) : undefined 
                        }
                      })}
                    />
                  )}
                  {formData.socials.instagram && (
                    <Input
                      type="number"
                      placeholder="Instagram followers"
                      value={formData.followingCount.instagram || ''}
                      onChange={(e) => updateFormData({
                        followingCount: { 
                          ...formData.followingCount, 
                          instagram: e.target.value ? parseInt(e.target.value) : undefined 
                        }
                      })}
                    />
                  )}
                  {formData.socials.youtube && (
                    <Input
                      type="number"
                      placeholder="YouTube subscribers"
                      value={formData.followingCount.youtube || ''}
                      onChange={(e) => updateFormData({
                        followingCount: { 
                          ...formData.followingCount, 
                          youtube: e.target.value ? parseInt(e.target.value) : undefined 
                        }
                      })}
                    />
                  )}
                  {formData.socials.linkedin && (
                    <Input
                      type="number"
                      placeholder="LinkedIn connections"
                      value={formData.followingCount.linkedin || ''}
                      onChange={(e) => updateFormData({
                        followingCount: { 
                          ...formData.followingCount, 
                          linkedin: e.target.value ? parseInt(e.target.value) : undefined 
                        }
                      })}
                    />
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Languages</label>
              <div className="flex flex-wrap gap-2">
                {COMMON_LANGUAGES.map(language => (
                  <button
                    key={language}
                    type="button"
                    onClick={() => toggleLanguage(language)}
                    className={`px-3 py-1 rounded-full text-sm border ${
                      formData.languages.includes(language)
                        ? 'bg-orange-100 text-orange-800 border-orange-300'
                        : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                    }`}
                  >
                    {language}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Portfolio Links (Optional)</label>
              <p className="text-sm text-muted-foreground mb-3">
                Share links to your work (YouTube, Instagram, TikTok, etc.)
              </p>
              {formData.portfolioLinks.map((link, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    placeholder="https://..."
                    value={link}
                    onChange={(e) => {
                      const newLinks = [...formData.portfolioLinks];
                      newLinks[index] = e.target.value;
                      updateFormData({ portfolioLinks: newLinks });
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const newLinks = formData.portfolioLinks.filter((_, i) => i !== index);
                      updateFormData({ portfolioLinks: newLinks });
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => updateFormData({
                  portfolioLinks: [...formData.portfolioLinks, '']
                })}
              >
                Add Link
              </Button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">🚗 Ready to Dash!</h3>
              <p className="text-muted-foreground mb-4">
                Your profile is complete! Go online to start receiving real-time gig offers.
              </p>
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <p className="text-sm text-orange-800 mb-3">
                  ✅ Profile created successfully<br/>
                  ✅ Trust Score calculated<br/>
                  ✅ Ready to go online as a Gigleter<br/>
                  💰 Rates managed by admin for fair pay<br/>
                  📱 Push notifications enabled
                </p>
                <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
                  <p className="text-sm text-green-800 font-medium">
                    💡 Pro tip: Add Giglet to your home screen for the best experience!
                  </p>
                </div>
              </div>
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
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Creator Setup</h1>
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of 5
            </span>
          </div>
            <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${(currentStep / 5) * 100}%` }}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && "Tell us about yourself"}
              {currentStep === 2 && "Interests & Experience"}
              {currentStep === 3 && "Socials & Languages"}
              {currentStep === 4 && "Portfolio"}
              {currentStep === 5 && "Profile Complete"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderStep()}
          </CardContent>
        </Card>

        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            Back
          </Button>
          {currentStep < 5 ? (
            <Button onClick={handleNext}>Next</Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Creating Profile...' : 'Complete Setup'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}