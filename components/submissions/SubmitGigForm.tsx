import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/lib/auth/AuthContext';
import { db, storage } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import toast from 'react-hot-toast';
import Layout from '@/components/layout/Layout';
import { calculatePayout, getCreatorFollowingCount } from '@/lib/payments/calculate-payout';
import { validateSubmission, hasVideoFiles } from '@/lib/submissions/validation';
import type { SubmissionData, Gig } from '@/lib/submissions/validation';
import FileUploadSection from './FileUploadSection';
import ProductPurchaseSection from './ProductPurchaseSection';
import EvaluationScreen from './EvaluationScreen';
import EvaluationResult from './EvaluationResult';

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

      setGig({
        id: gigDoc.id,
        ...gigData,
        deadlineAt,
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
          const response = await fetch('/api/evaluate-submission', {
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
            payout: gig.calculatedPayout || gig.basePayout || 0,
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

  const isEnded = gig.deadlineAt && new Date(gig.deadlineAt).getTime() < Date.now();

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
          {/* Content Link */}
          {(gig.platform === 'tiktok' || gig.platform === 'instagram' || gig.platform === 'x') && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {gig.platform === 'tiktok' && 'TikTok Link'}
                  {gig.platform === 'instagram' && `Instagram ${gig.instagramFormat === 'story' ? 'Story' : 'Post'} Link`}
                  {gig.platform === 'x' && 'X (Twitter) Post Link'}
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Link to your published content (optional if uploading files)
                </p>
              </CardContent>
            </Card>
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

          {/* Deliverables Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Required Deliverables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {gig.deliverables?.videos > 0 && (
                  <div className="flex justify-between">
                    <span>Videos:</span>
                    <span className="font-medium">{gig.deliverables.videos}</span>
                  </div>
                )}
                {gig.deliverables?.photos > 0 && (
                  <div className="flex justify-between">
                    <span>Photos:</span>
                    <span className="font-medium">{gig.deliverables.photos}</span>
                  </div>
                )}
                {gig.deliverables?.raw && (
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
                  <div className="text-2xl font-bold text-orange-600 mb-1">
                    ${gig.calculatedPayout || gig.basePayout || 0}
                  </div>
                  {gig.payoutType === 'dynamic' && (
                    <p className="text-[10px] text-gray-500 mb-1">Based on your followers</p>
                  )}
                  <div className="text-sm text-muted-foreground">You'll be paid after approval</div>
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || isUploading || isEnded}
                  className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  size="lg"
                >
                  {isUploading
                    ? 'Uploading files...'
                    : submitting
                    ? 'Submitting...'
                    : isEnded
                    ? 'Gig ended'
                    : `Submit Content - $${gig.calculatedPayout || gig.basePayout || 0}`}
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
