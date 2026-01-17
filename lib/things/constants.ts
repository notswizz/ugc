/**
 * Things/Categories system per plan.txt
 * The system is built around things/categories, not brand loyalty
 */

export const THINGS = [
  // Core categories from plan
  { id: 'gambling', name: 'Gambling', icon: '🎲' },
  { id: 'nfl', name: 'NFL', icon: '🏈' },
  { id: 'college-football', name: 'College Football', icon: '🏈' },
  { id: 'southern-cooking', name: 'Southern Cooking', icon: '🍳' },
  { id: 'mom-life', name: 'Mom Life', icon: '👶' },
  { id: 'fitness', name: 'Fitness', icon: '💪' },
  { id: 'streetwear', name: 'Streetwear', icon: '👕' },
  { id: 'outdoor-gear', name: 'Outdoor Gear', icon: '🏔️' },
  { id: 'mobile-apps', name: 'Mobile Apps', icon: '📱' },
  
  // Additional common categories
  { id: 'beauty', name: 'Beauty', icon: '💄' },
  { id: 'food', name: 'Food & Dining', icon: '🍽️' },
  { id: 'travel', name: 'Travel', icon: '✈️' },
  { id: 'tech', name: 'Technology', icon: '💻' },
  { id: 'fashion', name: 'Fashion', icon: '👗' },
  { id: 'lifestyle', name: 'Lifestyle', icon: '✨' },
  { id: 'gaming', name: 'Gaming', icon: '🎮' },
  { id: 'music', name: 'Music', icon: '🎵' },
  { id: 'sports', name: 'Sports', icon: '⚽' },
  { id: 'education', name: 'Education', icon: '📚' },
  { id: 'health', name: 'Health & Wellness', icon: '🧘' },
  { id: 'automotive', name: 'Automotive', icon: '🚗' },
  { id: 'home', name: 'Home & Garden', icon: '🏠' },
  { id: 'pets', name: 'Pets', icon: '🐾' },
] as const;

export const EXPERIENCE_TYPES = [
  'paid_ads',
  'on_camera',
  'voiceover',
  'product_demos',
  'pov_filming',
  'editing',
  'scriptwriting',
] as const;

export const HARD_NO_CATEGORIES = [
  'gambling',
  'alcohol',
  'politics',
  'supplements',
  'tobacco',
  'adult_content',
] as const;

export function getThingById(id: string) {
  return THINGS.find(thing => thing.id === id);
}

export function getThingIcon(id: string): string {
  const thing = getThingById(id);
  return thing?.icon || '📦';
}
