/**
 * Builds evaluation prompts for video analysis
 */

export interface GigData {
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
export function buildEvaluationPrompt(gig: GigData): string {
  // Use productDescription if provided, otherwise fall back to title/description
  const productDescription = gig.productDescription || gig.title || gig.description || 'the product';
  const productContext = gig.description || gig.primaryThing || '';
  
  // Build product information section
  let productInfo = `Product: ${productDescription}`;
  if (gig.productDescription && (gig.title || gig.description)) {
    productInfo += `\nGig/Gig: ${gig.title || gig.description}`;
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
export function buildRequirementsPrompt(gig: GigData): string {
  const parts: string[] = [];
  
  if (gig.title) {
    parts.push(`Gig Title: ${gig.title}`);
  }
  
  if (gig.description) {
    parts.push(`Description: ${gig.description}`);
  }
  
  if (gig.productInVideoRequired) {
    parts.push(`✓ Product MUST be visible in the video (this is required)`);
  }
  
  if (gig.brief) {
    if (gig.brief.talkingPoints && gig.brief.talkingPoints.length > 0) {
      parts.push(`Key Talking Points: ${gig.brief.talkingPoints.join(', ')}`);
    }
    if (gig.brief.hooks && gig.brief.hooks.length > 0) {
      parts.push(`Suggested Hooks: ${gig.brief.hooks.join(', ')}`);
    }
    if (gig.brief.angles && gig.brief.angles.length > 0) {
      parts.push(`Story Angles: ${gig.brief.angles.join(', ')}`);
    }
    if (gig.brief.do && gig.brief.do.length > 0) {
      parts.push(`Do's: ${gig.brief.do.join(', ')}`);
    }
    if (gig.brief.dont && gig.brief.dont.length > 0) {
      parts.push(`Don'ts: ${gig.brief.dont.join(', ')}`);
    }
  }
  
  if (gig.deliverables?.notes) {
    parts.push(`Additional Notes: ${gig.deliverables.notes}`);
  }
  
  return parts.join('\n');
}
