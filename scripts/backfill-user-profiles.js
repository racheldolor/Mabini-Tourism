// Backfill user profile documents for community features (likes/comments display names).
// Usage:
//   node scripts/backfill-user-profiles.js
//
// Requires Firebase Admin SDK credentials:
// 1) Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path, or
// 2) Have gcloud ADC set up (gcloud auth application-default login).

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const admin = require('firebase-admin');

const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || '';
const explicitProjectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || '';

function buildFirebaseAdminConfig() {
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
}

admin.initializeApp(buildFirebaseAdminConfig());

const db = admin.firestore();

function chooseBetter(currentValue, candidateValue) {
  if (currentValue && String(currentValue).trim()) return currentValue;
  if (candidateValue && String(candidateValue).trim()) return candidateValue;
  return currentValue || null;
}

function setProfileField(profile, field, value) {
  profile[field] = chooseBetter(profile[field], value);
}

function ensureProfile(map, uid) {
  if (!uid || typeof uid !== 'string') return null;
  const key = uid.trim();
  if (!key) return null;

  if (!map.has(key)) {
    map.set(key, {
      uid: key,
      displayName: null,
      email: null,
      photoURL: null,
      sources: new Set(),
    });
  }

  return map.get(key);
}

function mergeProfile(map, uid, values, source) {
  const profile = ensureProfile(map, uid);
  if (!profile) return;

  setProfileField(profile, 'displayName', values.displayName);
  setProfileField(profile, 'email', values.email);
  setProfileField(profile, 'photoURL', values.photoURL);
  if (source) profile.sources.add(source);
}

async function collectFromPosts(profileMap) {
  const postsSnap = await db.collection('posts').get();

  for (const postDoc of postsSnap.docs) {
    const post = postDoc.data() || {};

    mergeProfile(profileMap, post.userId, {
      displayName: post.userDisplayName,
      email: post.userEmail,
      photoURL: post.userPhotoURL,
    }, 'posts');

    const likes = Array.isArray(post.likes) ? post.likes : [];
    for (const uid of likes) {
      mergeProfile(profileMap, uid, {}, 'likes');
    }

    const commentsSnap = await postDoc.ref.collection('comments').get();
    for (const commentDoc of commentsSnap.docs) {
      const comment = commentDoc.data() || {};
      mergeProfile(profileMap, comment.userId, {
        displayName: comment.userDisplayName,
        email: comment.userEmail,
        photoURL: comment.userPhotoURL,
      }, 'comments');
    }
  }

  return {
    postsCount: postsSnap.size,
  };
}

async function collectFromLegacyCommunityPosts(profileMap) {
  const legacySnap = await db.collection('community_posts').get();

  for (const doc of legacySnap.docs) {
    const post = doc.data() || {};
    mergeProfile(profileMap, post.userId, {
      displayName: post.userDisplayName,
      email: post.userEmail,
      photoURL: post.userPhotoURL,
    }, 'community_posts');
  }

  return {
    legacyPostsCount: legacySnap.size,
  };
}

async function enrichFromAuth(profileMap) {
  const uids = [...profileMap.keys()];
  const chunkSize = 100;
  let found = 0;

  for (let i = 0; i < uids.length; i += chunkSize) {
    const slice = uids.slice(i, i + chunkSize);
    const identifiers = slice.map((uid) => ({ uid }));

    const result = await admin.auth().getUsers(identifiers);
    for (const userRecord of result.users) {
      mergeProfile(profileMap, userRecord.uid, {
        displayName: userRecord.displayName,
        email: userRecord.email,
        photoURL: userRecord.photoURL,
      }, 'auth');
      found += 1;
    }
  }

  return { authMatchedUsers: found };
}

async function writeProfiles(profileMap) {
  const profiles = [...profileMap.values()];
  let writes = 0;

  while (profiles.length > 0) {
    const batch = db.batch();
    const chunk = profiles.splice(0, 400);

    for (const profile of chunk) {
      const payload = {
        displayName: profile.displayName || profile.email || `User ${profile.uid.slice(0, 6)}`,
        email: profile.email || null,
        photoURL: profile.photoURL || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        backfillSources: [...profile.sources],
      };

      batch.set(db.collection('users').doc(profile.uid), payload, { merge: true });
      writes += 1;
    }

    await batch.commit();
  }

  return { writes };
}

(async () => {
  try {
    const profileMap = new Map();

    const fromPosts = await collectFromPosts(profileMap);
    const fromLegacy = await collectFromLegacyCommunityPosts(profileMap);
    const fromAuth = await enrichFromAuth(profileMap);
    const writeResult = await writeProfiles(profileMap);

    console.log('Backfill completed successfully.');
    console.log(`Scanned posts: ${fromPosts.postsCount}`);
    console.log(`Scanned legacy community_posts: ${fromLegacy.legacyPostsCount}`);
    console.log(`Unique user IDs discovered: ${profileMap.size}`);
    console.log(`Auth matches found: ${fromAuth.authMatchedUsers}`);
    console.log(`User profile docs upserted: ${writeResult.writes}`);
  } catch (error) {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  }
})();
