// Run with: node set-admin-claim.js
// Requires Firebase Admin SDK credentials:
// 1) Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path, or
// 2) Have gcloud ADC set up (gcloud auth application-default login).

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const admin = require('firebase-admin');

const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '';
const useApplicationDefault = String(process.env.USE_APPLICATION_DEFAULT || '').toLowerCase() === 'true';
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

  if (!useApplicationDefault) {
    throw new Error(
      'No Firebase admin credential source found. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_PATH in your .env. ' +
      'If you intentionally want ADC/gcloud auth, set USE_APPLICATION_DEFAULT=true.'
    );
  }

  return {
    credential: admin.credential.applicationDefault(),
    projectId: explicitProjectId || undefined,
  };
};

admin.initializeApp(buildFirebaseAdminConfig());

const splitCsv = (value) => String(value || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const targetUids = [
  ...splitCsv(process.env.ADMIN_UIDS),
  ...splitCsv(process.env.ADMIN_UID),
];

const targetEmails = [
  ...splitCsv(process.env.ADMIN_EMAILS),
  ...splitCsv(process.env.ADMIN_EMAIL),
];

(async () => {
  try {
    if (!targetUids.length && !targetEmails.length) {
      throw new Error('Set ADMIN_UIDS/ADMIN_EMAILS (or ADMIN_UID/ADMIN_EMAIL) in .env before running this script.');
    }

    const resolvedUsersByUid = new Map();

    for (const uid of targetUids) {
      const userRecord = await admin.auth().getUser(uid);
      resolvedUsersByUid.set(userRecord.uid, userRecord);
    }

    for (const email of targetEmails) {
      const userRecord = await admin.auth().getUserByEmail(email);
      resolvedUsersByUid.set(userRecord.uid, userRecord);
    }

    for (const userRecord of resolvedUsersByUid.values()) {
      await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true, role: 'admin' });
      console.log('Admin claim set for UID:', userRecord.uid);
      if (userRecord.email) {
        console.log('Admin email:', userRecord.email);
      }
    }

    console.log('Have the user sign out/in to refresh the token.');
  } catch (err) {
    console.error('Failed to set admin claim:', err);
    process.exitCode = 1;
  }
})();
