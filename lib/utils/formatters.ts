/**
 * Shared formatting utilities for consistent display across the application
 */

/**
 * Format a number as currency (USD)
 * @param cents - Amount in cents
 * @returns Formatted currency string (e.g., "$12.34")
 */
export function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(dollars);
}

/**
 * Format a dollar amount as currency (USD)
 * @param dollars - Amount in dollars
 * @returns Formatted currency string (e.g., "$12.34")
 */
export function formatCurrencyFromDollars(dollars: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(dollars);
}

/**
 * Calculate platform fee (15%)
 * @param amount - Amount in dollars
 * @returns Platform fee in dollars
 */
export function calculatePlatformFee(amount: number): number {
  return amount * 0.15;
}

/**
 * Calculate creator net payout after platform fee
 * @param gross - Gross amount in dollars
 * @returns Net amount after 15% platform fee
 */
export function calculateCreatorNet(gross: number): number {
  return gross - calculatePlatformFee(gross);
}

/**
 * Format time remaining until a deadline
 * @param deadline - Deadline as Date or timestamp
 * @returns Human-readable time remaining (e.g., "2 days left", "5 hours left")
 */
export function formatTimeLeft(deadline: Date | number): string {
  const now = Date.now();
  const deadlineMs = typeof deadline === 'number' ? deadline : deadline.getTime();
  const diffMs = deadlineMs - now;

  if (diffMs <= 0) return 'Expired';

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} left`;
  return `${minutes} minute${minutes > 1 ? 's' : ''} left`;
}

/**
 * Get urgency color class based on time remaining
 * @param deadline - Deadline as Date or timestamp
 * @returns Tailwind color class (green/yellow/red)
 */
export function getTimeUrgencyColor(deadline: Date | number): string {
  const now = Date.now();
  const deadlineMs = typeof deadline === 'number' ? deadline : deadline.getTime();
  const diffMs = deadlineMs - now;
  const hours = diffMs / (1000 * 60 * 60);

  if (hours > 48) return 'text-green-600';
  if (hours > 24) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Format follower count with K/M suffixes
 * @param count - Number of followers
 * @returns Formatted string (e.g., "5.2K", "1.2M")
 */
export function formatFollowerCount(count: number): string {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return count.toString();
}

/**
 * Parse follower count string to number
 * Handles formats like "5K", "1.2M", "1,000", "5000"
 * @param input - Follower count as string
 * @returns Number of followers
 */
export function parseFollowerCount(input: string): number {
  if (!input) return 0;

  const cleaned = input.trim().toUpperCase();
  const multiplier = cleaned.includes('M') ? 1000000 : cleaned.includes('K') ? 1000 : 1;
  const number = parseFloat(cleaned.replace(/[^0-9.]/g, ''));

  return isNaN(number) ? 0 : Math.floor(number * multiplier);
}

/**
 * Format a date as a human-readable string
 * @param date - Date to format
 * @returns Formatted date string (e.g., "Jan 15, 2025")
 */
export function formatDate(date: Date | number): string {
  const dateObj = typeof date === 'number' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(dateObj);
}

/**
 * Format a date with time
 * @param date - Date to format
 * @returns Formatted date and time string (e.g., "Jan 15, 2025 at 3:45 PM")
 */
export function formatDateTime(date: Date | number): string {
  const dateObj = typeof date === 'number' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(dateObj);
}

/**
 * Format a timestamp as relative time (e.g., "2 hours ago")
 * @param timestamp - Timestamp to format
 * @returns Relative time string
 */
export function formatRelativeTime(timestamp: Date | number): string {
  const now = Date.now();
  const timestampMs = typeof timestamp === 'number' ? timestamp : timestamp.getTime();
  const diffMs = now - timestampMs;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(timestamp);
}

/**
 * Truncate text to a maximum length with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format a number with commas
 * @param num - Number to format
 * @returns Formatted number string (e.g., "1,234,567")
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}
