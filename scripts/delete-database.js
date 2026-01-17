/**
 * WARNING: This script deletes ALL data in your Firestore database!
 * Use with extreme caution. This action cannot be undone.
 * 
 * Run with: node scripts/delete-database.js
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

async function deleteCollection(collectionPath) {
  const collectionRef = db.collection(collectionPath);
  const snapshot = await collectionRef.get();

  if (snapshot.empty) {
    console.log(`  ✓ Collection "${collectionPath}" is already empty`);
    return;
  }

  console.log(`  Deleting ${snapshot.size} documents from "${collectionPath}"...`);

  const docs = snapshot.docs;
  const batchSize = 500; // Firestore batch limit
  
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = db.batch();
    const batchDocs = docs.slice(i, i + batchSize);
    
    batchDocs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`    Deleted ${batchDocs.length} documents (${Math.min(i + batchSize, docs.length)}/${docs.length})`);
  }

  console.log(`  ✓ Deleted ${docs.length} documents from "${collectionPath}"`);
}

async function deleteAllData() {
  console.log('⚠️  WARNING: This will delete ALL data in your Firestore database!');
  console.log('⚠️  This action cannot be undone!\n');

  // List of collections to delete (add any custom collections here)
  const collections = [
    'users',
    'creators',
    'brands',
    'jobs',
    'submissions',
    'payments',
    'notifications',
    'balanceTransactions',
    'usageRightsTemplates',
    'campaigns',
    'contracts',
    'squads',
    'squadInvitations',
  ];

  console.log('Collections to delete:');
  collections.forEach((col) => console.log(`  - ${col}`));
  console.log('\n');

  try {
    // Delete each collection
    for (const collection of collections) {
      console.log(`Deleting collection: "${collection}"`);
      await deleteCollection(collection);
    }

    console.log('\n✅ Database deletion complete!');
    console.log('All collections have been cleared.');
  } catch (error) {
    console.error('\n❌ Error deleting database:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
deleteAllData()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
