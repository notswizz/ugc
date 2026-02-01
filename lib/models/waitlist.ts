export type CreatorExperienceLevel = 'beginner' | 'intermediate' | 'experienced' | 'professional';

export interface WaitlistEntry {
  id: string;
  email: string;
  name: string;
  userType: 'creator';

  socials?: {
    tiktok?: string;
    instagram?: string;
    youtube?: string;
    x?: string;
  };
  experienceLevel?: CreatorExperienceLevel;

  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}
