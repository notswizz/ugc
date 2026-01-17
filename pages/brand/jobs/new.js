import { useState, useEffect, useState as useStateHook } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { collection, addDoc, serverTimestamp, query, getDocs, orderBy } from 'firebase/firestore';
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

  useEffect(() => {
    if (appUser && appUser.role !== 'brand') {
      router.push('/brand/dashboard');
    }
  }, [appUser, router]);

  const [jobData, setJobData] = useState({
    title: '',
    description: '',
    productDescription: '', // Specific product description for AI evaluation
    primaryThing: '',
    secondaryTags: [],
    basePayout: '',
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
  });

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
        basePayout: parseFloat(jobData.basePayout) || 0,
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
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

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
              <label className="block text-sm font-medium mb-2">Campaign Title</label>
              <Input
                placeholder="e.g., Authentic Coffee Shop Review"
                value={jobData.title}
                onChange={(e) => updateJobData({ title: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Primary Thing/Category *</label>
              <p className="text-sm text-muted-foreground mb-3">
                Select the main category for this campaign
              </p>
              <div className="flex flex-wrap gap-2">
                {THINGS.map(thing => (
                  <button
                    key={thing.id}
                    type="button"
                    onClick={() => updateJobData({ primaryThing: thing.id })}
                    className={`px-3 py-2 rounded-full text-sm border flex items-center gap-1.5 ${
                      jobData.primaryThing === thing.id
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

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">Create a New Campaign</h1>
              <p className="text-muted-foreground">Find creators for your UGC needs</p>
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