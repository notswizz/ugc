import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/lib/auth/AuthContext';
import { db, storage } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import Layout from '@/components/layout/Layout';
import { calculatePayout, getCreatorFollowingCount, getCreatorNetPayout } from '@/lib/payments/calculate-payout';
import { validateSubmission, hasVideoFiles } from '@/lib/submissions/validation';
import type { SubmissionData, Gig } from '@/lib/submissions/validation';
import FileUploadSection from './FileUploadSection';
import ProductPurchaseSection from './ProductPurchaseSection';
import EvaluationScreen from './EvaluationScreen';
import EvaluationResult from './EvaluationResult';
import { ArrowLeft, Video, Image as ImageIcon, Link as LinkIcon, FileVideo, CheckCircle2, Loader2, DollarSign } from 'lucide-react';

interface UploadProgress {
  [key: string]: {
    progress: number;
    fileName: string;
  };
}

interface EvaluationResultState {
  status: 'evaluating' | 'approved' | 'rejected' | 'error';
  evaluation?: any;
  qualityScore?: number;
  compliancePassed?: boolean;
  payout?: number;
  error?: string;
}

export default function SubmitGigForm() {
  const router = useRouter();
  const { gigId } = router.query;
  const { user } = useAuth();
  const [gig, setGig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [submissionData, setSubmissionData] = useState<SubmissionData>({
    contentLink: '',
    videos: [],
    photos: [],
    rawVideos: [],
    rawPhotos: [],
    productPurchase: {
      receiptUrl: '',
      productPhotoUrl: '',
      amount: '',
      purchaseDate: '',
    },
  });
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const [isUploading, setIsUploading] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResultState | null>(null);

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

      const deadlineAt = gigData.deadlineAt?.toDate ? gigData.deadlineAt.toDate() : new Date(gigData.deadlineAt);
      if (deadlineAt && deadlineAt.getTime() < Date.now()) {
        toast.error('This gig has ended');
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
          }
        } catch (err) {
          console.error('Error calculating payout:', err);
        }
      }

      const netPayout = getCreatorNetPayout(payout);
      setGig({
        id: gigDoc.id,
        ...gigData,
        deadlineAt,
        calculatedPayout: payout,
        creatorNetPayout: netPayout,
      });
    } catch (error) {
      console.error('Error fetching gig:', error);
      toast.error('Failed to load gig');
      router.push('/creator/gigs');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, type: string): Promise<string | null> => {
    if (!file || !gig || !user) return null;

    const fileId = `${type}_${Date.now()}_${file.name}`;
    setIsUploading(true);

    setUploadProgress((prev) => ({
      ...prev,
      [fileId]: {
        progress: 0,
        fileName: file.name,
      },
    }));

    try {
      const fileName = `${gig.id}_${user.uid}_${Date.now()}_${file.name}`;
      const fileRef = ref(storage, `submissions/${gig.id}/${user.uid}/${type}/${fileName}`);
      const uploadTask = uploadBytesResumable(fileRef, file);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress((prev) => ({
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
            setUploadProgress((prev) => {
              const newProgress = { ...prev };
              delete newProgress[fileId];
              if (Object.keys(newProgress).length === 0) {
                setIsUploading(false);
              }
              return newProgress;
            });
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setUploadProgress((prev) => {
              const newProgress = { ...prev };
              delete newProgress[fileId];
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
      setUploadProgress((prev) => {
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

  const handleFilesChange = async (files: FileList | null, type: string, key: keyof SubmissionData) => {
    if (!files || files.length === 0) return;
    const filesArray = Array.from(files);
    const urls: string[] = [];

    for (const file of filesArray) {
      const url = await handleFileUpload(file, type);
      if (url) urls.push(url);
    }

    setSubmissionData((prev) => ({
      ...prev,
      [key]: [...(prev[key] as string[]), ...urls],
    }));
  };

  const handleSubmit = async () => {
    if (!gig || !user) {
      toast.error('Missing required information. Please refresh the page.');
      return;
    }

    const deadlineMs = gig.deadlineAt ? new Date(gig.deadlineAt).getTime() : null;
    if (deadlineMs != null && deadlineMs < Date.now()) {
      toast.error('This gig has ended');
      return;
    }

    if (submitting) return;

    // Validate
    const error = validateSubmission(gig, submissionData);
    if (error) {
      toast.error(error);
      return;
    }

    if (isUploading) {
      toast.error('Please wait for all files to finish uploading');
      return;
    }

    setSubmitting(true);
    try {
      const hasVideos = hasVideoFiles(submissionData);

      const submissionDoc: any = {
        gigId: gig.id,
        creatorId: user.uid,
        version: 1,
        files: {
          videos: submissionData.videos || [],
          photos: submissionData.photos || [],
          raw: [...(submissionData.rawVideos || []), ...(submissionData.rawPhotos || [])],
        },
        contentLink: submissionData.contentLink || null,
        status: 'submitted',
        changeRequestsCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Add product purchase data if reimbursement is required
      if (gig.productInVideoRequired && gig.reimbursementMode === 'reimbursement') {
        if (submissionData.productPurchase.receiptUrl && submissionData.productPurchase.amount) {
          submissionDoc.productPurchase = {
            receiptUrl: submissionData.productPurchase.receiptUrl,
            productPhotoUrl: submissionData.productPurchase.productPhotoUrl || null,
            amount: parseFloat(submissionData.productPurchase.amount) || 0,
            purchaseDate: submissionData.productPurchase.purchaseDate
              ? new Date(submissionData.productPurchase.purchaseDate)
              : new Date(),
            ocrVerified: false,
          };
        }
      }

      const submissionRef = await addDoc(collection(db, 'submissions'), submissionDoc);
      const submissionId = submissionRef.id;

      // Trigger AI evaluation if video files uploaded
      if (hasVideos) {
        setSubmitting(false);
        setEvaluationResult({ status: 'evaluating' });

        try {
          const response = await fetch('/api/gigs/evaluate-submission', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ submissionId, gigId: gig.id }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Evaluation failed with status ${response.status}`);
          }

          const result = await response.json();
          const approved = result.evaluation?.compliance?.passed || false;
          const qualityScore = result.evaluation?.quality?.score || 0;

          setEvaluationResult({
            status: approved ? 'approved' : 'rejected',
            evaluation: result.evaluation,
            qualityScore,
            compliancePassed: approved,
            payout: gig.creatorNetPayout || getCreatorNetPayout(gig.basePayout || 0),
          });
        } catch (evalError: any) {
          console.error('Error during AI evaluation:', evalError);
          setEvaluationResult({
            status: 'error',
            error: evalError.message,
          });
        }
      } else {
        toast.error('Warning: No video files uploaded. Your submission will need manual review.');
        router.push('/creator/gigs');
      }
    } catch (error: any) {
      console.error('Error submitting:', error);
      toast.error(`Failed to submit: ${error.message || 'Unknown error. Please try again.'}`);
      setSubmitting(false);
      setEvaluationResult(null);
    }
  };

  // Render evaluation states
  if (evaluationResult) {
    if (evaluationResult.status === 'evaluating') {
      return (
        <Layout>
          <EvaluationScreen />
        </Layout>
      );
    }

    return (
      <Layout>
        <EvaluationResult
          status={evaluationResult.status}
          evaluation={evaluationResult.evaluation}
          qualityScore={evaluationResult.qualityScore}
          payout={evaluationResult.payout}
          error={evaluationResult.error}
        />
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            <p className="text-sm text-zinc-500">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!gig) {
    return (
      <Layout>
        <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center px-4">
          <h1 className="text-xl font-bold text-zinc-900 mb-2">Gig Not Found</h1>
          <p className="text-zinc-500 mb-4">This gig may have been removed.</p>
          <Link href="/creator/gigs">
            <Button>Back to Gigs</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const isEnded = gig.deadlineAt && new Date(gig.deadlineAt).getTime() < Date.now();
  const videosUploaded = submissionData.videos.length;
  const videosRequired = gig.deliverables?.videos || 0;
  const photosUploaded = submissionData.photos.length;
  const photosRequired = gig.deliverables?.photos || 0;

  return (
    <Layout>
      <div className="min-h-screen bg-zinc-50 pb-32">
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-lg border-b border-zinc-200">
          <div className="max-w-lg mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <Link href={`/creator/gigs/${gig.id}`} className="p-2 -ml-2 rounded-full hover:bg-zinc-100 transition-colors">
                <ArrowLeft className="w-5 h-5 text-zinc-600" />
              </Link>
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-semibold text-zinc-900 truncate">Submit Content</h1>
                <p className="text-xs text-zinc-500 truncate">{gig.title}</p>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 rounded-full">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-600">{(gig.creatorNetPayout || 0).toFixed(0)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
          {/* Deliverables Progress */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-4">
            <h3 className="text-sm font-semibold text-zinc-900 mb-3">Required Deliverables</h3>
            <div className="space-y-3">
              {videosRequired > 0 && (
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${videosUploaded >= videosRequired ? 'bg-emerald-100' : 'bg-zinc-100'}`}>
                    <Video className={`w-5 h-5 ${videosUploaded >= videosRequired ? 'text-emerald-600' : 'text-zinc-500'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-900">Videos</p>
                    <p className="text-xs text-zinc-500">{videosUploaded} of {videosRequired} uploaded</p>
                  </div>
                  {videosUploaded >= videosRequired && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  )}
                </div>
              )}
              {photosRequired > 0 && (
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${photosUploaded >= photosRequired ? 'bg-emerald-100' : 'bg-zinc-100'}`}>
                    <ImageIcon className={`w-5 h-5 ${photosUploaded >= photosRequired ? 'text-emerald-600' : 'text-zinc-500'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-900">Photos</p>
                    <p className="text-xs text-zinc-500">{photosUploaded} of {photosRequired} uploaded</p>
                  </div>
                  {photosUploaded >= photosRequired && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  )}
                </div>
              )}
              {gig.deliverables?.raw && (
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${(submissionData.rawVideos.length > 0 || submissionData.rawPhotos.length > 0) ? 'bg-emerald-100' : 'bg-zinc-100'}`}>
                    <FileVideo className={`w-5 h-5 ${(submissionData.rawVideos.length > 0 || submissionData.rawPhotos.length > 0) ? 'text-emerald-600' : 'text-zinc-500'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-900">Raw Footage</p>
                    <p className="text-xs text-zinc-500">{submissionData.rawVideos.length + submissionData.rawPhotos.length} files uploaded</p>
                  </div>
                  {(submissionData.rawVideos.length > 0 || submissionData.rawPhotos.length > 0) && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Content Link */}
          {(gig.platform === 'tiktok' || gig.platform === 'instagram' || gig.platform === 'x') && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <LinkIcon className="w-4 h-4 text-zinc-500" />
                <h3 className="text-sm font-semibold text-zinc-900">
                  {gig.platform === 'tiktok' && 'TikTok Link'}
                  {gig.platform === 'instagram' && `Instagram ${gig.instagramFormat === 'story' ? 'Story' : 'Post'} Link`}
                  {gig.platform === 'x' && 'X Post Link'}
                </h3>
                <span className="text-xs text-zinc-400 ml-auto">Optional</span>
              </div>
              <Input
                type="url"
                placeholder={
                  gig.platform === 'tiktok'
                    ? 'https://www.tiktok.com/@username/video/...'
                    : gig.platform === 'instagram'
                    ? 'https://www.instagram.com/p/...'
                    : 'https://x.com/username/status/...'
                }
                value={submissionData.contentLink}
                onChange={(e) =>
                  setSubmissionData((prev) => ({ ...prev, contentLink: e.target.value }))
                }
                className="w-full h-12 rounded-xl border-zinc-200"
              />
            </div>
          )}

          {/* Video Files */}
          {gig.contentType === 'video' && gig.deliverables?.videos > 0 && (
            <FileUploadSection
              title="Video Files"
              type="videos"
              required={gig.deliverables.videos}
              accept="video/*,.mov,.mp4,.avi,.webm,.mkv"
              uploadedUrls={submissionData.videos}
              uploadProgress={uploadProgress}
              onFileChange={(e) => handleFilesChange(e.target.files, 'videos', 'videos')}
              description="Upload your final video files"
              isRequired
            />
          )}

          {/* Photo Files */}
          {gig.contentType === 'photo' && gig.deliverables?.photos > 0 && (
            <FileUploadSection
              title="Photo Files"
              type="photos"
              required={gig.deliverables.photos}
              accept="image/*"
              uploadedUrls={submissionData.photos}
              uploadProgress={uploadProgress}
              onFileChange={(e) => handleFilesChange(e.target.files, 'photos', 'photos')}
              description="Upload your final photo files"
              isRequired
            />
          )}

          {/* Raw Videos */}
          {gig.deliverables?.raw && (
            <FileUploadSection
              title="Raw Videos"
              type="raw-videos"
              accept="video/*,.mov,.mp4,.avi,.webm,.mkv"
              uploadedUrls={submissionData.rawVideos}
              uploadProgress={uploadProgress}
              onFileChange={(e) => handleFilesChange(e.target.files, 'raw-videos', 'rawVideos')}
              description="Upload unedited video files"
            />
          )}

          {/* Raw Photos */}
          {gig.deliverables?.raw && (
            <FileUploadSection
              title="Raw Photos"
              type="raw-photos"
              accept="image/*"
              uploadedUrls={submissionData.rawPhotos}
              uploadProgress={uploadProgress}
              onFileChange={(e) => handleFilesChange(e.target.files, 'raw-photos', 'rawPhotos')}
              description="Upload unedited photo files"
            />
          )}

          {/* Product Purchase Reimbursement */}
          {gig.productInVideoRequired && gig.reimbursementMode === 'reimbursement' && (
            <ProductPurchaseSection
              reimbursementCap={gig.reimbursementCap || 0}
              productPurchase={submissionData.productPurchase}
              onPurchaseChange={(updates) =>
                setSubmissionData((prev) => ({
                  ...prev,
                  productPurchase: { ...prev.productPurchase, ...updates },
                }))
              }
              onReceiptUpload={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const url = await handleFileUpload(file, 'receipts');
                  if (url) {
                    setSubmissionData((prev) => ({
                      ...prev,
                      productPurchase: { ...prev.productPurchase, receiptUrl: url },
                    }));
                  }
                }
              }}
              onProductPhotoUpload={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const url = await handleFileUpload(file, 'product-photos');
                  if (url) {
                    setSubmissionData((prev) => ({
                      ...prev,
                      productPurchase: { ...prev.productPurchase, productPhotoUrl: url },
                    }));
                  }
                }
              }}
              uploadProgress={uploadProgress}
            />
          )}

          {/* AI Review Notice */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">🤖</span>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900">AI-Powered Review</p>
              <p className="text-xs text-blue-700 mt-0.5">Your submission will be instantly reviewed by AI for quality and compliance.</p>
            </div>
          </div>
        </div>

        {/* Fixed Bottom Submit Bar */}
        <div className="fixed bottom-[calc(60px+env(safe-area-inset-bottom))] left-0 right-0 max-w-[428px] mx-auto bg-white border-t border-zinc-200 px-4 py-3 z-40">
          <Button
            onClick={handleSubmit}
            disabled={submitting || isUploading || isEnded}
            className="w-full h-14 text-base font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Uploading...
              </>
            ) : submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Submitting...
              </>
            ) : isEnded ? (
              'Gig Ended'
            ) : (
              <>Submit & Earn ${(gig.creatorNetPayout || 0).toFixed(2)}</>
            )}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
