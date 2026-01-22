import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const LLAVA_MODEL = 'yorickvp/llava-13b:80537f9eead1a5bfa72d5ac6ea6414379be41d4d4f6679fd776e9535d1eb58bb';

export type SocialPlatform = 'tiktok' | 'instagram' | 'youtube' | 'x';

export interface SocialVerifyResult {
  gigletInBio: boolean;
  username: string | null;
  followerCount: number | null;
  raw?: string;
}

const PLATFORM_PROMPTS: Record<SocialPlatform, string> = {
  tiktok: `This image is a screenshot of a TikTok profile page. Look at it carefully.

You must respond with ONLY a JSON object, no other text. Use this exact format:
{"gigletInBio": true or false, "username": "the @ username without @", "followerCount": number or null}

Rules:
1. gigletInBio: true ONLY if the exact word "GIGLET" (all caps) appears in the profile bio. Otherwise false.
2. username: The TikTok username/handle shown (without the @ symbol). If not visible, use null.
3. followerCount: The follower count number shown (e.g. 12500). If not visible or unreadable, use null. Use only digits, no "K", "M", commas.

Reply with ONLY the JSON object.`,

  instagram: `This image is a screenshot of an Instagram profile page. Look at it carefully.

You must respond with ONLY a JSON object, no other text. Use this exact format:
{"gigletInBio": true or false, "username": "the @ username without @", "followerCount": number or null}

Rules:
1. gigletInBio: true ONLY if the exact word "GIGLET" (all caps) appears in the profile bio. Otherwise false.
2. username: The Instagram username/handle shown (without the @ symbol). If not visible, use null.
3. followerCount: The follower count number shown (e.g. 12500). If not visible or unreadable, use null. Use only digits, no "K", "M", commas.

Reply with ONLY the JSON object.`,

  youtube: `This image is a screenshot of a YouTube channel page (profile, about, or channel home). Look at it carefully.

You must respond with ONLY a JSON object, no other text. Use this exact format:
{"gigletInBio": true or false, "username": "the channel handle without @", "followerCount": number or null}

Rules:
1. gigletInBio: true ONLY if the exact word "GIGLET" (all caps) appears in the channel description, "about" section, or profile bio. Otherwise false.
2. username: The YouTube channel handle/name shown (without the @ symbol). If not visible, use null.
3. followerCount: The SUBSCRIBER count number shown (e.g. 12500). If not visible or unreadable, use null. Use only digits, no "K", "M", commas.

Reply with ONLY the JSON object.`,

  x: `This image is a screenshot of an X (Twitter) profile page. Look at it carefully.

You must respond with ONLY a JSON object, no other text. Use this exact format:
{"gigletInBio": true or false, "username": "the @ username without @", "followerCount": number or null}

Rules:
1. gigletInBio: true ONLY if the exact word "GIGLET" (all caps) appears in the profile bio. Otherwise false.
2. username: The X/Twitter username/handle shown (without the @ symbol). If not visible, use null.
3. followerCount: The follower count number shown (e.g. 12500). If not visible or unreadable, use null. Use only digits, no "K", "M", commas.

Reply with ONLY the JSON object.`,
};

function parseOutput(output: unknown): string {
  if (typeof output === 'string') return output;
  if (typeof output === 'object' && output !== null && 'output' in output) {
    const o = (output as { output?: unknown }).output;
    return Array.isArray(o) ? (o as string[]).join('') : String(o ?? '');
  }
  if (Array.isArray(output)) return (output as string[]).join('');
  return JSON.stringify(output);
}

function parseResult(text: string): SocialVerifyResult {
  const jsonMatch = text.match(/\{[\s\S]*"gigletInBio"[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : text;
  try {
    const parsed = JSON.parse(jsonStr) as {
      gigletInBio?: boolean;
      username?: string | null;
      followerCount?: number | null;
    };
    return {
      gigletInBio: !!parsed.gigletInBio,
      username:
        typeof parsed.username === 'string'
          ? parsed.username.replace(/^@/, '').trim() || null
          : null,
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

/**
 * Verify social screenshot: GIGLET in bio, extract username and follower/subscriber count.
 */
export async function verifySocialScreenshot(
  imageUrl: string,
  platform: SocialPlatform
): Promise<SocialVerifyResult> {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN is not set');
  }

  const prompt = PLATFORM_PROMPTS[platform];
  const output = await replicate.run(LLAVA_MODEL, {
    input: { image: imageUrl, prompt },
  });

  const text = parseOutput(output);
  return parseResult(text);
}
