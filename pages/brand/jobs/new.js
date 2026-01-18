import { useState, useEffect, useState as useStateHook, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { collection, addDoc, serverTimestamp, query, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import VisibilityBadge from '@/components/jobs/VisibilityBadge';
import { THINGS, EXPERIENCE_TYPES } from '@/lib/things/constants';
import toast from 'react-hot-toast';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function NewJob() {
  const router = useRouter();
  const { user, appUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingReuse, setIsLoadingReuse] = useState(false);

  useEffect(() => {
    if (appUser && appUser.role !== 'brand') {
      router.push('/brand/dashboard');
    }
  }, [appUser, router]);

  // Load existing job data if reuse parameter is present
  useEffect(() => {
    const loadReuseJob = async () => {
      const reuseJobId = router.query.reuse;
      if (!reuseJobId || typeof reuseJobId !== 'string' || !user) return;

      setIsLoadingReuse(true);
      try {
        const jobDoc = await getDoc(doc(db, 'jobs', reuseJobId));
        if (!jobDoc.exists()) {
          toast.error('Campaign not found');
          router.replace('/brand/jobs/new');
          return;
        }

        const existingJob = jobDoc.data();
        
        // Check if user owns this job
        if (existingJob.brandId !== user.uid) {
          toast.error('You do not have permission to reuse this campaign');
          router.replace('/brand/jobs/new');
          return;
        }

        // Calculate deadline hours from deadlineAt
        const deadlineAt = existingJob.deadlineAt?.toDate ? existingJob.deadlineAt.toDate() : new Date(existingJob.deadlineAt);
        const now = new Date();
        const hoursDiff = Math.max(24, Math.round((deadlineAt.getTime() - now.getTime()) / (1000 * 60 * 60)));

        // Pre-fill form with existing job data (but clear title)
        setJobData({
          title: '', // Clear title so they can enter a new one
          description: existingJob.description || '',
          productDescription: existingJob.productDescription || '',
          primaryThing: existingJob.primaryThing || '',
          secondaryTags: existingJob.secondaryTags || [],
          payoutType: existingJob.payoutType || 'fixed',
          basePayout: existingJob.basePayout?.toString() || '',
          followerRanges: existingJob.followerRanges && existingJob.followerRanges.length > 0 
            ? existingJob.followerRanges 
            : [{ min: 0, max: null, payout: 0 }],
          bonusPool: existingJob.bonusPool?.toString() || '',
          deadlineHours: hoursDiff,
          visibility: existingJob.visibility || 'open',
          targetTags: existingJob.targetTags || [],
          squadIds: existingJob.squadIds || [],
          trustScoreMin: existingJob.trustScoreMin?.toString() || '',
          experienceRequirements: existingJob.experienceRequirements || [],
          acceptedSubmissionsLimit: existingJob.acceptedSubmissionsLimit || 1,
          productInVideoRequired: existingJob.productInVideoRequired || false,
          reimbursementMode: existingJob.reimbursementMode || 'reimbursement',
          reimbursementCap: existingJob.reimbursementCap?.toString() || '',
          purchaseWindowHours: existingJob.purchaseWindowHours || 24,
          deliverables: {
            videos: existingJob.deliverables?.videos || 0,
            photos: existingJob.deliverables?.photos || 0,
            raw: existingJob.deliverables?.raw || false,
            notes: existingJob.deliverables?.notes || '',
          },
          brief: existingJob.brief || {
            hooks: [''],
            angles: [''],
            talkingPoints: [''],
            do: [''],
            dont: [''],
            references: [''],
          },
          usageRightsTemplateId: existingJob.usageRightsTemplateId || '',
          aiComplianceRequired: existingJob.aiComplianceRequired || false,
          autoApproveWindowHours: existingJob.autoApproveWindowHours || 0,
        });

        toast.success('Campaign data loaded! Please enter a new title.');
      } catch (error) {
        console.error('Error loading campaign to reuse:', error);
        toast.error('Failed to load campaign data');
      } finally {
        setIsLoadingReuse(false);
      }
    };

    if (router.isReady && router.query.reuse) {
      loadReuseJob();
    }
  }, [router.isReady, router.query.reuse, user]);

  const [jobData, setJobData] = useState({
    title: '',
    platform: '', // TikTok, Instagram, YouTube, etc.
    contentType: '', // 'video' or 'photo'
    description: '',
    productDescription: '', // Specific product description for AI evaluation
    primaryThing: '',
    secondaryTags: [],
    payoutType: 'fixed', // 'fixed' or 'dynamic'
    basePayout: '',
    followerRanges: [{ min: 0, max: null, payout: 0 }], // Array of { min: number, max: number | null, payout: number }
    bonusPool: '',
    deadlineHours: 24,
    visibility: 'open',
    targetTags: [],
    squadIds: [], // Selected squad IDs for squad visibility
    trustScoreMin: '',
    experienceRequirements: [],
    acceptedSubmissionsLimit: 1, // Default to 1 (standard single creator)
    productInVideoRequired: false,
    reimbursementMode: 'reimbursement',
    reimbursementCap: '',
    purchaseWindowHours: 24,
    deliverables: {
      videos: 0,
      photos: 0,
      raw: false,
      notes: '',
    },
    brief: {
      hooks: [''],
      angles: [''],
      talkingPoints: [''],
      do: [''],
      dont: [''],
      references: [''],
    },
    usageRightsTemplateId: '',
    aiComplianceRequired: false,
    autoApproveWindowHours: 0,
  });

  // State for category search
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryDropdownRef = useRef(null);

  // Filter categories based on search
  const filteredCategories = THINGS.filter(thing =>
    thing.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
        setShowCategoryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateJobData = (updates) => {
    setJobData(prev => ({ ...prev, ...updates }));
  };

  const updateDeliverables = (updates) => {
    setJobData(prev => ({
      ...prev,
      deliverables: { ...prev.deliverables, ...updates }
    }));
  };

  const updateBrief = (updates) => {
    setJobData(prev => ({
      ...prev,
      brief: { ...prev.brief, ...updates }
    }));
  };

  const addFollowerRange = () => {
    setJobData(prev => {
      const ranges = prev.followerRanges || [];
      const lastRange = ranges[ranges.length - 1];
      // New range's min should be the previous range's max (or 0 if no previous range)
      const newMin = lastRange?.max !== null && lastRange?.max !== undefined ? lastRange.max : 0;
      return {
        ...prev,
        followerRanges: [...ranges, { min: newMin, max: null, payout: 0 }]
      };
    });
  };

  const updateFollowerRange = (index, updates) => {
    setJobData(prev => {
      const ranges = prev.followerRanges || [];
      const updatedRanges = ranges.map((range, i) => {
        if (i === index) {
          return { ...range, ...updates };
        }
        // If previous range's max was updated, update this range's min
        if (i === index + 1 && updates.max !== undefined) {
          return { ...range, min: updates.max };
        }
        return range;
      });
      
      return {
        ...prev,
        followerRanges: updatedRanges
      };
    });
  };

  const removeFollowerRange = (index) => {
    setJobData(prev => {
      const ranges = prev.followerRanges.filter((_, i) => i !== index);
      // After removing, update min values to ensure they're linked properly
      const updatedRanges = ranges.map((range, i) => {
        if (i === 0) {
          // First range can have any min
          return range;
        }
        // Subsequent ranges: min should be previous range's max
        const prevRange = ranges[i - 1];
        return {
          ...range,
          min: prevRange?.max !== null && prevRange?.max !== undefined ? prevRange.max : range.min
        };
      });
      
      return {
        ...prev,
        followerRanges: updatedRanges
      };
    });
  };

  const toggleSecondaryTag = (tag) => {
    setJobData(prev => ({
      ...prev,
      secondaryTags: prev.secondaryTags.includes(tag)
        ? prev.secondaryTags.filter(t => t !== tag)
        : [...prev.secondaryTags, tag]
    }));
  };

  const toggleExperience = (exp) => {
    setJobData(prev => ({
      ...prev,
      experienceRequirements: prev.experienceRequirements.includes(exp)
        ? prev.experienceRequirements.filter(e => e !== exp)
        : [...prev.experienceRequirements, exp]
    }));
  };

  const handleNext = () => {
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
    if (!user || !appUser) return;
    
    setIsSubmitting(true);
    try {
      // Calculate deadline date
      const deadlineAt = new Date();
      deadlineAt.setHours(deadlineAt.getHours() + (parseInt(jobData.deadlineHours) || 24));
      
      // Prepare job document (only include fields that have values)
      const jobDoc = {
        brandId: user.uid,
        title: jobData.title,
        description: jobData.description || '',
        productDescription: jobData.productDescription || '', // Product description for AI evaluation
        primaryThing: jobData.primaryThing,
        secondaryTags: jobData.secondaryTags || [],
        payoutType: jobData.payoutType || 'fixed',
        basePayout: jobData.payoutType === 'fixed' ? (parseFloat(jobData.basePayout) || 0) : 0,
        deadlineAt: deadlineAt,
        visibility: jobData.visibility || 'open',
        targetTags: jobData.targetTags || [],
        experienceRequirements: jobData.experienceRequirements || [],
        acceptedSubmissionsLimit: parseInt(jobData.acceptedSubmissionsLimit) || 1,
        productInVideoRequired: jobData.productInVideoRequired || false,
        deliverables: {
          videos: jobData.deliverables?.videos || 0,
          photos: jobData.deliverables?.photos || 0,
          raw: jobData.deliverables?.raw || false,
          notes: jobData.deliverables?.notes || '',
        },
        usageRightsTemplateId: jobData.usageRightsTemplateId || '',
        usageRightsSnapshot: {}, // Placeholder - should fetch from template
        aiComplianceRequired: jobData.aiComplianceRequired || false,
        autoApproveWindowHours: jobData.autoApproveWindowHours || 0,
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Only add followerRanges if payoutType is dynamic (Firestore doesn't allow undefined)
      if (jobData.payoutType === 'dynamic' && jobData.followerRanges && jobData.followerRanges.length > 0) {
        jobDoc.followerRanges = jobData.followerRanges;
      }

      // Add squad IDs if visibility is squad
      if (jobData.visibility === 'squad' && jobData.squadIds && jobData.squadIds.length > 0) {
        jobDoc.squadIds = jobData.squadIds;
      }

      // Only add optional fields if they have values (Firestore doesn't allow undefined)
      if (jobData.bonusPool && parseFloat(jobData.bonusPool) > 0) {
        jobDoc.bonusPool = parseFloat(jobData.bonusPool);
      }

      if (jobData.trustScoreMin) {
        jobDoc.trustScoreMin = parseInt(jobData.trustScoreMin);
      }

      // Only add reimbursement fields if product in video is required
      if (jobData.productInVideoRequired) {
        jobDoc.reimbursementMode = jobData.reimbursementMode || 'reimbursement';
        
        if (jobData.reimbursementMode === 'reimbursement') {
          if (jobData.reimbursementCap && parseFloat(jobData.reimbursementCap) > 0) {
            jobDoc.reimbursementCap = parseFloat(jobData.reimbursementCap);
          }
          if (jobData.purchaseWindowHours) {
            jobDoc.purchaseWindowHours = parseInt(jobData.purchaseWindowHours) || 24;
          }
        }
      }

      // Add brief if provided
      if (jobData.brief) {
        const briefData = {
          hooks: jobData.brief.hooks?.filter((h) => h.trim()) || [],
          angles: jobData.brief.angles?.filter((a) => a.trim()) || [],
          talkingPoints: jobData.brief.talkingPoints?.filter((tp) => tp.trim()) || [],
          do: jobData.brief.do?.filter((d) => d.trim()) || [],
          dont: jobData.brief.dont?.filter((d) => d.trim()) || [],
          references: jobData.brief.references?.filter((r) => r.trim()) || [],
        };
        
        // Only add brief if at least one field has content
        if (briefData.hooks.length > 0 || briefData.angles.length > 0 || 
            briefData.talkingPoints.length > 0 || briefData.do.length > 0 || 
            briefData.dont.length > 0 || briefData.references.length > 0) {
          jobDoc.brief = briefData;
        }
      }

      // Save to Firestore
      const docRef = await addDoc(collection(db, 'jobs'), jobDoc);
      
      console.log('Job created with ID:', docRef.id);
      toast.success('Campaign created successfully!');
      router.push('/brand/dashboard');

    } catch (error) {
      console.error('Error creating job:', error);
      toast.error('Failed to create campaign: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Campaign Title *</label>
              <Input
                placeholder="e.g., Authentic Coffee Shop Review"
                value={jobData.title}
                onChange={(e) => updateJobData({ title: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Platform *</label>
              <p className="text-sm text-muted-foreground mb-3">
                Where will this content be posted?
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { id: 'tiktok', name: 'TikTok', icon: '🎵' },
                  { id: 'instagram', name: 'Instagram', icon: '📸' },
                  { id: 'youtube', name: 'YouTube', icon: '▶️' },
                  { id: 'other', name: 'Other', icon: '🌐' },
                ].map(platform => (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => updateJobData({ platform: platform.id })}
                    className={`p-4 rounded-lg border-2 text-center transition-all ${
                      jobData.platform === platform.id
                        ? 'bg-orange-50 border-orange-500 shadow-sm'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-3xl mb-2">{platform.icon}</div>
                    <div className="text-sm font-semibold">{platform.name}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Content Type *</label>
              <p className="text-sm text-muted-foreground mb-3">
                What type of content do you need?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateJobData({ contentType: 'video' })}
                  className={`p-6 rounded-lg border-2 text-center transition-all ${
                    jobData.contentType === 'video'
                      ? 'bg-blue-50 border-blue-500 shadow-sm'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-4xl mb-2">🎥</div>
                  <div className="text-base font-semibold mb-1">Video</div>
                  <div className="text-xs text-gray-500">Short-form or long-form video content</div>
                </button>
                <button
                  type="button"
                  onClick={() => updateJobData({ contentType: 'photo' })}
                  className={`p-6 rounded-lg border-2 text-center transition-all ${
                    jobData.contentType === 'photo'
                      ? 'bg-purple-50 border-purple-500 shadow-sm'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-4xl mb-2">📷</div>
                  <div className="text-base font-semibold mb-1">Photo</div>
                  <div className="text-xs text-gray-500">Still images and photography</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Primary Thing/Category *</label>
              <p className="text-sm text-muted-foreground mb-3">
                Search and select the main category for this campaign
              </p>
              <div className="relative" ref={categoryDropdownRef}>
                <Input
                  placeholder="Search categories (e.g., Food, Beauty, Tech)..."
                  value={categorySearch}
                  onChange={(e) => {
                    setCategorySearch(e.target.value);
                    setShowCategoryDropdown(true);
                  }}
                  onFocus={() => setShowCategoryDropdown(true)}
                  className="pr-10"
                />
                {jobData.primaryThing && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    <span>{THINGS.find(t => t.id === jobData.primaryThing)?.icon}</span>
                    <button
                      type="button"
                      onClick={() => {
                        updateJobData({ primaryThing: '' });
                        setCategorySearch('');
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                )}
                
                {/* Dropdown */}
                {showCategoryDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCategories.length > 0 ? (
                      filteredCategories.map(thing => (
                        <button
                          key={thing.id}
                          type="button"
                          onClick={() => {
                            updateJobData({ primaryThing: thing.id });
                            setCategorySearch(thing.name);
                            setShowCategoryDropdown(false);
                          }}
                          className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-2 border-b last:border-b-0 ${
                            jobData.primaryThing === thing.id ? 'bg-green-50' : ''
                          }`}
                        >
                          <span className="text-xl">{thing.icon}</span>
                          <span className="font-medium">{thing.name}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-gray-500 text-sm">
                        No categories found
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Selected category display */}
              {jobData.primaryThing && (
                <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  <span>{THINGS.find(t => t.id === jobData.primaryThing)?.icon}</span>
                  <span>{THINGS.find(t => t.id === jobData.primaryThing)?.name}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Campaign Description</label>
              <textarea
                className="w-full p-3 border rounded-md min-h-[100px]"
                placeholder="Describe what you want the creator to do..."
                value={jobData.description}
                onChange={(e) => updateJobData({ description: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Product Description (for AI Evaluation)</label>
              <textarea
                className="w-full p-3 border rounded-md min-h-[80px]"
                placeholder="Describe exactly what the product is (e.g., 'Nike Air Max running shoes in blue and white', 'iPhone 15 Pro Max 256GB'). This helps AI accurately evaluate if the product is shown in the video."
                value={jobData.productDescription}
                onChange={(e) => updateJobData({ productDescription: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">Be specific - include product name, model, colors, size, or other distinguishing features.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Visibility</label>
              <p className="text-sm text-muted-foreground mb-3">
                Who can see and accept this campaign?
              </p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => updateJobData({ visibility: 'open' })}
                  className={`w-full p-3 rounded-lg border text-left ${
                    jobData.visibility === 'open'
                      ? 'bg-green-50 border-green-300'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <VisibilityBadge visibility="open" />
                    <span className="text-sm">Any creator who meets requirements</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => updateJobData({ visibility: 'squad' })}
                  className={`w-full p-3 rounded-lg border text-left ${
                    jobData.visibility === 'squad'
                      ? 'bg-purple-50 border-purple-300'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <VisibilityBadge visibility="squad" />
                    <span className="text-sm">Only creators in eligible squads</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => updateJobData({ visibility: 'invite' })}
                  className={`w-full p-3 rounded-lg border text-left ${
                    jobData.visibility === 'invite'
                      ? 'bg-orange-50 border-orange-300'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <VisibilityBadge visibility="invite" />
                    <span className="text-sm">Only invited creators</span>
                  </div>
                </button>
              </div>
              
              {/* Squad Selection (when visibility is 'squad') */}
              {jobData.visibility === 'squad' && (
                <SquadSelector
                  selectedSquadIds={jobData.squadIds || []}
                  onSelectionChange={(squadIds) => updateJobData({ squadIds })}
                />
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Payout Type *</label>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => updateJobData({ payoutType: 'fixed' })}
                  className={`flex-1 px-4 py-2 rounded-lg border text-sm ${
                    jobData.payoutType === 'fixed'
                      ? 'bg-blue-50 border-blue-300 text-blue-800'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Fixed Payout
                </button>
                <button
                  type="button"
                  onClick={() => updateJobData({ payoutType: 'dynamic' })}
                  className={`flex-1 px-4 py-2 rounded-lg border text-sm ${
                    jobData.payoutType === 'dynamic'
                      ? 'bg-blue-50 border-blue-300 text-blue-800'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Dynamic by Followers
                </button>
              </div>

              {jobData.payoutType === 'fixed' ? (
                <div>
                  <label className="block text-sm font-medium mb-2">Base Payout ($) *</label>
                  <Input
                    type="number"
                    placeholder="150"
                    value={jobData.basePayout}
                    onChange={(e) => updateJobData({ basePayout: e.target.value })}
                    required
                    min="1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Fixed amount the creator will earn upon completion
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-2">Follower Count Ranges & Payouts *</label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Set different payouts based on creator follower counts. Ranges should not overlap.
                  </p>
                  
                  <div className="space-y-3">
                    {jobData.followerRanges.map((range, index) => {
                      const isLastRange = index === jobData.followerRanges.length - 1;
                      const prevRange = index > 0 ? jobData.followerRanges[index - 1] : null;
                      
                      return (
                        <div key={index} className="p-3 border rounded-lg bg-gray-50">
                          <div className="flex items-end gap-2 mb-2">
                            <div className="flex-1">
                              <label className="text-xs text-gray-600 mb-1 block">Min Followers</label>
                              <Input
                                type="number"
                                placeholder={prevRange?.max || "0"}
                                value={range.min || ''}
                                onChange={(e) => {
                                  const newMin = parseInt(e.target.value) || 0;
                                  updateFollowerRange(index, { min: newMin });
                                }}
                                min={prevRange?.max || 0}
                                className="text-sm"
                                disabled={prevRange !== null}
                              />
                              {prevRange && (
                                <p className="text-[10px] text-gray-500 mt-0.5">Auto-set from previous range</p>
                              )}
                            </div>
                            <div className="flex-1">
                              <label className="text-xs text-gray-600 mb-1 block">Max Followers</label>
                              <Input
                                type="number"
                                placeholder={isLastRange ? "Leave empty for ∞" : "1000"}
                                value={range.max || ''}
                                onChange={(e) => {
                                  const newMax = e.target.value ? parseInt(e.target.value) : null;
                                  updateFollowerRange(index, { max: newMax });
                                }}
                                min={range.min || 0}
                                className="text-sm"
                              />
                              <p className="text-[10px] text-gray-500 mt-0.5">
                                {isLastRange ? 'Leave empty for "and above"' : 'Sets min of next range'}
                              </p>
                            </div>
                            <div className="flex-1">
                              <label className="text-xs text-gray-600 mb-1 block">Payout ($)</label>
                              <Input
                                type="number"
                                placeholder="25"
                                value={range.payout || ''}
                                onChange={(e) => updateFollowerRange(index, { payout: parseFloat(e.target.value) || 0 })}
                                min="0"
                                step="0.01"
                                className="text-sm"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFollowerRange(index)}
                              className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                              disabled={jobData.followerRanges.length === 1}
                            >
                              ✕
                            </button>
                          </div>
                          <div className="text-xs text-gray-600">
                            {range.min} - {range.max === null ? '∞' : range.max} followers: ${range.payout || 0}
                          </div>
                        </div>
                      );
                    })}
                    
                    <button
                      type="button"
                      onClick={addFollowerRange}
                      className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 hover:text-gray-700"
                    >
                      + Add Range
                    </button>
                  </div>
                  
                  {jobData.followerRanges.length === 0 && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                      Please add at least one follower range with payout.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Bonus Pool ($)</label>
              <Input
                type="number"
                placeholder="100"
                value={jobData.bonusPool}
                onChange={(e) => updateJobData({ bonusPool: e.target.value })}
                min="0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Optional bonus pool for high-quality submissions
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Accepted Submissions Limit *</label>
              <Input
                type="number"
                placeholder="1"
                value={jobData.acceptedSubmissionsLimit || 1}
                onChange={(e) => updateJobData({ acceptedSubmissionsLimit: parseInt(e.target.value) || 1 })}
                required
                min="1"
                max="100"
              />
              <p className="text-xs text-muted-foreground mt-1">
                How many accepted submissions do you need? (Each creator gets paid individually when their submission is approved)
              </p>
              <div className="mt-2 space-y-1 text-xs text-gray-600">
                <div>• 1 = Standard campaign (single creator)</div>
                <div>• 2-10 = Multiple creators, all get paid when approved</div>
                <div>• More = Scale for volume needs</div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Trust Score Minimum</label>
              <Input
                type="number"
                placeholder="30"
                value={jobData.trustScoreMin}
                onChange={(e) => updateJobData({ trustScoreMin: e.target.value })}
                min="0"
                max="100"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minimum Trust Score required to accept (0-100)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Experience Requirements</label>
              <p className="text-sm text-muted-foreground mb-3">
                Select required experience types
              </p>
              <div className="flex flex-wrap gap-2">
                {EXPERIENCE_TYPES.map(exp => (
                  <button
                    key={exp}
                    type="button"
                    onClick={() => toggleExperience(exp)}
                    className={`px-3 py-1 rounded-full text-sm border ${
                      jobData.experienceRequirements.includes(exp)
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
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={jobData.productInVideoRequired}
                  onChange={(e) => updateJobData({ productInVideoRequired: e.target.checked })}
                />
                <span className="text-sm font-medium">Product must appear in video</span>
              </label>
              {jobData.productInVideoRequired && (
                <div className="mt-3 space-y-3 pl-6 border-l-2 border-blue-200">
                  <div>
                    <label className="block text-sm font-medium mb-2">Reimbursement Mode</label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={jobData.reimbursementMode}
                      onChange={(e) => updateJobData({ reimbursementMode: e.target.value })}
                    >
                      <option value="reimbursement">Reimbursement (creator buys)</option>
                      <option value="shipping">Shipping (we ship to creator)</option>
                    </select>
                  </div>
                  {jobData.reimbursementMode === 'reimbursement' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-2">Reimbursement Cap ($)</label>
                        <Input
                          type="number"
                          placeholder="50"
                          value={jobData.reimbursementCap}
                          onChange={(e) => updateJobData({ reimbursementCap: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Purchase Window (hours)</label>
                        <Input
                          type="number"
                          placeholder="24"
                          value={jobData.purchaseWindowHours}
                          onChange={(e) => updateJobData({ purchaseWindowHours: e.target.value })}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Deadline</label>
              <select
                className="w-full p-3 border rounded-md"
                value={jobData.deadlineHours}
                onChange={(e) => updateJobData({ deadlineHours: Number(e.target.value) })}
              >
                <option value={24}>24 hours</option>
                <option value={48}>48 hours</option>
                <option value={72}>3 days</option>
                <option value={168}>1 week</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-4">Deliverables Required</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm mb-2">Videos</label>
                  <select
                    className="w-full p-2 border rounded"
                    value={jobData.deliverables.videos}
                    onChange={(e) => updateDeliverables({ videos: Number(e.target.value) })}
                  >
                    <option value={0}>None</option>
                    <option value={1}>1 video</option>
                    <option value={2}>2 videos</option>
                    <option value={3}>3 videos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2">Photos</label>
                  <select
                    className="w-full p-2 border rounded"
                    value={jobData.deliverables.photos}
                    onChange={(e) => updateDeliverables({ photos: Number(e.target.value) })}
                  >
                    <option value={0}>None</option>
                    <option value={1}>1-2 photos</option>
                    <option value={3}>3-5 photos</option>
                    <option value={6}>6+ photos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2">Raw Footage</label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={jobData.deliverables.raw}
                      onChange={(e) => updateDeliverables({ raw: e.target.checked })}
                    />
                    <span className="text-sm">Include raw/unedited footage</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Creative Brief (Optional)</label>
              <p className="text-sm text-muted-foreground mb-4">
                Help creators understand your vision and brand guidelines
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Opening Hooks</label>
                <textarea
                  className="w-full p-3 border rounded-md min-h-[80px]"
                  placeholder="Suggest ways creators can start their content..."
                  value={jobData.brief.hooks.join('\n')}
                  onChange={(e) => updateBrief({
                    hooks: e.target.value.split('\n').filter(line => line.trim())
                  })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Story Angles</label>
                <textarea
                  className="w-full p-3 border rounded-md min-h-[80px]"
                  placeholder="Different ways to approach the content..."
                  value={jobData.brief.angles.join('\n')}
                  onChange={(e) => updateBrief({
                    angles: e.target.value.split('\n').filter(line => line.trim())
                  })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Key Talking Points</label>
                <textarea
                  className="w-full p-3 border rounded-md min-h-[80px]"
                  placeholder="What should creators mention or highlight..."
                  value={jobData.brief.talkingPoints.join('\n')}
                  onChange={(e) => updateBrief({
                    talkingPoints: e.target.value.split('\n').filter(line => line.trim())
                  })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Do's ✅</label>
                  <textarea
                    className="w-full p-3 border rounded-md min-h-[80px]"
                    placeholder="What creators should do..."
                    value={jobData.brief.do.join('\n')}
                    onChange={(e) => updateBrief({
                      do: e.target.value.split('\n').filter(line => line.trim())
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Don'ts ❌</label>
                  <textarea
                    className="w-full p-3 border rounded-md min-h-[80px]"
                    placeholder="What creators should avoid..."
                    value={jobData.brief.dont.join('\n')}
                    onChange={(e) => updateBrief({
                      dont: e.target.value.split('\n').filter(line => line.trim())
                    })}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!user || !appUser) {
    return <LoadingSpinner fullScreen text="Loading..." />;
  }

  if (isLoadingReuse) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-8">
          <LoadingSpinner text="Loading campaign data..." />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">Create a New Campaign</h1>
              <p className="text-muted-foreground">
                {router.query.reuse ? 'Reusing an existing campaign - please enter a new title' : 'Find creators for your UGC needs'}
              </p>
            </div>
            <Link href="/brand/dashboard">
              <Button variant="outline">Cancel</Button>
            </Link>
          </div>

          {/* Progress */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="bg-orange-600 h-2 rounded-full transition-all"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span className={currentStep >= 1 ? 'text-orange-600 font-medium' : ''}>Campaign Details</span>
            <span className={currentStep >= 2 ? 'text-orange-600 font-medium' : ''}>Requirements</span>
            <span className={currentStep >= 3 ? 'text-orange-600 font-medium' : ''}>Brief</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && "Campaign Details"}
              {currentStep === 2 && "Requirements & Budget"}
              {currentStep === 3 && "Creative Brief"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderStep()}
          </CardContent>
        </Card>

        <div className="flex justify-between mt-8">
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
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isSubmitting ? 'Creating Campaign...' : 'Create Campaign'}
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
}

// Squad Selector Component
function SquadSelector({ selectedSquadIds, onSelectionChange }) {
  const [squads, setSquads] = useStateHook([]);
  const [loading, setLoading] = useStateHook(true);

  useEffect(() => {
    fetchSquads();
  }, []);

  const fetchSquads = async () => {
    try {
      setLoading(true);
      const squadsQuery = query(
        collection(db, 'squads'),
        orderBy('createdAt', 'desc')
      );
      const squadsSnapshot = await getDocs(squadsQuery);
      const squadsData = squadsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSquads(squadsData);
    } catch (error) {
      console.error('Error fetching squads:', error);
      toast.error('Failed to load squads');
    } finally {
      setLoading(false);
    }
  };

  const toggleSquad = (squadId) => {
    const newSelection = selectedSquadIds.includes(squadId)
      ? selectedSquadIds.filter((id) => id !== squadId)
      : [...selectedSquadIds, squadId];
    onSelectionChange(newSelection);
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading squads...</div>;
  }

  if (squads.length === 0) {
    return (
      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">No squads available. Creators need to create squads first.</p>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <label className="block text-sm font-medium mb-2">Select Squads</label>
      <p className="text-xs text-gray-500 mb-3">Choose which squads can see this campaign</p>
      <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
        {squads.map((squad) => (
          <label
            key={squad.id}
            className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedSquadIds.includes(squad.id)}
              onChange={() => toggleSquad(squad.id)}
              className="rounded"
            />
            <span className="text-sm">{squad.name}</span>
            <span className="text-xs text-gray-500">
              ({squad.memberIds?.length || 0} members)
            </span>
          </label>
        ))}
      </div>
      {selectedSquadIds.length > 0 && (
        <p className="text-xs text-gray-600 mt-2">
          {selectedSquadIds.length} squad{selectedSquadIds.length > 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}