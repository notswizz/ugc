import type { NextApiRequest, NextApiResponse } from 'next';
import admin, { adminDb } from '@/lib/firebase/admin';
import { evaluateSubmission } from '@/lib/ai/evaluation-service';
import { processPayment } from '@/lib/payments/processor';
import { createNotification } from '@/lib/notifications/service';
import { awardGigCompletionRepAdmin, awardAIScoreRepAdmin, deductFailedSubmissionRepAdmin } from '@/lib/rep/admin-service';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { submissionId, gigId } = req.body;

  if (!submissionId || !gigId) {
    return res.status(400).json({ error: 'Missing submissionId or gigId' });
  }

  try {
    // Validate Firebase Admin initialization
    if (!adminDb) {
      console.error('Firebase Admin not initialized. Check environment variables:');
      console.error('- FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'Set' : 'Missing');
      console.error('- FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Missing');
      console.error('- FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'Set' : 'Missing');
      return res.status(500).json({ 
        error: 'Firebase Admin not initialized',
        message: 'Please configure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in your environment variables'
      });
    }

    // Verify Admin SDK connection
    try {
      await admin.app().options.credential?.getAccessToken();
      console.log('Access token retrieved successfully');
    } catch (tokenError: any) {
      console.error('Failed to get access token:', tokenError.message);
    }

    // Fetch submission and gig data
    let submissionDoc, gigDoc;
    try {
      submissionDoc = await adminDb.collection('submissions').doc(submissionId).get();
      gigDoc = await adminDb.collection('gigs').doc(gigId).get();
    } catch (authError: any) {
      console.error('Firebase Admin authentication error:', authError);
      return res.status(500).json({ 
        error: 'Firebase Admin authentication failed',
        message: 'Please verify your Firebase Admin credentials are correct.',
        code: authError.code
      });
    }

    if (!submissionDoc.exists || !gigDoc.exists) {
      return res.status(404).json({ error: 'Submission or gig not found' });
    }

    const submission = submissionDoc.data();
    const gig = gigDoc.data();
    
    // Store previous state for comparison
    const previousStatus = submission.status;
    const previousEvaluation = submission.aiEvaluation;

    // Debug: Log submission structure
    console.log('Submission data:', {
      hasFiles: !!submission.files,
      filesKeys: submission.files ? Object.keys(submission.files) : [],
      videos: submission.files?.videos,
      raw: submission.files?.raw,
      contentLink: submission.contentLink,
    });

    // Get video URLs from submission - ONLY accept uploaded files, not links
    // Check files.videos first, then files.raw (filtering for video extensions)
    let videoFiles: string[] = [];
    
    if (submission.files?.videos && Array.isArray(submission.files.videos) && submission.files.videos.length > 0) {
      videoFiles = submission.files.videos;
    } else if (submission.files?.raw && Array.isArray(submission.files.raw)) {
      videoFiles = submission.files.raw.filter((url: string) => 
        url && typeof url === 'string' && url.match(/\.(mp4|mov|avi|webm|mkv)$/i)
      );
    }

    console.log('Found video files:', videoFiles);

    if (videoFiles.length === 0) {
      console.error('No video files found. Submission structure:', JSON.stringify(submission, null, 2));
      return res.status(400).json({ 
        error: 'No video files found in submission',
        message: 'Please upload video files. Content links are not supported for AI evaluation.',
        debug: {
          hasFiles: !!submission.files,
          filesStructure: submission.files ? Object.keys(submission.files) : [],
          videosCount: submission.files?.videos?.length || 0,
          rawCount: submission.files?.raw?.length || 0,
        }
      });
    }

    // Use the first video file for evaluation
    const videoUrl = videoFiles[0];
    console.log('Using uploaded video file for evaluation:', videoUrl);
    
    // Validate video URL is accessible
    if (!videoUrl || typeof videoUrl !== 'string' || !videoUrl.startsWith('http')) {
      console.error('Invalid video URL:', videoUrl);
      return res.status(400).json({ 
        error: 'Invalid video URL',
        message: 'The video URL is not valid or accessible.'
      });
    }

    // Evaluate the video using the evaluation service
    console.log('Starting AI evaluation...', {
      videoUrl,
      gigId,
      submissionId,
      hasProductDescription: !!gig.productDescription,
      aiComplianceRequired: gig.aiComplianceRequired,
    });
    
    let evaluation;
    try {
      evaluation = await evaluateSubmission({
        videoUrl,
        gig,
      });
      console.log('AI evaluation completed successfully:', {
        compliancePassed: evaluation.compliance.passed,
        qualityScore: evaluation.quality?.score,
        hasQualityBreakdown: !!evaluation.quality?.breakdown,
      });
    } catch (evalError: any) {
      console.error('Error during AI evaluation:', evalError);
      console.error('Evaluation error details:', {
        message: evalError.message,
        stack: evalError.stack,
        code: evalError.code,
      });
      throw evalError;
    }

    // Prepare evaluation data for Firestore
    const aiEvaluationData = {
      compliancePassed: evaluation.compliance.passed,
      complianceIssues: evaluation.compliance.issues,
      qualityScore: evaluation.quality?.score || 0,
      qualityBreakdown: evaluation.quality?.breakdown || {
        hook: 0,
        lighting: 0,
        productClarity: 0,
        authenticity: 0,
        editing: 0,
      },
      improvementTips: evaluation.quality?.improvementTips || [],
    };

    // Prepare update data - always replace the entire aiEvaluation object
    const updateData: any = {
      aiEvaluation: aiEvaluationData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Handle status changes based on compliance result
    if (evaluation.compliance.passed) {
      updateData.status = 'approved';
      console.log('Submission passed compliance check - auto-approving');
    } else {
      // When submission fails, mark it as 'rejected' - they cannot resubmit
      updateData.status = 'rejected';
      if (previousStatus === 'approved') {
        console.log('Submission failed re-evaluation - changing status from approved to rejected');
      } else {
        console.log('Submission failed AI evaluation - marking as rejected');
      }
    }

    // Update submission in Firestore
    await adminDb.collection('submissions').doc(submissionId).update(updateData);

    // Check if this is a new approval (for notifications and payments)
    // A submission is newly approved if: it passes compliance AND it wasn't already approved
    const isNewApproval = evaluation.compliance.passed && previousStatus !== 'approved';
    
    // Check if this is a new failure (for notifications)
    // A submission newly fails if: it fails compliance AND it wasn't already failed (was submitted or approved before)
    const isNewFailure = !evaluation.compliance.passed && 
                         (previousStatus === 'submitted' || previousStatus === 'approved');
    
    console.log('Payment check:', {
      compliancePassed: evaluation.compliance.passed,
      previousStatus,
      isNewApproval,
      isNewFailure,
      creatorId: submission.creatorId,
    });
    
    // Handle notifications for both success and failure
    if (submission.creatorId) {
      const jobTitle = gig.title || 'Your submission';
      
      if (isNewApproval) {
        console.log('Processing payment for newly approved submission:', submissionId);
        
        // Create approval notification
        try {
          await createNotification({
            userId: submission.creatorId,
            type: 'submission_approved',
            title: 'Submission Approved! 🎉',
            message: `Your submission for "${jobTitle}" has been approved by AI evaluation. Quality score: ${aiEvaluationData.qualityScore}/100`,
            submissionId: submissionId,
            gigId: gigId,
          });
          console.log('Approval notification created successfully');
        } catch (notifError) {
          console.error('Error creating approval notification:', notifError);
          // Don't fail the whole request if notification creation fails
        }
      } else if (isNewFailure) {
        console.log('Creating failure notification for submission:', submissionId);
        
        // Deduct rep for failed submission
        try {
          console.log('Deducting rep for failed submission from creator:', submission.creatorId);
          await deductFailedSubmissionRepAdmin(submission.creatorId);
          console.log('✅ Rep deducted successfully');
        } catch (repError) {
          console.error('❌ Error deducting rep:', repError);
          // Don't fail the whole request if rep deduction fails
        }
        
        // Create failure notification
        try {
          const complianceIssues = evaluation.compliance.issues || [];
          const issuesText = complianceIssues.length > 0 
            ? ` Issues: ${complianceIssues.slice(0, 2).join(', ')}${complianceIssues.length > 2 ? '...' : ''}`
            : '';
          
          await createNotification({
            userId: submission.creatorId,
            type: 'submission_failed',
            title: 'Submission Needs Changes ⚠️',
            message: `Your submission for "${jobTitle}" did not pass AI evaluation.${issuesText}`,
            submissionId: submissionId,
            gigId: gigId,
          });
          console.log('Failure notification created successfully');
        } catch (notifError) {
          console.error('Error creating failure notification:', notifError);
          // Don't fail the whole request if notification creation fails
        }
      }
    }
    
    if (isNewApproval && submission.creatorId) {

      // Award rep for completing the gig
      try {
        console.log('Awarding gig completion rep to creator:', submission.creatorId);
        await awardGigCompletionRepAdmin(submission.creatorId);
        
        // Award bonus rep based on AI score
        const qualityScore = aiEvaluationData.qualityScore;
        if (qualityScore >= 70) {
          console.log(`Awarding AI score bonus rep (score: ${qualityScore})`);
          await awardAIScoreRepAdmin(submission.creatorId, qualityScore);
        }
        
        console.log('✅ Rep awarded successfully');
      } catch (repError) {
        console.error('❌ Error awarding rep:', repError);
        // Don't fail the whole request if rep awarding fails
      }

      // Process automatic payment
      try {
        console.log('Attempting to process payment:', {
          submissionId,
          gigId,
          creatorId: submission.creatorId,
          brandId: gig.brandId,
          basePayout: gig.basePayout,
        });
        
        await processPayment({
          submissionId,
          gigId,
          creatorId: submission.creatorId,
          brandId: gig.brandId,
          gig,
          submission,
        });
        console.log('✅ Payment processed successfully for submission:', submissionId);
      } catch (paymentError: any) {
        console.error('❌ Error processing payment:', paymentError);
        console.error('Payment error details:', {
          message: paymentError.message,
          stack: paymentError.stack,
        });
        // Don't fail the whole request if payment processing fails
      }
    } else {
      if (!isNewApproval) {
        console.log('Skipping payment - not a new approval:', {
          compliancePassed: evaluation.compliance.passed,
          previousStatus,
        });
      }
      if (!submission.creatorId) {
        console.log('Skipping payment - no creatorId found');
      }
    }

    return res.status(200).json({ 
      success: true, 
      evaluation, 
      autoApproved: evaluation.compliance.passed 
    });
  } catch (error: any) {
    console.error('Error evaluating submission:', error);
    
    // Provide detailed error messages
    let errorMessage = 'Evaluation failed';
    let errorDetails = error.message;
    
    if (error.code === 16 || error.message?.includes('UNAUTHENTICATED')) {
      errorMessage = 'Firebase Admin authentication failed';
      errorDetails = 'Please check your Firebase Admin credentials in .env.local. Make sure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set correctly.';
    } else if (error.message?.includes('permission-denied')) {
      errorMessage = 'Permission denied';
      errorDetails = 'Firebase Admin does not have permission to access this data. Check your Firestore security rules.';
    }
    
    return res.status(500).json({ 
      error: errorMessage, 
      message: errorDetails,
      code: error.code
    });
  }
}
