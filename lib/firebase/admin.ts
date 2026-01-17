// This file is only used in Firebase Functions and API routes
// It should not be imported in client-side code

let admin: any = null;

if (typeof window === 'undefined') {
  try {
    admin = require('firebase-admin');

    if (!admin.apps.length) {
      // Check for required environment variables
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;

      // Try to use GOOGLE_APPLICATION_CREDENTIALS first (if set)
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        try {
          admin.initializeApp({
            credential: admin.credential.applicationDefault(),
          });
          console.log('Firebase Admin initialized using GOOGLE_APPLICATION_CREDENTIALS');
        } catch (adcError: any) {
          console.warn('Failed to initialize with GOOGLE_APPLICATION_CREDENTIALS, trying manual credentials:', adcError.message);
        }
      }

      if (!admin?.apps.length) {
        if (!projectId || !clientEmail || !privateKey) {
          console.error('Firebase Admin initialization failed: Missing required environment variables');
          console.error('- FIREBASE_PROJECT_ID:', projectId ? 'Set' : 'Missing');
          console.error('- FIREBASE_CLIENT_EMAIL:', clientEmail ? 'Set' : 'Missing');
          console.error('- FIREBASE_PRIVATE_KEY:', privateKey ? 'Set' : 'Missing');
          admin = null;
        } else {
        try {
          // Ensure private key is properly formatted
          // Handle both escaped \n and actual newlines
          let formattedPrivateKey = privateKey;
          
          // Check if private key has literal \n (backslash-n) characters that need to be converted
          // This happens when the key is stored in .env with quotes and \n escape sequences
          if (privateKey.includes('\\n') && !privateKey.includes('\n')) {
            // Replace literal \n with actual newlines
            formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
            console.log('Converted \\n escape sequences to actual newlines');
          } else if (privateKey.includes('\n')) {
            // Already has newlines, use as-is
            formattedPrivateKey = privateKey;
            console.log('Private key already has newlines');
          } else {
            // No newlines found - this is unusual but might work if it's a single line
            console.warn('Private key does not contain newlines - this may cause issues');
          }
          
          // Validate private key format
          if (!formattedPrivateKey.includes('BEGIN PRIVATE KEY') && !formattedPrivateKey.includes('BEGIN RSA PRIVATE KEY')) {
            console.error('Firebase Admin: Private key appears to be invalid. It should start with "-----BEGIN PRIVATE KEY-----"');
            console.error('Private key preview:', formattedPrivateKey.substring(0, 100));
            admin = null;
          } else {
            // Verify the key has proper newlines
            const hasNewlines = formattedPrivateKey.includes('\n');
            if (!hasNewlines && formattedPrivateKey.length > 100) {
              console.warn('Firebase Admin: Private key might not have proper newlines. Attempting to fix...');
              // Try to add newlines if missing (unlikely but possible)
            }
            
            try {
              admin.initializeApp({
                credential: admin.credential.cert({
                  projectId,
                  clientEmail,
                  privateKey: formattedPrivateKey,
                }),
                storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
              });
              console.log('Firebase Admin initialized successfully');
              console.log('Project ID:', projectId);
              console.log('Client Email:', clientEmail);
            } catch (certError: any) {
              console.error('Firebase Admin credential error:', certError.message || certError);
              console.error('This usually means the private key format is incorrect');
              admin = null;
            }
          }
        } catch (initError: any) {
          console.error('Firebase Admin initialization error:', initError.message || initError);
          console.error('Error details:', initError);
          admin = null;
        }
        }
      }
    }
  } catch (error: any) {
    // firebase-admin not available or initialization failed
    console.error('Firebase Admin initialization error:', error.message || error);
    admin = null;
  }
}

export const adminAuth = admin?.auth();
export const adminDb = admin?.firestore();
export const adminStorage = admin?.storage();
// Note: Firebase Admin SDK doesn't have a functions() method like the client SDK
// Functions are managed separately in Firebase Cloud Functions

export default admin;