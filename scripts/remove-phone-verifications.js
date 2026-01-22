/**
 * Remove all phone number verifications:
 * - Clear phoneVerified, phoneNumber, phoneVerifiedAt from all creators
 * - Delete all documents in bland_verification_calls
 *
 * Run with: node scripts/remove-phone-verifications.js
 */

const fs = require('fs');
const path = require('path');

try {
  const envPath = path.join(__dirname, '..', '.env.local');
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach((line) => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
} catch (e) {
  console.warn('Could not load .env.local, using existing env');
}

const admin = require('firebase-admin');

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.error('Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY');
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

const db = admin.firestore();
const BLAND_COLLECTION = 'bland_verification_calls';

async function removePhoneVerifications() {
  console.log('Removing all phone number verifications...\n');

  try {
    const creatorsSnap = await db.collection('creators').get();
    const creators = creatorsSnap.docs;

    if (creators.length > 0) {
      console.log(`Clearing phone verification from ${creators.length} creator(s)...`);

      const batchSize = 500;
      for (let i = 0; i < creators.length; i += batchSize) {
        const batch = db.batch();
        const chunk = creators.slice(i, i + batchSize);
        chunk.forEach((doc) => {
          batch.update(doc.ref, {
            phoneVerified: admin.firestore.FieldValue.delete(),
            phoneNumber: admin.firestore.FieldValue.delete(),
            phoneVerifiedAt: admin.firestore.FieldValue.delete(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });
        await batch.commit();
        console.log(`  Cleared ${Math.min(i + batchSize, creators.length)}/${creators.length} creators`);
      }
      console.log(`  Done. Cleared phone verification from ${creators.length} creator(s).\n`);
    } else {
      console.log('No creators found.\n');
    }

    const blandSnap = await db.collection(BLAND_COLLECTION).get();
    if (!blandSnap.empty) {
      console.log(`Deleting ${blandSnap.size} document(s) from "${BLAND_COLLECTION}"...`);
      const batchSize = 500;
      const docs = blandSnap.docs;
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = db.batch();
        docs.slice(i, i + batchSize).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      console.log(`  Deleted ${blandSnap.size} document(s) from "${BLAND_COLLECTION}".\n`);
    } else {
      console.log(`"${BLAND_COLLECTION}" is already empty.\n`);
    }

    console.log('Done. All phone verifications have been removed.');
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

removePhoneVerifications()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
