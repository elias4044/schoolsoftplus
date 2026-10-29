import { FieldValue } from 'firebase-admin/firestore';

import { db } from './firebaseAdmin';
import { assertUserId } from './identity';

export async function recordLogin(
  userId: string,
  school: string,
  method: string
): Promise<boolean> {
  assertUserId(userId);
  const userRef = db.collection('login_users').doc(userId);
  const totalsRef = db.collection('stats').doc('loginStats');
  return db.runTransaction(async (transaction) => {
    const existing = await transaction.get(userRef);
    const now = Date.now();
    transaction.set(userRef, {
      userId,
      school,
      method,
      lastLoginAt: now,
      loginCount: (existing.data()?.loginCount ?? 0) + 1,
      firstLoginAt: existing.data()?.firstLoginAt ?? now,
    });
    transaction.set(
      totalsRef,
      {
        total_logins: FieldValue.increment(1),
        total_successful_logins: FieldValue.increment(1),
        total_api_calls: FieldValue.increment(1),
        unique_logins: FieldValue.increment(existing.exists ? 0 : 1),
      },
      { merge: true }
    );
    return !existing.exists;
  });
}
