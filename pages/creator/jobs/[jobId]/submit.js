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
import { calculatePayout, getCreatorFollowingCount } from '@/lib/payments/calculate-payout';

export default function SubmitJob() {
  const router = useRouter();
  const { jobId } = router.query;
  const { user } = useAuth();
  const [job, setJob] = useState(null);
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

  useEffect(() => {
    if (jobId && typeof jobId === 'string') {
      fetchJob();
    }
  }, [jobId]);

  const fetchJob = async () => {
    if (!jobId || typeof jobId !== 'string') return;
    
    try {
      setLoading(true);
      const jobDoc = await getDoc(doc(db, 'jobs', jobId));
      
      if (!jobDoc.exists()) {
        toast.error('Job not found');
        router.push('/creator/jobs');
        return;
      }

      const jobData = jobDoc.data();
      
      // Check if user has accepted this job
      if (jobData.acceptedBy !== user?.uid) {
        toast.error('You have not accepted this job');
        router.push(`/creator/jobs/${jobId}`);
        return;
      }

      // Calculate payout if dynamic
      let payout = jobData.basePayout || 0;
      if (jobData.payoutType === 'dynamic' && user) {
        try {
          const creatorDoc = await getDoc(doc(db, 'creators', user.uid));
          if (creatorDoc.exists()) {
            const creatorData = creatorDoc.data();
            const creatorFollowingCount = getCreatorFollowingCount(creatorData);
            payout = calculatePayout(jobData, creatorFollowingCount);
            setCalculatedPayout(payout);
          }
        } catch (err) {
          console.error('Error calculating payout:', err);
        }
      } else {
        setCalculatedPayout(payout);
      }

      setJob({
        id: jobDoc.id,
        ...jobData,
        deadlineAt: jobData.deadlineAt?.toDate ? jobData.deadlineAt.toDate() : new Date(jobData.deadlineAt),
        calculatedPayout: payout,
      });
    } catch (error) {
      console.error('Error fetching job:', error);
      toast.error('Failed to load job');
      router.push('/creator/jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file, type) => {
    if (!file || !job || !user) return null;
    
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
      const fileName = `${job.id}_${user.uid}_${Date.now()}_${file.name}`;
      const fileRef = ref(storage, `submissions/${job.id}/${user.uid}/${type}/${fileName}`);
      
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
    if (!job || !user) {
      console.error('Cannot submit: missing job or user', { hasJob: !!job, hasUser: !!user });
      toast.error('Missing required information. Please refresh the page.');
      return;
    }
    
    if (submitting) {
      console.log('Already submitting, ignoring duplicate click');
      return;
    }

    // Validation - check against job requirements
    // If job requires videos, they must be uploaded (content links don't work for AI evaluation)
    const hasUploadedVideos = submissionData.videos.length > 0 || submissionData.rawVideos.length > 0;
    const hasPhotos = submissionData.photos.length > 0;
    const hasRaw = !job.deliverables.raw || (submissionData.rawVideos.length > 0 || submissionData.rawPhotos.length > 0);
    
    // Check if minimum requirements are met
    // If job requires videos AND has AI evaluation, videos must be uploaded (not just a link)
    if (job.deliverables.videos > 0) {
      if (job.aiComplianceRequired && !hasUploadedVideos) {
        toast.error(`This campaign requires AI evaluation. Please upload at least ${job.deliverables.videos} video file(s). Content links are not supported for AI evaluation.`);
        return;
      } else if (!hasUploadedVideos && !submissionData.contentLink) {
        toast.error(`Please upload at least ${job.deliverables.videos} video(s) or provide a content link`);
        return;
      }
    }
    
    if (job.deliverables.photos > 0 && !hasPhotos) {
      toast.error(`Please upload at least ${job.deliverables.photos} photo(s)`);
      return;
    }
    
    if (job.deliverables.raw && !hasRaw) {
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
    if (job.aiComplianceRequired && !hasUploadedVideos) {
      toast.error('This campaign requires AI evaluation. Please upload video files. Content links are not supported for AI evaluation.');
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
        jobId: job.id,
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
      if (job.productInVideoRequired && job.reimbursementMode === 'reimbursement') {
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

      // Don't change job status - keep it 'open' until submission cap is reached
      // The job will remain available for other creators to submit until it hits the cap

      // Trigger AI evaluation in the background ONLY if video files are uploaded
      // Content links cannot be evaluated by AI
      if (hasVideoFiles && job.aiComplianceRequired) {
        fetch('/api/evaluate-submission', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            submissionId, 
            jobId: job.id 
          }),
        }).catch(error => {
          console.error('Error triggering evaluation:', error);
          // Don't block submission if evaluation fails
        });
      } else if (!hasVideoFiles && job.aiComplianceRequired) {
        console.warn('AI evaluation required but no video files uploaded. Submission created but will need manual review.');
        toast.error('Warning: This campaign requires AI evaluation, but no video files were uploaded. Your submission will need manual review.');
      }

      toast.success('Submission submitted! It will be reviewed.');
      router.push('/creator/jobs');
      
    } catch (error) {
      console.error('Error submitting:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      toast.error(`Failed to submit: ${error.message || 'Unknown error. Please try again.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-8">
          <div className="text-center py-8">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!job) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Job Not Found</h1>
          <Link href="/creator/jobs">
            <Button>Back to Jobs</Button>
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
          <Link href={`/creator/jobs/${job.id}`} className="text-orange-600 hover:underline mb-4 inline-block">
            ← Back to Job Details
          </Link>
          <h1 className="text-3xl font-bold mb-2">Submit Content</h1>
          <p className="text-lg text-muted-foreground">{job.title}</p>
        </div>

        <div className="space-y-6">
          {/* Content Link */}
          <Card>
            <CardHeader>
              <CardTitle>Content Link {job.deliverables.videos > 0 && submissionData.videos.length === 0 ? '*' : ''}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Share your content link (TikTok, YouTube, Instagram, etc.)
                </label>
                <Input
                  type="url"
                  placeholder="https://www.tiktok.com/@username/video/..."
                  value={submissionData.contentLink}
                  onChange={(e) => setSubmissionData(prev => ({ ...prev, contentLink: e.target.value }))}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Link to your published video/content on any platform (optional if uploading files)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Video Files */}
          {job.deliverables.videos > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Video Files *</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Upload video files ({job.deliverables.videos} required)
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
                    <p className="text-sm font-medium">Uploaded videos ({submissionData.videos.length}/{job.deliverables.videos}):</p>
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

          {/* Photo Files */}
          {job.deliverables.photos > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Photo Files *</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Upload photo files ({job.deliverables.photos} required)
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
                    <p className="text-sm font-medium">Uploaded photos ({submissionData.photos.length}/{job.deliverables.photos}):</p>
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
          {job.deliverables.raw && (
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
          {job.deliverables.raw && (
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
          {job.productInVideoRequired && job.reimbursementMode === 'reimbursement' && (
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
                    max={job.reimbursementCap || 9999}
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
                    Maximum reimbursement: ${job.reimbursementCap || 0}
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
                {job.deliverables.videos > 0 && (
                  <div className="flex justify-between">
                    <span>Videos:</span>
                    <span className="font-medium">{job.deliverables.videos}</span>
                  </div>
                )}
                {job.deliverables.photos > 0 && (
                  <div className="flex justify-between">
                    <span>Photos:</span>
                    <span className="font-medium">{job.deliverables.photos}</span>
                  </div>
                )}
                {job.deliverables.raw && (
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
                  <div className="text-2xl font-bold text-orange-600 mb-1">${job.calculatedPayout || job.basePayout || 0}</div>
                  {job.payoutType === 'dynamic' && (
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
                      : `Submit Content - $${job.calculatedPayout || job.basePayout || 0}`
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
