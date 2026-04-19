import { db } from "./firebaseAdmin";
import type { DashboardLayout } from "@/lib/widgets/types";

const COLLECTION = "dashboard_layouts";

/** Returns null if no layout has been saved yet */
export async function getLayout(username: string): Promise<DashboardLayout | null> {
  const doc = await db.collection(COLLECTION).doc(username).get();
  if (!doc.exists) return null;
  return doc.data() as DashboardLayout;
}

/** Overwrites the stored layout for a user */
export async function saveLayout(username: string, layout: DashboardLayout): Promise<void> {
  await db.collection(COLLECTION).doc(username).set({
    ...layout,
    updatedAt: Date.now(),
  });
}
