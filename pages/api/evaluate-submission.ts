import type { NextApiRequest, NextApiResponse } from 'next';
import admin, { adminDb } from '@/lib/firebase/admin';
import { evaluateSubmission } from '@/lib/ai/evaluation-service';
import { processPayment } from '@/lib/payments/processor';
import { createNotification } from '@/lib/notifications/service';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { submissionId, jobId } = req.body;

  if (!submissionId || !jobId) {
    return res.status(400).json({ error: 'Missing submissionId or jobId' });
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

    // Fetch submission and job data
    let submissionDoc, jobDoc;
    try {
      submissionDoc = await adminDb.collection('submissions').doc(submissionId).get();
      jobDoc = await adminDb.collection('jobs').doc(jobId).get();
    } catch (authError: any) {
      console.error('Firebase Admin authentication error:', authError);
      return res.status(500).json({ 
        error: 'Firebase Admin authentication failed',
        message: 'Please verify your Firebase Admin credentials are correct.',
        code: authError.code
      });
    }

    if (!submissionDoc.exists || !jobDoc.exists) {
      return res.status(404).json({ error: 'Submission or job not found' });
    }

    const submission = submissionDoc.data();
    const job = jobDoc.data();
    
    // Store previous state for comparison
    const previousStatus = submission.status;
    const previousEvaluation = submission.aiEvaluation;

    // Get video URLs from submission - ONLY accept uploaded files, not links
    const videoFiles = submission.files?.videos || submission.files?.raw?.filter((url: string) => 
      url.match(/\.(mp4|mov|avi|webm|mkv)$/i)
    ) || [];

    if (videoFiles.length === 0) {
      return res.status(400).json({ 
        error: 'No video files found in submission',
        message: 'Please upload video files. Content links are not supported for AI evaluation.'
      });
    }

    // Use the first video file for evaluation
    const videoUrl = videoFiles[0];
    console.log('Using uploaded video file for evaluation:', videoUrl);

    // Evaluate the video using the evaluation service
    const evaluation = await evaluateSubmission({
      videoUrl,
      job,
    });

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
      const jobTitle = job.title || 'Your submission';
      
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
            jobId: jobId,
          });
          console.log('Approval notification created successfully');
        } catch (notifError) {
          console.error('Error creating approval notification:', notifError);
          // Don't fail the whole request if notification creation fails
        }
      } else if (isNewFailure) {
        console.log('Creating failure notification for submission:', submissionId);
        
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
            jobId: jobId,
          });
          console.log('Failure notification created successfully');
        } catch (notifError) {
          console.error('Error creating failure notification:', notifError);
          // Don't fail the whole request if notification creation fails
        }
      }
    }
    
    if (isNewApproval && submission.creatorId) {

      // Process automatic payment
      try {
        console.log('Attempting to process payment:', {
          submissionId,
          jobId,
          creatorId: submission.creatorId,
          brandId: job.brandId,
          basePayout: job.basePayout,
        });
        
        await processPayment({
          submissionId,
          jobId,
          creatorId: submission.creatorId,
          brandId: job.brandId,
          job,
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
