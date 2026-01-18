import admin, { adminDb } from '@/lib/firebase/admin';

export interface NotificationData {
  userId: string;
  type: string;
  title: string;
  message: string;
  submissionId: string;
  gigId: string;
}

/**
 * Creates a notification for a user
 */
export async function createNotification(data: NotificationData): Promise<void> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }
  
  await adminDb.collection('notifications').add({
    userId: data.userId,
    type: data.type,
    title: data.title,
    message: data.message,
    submissionId: data.submissionId,
    gigId: data.gigId,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  console.log('Notification created for user:', data.userId);
}
