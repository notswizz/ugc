import { useState, useEffect, useState as useStateHook, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { collection, addDoc, serverTimestamp, query, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import VisibilityBadge from '@/components/gigs/VisibilityBadge';
import { THINGS, EXPERIENCE_TYPES } from '@/lib/things/constants';
import toast from 'react-hot-toast';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function NewGig() {
  const router = useRouter();
  const { user, appUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingReuse, setIsLoadingReuse] = useState(false);
  const [availableCreatorsCount, setAvailableCreatorsCount] = useState(null);
  const [loadingCreatorCount, setLoadingCreatorCount] = useState(false);

  useEffect(() => {
    if (appUser && appUser.role !== 'brand') {
      router.push('/brand/dashboard');
    } else {
      // Initial fetch with score 0 and no follower filter to show total creators
      fetchAvailableCreators(0, 0, '');
    }
  }, [appUser, router]);

  // Fetch available creators count based on trust score and follower requirements
  const fetchAvailableCreators = async (minTrustScore, minFollowerCount, platform) => {
    if ((!minTrustScore && minTrustScore !== 0) && !minFollowerCount) {
      setAvailableCreatorsCount(null);
      return;
    }

    setLoadingCreatorCount(true);
    try {
      const creatorsQuery = query(collection(db, 'creators'));
      const creatorsSnapshot = await getDocs(creatorsQuery);
      
      const count = creatorsSnapshot.docs.filter(doc => {
        const creator = doc.data();
        
        // Trust Score filter
        const trustScore = creator.trustScore || 0;
        if (minTrustScore && trustScore < minTrustScore) {
          return false;
        }
        
        // Follower count filter (only if platform and minFollowers are specified)
        if (minFollowerCount && platform) {
          const platformKey = platform.toLowerCase();
          const creatorFollowers = creator.followingCount?.[platformKey] || 0;
          if (creatorFollowers < minFollowerCount) {
            return false;
          }
        }
        
        return true;
      }).length;

      setAvailableCreatorsCount(count);
    } catch (error) {
      console.error('Error fetching creator count:', error);
      setAvailableCreatorsCount(null);
    } finally {
      setLoadingCreatorCount(false);
    }
  };

  // Load existing gig data if reuse parameter is present
  useEffect(() => {
    const loadReuseGig = async () => {
      const reuseGigId = router.query.reuse;
      if (!reuseGigId || typeof reuseGigId !== 'string' || !user) return;

      setIsLoadingReuse(true);
      try {
        const gigDoc = await getDoc(doc(db, 'gigs', reuseGigId));
        if (!gigDoc.exists()) {
          toast.error('Gig not found');
          router.replace('/brand/gigs/new');
          return;
        }

        const existingGig = gigDoc.data();
        
        // Check if user owns this gig
        if (existingGig.brandId !== user.uid) {
          toast.error('You do not have permission to reuse this gig');
          router.replace('/brand/gigs/new');
          return;
        }

        // Calculate deadline hours from deadlineAt
        const deadlineAt = existingGig.deadlineAt?.toDate ? existingGig.deadlineAt.toDate() : new Date(existingGig.deadlineAt);
        const now = new Date();
        const hoursDiff = Math.max(24, Math.round((deadlineAt.getTime() - now.getTime()) / (1000 * 60 * 60)));

        // Pre-fill form with existing gig data (but clear title)
        setGigData({
          title: '', // Clear title so they can enter a new one
          platform: existingGig.platform || '',
          contentType: existingGig.contentType || '',
          instagramFormat: existingGig.instagramFormat || '',
          description: existingGig.description || '',
          productDescription: existingGig.productDescription || '',
          primaryThing: existingGig.primaryThing || '',
          secondaryTags: existingGig.secondaryTags || [],
          payoutType: existingGig.payoutType || 'fixed',
          basePayout: existingGig.basePayout?.toString() || '',
          followerRanges: existingGig.followerRanges && existingGig.followerRanges.length > 0 
            ? existingGig.followerRanges 
            : [{ min: 0, max: null, payout: 0 }],
          bonusPool: existingGig.bonusPool?.toString() || '',
          deadlineHours: hoursDiff,
          visibility: existingGig.visibility || 'open',
          targetTags: existingGig.targetTags || [],
          squadIds: existingGig.squadIds || [],
          trustScoreMin: existingGig.trustScoreMin?.toString() || '',
          minFollowers: existingGig.minFollowers?.toString() || '',
          experienceRequirements: existingGig.experienceRequirements || [],
          acceptedSubmissionsLimit: existingGig.acceptedSubmissionsLimit || 1,
          productInVideoRequired: existingGig.productInVideoRequired || false,
          reimbursementMode: existingGig.reimbursementMode || 'reimbursement',
          reimbursementCap: existingGig.reimbursementCap?.toString() || '',
          purchaseWindowHours: existingGig.purchaseWindowHours || 24,
          deliverables: {
            videos: existingGig.deliverables?.videos || 0,
            photos: existingGig.deliverables?.photos || 0,
            raw: existingGig.deliverables?.raw || false,
            notes: existingGig.deliverables?.notes || '',
          },
          brief: existingGig.brief || {
            hooks: [''],
            angles: [''],
            talkingPoints: [''],
            do: [''],
            dont: [''],
            references: [''],
          },
          usageRightsTemplateId: existingGig.usageRightsTemplateId || '',
          aiComplianceRequired: existingGig.aiComplianceRequired || false,
          autoApproveWindowHours: existingGig.autoApproveWindowHours || 0,
        });

        toast.success('Gig data loaded! Please enter a new title.');
      } catch (error) {
        console.error('Error loading gig to reuse:', error);
        toast.error('Failed to load gig data');
      } finally {
        setIsLoadingReuse(false);
      }
    };

    if (router.isReady && router.query.reuse) {
      loadReuseGig();
    }
  }, [router.isReady, router.query.reuse, user]);

  const [gigData, setGigData] = useState({
    title: '',
    platform: '', // TikTok, Instagram, X, etc.
    contentType: '', // 'video' or 'photo'
    instagramFormat: '', // 'post' or 'story' (only for Instagram)
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
    minFollowers: '', // Minimum followers for selected platform
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

  // Debounced update - fetch available creators when trust score or followers change
  useEffect(() => {
    const timer = setTimeout(() => {
      const score = gigData.trustScoreMin ? parseInt(gigData.trustScoreMin) : 0;
      // Only apply follower filter if payout is NOT dynamic
      const followers = (gigData.payoutType !== 'dynamic' && gigData.minFollowers) ? parseInt(gigData.minFollowers) : 0;
      const platform = gigData.platform || '';
      fetchAvailableCreators(score, followers, platform);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [gigData.trustScoreMin, gigData.minFollowers, gigData.platform, gigData.payoutType]);

  // Clear minFollowers when switching to dynamic payouts
  useEffect(() => {
    if (gigData.payoutType === 'dynamic' && gigData.minFollowers) {
      updateGigData({ minFollowers: '' });
    }
  }, [gigData.payoutType]);

  const updateGigData = (updates) => {
    setGigData(prev => ({ ...prev, ...updates }));
  };

  const updateDeliverables = (updates) => {
    setGigData(prev => ({
      ...prev,
      deliverables: { ...prev.deliverables, ...updates }
    }));
  };

  const updateBrief = (updates) => {
    setGigData(prev => ({
      ...prev,
      brief: { ...prev.brief, ...updates }
    }));
  };

  const addFollowerRange = () => {
    setGigData(prev => {
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
    setGigData(prev => {
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
    setGigData(prev => {
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
    setGigData(prev => ({
      ...prev,
      secondaryTags: prev.secondaryTags.includes(tag)
        ? prev.secondaryTags.filter(t => t !== tag)
        : [...prev.secondaryTags, tag]
    }));
  };

  const toggleExperience = (exp) => {
    setGigData(prev => ({
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
      deadlineAt.setHours(deadlineAt.getHours() + (parseInt(gigData.deadlineHours) || 24));
      
      // Prepare gig document (only include fields that have values)
      const gigDoc = {
        brandId: user.uid,
        title: gigData.title,
        platform: gigData.platform, // TikTok, Instagram, X
        contentType: gigData.contentType, // video or photo
        instagramFormat: gigData.instagramFormat || null, // post or story (only for Instagram)
        description: gigData.description || '',
        productDescription: gigData.productDescription || '', // Product description for AI evaluation
        primaryThing: gigData.primaryThing,
        secondaryTags: gigData.secondaryTags || [],
        payoutType: gigData.payoutType || 'fixed',
        basePayout: gigData.payoutType === 'fixed' ? (parseFloat(gigData.basePayout) || 0) : 0,
        deadlineAt: deadlineAt,
        visibility: gigData.visibility || 'open',
        targetTags: gigData.targetTags || [],
        experienceRequirements: gigData.experienceRequirements || [],
        acceptedSubmissionsLimit: parseInt(gigData.acceptedSubmissionsLimit) || 1,
        productInVideoRequired: gigData.productInVideoRequired || false,
        deliverables: {
          videos: gigData.contentType === 'video' ? 1 : 0, // Automatically set based on content type
          photos: gigData.contentType === 'photo' ? 1 : 0, // Automatically set based on content type
          raw: false,
          notes: '',
        },
        usageRightsTemplateId: gigData.usageRightsTemplateId || '',
        usageRightsSnapshot: {}, // Placeholder - should fetch from template
        aiComplianceRequired: gigData.aiComplianceRequired || false,
        autoApproveWindowHours: gigData.autoApproveWindowHours || 0,
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Only add followerRanges if payoutType is dynamic (Firestore doesn't allow undefined)
      if (gigData.payoutType === 'dynamic' && gigData.followerRanges && gigData.followerRanges.length > 0) {
        gigDoc.followerRanges = gigData.followerRanges;
      }

      // Add squad IDs if visibility is squad
      if (gigData.visibility === 'squad' && gigData.squadIds && gigData.squadIds.length > 0) {
        gigDoc.squadIds = gigData.squadIds;
      }

      // Only add optional fields if they have values (Firestore doesn't allow undefined)
      if (gigData.bonusPool && parseFloat(gigData.bonusPool) > 0) {
        gigDoc.bonusPool = parseFloat(gigData.bonusPool);
      }

      if (gigData.trustScoreMin) {
        gigDoc.trustScoreMin = parseInt(gigData.trustScoreMin);
      }

      // Add minimum followers requirement if specified (but NOT for dynamic payouts)
      // Dynamic payouts already filter by follower ranges, so minFollowers would conflict
      if (gigData.payoutType !== 'dynamic' && gigData.minFollowers && parseInt(gigData.minFollowers) > 0) {
        gigDoc.minFollowers = parseInt(gigData.minFollowers);
        gigDoc.minFollowersPlatform = gigData.platform; // Store which platform the requirement is for
      }

      // Only add reimbursement fields if product in video is required
      if (gigData.productInVideoRequired) {
        gigDoc.reimbursementMode = gigData.reimbursementMode || 'reimbursement';
        
        if (gigData.reimbursementMode === 'reimbursement') {
          if (gigData.reimbursementCap && parseFloat(gigData.reimbursementCap) > 0) {
            gigDoc.reimbursementCap = parseFloat(gigData.reimbursementCap);
          }
          if (gigData.purchaseWindowHours) {
            gigDoc.purchaseWindowHours = parseInt(gigData.purchaseWindowHours) || 24;
          }
        }
      }

      // Add brief if provided
      if (gigData.brief) {
        const briefData = {
          hooks: gigData.brief.hooks?.filter((h) => h.trim()) || [],
          angles: gigData.brief.angles?.filter((a) => a.trim()) || [],
          talkingPoints: gigData.brief.talkingPoints?.filter((tp) => tp.trim()) || [],
          do: gigData.brief.do?.filter((d) => d.trim()) || [],
          dont: gigData.brief.dont?.filter((d) => d.trim()) || [],
          references: gigData.brief.references?.filter((r) => r.trim()) || [],
        };
        
        // Only add brief if at least one field has content
        if (briefData.hooks.length > 0 || briefData.angles.length > 0 || 
            briefData.talkingPoints.length > 0 || briefData.do.length > 0 || 
            briefData.dont.length > 0 || briefData.references.length > 0) {
          gigDoc.brief = briefData;
        }
      }

      // Save to Firestore
      const docRef = await addDoc(collection(db, 'gigs'), gigDoc);
      
      console.log('Gig created with ID:', docRef.id);
      toast.success('Gig created successfully!');
      router.push('/brand/dashboard');

    } catch (error) {
      console.error('Error creating gig:', error);
      toast.error('Failed to create gig: ' + (error.message || 'Unknown error'));
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
              <label className="block text-sm font-medium mb-2">Gig Title *</label>
              <Input
                placeholder="e.g., Authentic Coffee Shop Review"
                value={gigData.title}
                onChange={(e) => updateGigData({ title: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Platform *</label>
              <div className="grid grid-cols-3 gap-3">
                {/* TikTok */}
                <button
                  type="button"
                  onClick={() => updateGigData({ platform: 'tiktok', contentType: 'video' })}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    gigData.platform === 'tiktok'
                      ? 'bg-orange-50 border-orange-500 shadow-sm'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <svg className="w-8 h-8 mx-auto mb-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                  <div className="text-sm font-semibold">TikTok</div>
                </button>

                {/* Instagram */}
                <button
                  type="button"
                  onClick={() => updateGigData({ platform: 'instagram' })}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    gigData.platform === 'instagram'
                      ? 'bg-orange-50 border-orange-500 shadow-sm'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <svg className="w-8 h-8 mx-auto mb-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>
                  </svg>
                  <div className="text-sm font-semibold">Instagram</div>
                </button>

                {/* X (Twitter) */}
                <button
                  type="button"
                  onClick={() => updateGigData({ platform: 'x' })}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    gigData.platform === 'x'
                      ? 'bg-orange-50 border-orange-500 shadow-sm'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <svg className="w-8 h-8 mx-auto mb-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  <div className="text-sm font-semibold">X</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Content Type *</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateGigData({ contentType: 'video' })}
                  className={`p-6 rounded-lg border-2 text-center transition-all ${
                    gigData.contentType === 'video'
                      ? 'bg-blue-50 border-blue-500 shadow-sm'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-4xl mb-2">🎥</div>
                  <div className="text-base font-semibold">Video</div>
                </button>
                <button
                  type="button"
                  onClick={() => updateGigData({ contentType: 'photo' })}
                  disabled={gigData.platform === 'tiktok'}
                  className={`p-6 rounded-lg border-2 text-center transition-all ${
                    gigData.platform === 'tiktok'
                      ? 'bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed'
                      : gigData.contentType === 'photo'
                      ? 'bg-purple-50 border-purple-500 shadow-sm'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-4xl mb-2">📷</div>
                  <div className="text-base font-semibold">Photo</div>
                  {gigData.platform === 'tiktok' && (
                    <div className="text-xs text-gray-500 mt-1">TikTok is video only</div>
                  )}
                </button>
              </div>
            </div>

            {/* Instagram Format Selection */}
            {gigData.platform === 'instagram' && (
              <div>
                <label className="block text-sm font-medium mb-2">Instagram Format *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => updateGigData({ instagramFormat: 'post' })}
                    className={`p-4 rounded-lg border-2 text-center transition-all ${
                      gigData.instagramFormat === 'post'
                        ? 'bg-pink-50 border-pink-500 shadow-sm'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">📱</div>
                    <div className="text-sm font-semibold">Post</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateGigData({ instagramFormat: 'story' })}
                    className={`p-4 rounded-lg border-2 text-center transition-all ${
                      gigData.instagramFormat === 'story'
                        ? 'bg-pink-50 border-pink-500 shadow-sm'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">⭕</div>
                    <div className="text-sm font-semibold">Story</div>
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Primary Thing/Category *</label>
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
                {gigData.primaryThing && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    <span>{THINGS.find(t => t.id === gigData.primaryThing)?.icon}</span>
                    <button
                      type="button"
                      onClick={() => {
                        updateGigData({ primaryThing: '' });
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
                            updateGigData({ primaryThing: thing.id });
                            setCategorySearch(thing.name);
                            setShowCategoryDropdown(false);
                          }}
                          className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-2 border-b last:border-b-0 ${
                            gigData.primaryThing === thing.id ? 'bg-green-50' : ''
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
              {gigData.primaryThing && (
                <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  <span>{THINGS.find(t => t.id === gigData.primaryThing)?.icon}</span>
                  <span>{THINGS.find(t => t.id === gigData.primaryThing)?.name}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Gig Description</label>
              <textarea
                className="w-full p-3 border rounded-md min-h-[100px]"
                placeholder="Describe what you want the creator to do..."
                value={gigData.description}
                onChange={(e) => updateGigData({ description: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Product Description (for AI Evaluation)</label>
              <textarea
                className="w-full p-3 border rounded-md min-h-[80px]"
                placeholder="Describe exactly what the product is (e.g., 'Nike Air Max running shoes in blue and white', 'iPhone 15 Pro Max 256GB'). This helps AI accurately evaluate if the product is shown in the video."
                value={gigData.productDescription}
                onChange={(e) => updateGigData({ productDescription: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">Be specific - include product name, model, colors, size, or other distinguishing features.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Visibility</label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => updateGigData({ visibility: 'open' })}
                  className={`w-full p-3 rounded-lg border text-left ${
                    gigData.visibility === 'open'
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
                  onClick={() => updateGigData({ visibility: 'squad' })}
                  className={`w-full p-3 rounded-lg border text-left ${
                    gigData.visibility === 'squad'
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
                  onClick={() => updateGigData({ visibility: 'invite' })}
                  className={`w-full p-3 rounded-lg border text-left ${
                    gigData.visibility === 'invite'
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
              {gigData.visibility === 'squad' && (
                <SquadSelector
                  selectedSquadIds={gigData.squadIds || []}
                  onSelectionChange={(squadIds) => updateGigData({ squadIds })}
                />
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-900">Payout Type *</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => updateGigData({ payoutType: 'fixed' })}
                  className={`flex-1 px-6 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    gigData.payoutType === 'fixed'
                      ? 'bg-orange-50 border-orange-500 text-orange-900 shadow-sm'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  💵 Fixed Payout
                </button>
                <button
                  type="button"
                  onClick={() => updateGigData({ payoutType: 'dynamic' })}
                  className={`flex-1 px-6 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    gigData.payoutType === 'dynamic'
                      ? 'bg-orange-50 border-orange-500 text-orange-900 shadow-sm'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  📊 Dynamic by Followers
                </button>
              </div>

              {gigData.payoutType === 'fixed' ? (
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">Base Payout ($) *</label>
                  <Input
                    type="number"
                    placeholder="150"
                    value={gigData.basePayout}
                    onChange={(e) => updateGigData({ basePayout: e.target.value })}
                    required
                    min="1"
                    className="h-12 text-lg"
                  />
                </div>
              ) : (
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-3">Follower Count Ranges & Payouts *</label>
                  
                  <div className="space-y-3">
                    {gigData.followerRanges.map((range, index) => {
                      const isLastRange = index === gigData.followerRanges.length - 1;
                      const prevRange = index > 0 ? gigData.followerRanges[index - 1] : null;
                      
                      return (
                        <div key={index} className="p-3 border-2 rounded-lg bg-white hover:border-gray-300 transition-all">
                          <div className="flex items-end gap-2 mb-2">
                            <div className="flex-1">
                              <label className="text-xs font-medium text-gray-700 mb-1 block">Min</label>
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
                            </div>
                            <div className="flex-1">
                              <label className="text-xs font-medium text-gray-700 mb-1 block">Max</label>
                              <Input
                                type="number"
                                placeholder={isLastRange ? "∞" : "1000"}
                                value={range.max || ''}
                                onChange={(e) => {
                                  const newMax = e.target.value ? parseInt(e.target.value) : null;
                                  updateFollowerRange(index, { max: newMax });
                                }}
                                min={range.min || 0}
                                className="text-sm"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs font-medium text-gray-700 mb-1 block">Payout ($)</label>
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
                              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium"
                              disabled={gigData.followerRanges.length === 1}
                            >
                              ✕
                            </button>
                          </div>
                          <div className="text-xs font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded">
                            {range.min} - {range.max === null ? '∞' : range.max} followers = ${range.payout || 0}
                          </div>
                        </div>
                      );
                    })}
                    
                    <button
                      type="button"
                      onClick={addFollowerRange}
                      className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-all"
                    >
                      + Add Range
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Bonus Pool ($)</label>
              <Input
                type="number"
                placeholder="100"
                value={gigData.bonusPool}
                onChange={(e) => updateGigData({ bonusPool: e.target.value })}
                min="0"
                className="h-12 text-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Accepted Submissions Limit *</label>
              <Input
                type="number"
                placeholder="1"
                value={gigData.acceptedSubmissionsLimit || 1}
                onChange={(e) => updateGigData({ acceptedSubmissionsLimit: parseInt(e.target.value) || 1 })}
                required
                min="1"
                max="100"
                className="h-12 text-lg"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium">Trust Score Minimum</label>
                <div className="text-right">
                  <span className="text-2xl font-bold text-brand-600">{gigData.trustScoreMin || 0}</span>
                  <span className="text-sm text-gray-500 ml-1">/ 100</span>
                </div>
              </div>
              
              {/* Slider */}
              <div className="relative pt-1">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={gigData.trustScoreMin || 0}
                  onChange={(e) => updateGigData({ trustScoreMin: e.target.value })}
                  className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                  style={{
                    background: `linear-gradient(to right, #f97316 0%, #f97316 ${gigData.trustScoreMin || 0}%, #e5e7eb ${gigData.trustScoreMin || 0}%, #e5e7eb 100%)`
                  }}
                />
              </div>
            </div>

            {/* Minimum Followers - Only show if platform is selected AND payout is NOT dynamic */}
            {gigData.platform && gigData.payoutType !== 'dynamic' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium">
                    Minimum {gigData.platform} Followers
                  </label>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-brand-600">
                      {gigData.minFollowers ? parseInt(gigData.minFollowers).toLocaleString() : 0}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">followers</span>
                  </div>
                </div>
                
                {/* Slider */}
                <div className="relative pt-1">
                  <input
                    type="range"
                    min="0"
                    max="100000"
                    step="1000"
                    value={gigData.minFollowers || 0}
                    onChange={(e) => updateGigData({ minFollowers: e.target.value })}
                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                    style={{
                      background: `linear-gradient(to right, #f97316 0%, #f97316 ${(gigData.minFollowers || 0) / 1000}%, #e5e7eb ${(gigData.minFollowers || 0) / 1000}%, #e5e7eb 100%)`
                    }}
                  />
                </div>
              </div>
            )}

            {/* Available Creators Count - Shows combined filter results */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-brand-50 to-accent-50 rounded-lg border-2 border-brand-200">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👥</span>
                <span className="text-sm font-medium text-gray-700">Available Creators</span>
              </div>
              <div className="text-right">
                {loadingCreatorCount ? (
                  <div className="text-sm text-gray-500">Loading...</div>
                ) : availableCreatorsCount !== null ? (
                  <div>
                    <div className="text-2xl font-bold text-brand-600">{availableCreatorsCount}</div>
                    <div className="text-xs text-gray-500">
                      {availableCreatorsCount === 0 ? 'None available' : 
                       availableCreatorsCount === 1 ? 'creator' : 'creators'}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">Set filters</div>
                )}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-all">
                <input
                  type="checkbox"
                  checked={gigData.productInVideoRequired}
                  onChange={(e) => updateGigData({ productInVideoRequired: e.target.checked })}
                  className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                />
                <span className="text-sm font-medium">📦 Product must appear in content</span>
              </label>
              {gigData.productInVideoRequired && (
                <div className="mt-3 space-y-3 p-4 border-2 border-orange-200 bg-orange-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium mb-2">Reimbursement Mode</label>
                    <select
                      className="w-full p-3 border-2 rounded-lg bg-white text-base focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      value={gigData.reimbursementMode}
                      onChange={(e) => updateGigData({ reimbursementMode: e.target.value })}
                    >
                      <option value="reimbursement">💳 Reimbursement (creator buys)</option>
                      <option value="shipping">📦 Shipping (we ship to creator)</option>
                    </select>
                  </div>
                  {gigData.reimbursementMode === 'reimbursement' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Reimbursement Cap ($)</label>
                      <Input
                        type="number"
                        placeholder="50"
                        value={gigData.reimbursementCap}
                        onChange={(e) => updateGigData({ reimbursementCap: e.target.value })}
                        className="h-12 text-lg"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Deadline</label>
              <select
                className="w-full p-3 border-2 rounded-lg bg-white text-base focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                value={gigData.deadlineHours}
                onChange={(e) => updateGigData({ deadlineHours: Number(e.target.value) })}
              >
                <option value={24}>⏰ 24 hours</option>
                <option value={48}>⏰ 48 hours</option>
                <option value={72}>⏰ 3 days</option>
                <option value={168}>⏰ 1 week</option>
              </select>
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
                  value={gigData.brief.hooks.join('\n')}
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
                  value={gigData.brief.angles.join('\n')}
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
                  value={gigData.brief.talkingPoints.join('\n')}
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
                    value={gigData.brief.do.join('\n')}
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
                    value={gigData.brief.dont.join('\n')}
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
          <LoadingSpinner text="Loading gig data..." />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-full flex flex-col -mx-4 -my-8">
        {/* Sticky Header */}
        <div className="flex-shrink-0 bg-white border-b px-4 pt-8 pb-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold">Create a New Gig</h1>
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
              <span className={currentStep >= 1 ? 'text-orange-600 font-medium' : ''}>Gig Details</span>
              <span className={currentStep >= 2 ? 'text-orange-600 font-medium' : ''}>Requirements</span>
              <span className={currentStep >= 3 ? 'text-orange-600 font-medium' : ''}>Brief</span>
            </div>
          </div>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="pt-6">
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
                  {isSubmitting ? 'Creating Gig...' : 'Create Gig'}
                </Button>
              )}
            </div>
          </div>
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
      <p className="text-xs text-gray-500 mb-3">Choose which squads can see this gig</p>
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