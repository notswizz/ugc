import { AIEvaluation } from './evaluator';

/**
 * Parses natural language response as fallback when JSON parsing fails
 */
export function parseNaturalLanguageResponse(outputText: string, gig: any): AIEvaluation {
  const lowerOutput = outputText.toLowerCase();
  const productName = (gig.title || gig.description || 'product').toLowerCase();
  
  // Extract compliance from questions 2 and 3
  const isAboutProduct = !lowerOutput.includes('no') && 
                         !lowerOutput.includes('not about') &&
                         (lowerOutput.includes('yes') || 
                          lowerOutput.includes('is about') ||
                          lowerOutput.includes(productName) ||
                          lowerOutput.includes('related to'));
  
  const showcasesProduct = !lowerOutput.includes('no') &&
                           !lowerOutput.includes('cannot see') &&
                           !lowerOutput.includes('not visible') &&
                           !lowerOutput.includes('not clear') &&
                           (lowerOutput.includes('yes') ||
                            lowerOutput.includes('showcase') ||
                            lowerOutput.includes('visible') ||
                            lowerOutput.includes('clearly') ||
                            lowerOutput.includes('can see'));
  
  const compliancePassed = isAboutProduct && showcasesProduct;
  
  // Extract quality score (look for a number 1-100)
  let qualityScore = 0;
  const scoreMatches = [
    outputText.match(/rate[^\d]*(\d{1,3})/i),
    outputText.match(/score[^\d]*(\d{1,3})/i),
    outputText.match(/(?:^|\s)(\d{1,3})(?:\s|$)/),
  ];
  
  for (const match of scoreMatches) {
    if (match) {
      const num = parseInt(match[1]);
      if (num >= 1 && num <= 100) {
        qualityScore = num;
        break;
      }
    }
  }
  
  // If no score found, try to extract from the end of the response
  if (qualityScore === 0) {
    const lines = outputText.split('\n').filter(l => l.trim());
    const lastLine = lines[lines.length - 1] || '';
    const lastLineMatch = lastLine.match(/(\d{1,3})/);
    if (lastLineMatch) {
      const num = parseInt(lastLineMatch[1]);
      if (num >= 1 && num <= 100) {
        qualityScore = num;
      }
    }
  }
  
  // Default to 50 if no score found
  if (qualityScore === 0) {
    qualityScore = 50;
  }
  
  // Extract tips
  const tips: string[] = [];
  if (lowerOutput.includes('improve') || lowerOutput.includes('better') || 
      lowerOutput.includes('could') || lowerOutput.includes('suggest')) {
    const sentences = outputText.split(/[.!?]\s+/);
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if ((lowerSentence.includes('improve') || 
           lowerSentence.includes('better') ||
           lowerSentence.includes('could') ||
           lowerSentence.includes('should') ||
           lowerSentence.includes('suggest')) &&
          sentence.length > 20 && sentence.length < 200) {
        tips.push(sentence.trim());
      }
    }
  }
  
  // If no tips found, generate generic ones
  const finalTips = tips.length > 0 
    ? tips.slice(0, 3)
    : qualityScore < 50
      ? ['Consider improving product visibility and clarity', 'Add more engaging content to capture attention']
      : qualityScore < 75
        ? ['Good overall quality, minor improvements could enhance effectiveness']
        : ['Excellent commercial quality, well done!'];
  
  // Extract issues if compliance failed
  const issues: string[] = [];
  if (!isAboutProduct) {
    issues.push('Video does not appear to be about the product');
  }
  if (!showcasesProduct) {
    issues.push('Product is not clearly visible or showcased');
  }
  
  return {
    compliance: {
      passed: compliancePassed,
      issues,
      checks: {
        productVisible: showcasesProduct,
        requiredMentions: isAboutProduct,
        durationCorrect: true,
        audioClear: !lowerOutput.includes('audio unclear') && !lowerOutput.includes('inaudible'),
        noProhibitedContent: !lowerOutput.includes('inappropriate') && !lowerOutput.includes('prohibited'),
      },
    },
    quality: compliancePassed ? {
      score: qualityScore,
      breakdown: {
        hook: Math.round(qualityScore * 0.2),
        lighting: Math.round(qualityScore * 0.2),
        productClarity: showcasesProduct ? Math.round(qualityScore * 0.2) : Math.round(qualityScore * 0.1),
        authenticity: Math.round(qualityScore * 0.2),
        editing: Math.round(qualityScore * 0.2),
      },
      improvementTips: finalTips,
    } : undefined,
    timestamp: new Date(),
  };
}
