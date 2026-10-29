/* eslint-disable @typescript-eslint/no-require-imports -- Standalone migration CLI. */
const fs = require('node:fs');
const { isDeepStrictEqual } = require('node:util');

const isId = (value) => /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value));

function createIdentityMap(entries) {
  if (!Array.isArray(entries) || !entries.length)
    throw new Error('Provide a non-empty identity mapping array');
  const aliases = new Map();
  const ids = new Map();
  for (const entry of entries) {
    if (
      !entry ||
      typeof entry !== 'object' ||
      typeof entry.school !== 'string' ||
      typeof entry.username !== 'string' ||
      !entry.username.trim() ||
      !/^[\w-]+$/.test(entry.school) ||
      !isId(entry.userId)
    )
      throw new Error('Invalid identity mapping');
    const value = {
      username: entry.username.toLowerCase().trim(),
      school: entry.school.toLowerCase(),
      userId: String(entry.userId),
    };
    const key = `${value.username}@${value.school}`;
    if (aliases.has(key) && aliases.get(key).userId !== value.userId)
      throw new Error(`Conflicting mapping for ${key}`);
    aliases.set(key, value);
    if (ids.has(value.userId) && ids.get(value.userId).school !== value.school)
      throw new Error(`Conflicting school for user ID ${value.userId}`);
    ids.set(value.userId, value);
  }
  function resolve(value, school) {
    const name = String(value ?? '')
      .toLowerCase()
      .trim();
    const candidates = [...aliases.values()].filter(
      (entry) => entry.username === name && (!school || entry.school === school.toLowerCase())
    );
    const matches = new Set(candidates.map((entry) => entry.userId));
    if (matches.size > 1) throw new Error(`Ambiguous legacy username: ${name}`);
    if (matches.size === 1) return [...matches][0];
    if (isId(name) && ids.has(name)) return name;
    throw new Error(`Unmapped identity: ${name}${school ? '@' + school : ''}`);
  }
  function handle(value) {
    const raw = Buffer.from(value, 'base64url').toString('utf8');
    const separator = raw.lastIndexOf('@');
    if (separator < 1) throw new Error('Invalid passkey user handle');
    const school = raw.slice(separator + 1);
    return Buffer.from(
      `${resolve(raw.slice(0, separator), school)}@${school.toLowerCase()}`
    ).toString('base64url');
  }
  return { resolve, handle, ids };
}

