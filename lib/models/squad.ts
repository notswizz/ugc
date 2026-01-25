// Thread/Message types
export interface Thread {
  id: string;
  participants: string[]; // [brandId, creatorId] or [recruiterId, creatorId]
  gigId?: string;
  lastMessageAt: Date;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  createdAt: Date;
}

// Squad and Recruiter types
export interface Squad {
  id: string;
  name: string;
  description: string;
  recruiterId: string; // Squad Lead
  tags: string[]; // Thing-based tags
  style?: string; // e.g. "POV", "Review", "Tutorial"

  memberIds: string[]; // Creator UIDs
  inviteOnly: boolean;
  trustScoreMin?: number;

  stats: {
    completionRate: number;
    avgAIScore: number;
    gigsCompleted: number;
  };

  recruiterCut?: number; // Percentage from brand side
  createdAt: Date;
  updatedAt: Date;
}

export interface Recruiter {
  uid: string;
  name: string;
  squadsManaged: string[]; // Squad IDs
  totalEarnings: number;
  stats: {
    jobSuccessRate: number;
    brandSatisfaction: number;
    squadQuality: number;
  };
  createdAt: Date;
}

// Admin log types
export interface AdminLog {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}
