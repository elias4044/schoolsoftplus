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

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const db = admin.firestore();
const globalWithFirestore = global as typeof globalThis & {
  firestoreSettingsInitialized?: boolean;
};

if (db && !globalWithFirestore.firestoreSettingsInitialized) {
  db.settings({ ignoreUndefinedProperties: true });

  globalWithFirestore.firestoreSettingsInitialized = true
}
