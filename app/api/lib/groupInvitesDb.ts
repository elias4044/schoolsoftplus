import { db } from "./firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */

export type GroupInviteStatus = "pending" | "accepted" | "declined";

export interface GroupInvite {
  id: string;
  conversationId: string;
  groupName: string;
  invitedUsername: string;
  invitedBy: string;
  invitedByDisplayName: string;
  status: GroupInviteStatus;
  invitedAt: number;
  updatedAt: number;
}

/* ─────────────────────────────────────────────────────────────
   Collection
───────────────────────────────────────────────────────────── */

const INV_COL  = "group_invites_v1";
const CONV_COL = "conversations_v1";
const PROF_COL = "profiles_v1";

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToInvite(doc: FirebaseFirestore.DocumentSnapshot<any>): GroupInvite {
  const d = doc.data()!;
  return {
    id:                  doc.id,
    conversationId:      d.conversationId,
    groupName:           d.groupName           ?? "Group",
    invitedUsername:     d.invitedUsername,
    invitedBy:           d.invitedBy,
    invitedByDisplayName: d.invitedByDisplayName ?? d.invitedBy,
    status:              d.status,
    invitedAt:           d.invitedAt,
    updatedAt:           d.updatedAt,
  };
}

/* ─────────────────────────────────────────────────────────────
   Reads
───────────────────────────────────────────────────────────── */

export async function getPendingInvitesForUser(username: string): Promise<GroupInvite[]> {
  const snap = await db.collection(INV_COL)
    .where("invitedUsername", "==", username)
    .where("status", "==", "pending")
    .orderBy("invitedAt", "desc")
    .get();
  return snap.docs.map(docToInvite);
}

export async function getInviteById(id: string): Promise<GroupInvite | null> {
  const doc = await db.collection(INV_COL).doc(id).get();
  if (!doc.exists) return null;
  return docToInvite(doc);
}

/* ─────────────────────────────────────────────────────────────
   Writes
───────────────────────────────────────────────────────────── */

export async function sendGroupInvite(
  conversationId: string,
  invitedUsername: string,
  invitedBy: string
): Promise<GroupInvite | null> {
  // Verify conversation exists and inviter is admin
  const convDoc = await db.collection(CONV_COL).doc(conversationId).get();
  if (!convDoc.exists) return null;
  const conv = convDoc.data()!;
  if (conv.adminUsername !== invitedBy) return null;
  if (conv.participants.includes(invitedUsername)) return null; // already a member

  // Check for existing pending invite
  const existing = await db.collection(INV_COL)
    .where("conversationId", "==", conversationId)
    .where("invitedUsername", "==", invitedUsername)
    .where("status", "==", "pending")
    .limit(1)
    .get();
  if (!existing.empty) return docToInvite(existing.docs[0]);

  // Fetch inviter display name
  const inviterDoc = await db.collection(PROF_COL).doc(invitedBy).get();
  const inviterDisplayName = inviterDoc.exists
    ? (inviterDoc.data()!.displayName || `${inviterDoc.data()!.firstName ?? ""} ${inviterDoc.data()!.lastName ?? ""}`.trim() || invitedBy)
    : invitedBy;

  const now = Date.now();
  const ref = db.collection(INV_COL).doc();
  const data = {
    conversationId,
    groupName:            conv.groupName ?? "Group",
    invitedUsername,
    invitedBy,
    invitedByDisplayName: inviterDisplayName,
    status:               "pending" as GroupInviteStatus,
    invitedAt:            now,
    updatedAt:            now,
  };
  await ref.set(data);
  return { id: ref.id, ...data };
}

export async function respondToGroupInvite(
  inviteId: string,
  responder: string,
  accept: boolean
): Promise<{ invite: GroupInvite; joined: boolean }> {
  const invite = await getInviteById(inviteId);
  if (!invite) throw new Error("Invite not found.");
  if (invite.invitedUsername !== responder) throw new Error("Not authorized.");
  if (invite.status !== "pending") throw new Error("Invite already resolved.");

  const now = Date.now();
  const status: GroupInviteStatus = accept ? "accepted" : "declined";
  await db.collection(INV_COL).doc(inviteId).update({ status, updatedAt: now });

  if (accept) {
    // Fetch invitee display name and pfp
    const profileDoc = await db.collection(PROF_COL).doc(responder).get();
    const d = profileDoc.exists ? profileDoc.data()! : null;
    const displayName = d?.displayName || `${d?.firstName ?? ""} ${d?.lastName ?? ""}`.trim() || responder;
    const pfpUrl = d?.pfpUrl ?? "";

    await db.collection(CONV_COL).doc(invite.conversationId).update({
      participants:                  FieldValue.arrayUnion(responder),
      [`participantNames.${responder}`]:    displayName,
      [`participantPfpUrls.${responder}`]:  pfpUrl,
    });
  }

  return { invite: { ...invite, status, updatedAt: now }, joined: accept };
}
