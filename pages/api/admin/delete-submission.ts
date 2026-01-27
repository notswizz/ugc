import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/lib/firebase/admin';

const ADMIN_EMAIL = '7jackdsmith@gmail.com';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { submissionId, adminEmail } = req.body;

    if (!submissionId) {
      return res.status(400).json({ error: 'Missing submissionId' });
    }

    // Verify admin access
    if (adminEmail !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!adminDb) {
      return res.status(500).json({ error: 'Firebase Admin not initialized' });
    }

    // Delete the submission
    await adminDb.collection('submissions').doc(submissionId).delete();

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error deleting submission:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete submission' });
  }
}
