import admin from 'firebase-admin';
import { MetricServiceClient } from '@google-cloud/monitoring';

const rawBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!rawBase64) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
}

const raw = JSON.parse(Buffer.from(rawBase64, 'base64').toString('utf8'));

const serviceAccount: admin.ServiceAccount = {
  projectId: raw.project_id,
  clientEmail: raw.client_email,
  privateKey: raw.private_key,
};

const globalWithFirestore = global as typeof globalThis & {
  __firestoreDb?: admin.firestore.Firestore;
};

function getDb() {
  if (globalWithFirestore.__firestoreDb) {
    return globalWithFirestore.__firestoreDb;
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  const db = admin.firestore();

  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // Already configured elsewhere (e.g. concurrent hot-reload import) — safe to ignore.
  }

  globalWithFirestore.__firestoreDb = db;
  return db;
}

export const db = getDb();