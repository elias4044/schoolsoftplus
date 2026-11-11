import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { initializeFirestore, type Firestore } from 'firebase-admin/firestore';

const globalWithFirestore = globalThis as typeof globalThis & {
  __firestoreDb?: Firestore;
};

function getAdminApp() {
  const existing = getApps().find((app) => app.name === '[DEFAULT]');
  if (existing) return existing;

  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!key) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');

  const { project_id, client_email, private_key } = JSON.parse(
    Buffer.from(key, 'base64').toString('utf8')
  );
  return initializeApp({
    credential: cert({ projectId: project_id, clientEmail: client_email, privateKey: private_key }),
  });
}

export function getDb() {
  if (globalWithFirestore.__firestoreDb) return globalWithFirestore.__firestoreDb;

  // The server only uses one-shot operations. Workers do not support Firestore's gRPC transport.
  const useWorkersRuntime = globalThis.navigator?.userAgent === 'Cloudflare-Workers';
  const db = initializeFirestore(getAdminApp(), useWorkersRuntime ? { preferRest: true } : {});
  db.settings({ ignoreUndefinedProperties: true });
  globalWithFirestore.__firestoreDb = db;
  return db;
}

export function createFirebaseCustomToken(userId: string) {
  return getAuth(getAdminApp()).createCustomToken(userId, { identityVersion: 2 });
}
