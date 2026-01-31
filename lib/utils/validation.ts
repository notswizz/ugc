/**
 * Shared validation utilities
 */

/**
 * Validate email format
 * @param email - Email address to validate
 * @returns True if valid email format
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (US)
 * @param phone - Phone number to validate
 * @returns True if valid US phone format
 */
export function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 || cleaned.length === 11;
}

/**
 * Validate amount string (dollar amount)
 * @param amount - Amount string to validate
 * @returns True if valid amount format
 */
export function isValidAmount(amount: string): boolean {
  if (!amount) return false;
  const amountRegex = /^\d+(\.\d{1,2})?$/;
  return amountRegex.test(amount) && parseFloat(amount) > 0;
}

/**
 * Validate URL format
 * @param url - URL to validate
 * @returns True if valid URL format
 */
export function isValidUrl(url: string): boolean {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate username format
 * - 3-20 characters
 * - Alphanumeric, underscores, hyphens only
 * - Cannot start or end with underscore/hyphen
 * @param username - Username to validate
 * @returns True if valid username format
 */
export function isValidUsername(username: string): boolean {
  if (!username) return false;
  const usernameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9_-]{1,18}[a-zA-Z0-9])?$/;
  return usernameRegex.test(username);
}

/**
 * Sanitize username (remove invalid characters)
 * @param username - Username to sanitize
 * @returns Sanitized username
 */
export function sanitizeUsername(username: string): string {
  return username.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20);
}

/**
 * Validate social media URL
 * @param url - Social media URL
 * @param platform - Platform name (tiktok, instagram, youtube, etc.)
 * @returns True if valid social URL for platform
 */
export function isValidSocialUrl(url: string, platform: string): boolean {
  if (!isValidUrl(url)) return false;

  const patterns: Record<string, RegExp> = {
    tiktok: /tiktok\.com\/@[\w.-]+/i,
    instagram: /instagram\.com\/[\w.-]+/i,
    youtube: /youtube\.com\/(c\/|channel\/|@)[\w.-]+/i,
    twitter: /twitter\.com\/[\w.-]+/i,
    x: /(twitter|x)\.com\/[\w.-]+/i,
    linkedin: /linkedin\.com\/in\/[\w.-]+/i,
  };

  const pattern = patterns[platform.toLowerCase()];
  return pattern ? pattern.test(url) : false;
}
