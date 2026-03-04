import admin from 'firebase-admin';

const rawBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

let serviceAccount;

try {
    const decoded = Buffer.from(rawBase64, 'base64').toString('utf8');
    serviceAccount = JSON.parse(decoded);
} catch (err) {
    console.error("Failed to decode and parse Firebase service account key.");
    throw err;
}

// Initialize the app if it hasn't been already
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} else {
    console.log('admin already initialized');
}

const db = admin.firestore();

export { db };
