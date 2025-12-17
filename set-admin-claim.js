// Run with: node set-admin-claim.js
// Requires Firebase Admin SDK credentials:
// 1) Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path, or
// 2) Have gcloud ADC set up (gcloud auth application-default login).

const admin = require('firebase-admin');

// Initialize using ADC or service account env var
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

// TODO: replace with the UID you want to elevate
const targetUid = 'd6eXV3kzQuPiOROq8aYk7aH59Gy1';

(async () => {
  try {
    await admin.auth().setCustomUserClaims(targetUid, { admin: true });
    console.log('Admin claim set for UID:', targetUid);
    console.log('Have the user sign out/in to refresh the token.');
  } catch (err) {
    console.error('Failed to set admin claim:', err);
    process.exitCode = 1;
  }
})();
