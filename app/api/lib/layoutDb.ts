import type { DashboardLayout } from '@/lib/widgets/types';

import { getDb } from './firebaseAdmin';

const COLLECTION = 'dashboard_layouts';

/** Returns null if no layout has been saved yet */
export async function getLayout(userId: string): Promise<DashboardLayout | null> {
  const doc = await getDb().collection(COLLECTION).doc(userId).get();
  if (!doc.exists) return null;
  return doc.data() as DashboardLayout;
}

/** Overwrites the stored layout for a user */
export async function saveLayout(userId: string, layout: DashboardLayout): Promise<void> {
  const ref = getDb().collection(COLLECTION).doc(userId);
  await getDb().runTransaction(async (transaction) => {
    const current = (await transaction.get(ref)).data();
    if (
      current &&
      current.version === layout.version &&
      JSON.stringify(current.widgets) === JSON.stringify(layout.widgets)
    )
      return;
    transaction.set(ref, { ...layout, userId, updatedAt: Date.now() });
  });
}