function transformRecord(path, data, identities) {
  const parts = path.split('/');
  const collection = parts[0];
  const id = parts.at(-1);
  const next = { ...data };
  const extra = [];
  const resolve = (value) => identities.resolve(value, data.school);
  function rename(oldName, newName) {
    if (next[newName] !== undefined && next[newName] !== null && next[newName] !== '')
      next[newName] = resolve(next[newName]);
    else if (next[oldName] !== undefined && next[oldName] !== null && next[oldName] !== '')
      next[newName] = resolve(next[oldName]);
    else if (next[oldName] !== undefined) next[newName] = next[oldName];
    delete next[oldName];
  }
  function requireIds(...fields) {
    for (const field of fields)
      if (!isId(next[field])) throw new Error(`Missing or invalid ${field}: ${path}`);
  }
  function identityList(values) {
    return [...new Set((values ?? []).map(resolve))];
  }
  function identityKeys(object, prefix = '') {
    const result = {};
    for (const [key, value] of Object.entries(object ?? {})) {
      const name = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        for (const [id, nestedValue] of Object.entries(identityKeys(value, name))) {
          result[id] =
            typeof nestedValue === 'number' ? Math.max(result[id] ?? 0, nestedValue) : nestedValue;
        }
      } else {
        const userId = resolve(name);
        result[userId] = typeof value === 'number' ? Math.max(result[userId] ?? 0, value) : value;
      }
    }
    return result;
  }
  const ownerCollections = [
    'notes_v2',
    'countdowns_v1',
    'flashcard_decks_v1',
    'flashcard_cards_v1',
  ];
  const keyedCollections = [
    'profiles_v1',
    'presence_v1',
    'dashboard_layouts',
    'final_grades_v1',
    'referrals_v1',
  ];
  let target = path;
  if (ownerCollections.includes(collection)) {
    rename('username', 'userId');
    requireIds('userId');
  }
  if (keyedCollections.includes(collection)) {
    const userId = resolve(data.userId ?? id);
    target = `${collection}/${userId}`;
    next.userId = userId;
    if (collection === 'profiles_v1') {
      const entry = identities.ids.get(userId);
      next.loginUsername = data.loginUsername ?? entry.username;
      next.school = data.school ?? entry.school;
    }
    delete next.username;
  }
  if (collection === 'grade_tracker_v1') {
    rename('username', 'userId');
    requireIds('userId');
    if (!Number.isSafeInteger(data.subjectId) || data.subjectId < 1)
      throw new Error(`Invalid subject ID: ${path}`);
    target = `${collection}/${next.userId}_${data.subjectId}`;
  }
  if (collection === 'conversations_v1' || collection === 'group_calls_v2') {
    next.participantIds = identityList(data.participantIds ?? data.participants);
    delete next.participants;
    if (collection === 'conversations_v1') {
      rename('adminUsername', 'adminUserId');
      rename('lastSenderUsername', 'lastSenderUserId');
      if (data.type === 'dm') next.participantIds.sort();
      for (const field of ['participantNames', 'participantPfpUrls', 'lastReadAt'])
        next[field] = identityKeys(data[field]);
    } else {
      rename('startedBy', 'startedByUserId');
      next.status = 'ended';
      if (parts[2] === 'connections') {
        delete next.participantIds;
        delete next.status;
        rename('initiator', 'initiatorUserId');
        rename('responder', 'responderUserId');
      }
    }
  }
  if (collection === 'messages_v1') {
    rename('senderUsername', 'senderUserId');
    requireIds('senderUserId');
    next.reactions = Object.fromEntries(
      Object.entries(data.reactions ?? {}).map(([emoji, users]) => [emoji, identityList(users)])
    );
    if (data.shareCard?.type === 'flashdeck') {
      next.shareCard = {
        ...data.shareCard,
        sharedByUserId: resolve(data.shareCard.sharedByUserId ?? data.shareCard.sharedByUsername),
      };
      delete next.shareCard.sharedByUsername;
    }
  }
  if (collection === 'friendships_v1') {
    rename('userA', 'userAId');
    rename('userB', 'userBId');
    rename('requestedBy', 'requestedById');
    requireIds('userAId', 'userBId', 'requestedById');
    const pair = [next.userAId, next.userBId].sort();
    [next.userAId, next.userBId] = pair;
    target = `${collection}/${pair.join('_')}`;
  }
  if (collection === 'group_invites_v1') {
    rename('invitedUsername', 'invitedUserId');
    rename('invitedBy', 'invitedById');
    requireIds('invitedUserId', 'invitedById');
    target = `${collection}/${data.conversationId}_${next.invitedUserId}`;
  }
  if (collection === 'referral_codes_v1') {
    rename('username', 'userId');
    requireIds('userId');
  }
  if (collection === 'referrals_v1')
    next.referredUsers = (data.referredUsers ?? []).map((entry) => ({
      userId: resolve(entry.userId ?? entry.username),
      joinedAt: entry.joinedAt,
    }));
  if (collection === 'calls_v1') {
    rename('callerUsername', 'callerUserId');
    rename('calleeUsername', 'calleeUserId');
    requireIds('callerUserId', 'calleeUserId');
    if (['calling', 'accepted'].includes(next.status)) next.status = 'ended';
  }
  if (collection === 'passkey_users') {
    const userHandle = identities.handle(parts[1]);
    target = [collection, userHandle, ...parts.slice(2)].join('/');
    if (parts.length === 2)
      next.userId = identities.resolve(data.userId ?? data.username, data.school);
  }
  if (collection === 'passkey_credential_index')
    next.userHandle = identities.handle(data.userHandle);
  if (collection === 'passkey_challenges') return { path, data: null, extra };
  if (collection === 'stats' && id === 'loginStats') {
    for (const user of data.users ?? []) {
      const userId = resolve(user.userId ?? user.username);
      const entry = identities.ids.get(userId);
      extra.push({
        path: `login_users/${userId}`,
        data: {
          userId,
          school: entry.school,
          method: user.auth_method ?? 'classic',
          loginCount: user.login_count ?? 0,
          firstLoginAt: 0,
          lastLoginAt: 0,
          legacyFirstLogin: user.first_login ?? '',
          legacyLastLogin: user.last_login ?? '',
        },
      });
      extra.push({ path: `legacy_user_data/${userId}`, data: { ...user.data, userId } });
    }
    delete next.users;
  }
  return { path: target, data: next, extra };
}

