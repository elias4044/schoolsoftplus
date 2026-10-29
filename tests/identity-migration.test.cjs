/* eslint-disable @typescript-eslint/no-require-imports -- Isolated server and migration tests. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const { NextRequest } = require('next/server');
const { createIdentityMap, transformRecord } = require('../scripts/migrate-user-ids.cjs');

function loadServer(entry, stubs = {}) {
  const cache = new Map();
  function load(filename) {
    filename = path.resolve(filename);
    if (cache.has(filename)) return cache.get(filename);
    const loaded = { exports: {} };
    cache.set(filename, loaded.exports);
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    }).outputText;
    vm.runInNewContext(
      source,
      {
        module: loaded,
        exports: loaded.exports,
        Buffer,
        URL,
        Headers,
        Request,
        Response,
        AbortSignal,
        Date,
        console,
        process: stubs.process ?? process,
        fetch: stubs.fetch ?? globalThis.fetch,
        require(name) {
          if (name in stubs) return stubs[name];
          if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), `${name}.ts`));
          if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`);
          return require(name);
        },
      },
      { filename }
    );
    return loaded.exports;
  }
  return load(entry);
}

const entries = [
  { username: 'first.last', school: 'engelska', userId: '654321' },
  { username: 'second.last', school: 'engelska', userId: '123456' },
];
const identities = createIdentityMap(entries);

test('legacy passkeys link only after their SchoolSoft username is verified', async () => {
  for (const [storedId, actualUsername, status] of [
    [undefined, 'first.last', 200],
    [undefined, 'another.user', 401],
    ['654321', 'first.last', 401],
  ]) {
    const migrated = [];
    const events = [];
    const route = loadServer('app/api/auth/passkey/authenticate/complete/route.ts', {
      process: { env: { PASSKEY_RP_ID: 'localhost', PASSKEY_ORIGIN: 'http://localhost' } },
      fetch: async () => ({
        status: 200,
        json: async () => ({ access_token: 'access', refresh_token: 'rotated' }),
      }),
      axios: { get: async () => ({ headers: {} }) },
      '@simplewebauthn/server': {
        verifyAuthenticationResponse: async () => ({
          verified: true,
          authenticationInfo: { newCounter: 2 },
        }),
      },
      '@/app/api/lib/requestBody': {
        readRouteBody: async () => ({
          response: { id: 'device', response: { userHandle: 'old-handle' } },
        }),
      },
      '@/app/api/lib/routeValidation': { withValidation: (handler) => handler },
      '@/app/api/lib/passkeyDb': {
        consumeChallenge: async () => ({ type: 'authentication', challenge: 'challenge' }),
        getCredential: async () => ({ credentialId: 'device', publicKey: 'a2V5', signCount: 1 }),
        updateCredentialSignCount: async () => {},
        getPasskeyUser: async () => ({
          username: 'first.last',
          userId: storedId,
          school: 'engelska',
          orgId: '18',
          encryptedRefreshToken: 'encrypted',
        }),
        updatePasskeyToken: async () => events.push('token-saved'),
      },
      '@/app/api/lib/serverCrypto': {
        decrypt: () => 'refresh',
        encrypt: () => ({ ciphertext: 'new', iv: 'iv' }),
      },
      '@/app/api/lib/mobileAuth': {
        fetchSchoolsoftSession: async () => {
          events.push('identity-checked');
          return { username: actualUsername, userId: 123456 };
        },
      },
      '@/app/api/lib/accountMigration': {
        ensureAccountMigration: async (identity) => migrated.push(identity),
      },
    });
    const response = await route.POST(
      new NextRequest('http://localhost/api/auth/passkey/authenticate/complete', {
        method: 'POST',
        headers: { cookie: 'ssp_pk_auth_challenge_id=challenge' },
      })
    );
    assert.equal(response.status, status);
    assert.equal(events.join(','), 'token-saved,identity-checked');
    assert.equal(migrated.length, status === 200 ? 1 : 0);
    if (migrated.length) assert.equal(migrated[0].userId, '123456');
  }
});

test('IDs are validated without depending on a fixed six-digit width', () => {
  const { normalizeUserId } = loadServer('app/api/lib/identity.ts');
  for (const value of [123456, '123456', '1234567'])
    assert.equal(normalizeUserId(value), String(value));
  for (const value of [
    null,
    true,
    {},
    0,
    -1,
    Infinity,
    NaN,
    1.5,
    '012345',
    '../123456',
    '123456x',
    Number.MAX_SAFE_INTEGER + 1,
  ])
    assert.equal(normalizeUserId(value), null);
});

test('request identity comes from SchoolSoft, ignores forged identity cookies, and is verified once per request', async () => {
  let checks = 0;
  const migrated = [];
  const server = loadServer('app/api/lib/schoolsoft.ts', {
    './accountMigration': { ensureAccountMigration: async (identity) => migrated.push(identity) },
    axios: {
      create: () => ({
        get: async () => {
          checks++;
          return {
            status: 200,
            data: { user: { id: 123456, userName: 'Actual.User' }, organization: { id: 18 } },
          };
        },
      }),
    },
  });
  const request = new NextRequest('http://localhost/api/session', {
    headers: {
      cookie:
        'ssp_jsessionid=valid; ssp_username=attacker; ssp_userid=999999; ssp_ss_orgid=999; ssp_school=engelska',
    },
  });
  const [first, second] = await Promise.all([
    server.requireSession(request),
    server.requireSession(request),
  ]);
  assert.equal(first, second);
  assert.equal(first.userId, '123456');
  assert.equal(first.username, 'actual.user');
  assert.equal(first.user.orgId, 18);
  assert.equal(checks, 1);
  assert.equal(migrated.length, 1);
  assert.equal(migrated[0].username, 'actual.user');
  assert.equal(migrated[0].userId, '123456');
});

test('a rejected upstream session cannot become an authenticated account', async () => {
  const server = loadServer('app/api/lib/schoolsoft.ts', {
    axios: { create: () => ({ get: async () => ({ status: 401 }) }) },
  });
  const request = new NextRequest('http://localhost/api/session', {
    headers: { cookie: 'ssp_jsessionid=invalid; ssp_username=first.last; ssp_userid=654321' },
  });
  assert.equal(await server.requireSession(request), null);
});

test('mapping rejects ambiguity, conflicts, missing accounts, and malformed IDs', () => {
  assert.throws(() => identities.resolve('unknown'), /Unmapped/);
  assert.throws(
    () => createIdentityMap([...entries, { ...entries[0], userId: '777777' }]),
    /Conflicting/
  );
  assert.throws(() => createIdentityMap([{ ...entries[0], userId: '../bad' }]), /Invalid/);
  const ambiguous = createIdentityMap([
    ...entries,
    { username: 'first.last', school: 'other', userId: '777777' },
  ]);
  assert.throws(() => ambiguous.resolve('first.last'), /Ambiguous/);
  assert.equal(ambiguous.resolve('first.last', 'other'), '777777');
  assert.throws(
    () => transformRecord('notes_v2/note', { title: 'Missing owner' }, identities),
    /Missing or invalid/
  );
});

test('private ownership and keyed documents migrate without changing resource IDs or content', () => {
  for (const collection of [
    'notes_v2',
    'countdowns_v1',
    'flashcard_decks_v1',
    'flashcard_cards_v1',
  ]) {
    const source = { username: 'first.last', content: 'Original', deckId: 'deck' };
    const result = transformRecord(`${collection}/resource`, source, identities);
    assert.equal(result.path, `${collection}/resource`);
    assert.equal(result.data.userId, '654321');
    assert.equal(result.data.content, source.content);
    assert.equal(result.data.username, undefined);
    assert.equal(source.username, 'first.last');
    assert.deepEqual(transformRecord(result.path, result.data, identities), result);
  }
  const profile = transformRecord('profiles_v1/first.last', { displayName: 'First' }, identities);
  assert.equal(profile.path, 'profiles_v1/654321');
  assert.equal(profile.data.loginUsername, 'first.last');
  const tracker = transformRecord(
    'grade_tracker_v1/first.last_10',
    { username: 'first.last', subjectId: 10, entries: [{ grade: 'A' }] },
    identities
  );
  assert.equal(tracker.path, 'grade_tracker_v1/654321_10');
  assert.equal(tracker.data.entries[0].grade, 'A');
});

test('conversation IDs and encrypted ciphertext stay stable while identities and literal map keys migrate', () => {
  const result = transformRecord(
    'conversations_v1/keep-for-encryption',
    {
      type: 'dm',
      participants: ['first.last', 'second.last'],
      adminUsername: null,
      participantNames: { 'first.last': 'First', second: { last: 'Second' } },
      lastReadAt: { first: { last: 10 }, 'second.last': 20 },
      lastSenderUsername: 'first.last',
      encrypted: true,
    },
    identities
  );
  assert.equal(result.path, 'conversations_v1/keep-for-encryption');
  assert.deepEqual(result.data.participantIds, ['123456', '654321']);
  assert.deepEqual(result.data.lastReadAt, { 654321: 10, 123456: 20 });
  assert.equal(result.data.participantNames['123456'], 'Second');
  const message = transformRecord(
    'messages_v1/message',
    {
      conversationId: 'keep-for-encryption',
      senderUsername: 'first.last',
      content: 'ciphertext',
      reactions: { like: ['first.last', 'second.last'] },
      shareCard: { type: 'flashdeck', deckId: 'deck', sharedByUsername: 'second.last' },
    },
    identities
  );
  assert.equal(message.data.content, 'ciphertext');
  assert.equal(message.data.conversationId, 'keep-for-encryption');
  assert.equal(message.data.senderUserId, '654321');
  assert.deepEqual(message.data.reactions.like, ['654321', '123456']);
  assert.equal(message.data.shareCard.sharedByUserId, '123456');
});

test('friendships, invites, referral codes, and nested referral credit use IDs', () => {
  const friendship = transformRecord(
    'friendships_v1/random-id',
    { userA: 'first.last', userB: 'second.last', requestedBy: 'first.last' },
    identities
  );
  assert.equal(friendship.path, 'friendships_v1/123456_654321');
  assert.equal(friendship.data.requestedById, '654321');
  const invite = transformRecord(
    'group_invites_v1/random',
    { conversationId: 'group', invitedUsername: 'first.last', invitedBy: 'second.last' },
    identities
  );
  assert.equal(invite.path, 'group_invites_v1/group_654321');
  const referral = transformRecord(
    'referrals_v1/first.last',
    { code: 'ABCDEFGH', referredUsers: [{ username: 'second.last', joinedAt: 1 }] },
    identities
  );
  assert.equal(referral.data.code, 'ABCDEFGH');
  assert.equal(referral.data.referredUsers[0].userId, '123456');
  assert.equal(
    transformRecord('referral_codes_v1/ABCDEFGH', { username: 'first.last' }, identities).data
      .userId,
    '654321'
  );
});

test('passkeys move credentials and lookup indexes together without replacing authenticator material', () => {
  const oldHandle = Buffer.from('first.last@engelska').toString('base64url');
  const newHandle = Buffer.from('654321@engelska').toString('base64url');
  const credential = { publicKey: 'unchanged', signCount: 7 };
  const result = transformRecord(
    `passkey_users/${oldHandle}/credentials/credential`,
    credential,
    identities
  );
  assert.equal(result.path, `passkey_users/${newHandle}/credentials/credential`);
  assert.deepEqual(result.data, credential);
  const index = transformRecord(
    'passkey_credential_index/credential',
    { userHandle: oldHandle },
    identities
  );
  assert.equal(index.data.userHandle, newHandle);
  assert.equal(
    transformRecord('passkey_challenges/pending', { challenge: 'expired-on-cutover' }, identities)
      .data,
    null
  );
});

test('legacy personal data is removed from public aggregates and preserved in private ID-keyed documents', () => {
  const result = transformRecord(
    'stats/loginStats',
    {
      total_logins: 5,
      users: [{ username: 'first.last', login_count: 5, data: { notes: ['private'], goals: [] } }],
    },
    identities
  );
  assert.equal(result.data.users, undefined);
  assert.equal(result.data.total_logins, 5);
  assert.equal(result.extra[0].path, 'login_users/654321');
  assert.equal(result.extra[1].path, 'legacy_user_data/654321');
  assert.deepEqual(result.extra[1].data.notes, ['private']);
});
