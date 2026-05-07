// scripts/set-admin-cloud-function.js
// Example Cloud Function (HTTP) to set/remove admin claims.
// Protect this endpoint using a secret (ADMIN_SECRET) configured in your Cloud Functions environment.
// Deploy only from a trusted environment.

const admin = require('firebase-admin');
try { admin.initializeApp(); } catch (e) {}

// Example for Firebase Functions:
// const functions = require('firebase-functions');
// exports.setAdmin = functions.https.onRequest(async (req, res) => { ... });

// This file is an example; adapt to your Cloud Functions setup.

async function handler(req, res) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return res.status(500).send('Server not configured');

  const provided = req.header('x-admin-secret');
  if (!provided || provided !== secret) return res.status(403).send('Forbidden');

  const { uid, makeAdmin } = req.body || {};
  if (!uid) return res.status(400).send('Missing uid');

  try {
    if (makeAdmin === false) {
      await admin.auth().setCustomUserClaims(uid, null);
    } else {
      await admin.auth().setCustomUserClaims(uid, { admin: true });
    }
    await admin.auth().revokeRefreshTokens(uid);
    return res.status(200).send('OK');
  } catch (err) {
    console.error(err);
    return res.status(500).send('Error');
  }
}

module.exports = { handler };
