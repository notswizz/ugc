/**
 * AI Evaluation System per plan.txt
 * 
 * Layer 1: Compliance (binary)
 * - Product visible
 * - Required mentions present
 * - Duration correct
 * - Audio clarity
 * - No prohibited content
 * 
 * Layer 2: Quality score (0-100)
 * - Hook strength
 * - Lighting/framing
 * - Product clarity
 * - Energy/authenticity
 * - Editing pace
 */

export interface ComplianceCheck {
  passed: boolean;
  issues: string[];
  checks: {
    productVisible: boolean;
    requiredMentions: boolean;
    durationCorrect: boolean;
    audioClear: boolean;
    noProhibitedContent: boolean;
  };
}

export interface QualityScore {
  score: number; // 0-100
  breakdown: {
    hook: number; // 0-20
    lighting: number; // 0-20
    productClarity: number; // 0-20
    authenticity: number; // 0-20
    editing: number; // 0-20
  };
  improvementTips: string[];
}

export interface AIEvaluation {
  compliance: ComplianceCheck;
  quality?: QualityScore; // Only if compliance passes
  timestamp: Date;
}

/**
 * AI compliance evaluation using Replicate VideoLLaMA 3
 * Calls the evaluation API endpoint
 */
export async function evaluateCompliance(
  submissionId: string,
  jobId: string,
  requirements?: {
    productRequired?: boolean;
    requiredMentions?: string[];
    minDuration?: number;
    maxDuration?: number;
  }
): Promise<ComplianceCheck> {
  try {
    const response = await fetch('/api/evaluate-submission', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ submissionId, jobId }),
    });

    if (!response.ok) {
      throw new Error(`Evaluation API returned ${response.status}`);
    }

    const data = await response.json();
    return data.evaluation.compliance;
  } catch (error) {
    console.error('Error calling evaluation API:', error);
    // Fallback to basic checks if API fails
    return {
      passed: false,
      issues: ['Evaluation service unavailable. Please try again.'],
      checks: {
        productVisible: false,
        requiredMentions: false,
        durationCorrect: false,
        audioClear: false,
        noProhibitedContent: true,
      },
    };
  }
}

/**
 * AI quality scoring using Replicate VideoLLaMA 3
 * Quality score is returned from the evaluation API along with compliance
 */
export async function evaluateQuality(
  submissionId: string,
  jobId: string
): Promise<QualityScore> {
  try {
    const response = await fetch('/api/evaluate-submission', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ submissionId, jobId }),
    });

    if (!response.ok) {
      throw new Error(`Evaluation API returned ${response.status}`);
    }

    const data = await response.json();
    
    if (data.evaluation.quality) {
      return data.evaluation.quality;
    }

    // Fallback if quality not in response
    throw new Error('Quality score not available');
  } catch (error) {
    console.error('Error getting quality score:', error);
    // Return default score if API fails
    return {
      score: 0,
      breakdown: {
        hook: 0,
        lighting: 0,
        productClarity: 0,
        authenticity: 0,
        editing: 0,
      },
      improvementTips: ['Quality evaluation unavailable. Please contact support.'],
    };
  }
}

/**
 * Full AI evaluation pipeline
 */
export async function evaluateSubmission(
  submissionId: string,
  jobId: string,
  requirements?: any
): Promise<AIEvaluation> {
  // Layer 1: Compliance check
  const compliance = await evaluateCompliance(submissionId, jobId, requirements);
  
  // Layer 2: Quality score (only if compliance passes)
  let quality: QualityScore | undefined;
  if (compliance.passed) {
    quality = await evaluateQuality(submissionId, jobId);
  }
  
  return {
    compliance,
    quality,
    timestamp: new Date(),
  };
}
