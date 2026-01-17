import { AIEvaluation } from './evaluator';
import { evaluateVideo } from './video-evaluator';
import { buildEvaluationPrompt } from './prompt-builder';
import { parseJSONResponse } from './json-parser';
import { parseNaturalLanguageResponse } from './text-parser';

export interface EvaluationOptions {
  videoUrl: string;
  job: any;
}

/**
 * Main evaluation service that orchestrates video evaluation
 */
export async function evaluateSubmission(options: EvaluationOptions): Promise<AIEvaluation> {
  const { videoUrl, job } = options;
  
  // Build evaluation prompt
  const prompt = buildEvaluationPrompt(job);
  
  // Call video model
  const outputText = await evaluateVideo({
    videoUrl,
    prompt,
  });
  
  console.log('Video model output:', outputText);
  
  // Parse the response
  try {
    return parseJSONResponse(outputText, job);
  } catch (parseError) {
    console.error('Error parsing JSON response, falling back to text parsing:', parseError);
    // Fallback to text parsing
    return parseNaturalLanguageResponse(outputText, job);
  }
}
