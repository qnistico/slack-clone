// Quick script to fix user document
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixUser() {
  const userId = 'inV4HOOnWOMLbiUVcZNwRlrg3B43';
  const userRef = db.collection('users').doc(userId);

  await userRef.set({
    name: 'Quinton Nistico'
  }, { merge: true });

  console.log('User document updated successfully!');
  process.exit(0);
}

fixUser().catch(console.error);