async function readCollection(collection) {
  const result = [];
  let cursor;
  while (true) {
    let query = collection.orderBy('__name__').limit(200);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    result.push(...page.docs);
    if (page.size < 200) return result;
    cursor = page.docs.at(-1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const argument = (name) => args[args.indexOf(name) + 1];
  if (!args.includes('--mapping') || !args.includes('--project'))
    throw new Error(
      'Usage: node scripts/migrate-user-ids.cjs --mapping identities.json --project PROJECT [--apply --maintenance-confirmed]'
    );
  const apply = args.includes('--apply');
  if (apply && !args.includes('--maintenance-confirmed'))
    throw new Error('Apply requires stopped application traffic and --maintenance-confirmed');
  const identities = createIdentityMap(JSON.parse(fs.readFileSync(argument('--mapping'), 'utf8')));
  const admin = require('firebase-admin');
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is required');
  const credentials = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  if (credentials.project_id !== argument('--project'))
    throw new Error('Project does not match service account');
  admin.initializeApp({ credential: admin.credential.cert(credentials) });
  const db = admin.firestore();
  const collections = [
    'profiles_v1',
    'presence_v1',
    'dashboard_layouts',
    'final_grades_v1',
    'grade_tracker_v1',
    'notes_v2',
    'countdowns_v1',
    'flashcard_decks_v1',
    'flashcard_cards_v1',
    'conversations_v1',
    'messages_v1',
    'friendships_v1',
    'group_invites_v1',
    'referrals_v1',
    'referral_codes_v1',
    'calls_v1',
    'group_calls_v2',
    'passkey_users',
    'passkey_credential_index',
    'passkey_challenges',
    'stats',
  ];
  const plans = [];
  const targets = new Map();
  function schedule(snapshot, transformed) {
    for (const extra of transformed.extra) schedule(null, { ...extra, extra: [] });
    const source = snapshot?.ref.path;
    if (source === transformed.path && isDeepStrictEqual(snapshot.data(), transformed.data)) return;
    const previous = targets.get(transformed.path);
    if (previous && !isDeepStrictEqual(previous.data, transformed.data))
      throw new Error(`Conflicting destination: ${transformed.path}`);
    const plan = {
      source,
      version: snapshot?.updateTime,
      path: transformed.path,
      data: transformed.data,
    };
    targets.set(plan.path, plan);
    plans.push(plan);
  }
  for (const collection of collections) {
    for (const document of await readCollection(db.collection(collection))) {
      const data = document.data();
      if (collection === 'stats' && document.id !== 'loginStats') continue;
      const child =
        collection === 'passkey_users'
          ? 'credentials'
          : collection === 'group_calls_v2'
            ? 'connections'
            : null;
      if (child)
        for (const nested of await readCollection(document.ref.collection(child)))
          schedule(nested, transformRecord(nested.ref.path, nested.data(), identities));
      schedule(document, transformRecord(document.ref.path, data, identities));
    }
  }
  // Check every destination before changing any source document.
  for (const plan of plans) {
    if (plan.path === plan.source || plan.data === null) continue;
    const existing = await db.doc(plan.path).get();
    if (existing.exists && !isDeepStrictEqual(existing.data(), plan.data))
      throw new Error(`Destination already exists: ${plan.path}`);
  }
  console.log(
    `${apply ? 'Applying' : 'Dry run:'} ${plans.length} document changes in project ${argument('--project')}`
  );
  if (!apply) return;
  // Move credentials before their parent so interrupted runs can discover remaining children.
  for (const plan of plans) {
    await db.runTransaction(async (transaction) => {
      const source = plan.source ? await transaction.get(db.doc(plan.source)) : null;
      const target = plan.path !== plan.source ? await transaction.get(db.doc(plan.path)) : source;
      if (source && (!source.exists || !source.updateTime.isEqual(plan.version)))
        throw new Error(`Source changed: ${plan.source}`);
      if (
        target?.exists &&
        plan.path !== plan.source &&
        !isDeepStrictEqual(target.data(), plan.data)
      )
        throw new Error(`Destination changed: ${plan.path}`);
      if (plan.data === null) transaction.delete(db.doc(plan.path));
      else transaction.set(db.doc(plan.path), plan.data);
      if (plan.source && plan.source !== plan.path) transaction.delete(db.doc(plan.source));
    });
  }
  console.log('Migration finished. Deploy matching rules and clients before resuming traffic.');
}

module.exports = { createIdentityMap, transformRecord };
if (require.main === module)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
