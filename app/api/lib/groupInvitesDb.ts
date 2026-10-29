import { assertCurrentAccountReferences } from './accountRegistry';
import { db } from './firebaseAdmin';
import { InputError } from './validation';

/* 
   Types
 */

export type GroupInviteStatus = 'pending' | 'accepted' | 'declined';

export interface GroupInvite {
  id: string;
  conversationId: string;
  groupName: string;
  invitedUserId: string;
  invitedById: string;
  invitedByDisplayName: string;
  status: GroupInviteStatus;
  invitedAt: number;
  updatedAt: number;
}

/* 
   Collection
 */

const INV_COL = 'group_invites_v1';
const CONV_COL = 'conversations_v1';
const PROF_COL = 'profiles_v1';

/* 
   Helpers
 */

function docToInvite(doc: FirebaseFirestore.DocumentSnapshot): GroupInvite {
  const d = doc.data()!;
  return {
    id: doc.id,
    conversationId: d.conversationId,
    groupName: d.groupName ?? 'Group',
    invitedUserId: d.invitedUserId,
    invitedById: d.invitedById,
    invitedByDisplayName: d.invitedByDisplayName ?? d.invitedById,
    status: d.status,
    invitedAt: d.invitedAt,
    updatedAt: d.updatedAt,
  };
}

/* 
   Reads
 */

export async function getPendingInvitesForUser(username: string): Promise<GroupInvite[]> {
  const snap = await db
    .collection(INV_COL)
    .where('invitedUserId', '==', username)
    .where('status', '==', 'pending')
    .orderBy('invitedAt', 'desc')
    .get();
  return snap.docs.map(docToInvite);
}

export async function getInviteById(id: string): Promise<GroupInvite | null> {
  const doc = await db.collection(INV_COL).doc(id).get();
  if (!doc.exists) return null;
  return docToInvite(doc);
}

/* 
   Writes
 */

export async function sendGroupInvite(
  conversationId: string,
  invitedUserId: string,
  invitedById: string
): Promise<GroupInvite | null> {
  const conversationRef = db.collection(CONV_COL).doc(conversationId);
  return db.runTransaction(async (transaction) => {
    await assertCurrentAccountReferences(transaction, [invitedUserId, invitedById]);
    const matches = await transaction.get(
      db.collection(INV_COL).where('invitedUserId', '==', invitedUserId)
    );
    const previous = matches.docs.find((doc) => doc.data().conversationId === conversationId);
    const ref = previous?.ref ?? db.collection(INV_COL).doc(`${conversationId}_${invitedUserId}`);
    const conversation = (await transaction.get(conversationRef)).data();
    const existing = await transaction.get(ref);
    const inviter = (await transaction.get(db.collection(PROF_COL).doc(invitedById))).data();
    const invitee = await transaction.get(db.collection(PROF_COL).doc(invitedUserId));
    if (
      !invitee.exists ||
      !conversation ||
      conversation.type !== 'group' ||
      conversation.adminUserId !== invitedById ||
      conversation.participantIds.includes(invitedUserId)
    )
      return null;
    if (existing.exists && existing.data()?.status === 'pending') return docToInvite(existing);
    const now = Date.now();
    const data: Omit<GroupInvite, 'id'> = {
      conversationId,
      invitedUserId,
      invitedById,
      groupName: conversation.groupName ?? 'Group',
      invitedByDisplayName:
        inviter?.displayName ||
        `${inviter?.firstName ?? ''} ${inviter?.lastName ?? ''}`.trim() ||
        invitedById,
      status: 'pending',
      invitedAt: now,
      updatedAt: now,
    };
    transaction.set(ref, data);
    return { id: ref.id, ...data };
  });
}

export async function respondToGroupInvite(
  inviteId: string,
  responder: string,
  accept: boolean
): Promise<{ invite: GroupInvite; joined: boolean }> {
  const ref = db.collection(INV_COL).doc(inviteId);
  return db.runTransaction(async (transaction) => {
    const document = await transaction.get(ref);
    if (!document.exists) throw new InputError('Invite not found', 404);
    const invite = docToInvite(document);
    if (invite.invitedUserId !== responder) throw new InputError('Invite not found', 404);
    if (invite.status !== 'pending') throw new InputError('Invite already resolved', 409);
    const conversationRef = db.collection(CONV_COL).doc(invite.conversationId);
    const conversation = (await transaction.get(conversationRef)).data();
    const profile = (await transaction.get(db.collection(PROF_COL).doc(responder))).data();
    if (accept) {
      if (!conversation || conversation.type !== 'group')
        throw new InputError('Group no longer exists', 404);
      if (!conversation.participantIds.includes(invite.invitedById))
        throw new InputError('Invite is no longer valid', 409);
      const participantIds = [...new Set<string>([...conversation.participantIds, responder])];
      if (participantIds.length > 50) throw new InputError('Group is full', 409);
      transaction.update(conversationRef, {
        participantIds,
        participantNames: {
          ...conversation.participantNames,
          [responder]:
            profile?.displayName ||
            `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim() ||
            responder,
        },
        participantPfpUrls: {
          ...conversation.participantPfpUrls,
          [responder]: profile?.pfpUrl ?? '',
        },
      });
    }
    const status: GroupInviteStatus = accept ? 'accepted' : 'declined';
    const updatedAt = Date.now();
    transaction.update(ref, { status, updatedAt });
    return { invite: { ...invite, status, updatedAt }, joined: accept };
  });
}
