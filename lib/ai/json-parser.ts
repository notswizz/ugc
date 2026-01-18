import { AIEvaluation, ComplianceCheck, QualityScore } from './evaluator';

/**
 * Cleans and parses JSON from model output
 */
export function cleanJSON(jsonStr: string): string {
  return jsonStr
    // Remove all control characters except those that might be in string values
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Replace newlines and carriage returns with spaces
    .replace(/[\r\n]/g, ' ')
    // Remove tabs
    .replace(/\t/g, ' ')
    // Fix spacing around JSON structure
    .replace(/\s*{\s*/g, '{')
    .replace(/\s*}\s*/g, '}')
    .replace(/\s*\[\s*/g, '[')
    .replace(/\s*\]\s*/g, ']')
    .replace(/\s*:\s*/g, ':')
    .replace(/\s*,\s*/g, ',')
    // Remove multiple consecutive spaces
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Extracts tips from JSON string (handles multi-line strings)
 */
export function extractTipsFromJSON(jsonStr: string, originalText: string): string[] {
  const tips: string[] = [];
  
  // First try from cleaned JSON
  const tipsMatch = jsonStr.match(/"improvementTips"\s*:\s*\[([^\]]+)\]/i);
  if (tipsMatch) {
    const tipsContent = tipsMatch[1];
    const tipMatches = tipsContent.match(/"([^"\\]*(\\.[^"\\]*)*)"/g);
    if (tipMatches) {
      tips.push(...tipMatches.map(t => {
        let tip = t.replace(/^"|"$/g, '').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        tip = tip.replace(/[\x00-\x1F\x7F]/g, '').trim();
        return tip;
      }).filter(t => t.length > 0));
    }
  }
  
  // If extraction failed, try from original text
  if (tips.length === 0) {
    const originalTipsMatch = originalText.match(/"improvementTips"\s*:\s*\[([\s\S]*?)\]/i);
    if (originalTipsMatch) {
      const tipsContent = originalTipsMatch[1];
      const allQuotedStrings = tipsContent.match(/"([^"]*(?:\n[^"]*)*)"/g);
      if (allQuotedStrings) {
        tips.push(...allQuotedStrings.map(t => {
          let tip = t.replace(/^"|"$/g, '');
          tip = tip.replace(/[\r\n]/g, ' ').replace(/\s+/g, ' ').trim();
          return tip;
        }).filter(t => t.length > 5));
      }
    }
  }
  
  return tips;
}

/**
 * Extracts values from JSON using regex (fallback when JSON.parse fails)
 */
export function extractValuesFromJSON(jsonStr: string): {
  compliance: boolean;
  quality: number;
  breakdown: {
    hook: number;
    visual: number;
    productClarity: number;
    authenticity: number;
    effectiveness: number;
  };
  tips: string[];
} {
  const complianceMatch = jsonStr.match(/"compliance"\s*:\s*(true|false)/i);
  const qualityMatch = jsonStr.match(/"quality"\s*:\s*(\d+)/i);
  const hookMatch = jsonStr.match(/"hook"\s*:\s*(\d+)/i);
  const visualMatch = jsonStr.match(/"visual"\s*:\s*(\d+)/i);
  const productClarityMatch = jsonStr.match(/"productClarity"\s*:\s*(\d+)/i);
  const authenticityMatch = jsonStr.match(/"authenticity"\s*:\s*(\d+)/i);
  const effectivenessMatch = jsonStr.match(/"effectiveness"\s*:\s*(\d+)/i);
  
  return {
    compliance: complianceMatch ? complianceMatch[1].toLowerCase() === 'true' : false,
    quality: qualityMatch ? parseInt(qualityMatch[1]) : 0,
    breakdown: {
      hook: hookMatch ? parseInt(hookMatch[1]) : 0,
      visual: visualMatch ? parseInt(visualMatch[1]) : 0,
      productClarity: productClarityMatch ? parseInt(productClarityMatch[1]) : 0,
      authenticity: authenticityMatch ? parseInt(authenticityMatch[1]) : 0,
      effectiveness: effectivenessMatch ? parseInt(effectivenessMatch[1]) : 0,
    },
    tips: [],
  };
}

/**
 * Parses JSON response from model and converts to AIEvaluation
 */
export function parseJSONResponse(
  gradingText: string,
  gig: any
): AIEvaluation {
  // Look for JSON in the response
  const jsonMatch = gradingText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }
  
  let jsonStr = jsonMatch[0];
  const cleaned = cleanJSON(jsonStr);
  
  // Try to parse the cleaned JSON
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
    console.log('Successfully parsed JSON:', JSON.stringify(parsed, null, 2));
  } catch (firstError) {
    // If that fails, extract values manually
    console.log('First JSON parse attempt failed, trying regex extraction...');
    const extracted = extractValuesFromJSON(cleaned);
    const tips = extractTipsFromJSON(cleaned, gradingText);
    
    parsed = {
      ...extracted,
      improvementTips: tips,
    };
  }
  
  // Extract tips from parsed object
  let finalTips: string[] = [];
  if (Array.isArray(parsed.improvementTips) && parsed.improvementTips.length > 0) {
    finalTips = parsed.improvementTips
      .filter((tip: any) => tip && typeof tip === 'string' && tip.trim().length > 0)
      .map((tip: string) => tip.trim())
      .filter((tip: string) => {
        // Filter out placeholder tips like "tip 1", "tip 2", etc. but keep meaningful tips
        const lowerTip = tip.toLowerCase();
        return !lowerTip.match(/^tip\s*\d+$/i) && tip.length > 3;
      });
  }
  
  // If no tips found from parsed object, try extracting from original text
  if (finalTips.length === 0) {
    const tips = extractTipsFromJSON(cleaned, gradingText);
    finalTips = tips;
  }
  
  console.log('Extracted values:', {
    compliance: parsed.compliance,
    quality: parsed.quality,
    breakdown: parsed.breakdown,
    tipsCount: finalTips.length,
    tips: finalTips
  });
  
  // Validate and structure the response
  return {
    compliance: {
      passed: parsed.compliance === true,
      issues: parsed.compliance === false ? ['Video does not meet compliance requirements'] : [],
      checks: {
        productVisible: parsed.compliance === true,
        requiredMentions: parsed.compliance === true,
        durationCorrect: true,
        audioClear: true,
        noProhibitedContent: parsed.compliance === true,
      },
    },
    // Always include quality score, even if compliance fails
    quality: {
      score: Math.min(100, Math.max(0, parsed.quality || 0)),
      breakdown: {
        hook: Math.min(20, Math.max(0, parsed.breakdown?.hook || 0)),
        lighting: Math.min(20, Math.max(0, parsed.breakdown?.visual || parsed.breakdown?.lighting || 0)),
        productClarity: Math.min(20, Math.max(0, parsed.breakdown?.productClarity || 0)),
        authenticity: Math.min(20, Math.max(0, parsed.breakdown?.authenticity || 0)),
        editing: Math.min(20, Math.max(0, parsed.breakdown?.effectiveness || parsed.breakdown?.editing || 0)),
      },
      improvementTips: finalTips.length > 0 ? finalTips : ['No specific improvement tips provided'],
    },
    timestamp: new Date(),
  };
}
