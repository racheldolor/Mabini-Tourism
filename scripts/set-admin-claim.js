// Run with: node set-admin-claim.js
// Requires Firebase Admin SDK credentials:
// 1) Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path, or
// 2) Have gcloud ADC set up (gcloud auth application-default login).

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const admin = require('firebase-admin');

const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || '';
const explicitProjectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || '';

const buildFirebaseAdminConfig = () => {
  if (credentialsPath) {
    const resolvedCredentialsPath = path.resolve(credentialsPath);
    if (!fs.existsSync(resolvedCredentialsPath)) {
      throw new Error(`GOOGLE_APPLICATION_CREDENTIALS does not exist: ${resolvedCredentialsPath}`);
    }

    const serviceAccount = JSON.parse(fs.readFileSync(resolvedCredentialsPath, 'utf8'));
    return {
      credential: admin.credential.cert(serviceAccount),
      projectId: explicitProjectId || serviceAccount.project_id,
    };
  }

  return {
    credential: admin.credential.applicationDefault(),
    projectId: explicitProjectId || undefined,
  };
};

admin.initializeApp(buildFirebaseAdminConfig());

const targetUid = process.env.ADMIN_UID || '';
const targetEmail = process.env.ADMIN_EMAIL || '';

(async () => {
  try {
    let userRecord = null;

    if (targetUid) {
      userRecord = await admin.auth().getUser(targetUid);
    } else if (targetEmail) {
      userRecord = await admin.auth().getUserByEmail(targetEmail);
    } else {
      throw new Error('Set ADMIN_UID or ADMIN_EMAIL in .env before running this script.');
    }

    await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true, role: 'admin' });
    console.log('Admin claim set for UID:', userRecord.uid);
    if (userRecord.email) {
      console.log('Admin email:', userRecord.email);
    }
    console.log('Have the user sign out/in to refresh the token.');
  } catch (err) {
    console.error('Failed to set admin claim:', err);
    process.exitCode = 1;
  }
})();
