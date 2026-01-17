/**
 * Builds evaluation prompts for video analysis
 */

export interface JobData {
  title?: string;
  description?: string;
  productDescription?: string; // Specific product description for AI evaluation
  primaryThing?: string;
  brief?: {
    talkingPoints?: string[];
    hooks?: string[];
    angles?: string[];
    do?: string[];
    dont?: string[];
  };
  productInVideoRequired?: boolean;
  deliverables?: {
    notes?: string;
  };
}

/**
 * Builds a simple evaluation prompt for Qwen2.5-Omni
 */
export function buildEvaluationPrompt(job: JobData): string {
  // Use productDescription if provided, otherwise fall back to title/description
  const productDescription = job.productDescription || job.title || job.description || 'the product';
  const productContext = job.description || job.primaryThing || '';
  
  // Build product information section
  let productInfo = `Product: ${productDescription}`;
  if (job.productDescription && (job.title || job.description)) {
    productInfo += `\nCampaign/Job: ${job.title || job.description}`;
  }
  if (productContext && productContext !== productDescription) {
    productInfo += `\nCategory: ${productContext}`;
  }
  
  return `You are evaluating a video advertisement with the following details:

${productInfo}

Analyze the video and determine if it showcases the product described above. Provide your evaluation in JSON format:

{
  "compliance": true or false (is the video about the product and does it showcase it clearly?),
  "quality": 0-100 (overall commercial effectiveness rating),
  "breakdown": {
    "hook": 0-20 (how engaging is the opening?),
    "visual": 0-20 (lighting, framing, composition quality),
    "productClarity": 0-20 (how well is the product showcased?),
    "authenticity": 0-20 (natural delivery, genuine reactions),
    "effectiveness": 0-20 (how well does it work as an advertisement?)
  },
  "improvementTips": ["specific actionable tip", "another helpful suggestion"]
}

IMPORTANT: Provide your actual evaluation scores based on what you see in the video. Do NOT use placeholder values. Each score should reflect the actual quality of the video content you observe.`;
}

/**
 * Builds a detailed requirements prompt (for future use)
 */
export function buildRequirementsPrompt(job: JobData): string {
  const parts: string[] = [];
  
  if (job.title) {
    parts.push(`Job Title: ${job.title}`);
  }
  
  if (job.description) {
    parts.push(`Description: ${job.description}`);
  }
  
  if (job.productInVideoRequired) {
    parts.push(`✓ Product MUST be visible in the video (this is required)`);
  }
  
  if (job.brief) {
    if (job.brief.talkingPoints && job.brief.talkingPoints.length > 0) {
      parts.push(`Key Talking Points: ${job.brief.talkingPoints.join(', ')}`);
    }
    if (job.brief.hooks && job.brief.hooks.length > 0) {
      parts.push(`Suggested Hooks: ${job.brief.hooks.join(', ')}`);
    }
    if (job.brief.angles && job.brief.angles.length > 0) {
      parts.push(`Story Angles: ${job.brief.angles.join(', ')}`);
    }
    if (job.brief.do && job.brief.do.length > 0) {
      parts.push(`Do's: ${job.brief.do.join(', ')}`);
    }
    if (job.brief.dont && job.brief.dont.length > 0) {
      parts.push(`Don'ts: ${job.brief.dont.join(', ')}`);
    }
  }
  
  if (job.deliverables?.notes) {
    parts.push(`Additional Notes: ${job.deliverables.notes}`);
  }
  
  return parts.join('\n');
}
