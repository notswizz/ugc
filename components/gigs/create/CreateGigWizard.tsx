'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/client';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import BasicDetailsStep from './BasicDetailsStep';
import PayoutStep from './PayoutStep';
import BriefStep from './BriefStep';
import { DEFAULT_GIG_DATA, validateStep1, validateStep2 } from '@/lib/gigs/create-gig-schema';
import type { GigFormData, GigBrief, FollowerRange } from '@/lib/gigs/create-gig-schema';

export default function CreateGigWizard() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [gigData, setGigData] = useState<GigFormData>(DEFAULT_GIG_DATA);
  const [submitting, setSubmitting] = useState(false);
  const [availableCreatorsCount, setAvailableCreatorsCount] = useState<number | null>(null);
  const [loadingCreatorCount, setLoadingCreatorCount] = useState(false);

  // Count available creators based on filters
  useEffect(() => {
    if (currentStep === 2) {
      countAvailableCreators();
    }
  }, [currentStep, gigData.trustScoreMin, gigData.minFollowers, gigData.platform, gigData.visibility, gigData.squadIds]);

  const countAvailableCreators = async () => {
    setLoadingCreatorCount(true);
    try {
      const creatorsQuery = query(collection(db, 'creators'));
      const creatorsSnapshot = await getDocs(creatorsQuery);

      let count = 0;
      for (const creatorDoc of creatorsSnapshot.docs) {
        const creator = creatorDoc.data();
        let eligible = true;

        // Trust score filter
        const trustScoreMin = parseInt(gigData.trustScoreMin) || 0;
        if (trustScoreMin > 0 && (creator.trustScore || 0) < trustScoreMin) {
          eligible = false;
        }

        // Follower count filter (only if platform selected and not dynamic payout)
        if (eligible && gigData.platform && gigData.payoutType !== 'dynamic') {
          const minFollowers = parseInt(gigData.minFollowers) || 0;
          if (minFollowers > 0) {
            const creatorFollowers = creator.followingCount?.[gigData.platform] || 0;
            if (creatorFollowers < minFollowers) {
              eligible = false;
            }
          }
        }

        if (eligible) {
          count++;
        }
      }

      setAvailableCreatorsCount(count);
    } catch (error) {
      console.error('Error counting creators:', error);
      setAvailableCreatorsCount(null);
    } finally {
      setLoadingCreatorCount(false);
    }
  };

  const updateGigData = (updates: Partial<GigFormData>) => {
    setGigData((prev) => ({ ...prev, ...updates }));
  };

  const updateBrief = (updates: Partial<GigBrief>) => {
    setGigData((prev) => ({
      ...prev,
      brief: { ...prev.brief, ...updates }
    }));
  };

  const goToStep = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step);
      return;
    }

    // Validate current step before proceeding
    if (currentStep === 1) {
      const error = validateStep1(gigData);
      if (error) {
        toast.error(error);
        return;
      }
    } else if (currentStep === 2) {
      const error = validateStep2(gigData);
      if (error) {
        toast.error(error);
        return;
      }
    }

    setCurrentStep(step);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please sign in');
      return;
    }

    // Validate all steps
    const step1Error = validateStep1(gigData);
    if (step1Error) {
      toast.error(step1Error);
      setCurrentStep(1);
      return;
    }

    const step2Error = validateStep2(gigData);
    if (step2Error) {
      toast.error(step2Error);
      setCurrentStep(2);
      return;
    }

    setSubmitting(true);
    try {
      // Get the brand's default usage rights template
      const brandDoc = await getDoc(doc(db, 'users', user.uid));
      const brandData = brandDoc.exists() ? brandDoc.data() : {};
      const usageRightsTemplateId = brandData.defaultUsageRightsId || '';

      // Calculate deadline
      const deadlineAt = new Date();
      deadlineAt.setHours(deadlineAt.getHours() + gigData.deadlineHours);

      // Build the gig document
      const gigDoc: any = {
        brandId: user.uid,
        title: gigData.title,
        platform: gigData.platform,
        contentType: gigData.contentType,
        instagramFormat: gigData.platform === 'instagram' ? gigData.instagramFormat : null,
        description: gigData.description,
        productDescription: gigData.productDescription || '',
        primaryThing: gigData.primaryThing,
        secondaryTags: gigData.secondaryTags,
        payoutType: gigData.payoutType,
        basePayout: gigData.payoutType === 'fixed' ? parseFloat(gigData.basePayout) || 0 : 0,
        followerRanges: gigData.payoutType === 'dynamic' ? gigData.followerRanges : [],
        bonusPool: parseFloat(gigData.bonusPool) || 0,
        deadlineHours: gigData.deadlineHours,
        deadlineAt,
        visibility: gigData.visibility,
        targetTags: gigData.targetTags,
        squadIds: gigData.visibility === 'squad' ? gigData.squadIds : [],
        trustScoreMin: parseInt(gigData.trustScoreMin) || 0,
        minFollowers: parseInt(gigData.minFollowers) || 0,
        minFollowersPlatform: gigData.platform,
        experienceRequirements: gigData.experienceRequirements,
        acceptedSubmissionsLimit: gigData.acceptedSubmissionsLimit || 1,
        productInVideoRequired: gigData.productInVideoRequired,
        reimbursementMode: gigData.productInVideoRequired ? gigData.reimbursementMode : null,
        reimbursementCap: gigData.productInVideoRequired && gigData.reimbursementMode === 'reimbursement'
          ? parseFloat(gigData.reimbursementCap) || 0
          : 0,
        purchaseWindowHours: gigData.purchaseWindowHours,
        deliverables: {
          videos: gigData.contentType === 'video' ? 1 : 0,
          photos: gigData.contentType === 'photo' ? 1 : 0,
          raw: false,
          notes: '',
        },
        brief: {
          hooks: gigData.brief.hooks.filter(h => h.trim()),
          angles: gigData.brief.angles.filter(a => a.trim()),
          talkingPoints: gigData.brief.talkingPoints.filter(t => t.trim()),
          do: gigData.brief.do.filter(d => d.trim()),
          dont: gigData.brief.dont.filter(d => d.trim()),
          references: [],
          brandAssets: {
            logos: [],
            productPhotos: [],
            docs: [],
          },
        },
        usageRightsTemplateId,
        aiComplianceRequired: true,
        autoApproveWindowHours: 48,
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Create the gig
      const gigRef = doc(collection(db, 'gigs'));
      await setDoc(gigRef, gigDoc);

      toast.success('Gig created successfully!');
      router.push('/brand/gigs');
    } catch (error: any) {
      console.error('Error creating gig:', error);
      toast.error(error.message || 'Failed to create gig');
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: 'Basic Details' },
    { number: 2, title: 'Payout & Requirements' },
    { number: 3, title: 'Brief' },
  ];

  return (
    <div className="max-w-2xl mx-auto pb-8">
      <Card className="border-2">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <span className="text-3xl">📝</span> Create New Gig
          </CardTitle>

          {/* Progress Stepper */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              {steps.map((step, idx) => (
                <div key={step.number} className="flex items-center flex-1">
                  <button
                    type="button"
                    onClick={() => goToStep(step.number)}
                    className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm transition-all ${
                      currentStep === step.number
                        ? 'bg-orange-500 text-white scale-110 shadow-lg'
                        : currentStep > step.number
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {currentStep > step.number ? '✓' : step.number}
                  </button>
                  <span className={`ml-2 text-sm font-medium hidden sm:block ${
                    currentStep === step.number ? 'text-orange-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                  {idx < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-3 rounded ${
                      currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Step Content */}
          {currentStep === 1 && (
            <BasicDetailsStep gigData={gigData} updateGigData={updateGigData} />
          )}

          {currentStep === 2 && (
            <PayoutStep
              gigData={gigData}
              updateGigData={updateGigData}
              availableCreatorsCount={availableCreatorsCount}
              loadingCreatorCount={loadingCreatorCount}
            />
          )}

          {currentStep === 3 && (
            <BriefStep gigData={gigData} updateBrief={updateBrief} />
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="h-12 px-6"
              >
                ← Back
              </Button>
            ) : (
              <div />
            )}

            {currentStep < 3 ? (
              <Button
                type="button"
                onClick={() => goToStep(currentStep + 1)}
                className="h-12 px-8 bg-orange-500 hover:bg-orange-600 text-white"
              >
                Next →
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="h-12 px-8 bg-green-500 hover:bg-green-600 text-white"
              >
                {submitting ? 'Creating...' : '🚀 Create Gig'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
