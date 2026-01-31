const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize with default credentials
initializeApp({
  projectId: 'ugc-dock'
});

const db = getFirestore();

async function deleteCreator() {
  // Get all creators
  const snapshot = await db.collection('creators').get();
  console.log('Found', snapshot.size, 'creators');
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.username === 'testcreator') {
      console.log('Deleting creator:', doc.id, data.username);
      await db.collection('creators').doc(doc.id).delete();
      console.log('Deleted!');
    }
  }
}

deleteCreator().catch(console.error);
