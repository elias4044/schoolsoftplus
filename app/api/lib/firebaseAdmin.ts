import admin from "firebase-admin";

const rawBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!rawBase64) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.");
}

let serviceAccount: admin.ServiceAccount;
try {
  const decoded = Buffer.from(rawBase64, "base64").toString("utf8");
  serviceAccount = JSON.parse(decoded) as admin.ServiceAccount;
} catch (err) {
  console.error("Failed to decode and parse Firebase service account key.");
  throw err;
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const db = admin.firestore();
