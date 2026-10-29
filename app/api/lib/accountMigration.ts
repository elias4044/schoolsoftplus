import { isDeepStrictEqual } from 'node:util';

import { isAccountReference } from './accountRegistry';
import { db } from './firebaseAdmin';
import { assertSchool, assertUserId } from './identity';
import { InputError } from './validation';

interface AccountIdentity {
  userId: string;
  username: string;
  school: string;
}

const migrationVersion = 1;
const pending = new Map<string, Promise<void>>();
type RecordData = FirebaseFirestore.DocumentData;

function assertLegacyOwner(data: RecordData, identity: AccountIdentity) {
  if (
    (data.userId && String(data.userId) !== identity.userId) ||
    (data.school && data.school.toLowerCase() !== identity.school)
  )
    throw new InputError(
      'Legacy account ownership conflicts with this account. Contact support.',
      409
    );
}

async function visit(
  query: FirebaseFirestore.Query,
  migrate: (ref: FirebaseFirestore.DocumentReference) => Promise<void>
) {
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  while (true) {
    let pageQuery = query.orderBy('__name__').limit(100);
    if (cursor) pageQuery = pageQuery.startAfter(cursor);
    const page = await pageQuery.get();
    for (const document of page.docs) await migrate(document.ref);
    if (page.size < 100) return;
    cursor = page.docs.at(-1);
  }
}

async function changeRecord(
  ref: FirebaseFirestore.DocumentReference,
  transform: (data: RecordData) => Promise<RecordData> | RecordData
) {
  await db.runTransaction(async (transaction) => {
    const document = await transaction.get(ref);
    if (!document.exists) return;
    const data = document.data()!;
    const next = await transform(data);
    if (!isDeepStrictEqual(data, next)) transaction.set(ref, next);
  });
}

async function moveRecord(
  source: FirebaseFirestore.DocumentReference,
  target: FirebaseFirestore.DocumentReference,
  transform: (data: RecordData) => RecordData
) {
  if (source.path === target.path) return;
  await db.runTransaction(async (transaction) => {
    const old = await transaction.get(source);
    const current = await transaction.get(target);
    if (!old.exists) return;
    // Existing ID-owned values win. Keep a private copy if both versions exist.
    if (current.exists && !isDeepStrictEqual(transform(old.data()!), current.data())) {
      transaction.set(
        db
          .collection('account_migration_conflicts')
          .doc(Buffer.from(source.path).toString('base64url')),
        {
          sourcePath: source.path,
          targetPath: target.path,
          data: old.data(),
          savedAt: Date.now(),
        }
      );
    }
    transaction.set(target, { ...transform(old.data()!), ...current.data() });
    transaction.delete(source);
  });
}

async function migratePrivateRecords({ userId, username, school }: AccountIdentity) {
  for (const collection of [
    'notes_v2',
    'countdowns_v1',
    'flashcard_decks_v1',
    'flashcard_cards_v1',
  ]) {
    await visit(db.collection(collection).where('username', '==', username), (ref) =>
      changeRecord(ref, (data) => {
        assertLegacyOwner(data, { userId, username, school });
        const next: RecordData = { ...data, userId };
        delete next.username;
        return next;
      })
    );
  }
  for (const collection of [
    'profiles_v1',
    'presence_v1',
    'dashboard_layouts',
    'final_grades_v1',
    'referrals_v1',
  ]) {
    await moveRecord(
      db.collection(collection).doc(username),
      db.collection(collection).doc(userId),
      (data) => {
        assertLegacyOwner(data, { userId, username, school });
        const next: RecordData = { ...data, userId };
        delete next.username;
        if (collection === 'profiles_v1') Object.assign(next, { loginUsername: username, school });
        return next;
      }
    );
  }
  await visit(db.collection('grade_tracker_v1').where('username', '==', username), async (ref) => {
    const data = (await ref.get()).data();
    if (!data) return;
    await moveRecord(
      ref,
      db.collection('grade_tracker_v1').doc(`${userId}_${data.subjectId}`),
      (data) => {
        assertLegacyOwner(data, { userId, username, school });
        const next: RecordData = { ...data, userId };
        delete next.username;
        return next;
      }
    );
  });
}

