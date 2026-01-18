import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { doc, getDoc, collection, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/lib/auth/AuthContext';
import { db, storage } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { THINGS } from '@/lib/things/constants';
import toast from 'react-hot-toast';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { calculatePayout, getCreatorFollowingCount } from '@/lib/payments/calculate-payout';

export default function SubmitGig() {
  const router = useRouter();
  const { gigId } = router.query;
  const { user } = useAuth();
  const [gig, setGig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [calculatedPayout, setCalculatedPayout] = useState(0);
  
  const [submissionData, setSubmissionData] = useState({
    contentLink: '', // TikTok, YouTube, Instagram link
    videos: [], // Main video files
    photos: [], // Main photo files
    rawVideos: [],
    rawPhotos: [],
    productPurchase: {
      receiptUrl: '',
      productPhotoUrl: '',
      amount: '',
      purchaseDate: '',
    },
  });
  const [uploadProgress, setUploadProgress] = useState({}); // Track upload progress: { fileId: { progress: 0-100, fileName: string } }
  const [isUploading, setIsUploading] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null); // { status: 'evaluating' | 'approved' | 'rejected', evaluation: {...}, qualityScore: number }

  useEffect(() => {
    if (gigId && typeof gigId === 'string') {
      fetchGig();
    }
  }, [gigId]);

  const fetchGig = async () => {
    if (!gigId || typeof gigId !== 'string') return;
    
    try {
      setLoading(true);
      const gigDoc = await getDoc(doc(db, 'gigs', gigId));
      
      if (!gigDoc.exists()) {
        toast.error('Gig not found');
        router.push('/creator/gigs');
        return;
      }

      const gigData = gigDoc.data();
      
      // Check if user has accepted this gig
      if (gigData.acceptedBy !== user?.uid) {
        toast.error('You have not accepted this gig');
        router.push(`/creator/gigs/${gigId}`);
        return;
      }

      // Calculate payout if dynamic
      let payout = gigData.basePayout || 0;
      if (gigData.payoutType === 'dynamic' && user) {
        try {
          const creatorDoc = await getDoc(doc(db, 'creators', user.uid));
          if (creatorDoc.exists()) {
            const creatorData = creatorDoc.data();
            const creatorFollowingCount = getCreatorFollowingCount(creatorData);
            payout = calculatePayout(gigData, creatorFollowingCount);
            setCalculatedPayout(payout);
          }
        } catch (err) {
          console.error('Error calculating payout:', err);
        }
      } else {
        setCalculatedPayout(payout);
      }

      setGig({
        id: gigDoc.id,
        ...gigData,
        deadlineAt: gigData.deadlineAt?.toDate ? gigData.deadlineAt.toDate() : new Date(gigData.deadlineAt),
        calculatedPayout: payout,
      });
    } catch (error) {
      console.error('Error fetching gig:', error);
      toast.error('Failed to load gig');
      router.push('/creator/gigs');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file, type) => {
    if (!file || !gig || !user) return null;
    
    const fileId = `${type}_${Date.now()}_${file.name}`;
    setIsUploading(true);
    
    // Add to upload progress immediately
    setUploadProgress(prev => ({
      ...prev,
      [fileId]: {
        progress: 0,
        fileName: file.name,
      },
    }));
    
    try {
      const fileName = `${gig.id}_${user.uid}_${Date.now()}_${file.name}`;
      const fileRef = ref(storage, `submissions/${gig.id}/${user.uid}/${type}/${fileName}`);
      
      // Use uploadBytesResumable for progress tracking
      const uploadTask = uploadBytesResumable(fileRef, file);
      
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            // Track upload progress
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(prev => ({
              ...prev,
              [fileId]: {
                progress: Math.round(progress),
                fileName: file.name,
              },
            }));
          },
          (error) => {
            console.error(`Error uploading ${type}:`, error);
            toast.error(`Failed to upload ${file.name}`);
            setUploadProgress(prev => {
              const newProgress = { ...prev };
              delete newProgress[fileId];
              // Check if all uploads are done
              if (Object.keys(newProgress).length === 0) {
                setIsUploading(false);
              }
              return newProgress;
            });
            reject(error);
          },
          async () => {
            // Upload completed
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setUploadProgress(prev => {
              const newProgress = { ...prev };
              delete newProgress[fileId];
              // Check if all uploads are done after removing this one
              if (Object.keys(newProgress).length === 0) {
                setIsUploading(false);
              }
              return newProgress;
            });
            
            resolve(downloadURL);
          }
        );
      });
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      toast.error(`Failed to upload ${file.name}`);
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[fileId];
        if (Object.keys(newProgress).length === 0) {
          setIsUploading(false);
        }
        return newProgress;
      });
      return null;
    }
  };

  const handleVideoChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const urls = [];
    for (const file of files) {
      const url = await handleFileUpload(file, 'videos');
      if (url) urls.push(url);
    }
    
    setSubmissionData(prev => ({
      ...prev,
      videos: [...prev.videos, ...urls],
    }));
  };

  const handlePhotoChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const urls = [];
    for (const file of files) {
      const url = await handleFileUpload(file, 'photos');
      if (url) urls.push(url);
    }
    
    setSubmissionData(prev => ({
      ...prev,
      photos: [...prev.photos, ...urls],
    }));
  };

  const handleRawVideoChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const urls = [];
    for (const file of files) {
      const url = await handleFileUpload(file, 'raw-videos');
      if (url) urls.push(url);
    }
    
    setSubmissionData(prev => ({
      ...prev,
      rawVideos: [...prev.rawVideos, ...urls],
    }));
  };

  const handleRawPhotoChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const urls = [];
    for (const file of files) {
      const url = await handleFileUpload(file, 'raw-photos');
      if (url) urls.push(url);
    }
    
    setSubmissionData(prev => ({
      ...prev,
      rawPhotos: [...prev.rawPhotos, ...urls],
    }));
  };

  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const url = await handleFileUpload(file, 'receipts');
    if (url) {
      setSubmissionData(prev => ({
        ...prev,
        productPurchase: {
          ...prev.productPurchase,
          receiptUrl: url,
        },
      }));
    }
  };

  const handleProductPhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const url = await handleFileUpload(file, 'product-photos');
    if (url) {
      setSubmissionData(prev => ({
        ...prev,
        productPurchase: {
          ...prev.productPurchase,
          productPhotoUrl: url,
        },
      }));
    }
  };

  const handleSubmit = async () => {
    if (!gig || !user) {
      console.error('Cannot submit: missing gig or user', { hasGig: !!gig, hasUser: !!user });
      toast.error('Missing required information. Please refresh the page.');
      return;
    }
    
    if (submitting) {
      console.log('Already submitting, ignoring duplicate click');
      return;
    }

    // Validation - check against gig requirements
    // If gig requires videos, they must be uploaded (content links don't work for AI evaluation)
    const hasUploadedVideos = submissionData.videos.length > 0 || submissionData.rawVideos.length > 0;
    const hasPhotos = submissionData.photos.length > 0;
    const hasRaw = !gig.deliverables.raw || (submissionData.rawVideos.length > 0 || submissionData.rawPhotos.length > 0);
    
    // Check if minimum requirements are met
    // If gig requires videos AND has AI evaluation, videos must be uploaded (not just a link)
    if (gig.deliverables.videos > 0) {
      if (gig.aiComplianceRequired && !hasUploadedVideos) {
        toast.error(`This gig requires AI evaluation. Please upload at least ${gig.deliverables.videos} video file(s). Content links are not supported for AI evaluation.`);
        return;
      } else if (!hasUploadedVideos && !submissionData.contentLink) {
        toast.error(`Please upload at least ${gig.deliverables.videos} video(s) or provide a content link`);
        return;
      }
    }
    
    if (gig.deliverables.photos > 0 && !hasPhotos) {
      toast.error(`Please upload at least ${gig.deliverables.photos} photo(s)`);
      return;
    }
    
    if (gig.deliverables.raw && !hasRaw) {
      toast.error('Please upload raw footage files');
      return;
    }

    // At least one form of content must be provided
    if (!submissionData.contentLink && submissionData.videos.length === 0 && 
        submissionData.photos.length === 0 && submissionData.rawVideos.length === 0 && 
        submissionData.rawPhotos.length === 0) {
      toast.error('Please provide a content link or upload files');
      return;
    }
    
    // If AI evaluation is required, ensure video files are uploaded
    if (gig.aiComplianceRequired && !hasUploadedVideos) {
      toast.error('This gig requires AI evaluation. Please upload video files. Content links are not supported for AI evaluation.');
      return;
    }

    // Check if uploads are still in progress
    if (isUploading) {
      toast.error('Please wait for all files to finish uploading');
      return;
    }

    setSubmitting(true);
    try {
      // Create submission document
      // Only trigger AI evaluation if video files are uploaded (not just content links)
      const hasVideoFiles = submissionData.videos.length > 0 || submissionData.rawVideos.length > 0;
      
      console.log('Submitting with data:', {
        hasVideos: submissionData.videos.length > 0,
        hasRawVideos: submissionData.rawVideos.length > 0,
        hasPhotos: submissionData.photos.length > 0,
        hasRawPhotos: submissionData.rawPhotos.length > 0,
        hasContentLink: !!submissionData.contentLink,
        hasVideoFiles,
      });
      
      const submissionDoc = {
        gigId: gig.id,
        creatorId: user.uid,
        version: 1,
        files: {
          videos: submissionData.videos || [], // Only final video files
          photos: submissionData.photos || [], // Only final photo files
          raw: [...(submissionData.rawVideos || []), ...(submissionData.rawPhotos || [])], // All raw files
        },
        contentLink: submissionData.contentLink || null,
        status: 'submitted',
        changeRequestsCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Add product purchase data if reimbursement is required
      if (gig.productInVideoRequired && gig.reimbursementMode === 'reimbursement') {
        if (submissionData.productPurchase.receiptUrl && 
            submissionData.productPurchase.amount) {
          submissionDoc.productPurchase = {
            receiptUrl: submissionData.productPurchase.receiptUrl,
            productPhotoUrl: submissionData.productPurchase.productPhotoUrl || null,
            amount: parseFloat(submissionData.productPurchase.amount) || 0,
            purchaseDate: submissionData.productPurchase.purchaseDate 
              ? new Date(submissionData.productPurchase.purchaseDate)
              : new Date(),
            ocrVerified: false, // Will be verified later
          };
        }
      }

      console.log('Creating submission document:', submissionDoc);
      const submissionRef = await addDoc(collection(db, 'submissions'), submissionDoc);
      const submissionId = submissionRef.id;
      console.log('Submission created with ID:', submissionId);

      // Don't change gig status - keep it 'open' until submission cap is reached
      // The gig will remain available for other creators to submit until it hits the cap

      // ALWAYS trigger AI evaluation for submissions with video files
      // This is the core mechanic - AI grades and scores every submission to move it from pending to approved/rejected
      // Content links cannot be evaluated by AI
      if (hasVideoFiles) {
        setSubmitting(false); // Stop submitting state so we can show evaluation screen
        setEvaluationResult({ status: 'evaluating' });
        
        try {
          console.log('Triggering AI evaluation for submission:', submissionId);
          console.log('AI will grade and score this submission to determine approval status');
          
          const response = await fetch('/api/evaluate-submission', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              submissionId, 
              gigId: gig.id 
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Evaluation failed with status ${response.status}`);
          }

          const result = await response.json();
          console.log('AI evaluation successful:', result);
          
          // Determine if approved or rejected
          const approved = result.evaluation?.compliance?.passed || false;
          const qualityScore = result.evaluation?.quality?.score || 0;
          
          setEvaluationResult({
            status: approved ? 'approved' : 'rejected',
            evaluation: result.evaluation,
            qualityScore,
            compliancePassed: approved,
            payout: gig.calculatedPayout || gig.basePayout || 0,
          });
        } catch (error) {
          console.error('Error during AI evaluation:', error);
          setEvaluationResult({
            status: 'error',
            error: error.message,
          });
        }
      } else {
        // No video files - can't evaluate, redirect to gigs
        toast.error('Warning: No video files uploaded. Your submission will need manual review.');
        router.push('/creator/gigs');
      }
      
    } catch (error) {
      console.error('Error submitting:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      toast.error(`Failed to submit: ${error.message || 'Unknown error. Please try again.'}`);
      setSubmitting(false);
      setEvaluationResult(null);
    }
  };

  // Render evaluation result screen
  if (evaluationResult) {
    if (evaluationResult.status === 'evaluating') {
      return (
        <Layout>
          <div className="max-w-4xl mx-auto py-8">
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="mb-8">
                <div className="text-6xl mb-4 animate-pulse">🤖</div>
                <h2 className="text-3xl font-bold mb-2">AI is Evaluating Your Submission</h2>
                <p className="text-gray-600">Please wait while we analyze your video...</p>
              </div>
              <LoadingSpinner text="Analyzing video quality, compliance, and content..." />
            </div>
          </div>
        </Layout>
      );
    }

    if (evaluationResult.status === 'approved') {
      return (
        <Layout>
          <div className="max-w-4xl mx-auto py-8">
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="mb-8 animate-bounce">
                <div className="text-8xl mb-4">💰</div>
                <div className="text-6xl mb-4 font-bold text-green-600 animate-pulse">CHA CHING!</div>
                <h2 className="text-4xl font-bold mb-2 text-green-600">APPROVED!</h2>
                <p className="text-xl text-gray-700 mb-4">Your submission has been approved!</p>
              </div>
              
              <Card className="w-full max-w-md mb-6">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <div className="text-3xl font-bold text-green-600 mb-1">
                        ${evaluationResult.payout || 0}
                      </div>
                      <div className="text-sm text-gray-600">You'll be paid this amount</div>
                    </div>
                    
                    {evaluationResult.qualityScore !== undefined && (
                      <div className="pt-4 border-t">
                        <div className="text-sm text-gray-600 mb-1">AI Quality Score</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {evaluationResult.qualityScore}/100
                        </div>
                      </div>
                    )}
                    
                    {evaluationResult.evaluation?.quality?.improvementTips && 
                     evaluationResult.evaluation.quality.improvementTips.length > 0 && (
                      <div className="pt-4 border-t text-left">
                        <div className="text-sm font-medium text-gray-700 mb-2">Tips for Next Time:</div>
                        <ul className="space-y-1">
                          {evaluationResult.evaluation.quality.improvementTips.map((tip, idx) => (
                            <li key={idx} className="text-sm text-gray-600">• {tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button
                  onClick={() => router.push('/creator/gigs')}
                  className="bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  View My Gigs
                </Button>
                <Button
                  onClick={() => router.push('/creator/gigs/history')}
                  variant="outline"
                  size="lg"
                >
                  View History
                </Button>
              </div>
            </div>
          </div>
        </Layout>
      );
    }

    if (evaluationResult.status === 'rejected') {
      return (
        <Layout>
          <div className="max-w-4xl mx-auto py-8">
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="mb-8">
                <div className="text-8xl mb-4">❌</div>
                <h2 className="text-4xl font-bold mb-2 text-red-600">NOT APPROVED</h2>
              </div>
              
              <Card className="w-full max-w-md mb-6">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {evaluationResult.qualityScore !== undefined && (
                      <div>
                        <div className="text-sm text-gray-600 mb-1">AI Quality Score</div>
                        <div className="text-2xl font-bold text-red-600">
                          {evaluationResult.qualityScore}/100
                        </div>
                      </div>
                    )}
                    
                    {evaluationResult.evaluation?.quality?.improvementTips && 
                     evaluationResult.evaluation.quality.improvementTips.length > 0 && (
                      <div className="pt-4 border-t text-left">
                        <div className="text-sm font-medium text-gray-700 mb-2">Improvement Tips:</div>
                        <ul className="space-y-1">
                          {evaluationResult.evaluation.quality.improvementTips.map((tip, idx) => (
                            <li key={idx} className="text-sm text-gray-600">• {tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button
                  onClick={() => router.push('/creator/gigs')}
                  variant="outline"
                  size="lg"
                >
                  Back to Gigs
                </Button>
                <Button
                  onClick={() => router.push('/creator/gigs/history')}
                  variant="outline"
                  size="lg"
                >
                  View History
                </Button>
              </div>
            </div>
          </div>
        </Layout>
      );
    }

    if (evaluationResult.status === 'error') {
      return (
        <Layout>
          <div className="max-w-4xl mx-auto py-8">
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="mb-8">
                <div className="text-6xl mb-4">⚠️</div>
                <h2 className="text-3xl font-bold mb-2">Evaluation Error</h2>
                <p className="text-gray-600 mb-4">{evaluationResult.error || 'Something went wrong during evaluation'}</p>
              </div>
              
              <Button
                onClick={() => router.push('/creator/gigs')}
                size="lg"
              >
                Back to Gigs
              </Button>
            </div>
          </div>
        </Layout>
      );
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-8">
          <div className="text-center py-8">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!gig) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Gig Not Found</h1>
          <Link href="/creator/gigs">
            <Button>Back to Gigs</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/creator/gigs/${gig.id}`} className="text-orange-600 hover:underline mb-4 inline-block">
            ← Back to Gig Details
          </Link>
          <h1 className="text-3xl font-bold mb-2">Submit Content</h1>
          <p className="text-lg text-muted-foreground">{gig.title}</p>
        </div>

        <div className="space-y-6">
          {/* Content Link - Show based on platform */}
          {(gig.platform === 'tiktok' || gig.platform === 'instagram' || gig.platform === 'x') && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {gig.platform === 'tiktok' && 'TikTok Link'}
                  {gig.platform === 'instagram' && `Instagram ${gig.instagramFormat === 'story' ? 'Story' : 'Post'} Link`}
                  {gig.platform === 'x' && 'X (Twitter) Post Link'}
                  {gig.contentType === 'video' && gig.deliverables?.videos > 0 && submissionData.videos.length === 0 ? ' *' : ''}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {gig.platform === 'tiktok' && 'Share your TikTok video link'}
                    {gig.platform === 'instagram' && `Share your Instagram ${gig.instagramFormat === 'story' ? 'story' : 'post'} link`}
                    {gig.platform === 'x' && 'Share your X (Twitter) post link'}
                  </label>
                  <Input
                    type="url"
                    placeholder={
                      gig.platform === 'tiktok' ? 'https://www.tiktok.com/@username/video/...' :
                      gig.platform === 'instagram' ? 'https://www.instagram.com/p/...' :
                      'https://x.com/username/status/...'
                    }
                    value={submissionData.contentLink}
                    onChange={(e) => setSubmissionData(prev => ({ ...prev, contentLink: e.target.value }))}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Link to your published content (optional if uploading files)
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Video Files - Only show if contentType is video */}
          {gig.contentType === 'video' && gig.deliverables?.videos > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Video Files *</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Upload video files ({gig.deliverables.videos} required)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="video/*,.mov,.mp4,.avi,.webm,.mkv"
                    onChange={handleVideoChange}
                    className="w-full p-2 border rounded"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload your final video files
                  </p>
                </div>
                {/* Upload Progress */}
                {Object.keys(uploadProgress).filter(id => id.startsWith('videos_')).length > 0 && (
                  <div className="space-y-2">
                    {Object.entries(uploadProgress)
                      .filter(([id]) => id.startsWith('videos_'))
                      .map(([id, progress]) => (
                        <div key={id} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">{progress.fileName}</span>
                            <span className="text-gray-600">{progress.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progress.progress}%` }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                )}
                {submissionData.videos.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Uploaded videos ({submissionData.videos.length}/{gig.deliverables.videos}):</p>
                    {submissionData.videos.map((url, index) => (
                      <div key={index} className="text-xs text-green-600 flex items-center gap-2">
                        ✓ Video {index + 1} uploaded
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Photo Files - Only show if contentType is photo */}
          {gig.contentType === 'photo' && gig.deliverables?.photos > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Photo Files *</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Upload photo files ({gig.deliverables.photos} required)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="w-full p-2 border rounded"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload your final photo files
                  </p>
                </div>
                {/* Upload Progress */}
                {Object.keys(uploadProgress).filter(id => id.startsWith('photos_')).length > 0 && (
                  <div className="space-y-2">
                    {Object.entries(uploadProgress)
                      .filter(([id]) => id.startsWith('photos_'))
                      .map(([id, progress]) => (
                        <div key={id} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">{progress.fileName}</span>
                            <span className="text-gray-600">{progress.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progress.progress}%` }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                )}
                {submissionData.photos.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Uploaded photos ({submissionData.photos.length}/{gig.deliverables.photos}):</p>
                    {submissionData.photos.map((url, index) => (
                      <div key={index} className="text-xs text-green-600 flex items-center gap-2">
                        ✓ Photo {index + 1} uploaded
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Raw Videos */}
          {gig.deliverables.raw && (
            <Card>
              <CardHeader>
                <CardTitle>Raw Videos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Upload raw video files
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="video/*,.mov,.mp4,.avi,.webm,.mkv"
                    onChange={handleRawVideoChange}
                    className="w-full p-2 border rounded"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload unedited video files
                  </p>
                </div>
                {/* Upload Progress */}
                {Object.keys(uploadProgress).filter(id => id.startsWith('raw-videos_')).length > 0 && (
                  <div className="space-y-2">
                    {Object.entries(uploadProgress)
                      .filter(([id]) => id.startsWith('raw-videos_'))
                      .map(([id, progress]) => (
                        <div key={id} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">{progress.fileName}</span>
                            <span className="text-gray-600">{progress.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progress.progress}%` }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                )}
                {submissionData.rawVideos.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Uploaded videos ({submissionData.rawVideos.length}):</p>
                    {submissionData.rawVideos.map((url, index) => (
                      <div key={index} className="text-xs text-green-600 flex items-center gap-2">
                        ✓ Video {index + 1} uploaded
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Raw Photos */}
          {gig.deliverables.raw && (
            <Card>
              <CardHeader>
                <CardTitle>Raw Photos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Upload raw photo files
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleRawPhotoChange}
                    className="w-full p-2 border rounded"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload unedited photo files
                  </p>
                </div>
                {/* Upload Progress */}
                {Object.keys(uploadProgress).filter(id => id.startsWith('raw-photos_')).length > 0 && (
                  <div className="space-y-2">
                    {Object.entries(uploadProgress)
                      .filter(([id]) => id.startsWith('raw-photos_'))
                      .map(([id, progress]) => (
                        <div key={id} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">{progress.fileName}</span>
                            <span className="text-gray-600">{progress.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progress.progress}%` }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                )}
                {submissionData.rawPhotos.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Uploaded photos ({submissionData.rawPhotos.length}):</p>
                    {submissionData.rawPhotos.map((url, index) => (
                      <div key={index} className="text-xs text-green-600 flex items-center gap-2">
                        ✓ Photo {index + 1} uploaded
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Reimbursement Section */}
          {gig.productInVideoRequired && gig.reimbursementMode === 'reimbursement' && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle>Product Purchase Reimbursement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Purchase Amount ($) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={gig.reimbursementCap || 9999}
                    placeholder="0.00"
                    value={submissionData.productPurchase.amount}
                    onChange={(e) => setSubmissionData(prev => ({
                      ...prev,
                      productPurchase: {
                        ...prev.productPurchase,
                        amount: e.target.value,
                      },
                    }))}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum reimbursement: ${gig.reimbursementCap || 0}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Purchase Date *
                  </label>
                  <Input
                    type="date"
                    value={submissionData.productPurchase.purchaseDate}
                    onChange={(e) => setSubmissionData(prev => ({
                      ...prev,
                      productPurchase: {
                        ...prev.productPurchase,
                        purchaseDate: e.target.value,
                      },
                    }))}
                    className="w-full"
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Receipt Photo *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptUpload}
                    className="w-full p-2 border rounded"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload a clear photo of your purchase receipt
                  </p>
                  {/* Upload Progress */}
                  {Object.keys(uploadProgress).filter(id => id.startsWith('receipts_')).length > 0 && (
                    <div className="mt-2 space-y-1">
                      {Object.entries(uploadProgress)
                        .filter(([id]) => id.startsWith('receipts_'))
                        .map(([id, progress]) => (
                          <div key={id} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">{progress.fileName}</span>
                              <span className="text-gray-600">{progress.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress.progress}%` }}
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                  {submissionData.productPurchase.receiptUrl && (
                    <div className="mt-2 text-xs text-green-600">
                      ✓ Receipt uploaded
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Product Photo (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProductPhotoUpload}
                    className="w-full p-2 border rounded"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Optional: Upload a photo of the product you purchased
                  </p>
                  {/* Upload Progress */}
                  {Object.keys(uploadProgress).filter(id => id.startsWith('product-photos_')).length > 0 && (
                    <div className="mt-2 space-y-1">
                      {Object.entries(uploadProgress)
                        .filter(([id]) => id.startsWith('product-photos_'))
                        .map(([id, progress]) => (
                          <div key={id} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">{progress.fileName}</span>
                              <span className="text-gray-600">{progress.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress.progress}%` }}
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                  {submissionData.productPurchase.productPhotoUrl && (
                    <div className="mt-2 text-xs text-green-600">
                      ✓ Product photo uploaded
                    </div>
                  )}
                </div>

                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="text-xs text-blue-800">
                    💡 Reimbursement will be paid with your payout after approval. The reimbursement amount is separate from your base payout and is not subject to platform fees.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Deliverables Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Required Deliverables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {gig.deliverables.videos > 0 && (
                  <div className="flex justify-between">
                    <span>Videos:</span>
                    <span className="font-medium">{gig.deliverables.videos}</span>
                  </div>
                )}
                {gig.deliverables.photos > 0 && (
                  <div className="flex justify-between">
                    <span>Photos:</span>
                    <span className="font-medium">{gig.deliverables.photos}</span>
                  </div>
                )}
                {gig.deliverables.raw && (
                  <div className="flex justify-between">
                    <span>Raw Footage:</span>
                    <span className="font-medium text-green-600">Required</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600 mb-1">${gig.calculatedPayout || gig.basePayout || 0}</div>
                  {gig.payoutType === 'dynamic' && (
                    <p className="text-[10px] text-gray-500 mb-1">Based on your followers</p>
                  )}
                  <div className="text-sm text-muted-foreground">You'll be paid after approval</div>
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || isUploading}
                  className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  size="lg"
                >
                  {isUploading 
                    ? 'Uploading files...' 
                    : submitting 
                      ? 'Submitting...' 
                      : `Submit Content - $${gig.calculatedPayout || gig.basePayout || 0}`
                  }
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Your submission will be reviewed by AI and the brand before approval
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
