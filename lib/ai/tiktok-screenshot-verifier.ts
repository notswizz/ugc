import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const LLAVA_MODEL = 'yorickvp/llava-13b:80537f9eead1a5bfa72d5ac6ea6414379be41d4d4f6679fd776e9535d1eb58bb';

export interface TikTokVerifyResult {
  gigletInBio: boolean;
  username: string | null;
  followerCount: number | null;
  raw?: string;
}

const PROMPT = `This image is a screenshot of a TikTok profile page. Look at it carefully.

You must respond with ONLY a JSON object, no other text. Use this exact format:
{"gigletInBio": true or false, "username": "the @ username without @", "followerCount": number or null}

Rules:
1. gigletInBio: true ONLY if the exact word "GIGLET" (all caps) appears in the profile bio. Otherwise false.
2. username: The TikTok username/handle shown (without the @ symbol). If not visible, use null.
3. followerCount: The follower count number shown (e.g. 12500). If not visible or unreadable, use null. Use only digits, no "K", "M", commas.

Reply with ONLY the JSON object.`;

/**
 * Verify TikTok screenshot: GIGLET in bio, extract username and follower count.
 */
export async function verifyTikTokScreenshot(imageUrl: string): Promise<TikTokVerifyResult> {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN is not set');
  }

  const output = await replicate.run(LLAVA_MODEL, {
    input: {
      image: imageUrl,
      prompt: PROMPT,
    },
  });

  let text = '';
  if (typeof output === 'string') {
    text = output;
  } else if (typeof output === 'object' && output !== null && 'output' in output) {
    text = Array.isArray((output as any).output) ? (output as any).output.join('') : String((output as any).output);
  } else if (Array.isArray(output)) {
    text = output.join('');
  } else {
    text = JSON.stringify(output);
  }

  // Extract JSON from response (model might wrap in markdown or extra text)
  const jsonMatch = text.match(/\{[\s\S]*"gigletInBio"[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : text;

  try {
    const parsed = JSON.parse(jsonStr) as { gigletInBio?: boolean; username?: string | null; followerCount?: number | null };
    return {
      gigletInBio: !!parsed.gigletInBio,
      username: typeof parsed.username === 'string' ? parsed.username.replace(/^@/, '').trim() || null : null,
      followerCount:
        typeof parsed.followerCount === 'number' && parsed.followerCount >= 0
          ? parsed.followerCount
          : typeof parsed.followerCount === 'string'
            ? parseInt(parsed.followerCount.replace(/[^0-9]/g, ''), 10) || null
            : null,
      raw: text,
    };
  } catch {
    return {
      gigletInBio: false,
      username: null,
      followerCount: null,
      raw: text,
    };
  }
}