async function migrateSharedRecords(
  { userId, username }: AccountIdentity,
  resolve: (value: string) => Promise<string>
) {
  const rename = async (data: RecordData, fields: Record<string, string>) => {
    const next = { ...data };
    for (const [old, field] of Object.entries(fields)) {
      if (next[field] !== undefined || next[old] !== undefined)
        next[field] = await resolve(next[field] ?? next[old]);
      delete next[old];
    }
    return next;
  };

  const shared: Record<string, Record<string, string>> = {
    conversations_v1: { adminUsername: 'adminUserId', lastSenderUsername: 'lastSenderUserId' },
    friendships_v1: { userA: 'userAId', userB: 'userBId', requestedBy: 'requestedById' },
    group_invites_v1: { invitedUsername: 'invitedUserId', invitedBy: 'invitedById' },
    calls_v1: { callerUsername: 'callerUserId', calleeUsername: 'calleeUserId' },
    referral_codes_v1: { username: 'userId' },
    group_calls_v2: { startedBy: 'startedByUserId' },
  };
  for (const [collection, fields] of Object.entries(shared)) {
    const queries: FirebaseFirestore.Query[] = [];
    for (const field of new Set([...Object.keys(fields), ...Object.values(fields)]))
      queries.push(db.collection(collection).where(field, '==', username));
    if (collection === 'conversations_v1' || collection === 'group_calls_v2') {
      for (const field of ['participants', 'participantIds'])
        queries.push(db.collection(collection).where(field, 'array-contains', username));
      queries.push(db.collection(collection).where('participantIds', 'array-contains', userId));
    }
    for (const query of queries)
      await visit(query, (ref) =>
        changeRecord(ref, async (data) => {
          const next = await rename(data, fields);
          if (collection === 'group_calls_v2') {
            next.participantIds = [
              ...new Set(
                await Promise.all((data.participantIds ?? data.participants ?? []).map(resolve))
              ),
            ];
            delete next.participants;
            next.status = 'ended';
          }
          if (collection === 'conversations_v1') {
            const participants: string[] = data.participantIds ?? data.participants ?? [];
            next.participantIds = [...new Set(await Promise.all(participants.map(resolve)))];
            if (data.type === 'dm') next.participantIds.sort();
            delete next.participants;
            next.participantAliases = { ...data.participantAliases };
            for (const participant of participants) {
              const id = await resolve(participant);
              if (id !== participant) next.participantAliases[participant] = id;
            }
            next.participantAliases[username] = userId;
            for (const field of ['participantNames', 'participantPfpUrls', 'lastReadAt']) {
              const values: Record<string, unknown> = {};
              const flatten = async (object: RecordData, prefix = '') => {
                for (const [key, value] of Object.entries(object)) {
                  const name = prefix ? `${prefix}.${key}` : key;
                  if (value && typeof value === 'object' && !Array.isArray(value))
                    await flatten(value, name);
                  else {
                    const id = await resolve(name);
                    values[id] =
                      field === 'lastReadAt'
                        ? Math.max(Number(values[id]) || 0, Number(value) || 0)
                        : value;
                  }
                }
              };
              await flatten(data[field] ?? {});
              next[field] = values;
            }
          }
          if (collection === 'calls_v1' && ['calling', 'accepted'].includes(data.status))
            next.status = 'ended';
          return next;
        })
      );
  }
}

