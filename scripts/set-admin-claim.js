#!/usr/bin/env node
// scripts/set-admin-claim.js
// Usage:
//   npm run set-admin
//   node scripts/set-admin-claim.js --serviceAccount="C:\path\to\service-account.json"
//   node scripts/set-admin-claim.js --uid="uid1,uid2" --remove

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const admin = require('firebase-admin');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

function parseArgs() {
  const args = {};
  for (const item of process.argv.slice(2)) {
    if (item.startsWith('--uid=')) args.uid = item.slice('--uid='.length);
    if (item.startsWith('--serviceAccount=')) args.serviceAccount = item.slice('--serviceAccount='.length);
    if (item === '--remove') args.remove = true;
  }
  return args;
}

function splitCsv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function stripQuotes(value) {
  return String(value || '').replace(/^"|"$/g, '');
}

async function main() {
  const args = parseArgs();
  const explicitProjectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || '';
  const serviceAccountPathRaw = args.serviceAccount || process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '';
  const serviceAccountPath = stripQuotes(serviceAccountPathRaw);

  if (!serviceAccountPath) {
    throw new Error('Set FIREBASE_SERVICE_ACCOUNT_PATH or pass --serviceAccount=...');
  }

  const resolvedCredentialsPath = path.resolve(serviceAccountPath);
  if (!fs.existsSync(resolvedCredentialsPath)) {
    throw new Error(`Service account JSON does not exist: ${resolvedCredentialsPath}`);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(resolvedCredentialsPath, 'utf8'));

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: explicitProjectId || serviceAccount.project_id,
    });
  } catch (err) {
    // Ignore if already initialized in this process.
  }

  const targetUids = [
    ...splitCsv(args.uid),
    ...splitCsv(process.env.ADMIN_UIDS),
    ...splitCsv(process.env.ADMIN_UID),
  ];

  const targetEmails = [
    ...splitCsv(process.env.ADMIN_EMAILS),
    ...splitCsv(process.env.ADMIN_EMAIL),
  ];

  if (targetUids.length === 0 && targetEmails.length === 0) {
    throw new Error('Set ADMIN_UID/ADMIN_EMAIL in .env or pass --uid=...');
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
    if (args.remove) {
      await admin.auth().setCustomUserClaims(userRecord.uid, null);
      console.log('Removed admin claim for UID:', userRecord.uid);
    } else {
      await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true, role: 'admin' });
      console.log('Admin claim set for UID:', userRecord.uid);
    }

    await admin.auth().revokeRefreshTokens(userRecord.uid);
    if (userRecord.email) {
      console.log('Admin email:', userRecord.email);
    }
  }

  console.log('Have the user sign out and sign back in to refresh the token.');
}

main().catch((err) => {
  console.error('Failed to set admin claim:', err.message || err);
  process.exitCode = 1;
});
