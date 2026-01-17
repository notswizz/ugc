/**
 * Script to set all jobs status to 'open'
 * Run with: node scripts/set-jobs-open.js
 */

// Load environment variables from .env.local manually
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
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
} catch (error) {
  console.warn('Could not load .env.local, using environment variables from system');
}

const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
      throw new Error('Missing Firebase Admin credentials in .env.local or environment variables');
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    console.error('Make sure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set');
    process.exit(1);
  }
}

const db = admin.firestore();

async function setAllJobsToOpen() {
  console.log('Setting all jobs status to "open"...\n');

  try {
    // Get all jobs
    const jobsSnapshot = await db.collection('jobs').get();

    if (jobsSnapshot.empty) {
      console.log('No jobs found in database.');
      return;
    }

    console.log(`Found ${jobsSnapshot.size} jobs to update.\n`);

    // Update each job in batches
    const batchSize = 500;
    const jobs = jobsSnapshot.docs;
    let updated = 0;

    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = db.batch();
      const batchJobs = jobs.slice(i, i + batchSize);
      
      batchJobs.forEach((jobDoc) => {
        const currentStatus = jobDoc.data().status || 'unknown';
        batch.update(jobDoc.ref, {
          status: 'open',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        updated++;
        
        if (currentStatus !== 'open') {
          console.log(`  Updating job "${jobDoc.data().title || jobDoc.id}" from "${currentStatus}" to "open"`);
        }
      });
      
      await batch.commit();
      console.log(`  Committed batch (${Math.min(i + batchSize, jobs.length)}/${jobs.length} jobs)`);
    }

    console.log(`\n✅ Successfully updated ${updated} jobs to status "open"`);
  } catch (error) {
    console.error('\n❌ Error updating jobs:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
setAllJobsToOpen()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
