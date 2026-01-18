import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { doc, setDoc, getDoc, serverTimestamp, collection } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brand, UsageRightsTemplate } from '@/lib/models/types';
import toast from 'react-hot-toast';

interface BrandFormData {
  companyName: string;
  website: string;
  industry: string;
  brandVoice: number;
  defaultUsageRights: {
    termMonths: number;
    channels: {
      paidSocial: boolean;
      organicSocial: boolean;
      website: boolean;
      email: boolean;
      whitelisting: boolean;
    };
    rawFootageIncluded: boolean;
    exclusivity: {
      enabled: boolean;
      category?: string;
      months?: number;
    };
    geo: string[] | "global";
    notes: string;
  };
}

const INDUSTRIES = [
  'Fashion', 'Beauty', 'Fitness', 'Food & Beverage', 'Technology',
  'Gaming', 'Travel', 'Automotive', 'Finance', 'Healthcare',
  'Education', 'Entertainment', 'Retail', 'Sports', 'Other'
];

export default function BrandOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  // Check if brand profile already exists and redirect to dashboard
  useEffect(() => {
    const checkExistingProfile = async () => {
      if (!user) return;

      try {
        const brandDoc = await getDoc(doc(db, 'brands', user.uid));
        if (brandDoc.exists()) {
          router.push('/brand/dashboard');
        }
      } catch (error) {
        console.error('Error checking existing brand profile:', error);
      }
    };

    checkExistingProfile();
  }, [user, router]);

  const [formData, setFormData] = useState<BrandFormData>({
    companyName: '',
    website: '',
    industry: '',
    brandVoice: 5, // 1-10 scale, 5 is balanced
    defaultUsageRights: {
      termMonths: 12,
      channels: {
        paidSocial: true,
        organicSocial: true,
        website: true,
        email: false,
        whitelisting: false,
      },
      rawFootageIncluded: false,
      exclusivity: {
        enabled: false,
      },
      geo: 'global',
      notes: '',
    },
  });

  const handleNext = () => {
    // Validate step 1 fields before proceeding
    if (currentStep === 1) {
      if (!formData.companyName.trim()) {
        toast.error('Please enter your company name');
        return;
      }
      if (!formData.website.trim()) {
        toast.error('Please enter your website');
        return;
      }
      if (!formData.industry) {
        toast.error('Please select an industry');
        return;
      }
    }
    
    if (currentStep < 2) {
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

    // Validate required fields
    if (!formData.companyName.trim()) {
      toast.error('Company name is required');
      return;
    }
    if (!formData.website.trim()) {
      toast.error('Website is required');
      return;
    }
    if (!formData.industry) {
      toast.error('Industry is required');
      return;
    }

    setIsLoading(true);
    try {
      // Create default usage rights template
      const usageRightsTemplate: Omit<UsageRightsTemplate, 'id'> = {
        createdByBrandId: user.uid,
        ...formData.defaultUsageRights,
      };

      const templateRef = doc(collection(db, 'usageRightsTemplates'));
      await setDoc(templateRef, usageRightsTemplate);

      // Create brand profile
      const brandData: Omit<Brand, 'id'> = {
        uid: user.uid,
        companyName: formData.companyName,
        website: formData.website,
        industry: formData.industry,
        brandVoice: {
          casualToPolished: formData.brandVoice,
        },
        defaultUsageRightsId: templateRef.id,
        stripe: {},
        balance: 0, // Initialize balance to 0
        status: 'active',
      };

      await setDoc(doc(db, 'brands', user.uid), brandData);
      toast.success('Company profile created successfully!');
      router.push('/brand/dashboard');
    } catch (error) {
      console.error('Error creating brand profile:', error);
      toast.error('Failed to create profile');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (updates: Partial<BrandFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const updateUsageRights = (updates: Partial<BrandFormData['defaultUsageRights']>) => {
    setFormData(prev => ({
      ...prev,
      defaultUsageRights: { ...prev.defaultUsageRights, ...updates }
    }));
  };

  const updateChannels = (updates: Partial<BrandFormData['defaultUsageRights']['channels']>) => {
    setFormData(prev => ({
      ...prev,
      defaultUsageRights: {
        ...prev.defaultUsageRights,
        channels: { ...prev.defaultUsageRights.channels, ...updates }
      }
    }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-900">Company Name *</label>
              <Input
                placeholder="Your Company Name"
                value={formData.companyName}
                onChange={(e) => updateFormData({ companyName: e.target.value })}
                required
                className="h-12 text-base"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-900">Website *</label>
              <Input
                type="url"
                placeholder="https://yourcompany.com"
                value={formData.website}
                onChange={(e) => updateFormData({ website: e.target.value })}
                required
                className="h-12 text-base"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-900">Industry *</label>
              <Input
                list="industries"
                placeholder="Search or type your industry"
                value={formData.industry}
                onChange={(e) => updateFormData({ industry: e.target.value })}
                required
                className="h-12 text-base"
              />
              <datalist id="industries">
                {INDUSTRIES.map(industry => (
                  <option key={industry} value={industry} />
                ))}
              </datalist>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 py-12">
            <div className="text-center">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-5xl">✨</span>
              </div>
              <h3 className="text-3xl font-bold mb-3 text-gray-900">You're All Set!</h3>
              <p className="text-lg text-gray-600">
                {formData.companyName}
              </p>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome to Giglet</h1>
        </div>
        
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2].map(step => (
              <div key={step} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  currentStep === step 
                    ? 'bg-orange-500 text-white shadow-lg scale-110' 
                    : currentStep > step
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {currentStep > step ? '✓' : step}
                </div>
                {step < 2 && (
                  <div className={`w-16 h-1 mx-1 transition-all ${
                    currentStep > step ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <Card className="shadow-xl border-0">
          <CardContent className="p-8">
            {renderStep()}
          </CardContent>
        </Card>

        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="px-8"
            size="lg"
          >
            ← Back
          </Button>
          {currentStep < 2 ? (
            <Button onClick={handleNext} className="px-8 bg-orange-500 hover:bg-orange-600" size="lg">
              Continue →
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading}
              className="px-8 bg-green-500 hover:bg-green-600" 
              size="lg"
            >
              {isLoading ? 'Setting up...' : 'Complete Setup ✨'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}