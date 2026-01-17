import Replicate from 'replicate';
import { AIEvaluation } from './evaluator';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const MODEL_NAME = 'lucataco/qwen2.5-omni-7b';

export interface VideoEvaluationOptions {
  videoUrl: string;
  prompt: string;
}

/**
 * Evaluates a video using Qwen2.5-Omni-7B model
 */
export async function evaluateVideo(options: VideoEvaluationOptions): Promise<string> {
  const { videoUrl, prompt } = options;
  
  try {
    // Get the model to check its input schema
    let model;
    let latestVersionId;
    let version;
    let inputSchema;
    
    try {
      model = await replicate.models.get("lucataco", "qwen2.5-omni-7b");
      latestVersionId = model.latest_version.id;
      version = await replicate.models.versions.get("lucataco", "qwen2.5-omni-7b", latestVersionId);
      inputSchema = version.openapi_schema?.components?.schemas?.Input?.properties;
      
      console.log('Qwen2.5-Omni model found:', model.name);
      console.log('Latest version ID:', latestVersionId);
    } catch (modelError: any) {
      console.error('Error fetching Qwen2.5-Omni model:', modelError);
      inputSchema = null;
    }
    
    let output;
    
    if (inputSchema) {
      // Use the actual parameter names from the schema
      const inputParams: any = {};
      
      // ALWAYS set video parameter first (Qwen2.5-Omni requires it)
      // Find the video parameter - must be exactly 'video' or a clear video input parameter
      const videoParam = Object.keys(inputSchema).find(key => 
        key.toLowerCase() === 'video' ||
        (key.toLowerCase().includes('video') && 
         !key.toLowerCase().includes('audio') && 
         !key.toLowerCase().includes('generate'))
      );
      
      // Set video parameter - use schema name if found, otherwise use 'video'
      if (videoParam) {
        inputParams[videoParam] = videoUrl;
      } else {
        // Default to 'video' parameter name
        inputParams.video = videoUrl;
      }
      
      // Find the prompt parameter
      const promptParam = Object.keys(inputSchema).find(key => 
        key.toLowerCase() === 'prompt' || 
        key.toLowerCase().includes('prompt') || 
        key.toLowerCase().includes('text') || 
        key.toLowerCase().includes('question')
      );
      if (promptParam) {
        inputParams[promptParam] = prompt;
      }
      
      // Set system_prompt for Qwen2.5-Omni (optional but recommended)
      if (inputSchema.system_prompt !== undefined) {
        inputParams.system_prompt = "You are an AI video evaluator for a UGC (User Generated Content) platform. Your role is to analyze video submissions created by creators for brand advertising campaigns. You evaluate videos based on product visibility, commercial quality, visual appeal, and effectiveness as advertisements. Provide objective, detailed assessments in JSON format.";
      }
      
      // Set generate_audio to false to only get text/JSON output (boolean type)
      if (inputSchema.generate_audio !== undefined) {
        inputParams.generate_audio = false;
      }
      
      // Set use_audio_in_video to false if it exists (boolean type)
      if (inputSchema.use_audio_in_video !== undefined) {
        inputParams.use_audio_in_video = false;
      }
      
      // Make sure all boolean parameters are actually booleans, not strings
      Object.keys(inputParams).forEach(key => {
        const schemaProp = inputSchema[key];
        if (schemaProp && schemaProp.type === 'boolean' && typeof inputParams[key] !== 'boolean') {
          // Skip video and prompt params, only fix boolean ones
          if (key !== 'video' && key !== 'prompt') {
            inputParams[key] = inputParams[key] === 'true' || inputParams[key] === true;
          }
        }
      });
      
      console.log('Using input parameters:', inputParams);
      
      // Use Qwen2.5-Omni model with version ID
      const modelIdentifier = `${MODEL_NAME}:${latestVersionId}` as `${string}/${string}:${string}`;
      console.log('Using model identifier:', modelIdentifier);
      
      output = await replicate.run(modelIdentifier, { input: inputParams });
    } else {
      // Fallback: use 'video' parameter (Qwen2.5-Omni expects 'video', not 'media')
      output = await replicate.run(
        MODEL_NAME,
        {
          input: {
            video: videoUrl,
            prompt: prompt,
            generate_audio: false, // Only get text/JSON output
          }
        }
      );
    }
    
    // Convert output to string
    // Qwen2.5-Omni returns an object with { text: string, voice: null } structure
    if (typeof output === 'object' && output !== null) {
      // Extract text property from output object
      if ('text' in output && output.text != null) {
        return String(output.text);
      }
      // If it's an array, join it
      if (Array.isArray(output)) {
        return output.join('\n');
      }
      // Try JSON.stringify for other objects
      return JSON.stringify(output);
    }
    return String(output);
  } catch (apiError: any) {
    console.error('Replicate API error:', apiError);
    
    // If schema lookup fails, try common parameter combinations
    if (apiError.status === 422 || apiError.message?.includes('not allowed')) {
      console.log('Trying fallback parameter combinations...');
      
      // Try different parameter name combinations (Qwen2.5-Omni uses 'video')
      const attempts = [
        { video: videoUrl, prompt, generate_audio: false },
        { video: videoUrl, prompt },
        { video_url: videoUrl, prompt },
        { media: videoUrl, prompt },
        { video: videoUrl, text: prompt },
      ];
      
      let lastError = apiError;
      for (const attempt of attempts) {
        try {
          const output = await replicate.run(MODEL_NAME, { input: attempt });
          // Handle object output from Qwen2.5-Omni
          if (typeof output === 'object' && output !== null) {
            if ('text' in output) {
              return String(output.text);
            }
            if (Array.isArray(output)) {
              return output.join('\n');
            }
            return JSON.stringify(output);
          }
          return String(output);
        } catch (err: any) {
          lastError = err;
          continue;
        }
      }
      
      throw new Error(`Failed to call Replicate API. Model may not support these parameters. Error: ${lastError.message}`);
    } else {
      throw apiError;
    }
  }
}
