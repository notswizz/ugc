export interface SubmissionData {
  contentLink: string;
  videos: string[];
  photos: string[];
  rawVideos: string[];
  rawPhotos: string[];
  productPurchase: {
    receiptUrl: string;
    productPhotoUrl: string;
    amount: string;
    purchaseDate: string;
  };
}

export interface Gig {
  id: string;
  deliverables: {
    videos: number;
    photos: number;
    raw: boolean;
  };
  aiComplianceRequired?: boolean;
  productInVideoRequired?: boolean;
  reimbursementMode?: 'reimbursement' | 'shipping';
  reimbursementCap?: number;
  calculatedPayout?: number;
  basePayout?: number;
  deadlineAt?: Date;
}

export function validateSubmission(gig: Gig, submissionData: SubmissionData): string | null {
  const hasUploadedVideos = submissionData.videos.length > 0 || submissionData.rawVideos.length > 0;
  const hasPhotos = submissionData.photos.length > 0;
  const hasRaw = !gig.deliverables.raw || (submissionData.rawVideos.length > 0 || submissionData.rawPhotos.length > 0);

  // Check if minimum requirements are met
  if (gig.deliverables.videos > 0) {
    if (gig.aiComplianceRequired && !hasUploadedVideos) {
      return `This gig requires AI evaluation. Please upload at least ${gig.deliverables.videos} video file(s). Content links are not supported for AI evaluation.`;
    } else if (!hasUploadedVideos && !submissionData.contentLink) {
      return `Please upload at least ${gig.deliverables.videos} video(s) or provide a content link`;
    }
  }

  if (gig.deliverables.photos > 0 && !hasPhotos) {
    return `Please upload at least ${gig.deliverables.photos} photo(s)`;
  }

  if (gig.deliverables.raw && !hasRaw) {
    return 'Please upload raw footage files';
  }

  // At least one form of content must be provided
  if (!submissionData.contentLink && submissionData.videos.length === 0 &&
      submissionData.photos.length === 0 && submissionData.rawVideos.length === 0 &&
      submissionData.rawPhotos.length === 0) {
    return 'Please provide a content link or upload files';
  }

  // If AI evaluation is required, ensure video files are uploaded
  if (gig.aiComplianceRequired && !hasUploadedVideos) {
    return 'This gig requires AI evaluation. Please upload video files. Content links are not supported for AI evaluation.';
  }

  return null;
}

export function hasVideoFiles(submissionData: SubmissionData): boolean {
  return submissionData.videos.length > 0 || submissionData.rawVideos.length > 0;
}
