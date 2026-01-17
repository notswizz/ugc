/**
 * WARNING: This script deletes ALL data in your Firestore database!
 * Use with extreme caution. This action cannot be undone.
 * 
 * Run with: npx ts-node scripts/delete-database.ts
 * Or compile first: npm run build && node scripts/delete-database.js
 */

import admin, { adminDb } from '../lib/firebase/admin';

async function deleteCollection(collectionPath: string) {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  const collectionRef = adminDb.collection(collectionPath);
  const snapshot = await collectionRef.get();

  if (snapshot.empty) {
    console.log(`  ✓ Collection "${collectionPath}" is already empty`);
    return;
  }

  console.log(`  Deleting ${snapshot.size} documents from "${collectionPath}"...`);

  const batch = adminDb.batch();
  let batchCount = 0;
  let totalDeleted = 0;

  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
    batchCount++;

    // Firestore batch limit is 500 operations
    if (batchCount >= 500) {
      batch.commit();
      totalDeleted += batchCount;
      batchCount = 0;
    }
  });

  // Commit remaining operations
  if (batchCount > 0) {
    await batch.commit();
    totalDeleted += batchCount;
  }

  console.log(`  ✓ Deleted ${totalDeleted} documents from "${collectionPath}"`);
}

async function deleteAllSubcollections(docRef: FirebaseFirestore.DocumentReference) {
  const collections = await docRef.listCollections();
  
  for (const subcollection of collections) {
    const snapshot = await subcollection.get();
    
    if (!snapshot.empty) {
      console.log(`    Deleting subcollection "${subcollection.path}"...`);
      const batch = adminDb!.batch();
      let batchCount = 0;

      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        batchCount++;

        if (batchCount >= 500) {
          batch.commit();
          batchCount = 0;
        }
      });

      if (batchCount > 0) {
        await batch.commit();
      }
      
      console.log(`    ✓ Deleted subcollection "${subcollection.path}"`);
    }
  }
}

async function deleteAllData() {
  if (!adminDb) {
    console.error('❌ Firebase Admin not initialized!');
    console.error('Make sure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set in .env.local');
    process.exit(1);
  }

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
  } catch (error: any) {
    console.error('\n❌ Error deleting database:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  deleteAllData()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export { deleteAllData };