async function migratePasskeys({ userId, username, school }: AccountIdentity) {
  // Credential IDs remain discoverable even when authenticators send the old handle.
  const oldHandle = Buffer.from(`${username}@${school}`).toString('base64url');
  const newHandle = Buffer.from(`${userId}@${school}`).toString('base64url');
  const oldPasskey = db.collection('passkey_users').doc(oldHandle);
  const newPasskey = db.collection('passkey_users').doc(newHandle);
  await visit(oldPasskey.collection('credentials'), async (ref) => {
    await db.runTransaction(async (transaction) => {
      const credential = await transaction.get(ref);
      const target = newPasskey.collection('credentials').doc(ref.id);
      const current = await transaction.get(target);
      const oldUser = await transaction.get(oldPasskey);
      const newUser = await transaction.get(newPasskey);
      if (!credential.exists || !oldUser.exists) return;
      if (!newUser.exists) transaction.set(newPasskey, { ...oldUser.data(), userId });
      if (!current.exists) transaction.set(target, credential.data()!);
      transaction.set(db.collection('passkey_credential_index').doc(ref.id), {
        userHandle: newHandle,
      });
      transaction.delete(ref);
    });
  });
  await moveRecord(oldPasskey, newPasskey, (data) => ({ ...data, userId }));
}

async function finishMigration(
  { userId, username, school }: AccountIdentity,
  aliasRef: FirebaseFirestore.DocumentReference
) {
  await db.runTransaction(async (transaction) => {
    const statsRef = db.collection('stats').doc('loginStats');
    const stats = (await transaction.get(statsRef)).data();
    const archiveRef = db.collection('legacy_user_data').doc(userId);
    const archive = await transaction.get(archiveRef);
    const loginRef = db.collection('login_users').doc(userId);
    const login = await transaction.get(loginRef);
    const users: RecordData[] = stats?.users ?? [];
    const own = users.filter((user) => user.username === username || user.userId === userId);
    if (own.length) {
      if (!archive.exists) transaction.set(archiveRef, { userId, entries: own });
      if (!login.exists)
        transaction.set(loginRef, {
          userId,
          school,
          method: own[0].auth_method ?? 'classic',
          loginCount: own.reduce((count, entry) => count + (entry.login_count ?? 0), 0),
          legacyFirstLogin: own[0].first_login ?? '',
          legacyLastLogin: own[0].last_login ?? '',
        });
      transaction.update(statsRef, { users: users.filter((user) => !own.includes(user)) });
    }
    transaction.update(aliasRef, { migrationVersion, migratedAt: Date.now() });
  });
}

async function migrateAccount(identity: AccountIdentity) {
  const { userId, username, school } = identity;
  const aliasRef = db.collection('account_aliases').doc(username);
  const complete = await db.runTransaction(async (transaction) => {
    const alias = (await transaction.get(aliasRef)).data();
    if (alias && (alias.userId !== userId || alias.school !== school))
      throw new InputError(
        'This legacy username is already linked to another account. Contact support.',
        409
      );
    if (alias?.migrationVersion === migrationVersion) return true;
    if (!alias) transaction.set(aliasRef, { userId, username, school, claimedAt: Date.now() });
    return false;
  });
  if (complete) return;

  const resolve = async (value: string): Promise<string> => {
    if (!value) return value;
    if (value === username) return userId;
    if (!isAccountReference(value)) return value;
    return (await db.collection('account_aliases').doc(value).get()).data()?.userId ?? value;
  };
  await migratePrivateRecords(identity);
  await migrateSharedRecords(identity, resolve);
  await migratePasskeys(identity);
  await finishMigration(identity, aliasRef);
}

export function ensureAccountMigration(identity: AccountIdentity): Promise<void> {
  identity = {
    ...identity,
    username: identity.username.toLowerCase().trim(),
    school: identity.school.toLowerCase(),
  };
  assertUserId(identity.userId);
  assertSchool(identity.school);
  if (!isAccountReference(identity.username)) throw new InputError('Invalid SchoolSoft username');
  const key = `${identity.userId}:${identity.username}:${identity.school}`;
  let result = pending.get(key);
  if (!result) {
    result = migrateAccount(identity).finally(() => pending.delete(key));
    pending.set(key, result);
  }
  return result;
}
