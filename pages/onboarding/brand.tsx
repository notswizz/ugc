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
    
    if (currentStep < 3) {
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
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Company Name</label>
              <Input
                placeholder="Your Company Name"
                value={formData.companyName}
                onChange={(e) => updateFormData({ companyName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Website</label>
              <Input
                type="url"
                placeholder="https://yourcompany.com"
                value={formData.website}
                onChange={(e) => updateFormData({ website: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Industry</label>
              <select
                className="w-full p-3 border rounded-md"
                value={formData.industry}
                onChange={(e) => updateFormData({ industry: e.target.value })}
                required
              >
                <option value="">Select an industry</option>
                {INDUSTRIES.map(industry => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Brand Voice</label>
              <p className="text-sm text-muted-foreground mb-3">
                How polished vs casual is your brand voice? (1 = Very Casual, 10 = Very Polished)
              </p>
              <input
                type="range"
                min="1"
                max="10"
                value={formData.brandVoice}
                onChange={(e) => updateFormData({ brandVoice: Number(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Casual</span>
                <span>Balanced</span>
                <span>Polished</span>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Usage Rights Term</label>
              <select
                className="w-full p-3 border rounded-md"
                value={formData.defaultUsageRights.termMonths}
                onChange={(e) => updateUsageRights({ termMonths: Number(e.target.value) })}
              >
                <option value={6}>6 months</option>
                <option value={12}>12 months</option>
                <option value={24}>24 months</option>
                <option value={36}>36 months</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Allowed Channels</label>
              <div className="space-y-2">
                {Object.entries(formData.defaultUsageRights.channels).map(([channel, enabled]) => (
                  <label key={channel} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => updateChannels({ [channel]: e.target.checked })}
                    />
                    <span className="text-sm capitalize">
                      {channel.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.defaultUsageRights.rawFootageIncluded}
                  onChange={(e) => updateUsageRights({ rawFootageIncluded: e.target.checked })}
                />
                <span className="text-sm">Include raw footage rights</span>
              </label>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.defaultUsageRights.exclusivity.enabled}
                  onChange={(e) => updateUsageRights({
                    exclusivity: {
                      ...formData.defaultUsageRights.exclusivity,
                      enabled: e.target.checked
                    }
                  })}
                />
                <span className="text-sm">Require exclusivity</span>
              </label>
            </div>

            {formData.defaultUsageRights.exclusivity.enabled && (
              <div className="ml-6 space-y-2">
                <Input
                  placeholder="Category (optional)"
                  value={formData.defaultUsageRights.exclusivity.category || ''}
                  onChange={(e) => updateUsageRights({
                    exclusivity: {
                      ...formData.defaultUsageRights.exclusivity,
                      category: e.target.value
                    }
                  })}
                />
                <select
                  className="w-full p-3 border rounded-md"
                  value={formData.defaultUsageRights.exclusivity.months || 12}
                  onChange={(e) => updateUsageRights({
                    exclusivity: {
                      ...formData.defaultUsageRights.exclusivity,
                      months: Number(e.target.value)
                    }
                  })}
                >
                  <option value={6}>6 months</option>
                  <option value={12}>12 months</option>
                  <option value={24}>24 months</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Geographic Rights</label>
              <select
                className="w-full p-3 border rounded-md"
                value={formData.defaultUsageRights.geo}
                onChange={(e) => updateUsageRights({ geo: e.target.value as string[] | "global" })}
              >
                <option value="global">Global</option>
                <option value="us">United States</option>
                <option value="eu">European Union</option>
                <option value="na">North America</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Additional Notes</label>
              <textarea
                className="w-full p-3 border rounded-md min-h-[80px]"
                placeholder="Any special terms or notes about usage rights..."
                value={formData.defaultUsageRights.notes}
                onChange={(e) => updateUsageRights({ notes: e.target.value })}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Payment Setup</h3>
              <p className="text-muted-foreground mb-4">
                You'll set up billing when you create your first campaign
              </p>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm">
                  ✅ Company profile configured<br/>
                  ✅ Usage rights template created<br/>
                  💳 Billing setup will happen when you pay for your first campaign
                </p>
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
            <h1 className="text-2xl font-bold">Brand Setup</h1>
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of 3
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && "Company Information"}
              {currentStep === 2 && "Default Usage Rights"}
              {currentStep === 3 && "Ready to Launch"}
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
          {currentStep < 3 ? (
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