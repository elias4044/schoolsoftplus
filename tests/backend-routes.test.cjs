/* eslint-disable @typescript-eslint/no-require-imports -- Isolated TypeScript module tests. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const { NextRequest } = require('next/server');

function createLoader(stubs = {}) {
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
        Date,
        Request,
        Response,
        AbortSignal,
        console,
        require: (name) => {
          if (name in stubs) return stubs[name];
          if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`);
          if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), `${name}.ts`));
          return require(name);
        },
      },
      { filename }
    );
    return loaded.exports;
  }
  return load;
}

function createStore(initial = {}, { failCommit, retry = false } = {}) {
  const data = new Map(Object.entries(structuredClone(initial)));
  const commits = [];
  let nextId = 0;
  let attempts = 0;
  let pending = Promise.resolve();
  const snapshot = (ref) => ({
    id: ref.id,
    ref,
    exists: data.has(ref.path),
    data: () => structuredClone(data.get(ref.path)),
  });
  function collection(name, filters = [], max = Infinity, after = '') {
    return {
      doc(id = `generated-${++nextId}`) {
        const ref = {
          id,
          path: `${name}/${id}`,
          get: async () => snapshot(ref),
          set: async (value) => data.set(ref.path, structuredClone(value)),
          collection: (child) => collection(`${name}/${id}/${child}`),
          delete: async () => data.delete(ref.path),
        };
        return ref;
      },
      where: (field, operator, value) => {
        assert.ok(['==', 'array-contains'].includes(operator));
        return collection(name, [...filters, [field, value, operator]], max, after);
      },
      orderBy: () => collection(name, filters, max, after),
      startAfter: (cursor) => collection(name, filters, max, cursor.ref.path),
      limit: (limit) => collection(name, filters, limit, after),
      async get() {
        const docs = [...data.entries()]
          .filter(
            ([key, value]) =>
              key.startsWith(`${name}/`) &&
              !key.slice(name.length + 1).includes('/') &&
              key > after &&
              filters.every(([field, expected, operator]) =>
                operator === 'array-contains'
                  ? value[field]?.includes(expected)
                  : value[field] === expected
              )
          )
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(0, max)
          .map(([key]) => snapshot(collection(name).doc(key.slice(name.length + 1))));
        return { docs, size: docs.length, empty: docs.length === 0 };
      },
    };
  }
  const db = {
    collection,
    runTransaction(callback) {
      const operation = pending.then(async () => {
        let writes;
        const run = async () => {
          writes = [];
          return callback({
            get: (target) => target.get(),
            set: (ref, value) => writes.push(['set', ref.path, value]),
            update: (ref, value) => writes.push(['update', ref.path, value]),
            delete: (ref) => writes.push(['delete', ref.path]),
          });
        };
        if (retry) await run();
        const result = await run();
        assert.ok(writes.length <= 500, 'transaction exceeds write limit');
        if (++attempts === failCommit) throw new Error('Injected commit failure');
        for (const [type, key, value] of writes) {
          if (type === 'delete') data.delete(key);
          else
            data.set(key, structuredClone(type === 'set' ? value : { ...data.get(key), ...value }));
        }
        commits.push(writes);
        return result;
      });
      pending = operation.catch(() => {});
      return operation;
    },
  };
  const load = createLoader({ './firebaseAdmin': { db } });
  return { data, commits, load };
}

test('returning accounts migrate independently while shared IDs, messages, and offline peers survive', async () => {
  const first = { username: 'first.last', userId: '123456', school: 'engelska' };
  const second = { username: 'second.last', userId: '654321', school: 'engelska' };
  const oldHandle = Buffer.from('first.last@engelska').toString('base64url');
  const newHandle = Buffer.from('123456@engelska').toString('base64url');
  const { data, load, commits } = createStore(
    {
      'notes_v2/mine': { username: first.username, content: 'unchanged' },
      'notes_v2/theirs': { username: second.username, content: 'private' },
      'profiles_v1/first.last': { displayName: 'First' },
      'profiles_v1/second.last': { displayName: 'Second' },
      'dashboard_layouts/first.last': { widgets: ['notes'] },
      'grade_tracker_v1/first.last_10': {
        username: first.username,
        subjectId: 10,
        assessments: [1],
      },
      'conversations_v1/encryption-salt': {
        type: 'dm',
        participants: [first.username, second.username],
        participantNames: { 'first.last': 'First', 'second.last': 'Second' },
        lastReadAt: { first: { last: 20 }, 'first.last': 30 },
        lastSenderUsername: first.username,
      },
      'messages_v1/old': {
        conversationId: 'encryption-salt',
        senderUsername: first.username,
        content: 'ciphertext',
        reactions: { like: [first.username, second.username] },
      },
      'friendships_v1/random-legacy-id': {
        userA: first.username,
        userB: second.username,
        requestedBy: first.username,
        status: 'accepted',
      },
      'group_invites_v1/legacy-invite': {
        invitedUsername: first.username,
        invitedBy: second.username,
      },
      'referrals_v1/first.last': {
        code: 'ABCDEFGH',
        referredUsers: [{ username: second.username, joinedAt: 1 }],
      },
      'referral_codes_v1/ABCDEFGH': { username: first.username },
      [`passkey_users/${oldHandle}`]: {
        username: first.username,
        school: first.school,
        encryptedRefreshToken: 'secret',
      },
      [`passkey_users/${oldHandle}/credentials/device`]: { publicKey: 'keep', signCount: 3 },
      'stats/loginStats': {
        total_logins: 5,
        users: [
          { username: first.username, login_count: 3, data: { notes: ['legacy'] } },
          { username: second.username, login_count: 2 },
        ],
      },
    },
    { retry: true }
  );
  const migration = load('app/api/lib/accountMigration.ts');
  await Promise.all([
    migration.ensureAccountMigration(first),
    migration.ensureAccountMigration(first),
  ]);
  assert.equal(data.get('notes_v2/mine').userId, first.userId);
  assert.equal(data.get('notes_v2/mine').username, undefined);
  assert.equal(data.get('notes_v2/theirs').username, second.username);
  assert.equal(data.get('profiles_v1/123456').loginUsername, first.username);
  assert.equal(data.has('profiles_v1/first.last'), false);
  assert.equal(data.get('grade_tracker_v1/123456_10').assessments[0], 1);
  assert.equal(
    data.get('conversations_v1/encryption-salt').participantIds.join(','),
    '123456,second.last'
  );
  assert.equal(data.get('conversations_v1/encryption-salt').lastReadAt['123456'], 30);
  assert.equal(data.get('messages_v1/old').content, 'ciphertext');
  assert.equal(data.get(`passkey_users/${newHandle}/credentials/device`).publicKey, 'keep');
  assert.equal(data.get('passkey_credential_index/device').userHandle, newHandle);
  assert.equal(data.has(`passkey_users/${oldHandle}`), false);
  assert.equal(data.get('stats/loginStats').users.length, 1);
  assert.equal(data.get('legacy_user_data/123456').entries[0].data.notes[0], 'legacy');
  assert.equal(data.get('login_users/123456').loginCount, 3);
  const before = commits.reduce((total, writes) => total + writes.length, 0);
  await migration.ensureAccountMigration(first);
  assert.equal(
    commits.reduce((total, writes) => total + writes.length, 0),
    before
  );

  await migration.ensureAccountMigration(second);
  const conversation = data.get('conversations_v1/encryption-salt');
  assert.equal(conversation.participantIds.join(','), '123456,654321');
  const { normalizeMessageIdentity } = load('lib/accountReferences.ts');
  const message = normalizeMessageIdentity(
    data.get('messages_v1/old'),
    conversation.participantAliases
  );
  assert.equal(message.senderUserId, '123456');
  assert.equal(message.reactions.like.join(','), '123456,654321');
  const friendship = await load('app/api/lib/friendsDb.ts').getFriendship('123456', '654321');
  assert.equal(friendship.id, 'random-legacy-id');
  assert.equal(data.get('group_invites_v1/legacy-invite').invitedById, '654321');
  assert.equal(await load('app/api/lib/referralDb.ts').creditReferral('123456', '654321'), false);
  assert.equal(data.get('stats/loginStats').total_logins, 5);
});

test('lazy migration resumes after failure, preserves newer records, and rejects conflicting claims', async () => {
  const identity = { username: 'first.last', userId: '123456', school: 'engelska' };
  const { data, load } = createStore(
    {
      'profiles_v1/first.last': { displayName: 'Old', bio: 'legacy bio' },
      'profiles_v1/123456': { displayName: 'New' },
      'notes_v2/mine': { username: identity.username, content: 'keep' },
    },
    { failCommit: 3 }
  );
  const { ensureAccountMigration } = load('app/api/lib/accountMigration.ts');
  await assert.rejects(ensureAccountMigration(identity), /Injected commit failure/);
  assert.equal(data.get('account_aliases/first.last').migrationVersion, undefined);
  await ensureAccountMigration(identity);
  assert.equal(data.get('profiles_v1/123456').displayName, 'New');
  assert.equal(data.get('profiles_v1/123456').bio, 'legacy bio');
  assert.equal(
    [...data.keys()].some((key) => key.startsWith('account_migration_conflicts/')),
    true
  );
  await assert.rejects(ensureAccountMigration({ ...identity, userId: '654321' }), /already linked/);
  assert.equal(data.has('profiles_v1/654321'), false);
});

test('lazy migration pages owner records while deleting matches and changing their query fields', async () => {
  const initial = Object.fromEntries(
    Array.from({ length: 205 }, (_, index) => [
      `notes_v2/note-${String(index).padStart(3, '0')}`,
      { username: 'first.last', content: String(index) },
    ])
  );
  const { data, load } = createStore(initial);
  await load('app/api/lib/accountMigration.ts').ensureAccountMigration({
    username: 'first.last',
    userId: '123456',
    school: 'engelska',
  });
  assert.equal(
    [...data.entries()].filter(
      ([key, value]) => key.startsWith('notes_v2/') && value.userId === '123456'
    ).length,
    205
  );
});

const routePaths = [
  'notes',
  'notes/[id]',
  'notes/[id]/share',
  'notes/shared/[token]',
  'flashcards',
  'flashcards/[deckId]',
  'flashcards/[deckId]/cards',
  'flashcards/[deckId]/cards/[cardId]',
  'flashcards/import',
  'countdowns',
];
const context = {
  params: Promise.resolve({ id: 'note', deckId: 'deck', cardId: 'card', token: 'a'.repeat(40) }),
};
const request = (method, body) =>
  new NextRequest('http://localhost/api/test?id=countdown', {
    method,
    ...(body !== undefined && { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  });
function loadRoute(route, authenticated = true, overrides = {}) {
  const noWrite = () => {
    throw new Error('Unexpected database mutation');
  };
  const database = new Proxy(
    { getDeckById: async () => ({ id: 'deck' }) },
    {
      get: (target, key) => target[key] ?? noWrite,
    }
  );
  return createLoader({
    '@/app/api/lib/authenticatedUser': {
      getAuthenticatedUserId: async () => (authenticated ? 'first.last' : null),
    },
    '@/app/api/lib/notesDb': database,
    '@/app/api/lib/flashcardsDb': database,
    '@/app/api/lib/countdownsDb': database,
    '@/app/api/lib/statsHelper': { trackNoteCreated: noWrite },
    ...overrides,
  })(`app/api/${route}/route.ts`);
}

test('every private handler rejects missing authentication', async () => {
  for (const route of routePaths.filter((name) => !name.includes('shared/'))) {
    for (const [method, handler] of Object.entries(loadRoute(route, false))) {
      const response = await handler(request(method), context);
      assert.equal(response.status, 401, `${method} ${route}`);
      assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    }
  }
});

test('all body-writing routes reject malformed JSON and non-object bodies before writing', async () => {
  for (const route of routePaths) {
    if (route.includes('/share')) continue;
    for (const [method, handler] of Object.entries(loadRoute(route))) {
      if (!['POST', 'PUT', 'PATCH'].includes(method)) continue;
      for (const body of ['{', 'null', '[]', 'true', '42', '"text"']) {
        assert.equal(
          (await handler(request(method, body), context)).status,
          400,
          `${method} ${route}: ${body}`
        );
      }
    }
  }
});

test('invalid fields and empty updates cannot reach persistence', async () => {
  const cases = [
    ['notes', 'POST', { status: 'unknown' }],
    ['notes', 'POST', { title: {} }],
    ['notes', 'POST', { content: 'x'.repeat(200001) }],
    ['notes/[id]', 'PUT', {}],
    ['flashcards', 'POST', { title: 'Deck', subjectId: 1.5 }],
    ['flashcards/[deckId]', 'PATCH', { title: ' ' }],
    ['flashcards/[deckId]', 'PATCH', { tags: [123] }],
    ['flashcards/[deckId]/cards', 'POST', { cards: [{ front: 'ok' }, null] }],
    ['flashcards/[deckId]/cards', 'POST', { cards: Array(501).fill({ front: 'ok' }) }],
    ['flashcards/[deckId]/cards/[cardId]', 'PATCH', { nextReview: -1 }],
    ['flashcards/[deckId]/cards/[cardId]', 'PATCH', '{"easeFactor":1e999}'],
    ['flashcards/[deckId]/cards/[cardId]', 'PATCH', { repetitions: 0.5 }],
    ['flashcards/import', 'POST', { deckId: 'bad/path' }],
    ['countdowns', 'POST', { title: 'Exam', targetDate: 1e20 }],
    ['countdowns', 'PATCH', { category: 'unknown' }],
    ['countdowns', 'PATCH', { theme: 'unknown' }],
    ['countdowns', 'PATCH', { title: ' ' }],
    ['countdowns', 'PATCH', {}],
  ];
  for (const [route, method, body] of cases) {
    assert.equal(
      (await loadRoute(route)[method](request(method, body), context)).status,
      400,
      `${route}: ${JSON.stringify(body)}`
    );
  }
});

test('oversized bodies return 413', async () => {
  const response = await loadRoute('notes').POST(
    request('POST', JSON.stringify({ content: 'x'.repeat(4_000_000) })),
    context
  );
  assert.equal(response.status, 413);
});

test('public notes only expose explicitly allowed fields and reject invalid tokens', async () => {
  let reads = 0;
  const route = loadRoute('notes/shared/[token]', true, {
    '@/app/api/lib/notesDb': {
      getNoteByShareToken: async () => {
        reads++;
        return {
          id: 'note',
          title: 'Title',
          content: 'Body',
          status: 'draft',
          createdAt: 1,
          updatedAt: 2,
          userId: 'private',
          shareToken: 'secret',
          futurePrivateField: 'secret',
        };
      },
    },
  });
  const response = await route.GET(request('GET'), context);
  assert.deepEqual(
    Object.keys((await response.json()).note).sort(),
    ['id', 'title', 'content', 'status', 'createdAt', 'updatedAt'].sort()
  );
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(
    (await route.GET(request('GET'), { params: Promise.resolve({ token: 'bad' }) })).status,
    400
  );
  assert.equal(reads, 1);
});

const deckPath = 'flashcard_decks_v1/deck';
const cardPath = 'flashcard_cards_v1/card';
const initialCards = () => ({
  [deckPath]: { userId: 'first.last', cardCount: 1 },
  'flashcard_decks_v1/other': { userId: 'first.last', cardCount: 5 },
  [cardPath]: { userId: 'first.last', deckId: 'deck', front: 'Question', back: 'Answer' },
});
const cardInput = { front: 'Question', back: 'Answer', hint: '', tags: [] };

test('card updates and deletions require both the owner and actual parent deck', async () => {
  const store = createStore(initialCards());
  const api = store.load('app/api/lib/flashcardsDb.ts');
  for (const [deckId, username] of [
    ['other', 'first.last'],
    ['deck', 'outsider'],
  ]) {
    assert.equal(await api.updateCard('card', deckId, username, { front: 'changed' }), null);
    assert.equal(await api.deleteCard('card', deckId, username), false);
  }
  assert.equal(store.data.get(cardPath).front, 'Question');
  assert.equal(store.commits.flat().length, 0);
});

test('repeated concurrent deletes decrement the count once', async () => {
  const store = createStore(initialCards());
  const api = store.load('app/api/lib/flashcardsDb.ts');
  const results = await Promise.all(
    Array.from({ length: 10 }, () => api.deleteCard('card', 'deck', 'first.last'))
  );
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(store.data.get(deckPath).cardCount, 0);
  assert.equal(store.data.has(cardPath), false);
});

test('failed card writes do not leave orphan cards or incorrect counts', async () => {
  const store = createStore(initialCards(), { failCommit: 1 });
  const api = store.load('app/api/lib/flashcardsDb.ts');
  await assert.rejects(api.createCard('deck', 'first.last', cardInput), /Injected commit failure/);
  assert.equal(store.data.get(deckPath).cardCount, 1);
  assert.equal(
    [...store.data.keys()].filter((key) => key.startsWith('flashcard_cards_v1/')).length,
    1
  );
});

test('card creation refuses missing and foreign decks', async () => {
  const store = createStore(initialCards());
  const api = store.load('app/api/lib/flashcardsDb.ts');
  assert.equal(await api.createCard('missing', 'first.last', cardInput), null);
  assert.equal(await api.createCard('deck', 'outsider', cardInput), null);
  assert.equal(store.commits.flat().length, 0);
});

test('500-card imports survive transaction retries with accurate counts and fresh study progress', async () => {
  const store = createStore(
    { [deckPath]: { userId: 'first.last', cardCount: 0 } },
    { retry: true }
  );
  const api = store.load('app/api/lib/flashcardsDb.ts');
  const cards = await api.bulkCreateCards('deck', 'first.last', Array(500).fill(cardInput));
  assert.equal(cards.length, 500);
  assert.equal(new Set(cards.map((card) => card.id)).size, 500);
  assert.equal(store.data.get(deckPath).cardCount, 500);
  assert.equal(store.commits.length, 2);
  assert.ok(cards.every((card) => card.repetitions === 0 && card.lastReview === null));
});

test('a later failed import chunk preserves counts for the committed cards', async () => {
  const store = createStore(
    { [deckPath]: { userId: 'first.last', cardCount: 0 } },
    { failCommit: 2 }
  );
  const api = store.load('app/api/lib/flashcardsDb.ts');
  await assert.rejects(
    api.bulkCreateCards('deck', 'first.last', Array(500).fill(cardInput)),
    /Injected commit failure/
  );
  assert.equal(store.data.get(deckPath).cardCount, 400);
  assert.equal(
    [...store.data.keys()].filter((key) => key.startsWith('flashcard_cards_v1/')).length,
    400
  );
});

test('large deck deletion stays within write limits and preserves other decks', async () => {
  const initial = initialCards();
  initial[deckPath].cardCount = 1001;
  for (let index = 0; index < 1000; index++)
    initial[`flashcard_cards_v1/card-${index}`] = { userId: 'first.last', deckId: 'deck' };
  initial['flashcard_cards_v1/other-card'] = { userId: 'first.last', deckId: 'other' };
  const store = createStore(initial);
  const api = store.load('app/api/lib/flashcardsDb.ts');
  assert.equal(await api.deleteDeck('deck', 'outsider'), false);
  assert.equal(await api.deleteDeck('deck', 'first.last'), true);
  assert.equal(store.data.has(deckPath), false);
  assert.equal([...store.data.values()].filter((value) => value.deckId === 'deck').length, 0);
  assert.equal(store.data.has('flashcard_cards_v1/other-card'), true);
});

test('identical note, countdown, deck, and card updates do not write', async () => {
  const store = createStore({
    ...initialCards(),
    'notes_v2/note': { userId: 'first.last', title: 'Title', shareToken: null, updatedAt: 123 },
    'countdowns_v1/countdown': { userId: 'first.last', title: 'Title', updatedAt: 123 },
  });
  const notes = store.load('app/api/lib/notesDb.ts');
  const countdowns = store.load('app/api/lib/countdownsDb.ts');
  const flashcards = store.load('app/api/lib/flashcardsDb.ts');
  assert.equal((await notes.updateNote('note', 'first.last', { title: 'Title' })).updatedAt, 123);
  assert.equal(
    (await countdowns.updateCountdown('countdown', 'first.last', { title: 'Title' })).updatedAt,
    123
  );
  await notes.revokeShareToken('note', 'first.last');
  await flashcards.updateDeck('deck', 'first.last', { tags: [] });
  await flashcards.updateCard('card', 'deck', 'first.last', { front: 'Question', tags: [] });
  assert.equal(store.commits.flat().length, 0);
});

test('deck-copy failures clean up the newly created copy', async () => {
  let deleted;
  const route = loadRoute('flashcards/import', true, {
    '@/app/api/lib/flashcardsDb': {
      getDeckByIdAny: async () => ({ userId: 'owner', title: 'Shared' }),
      canImportDeck: async () => true,
      getCardsByDeck: async (id, username) => {
        assert.equal(username, 'owner');
        return [cardInput];
      },
      createDeck: async (username) => {
        assert.equal(username, 'first.last');
        return { id: 'copy' };
      },
      bulkCreateCards: async () => {
        throw new Error('Import failed');
      },
      deleteDeck: async (id) => {
        deleted = id;
      },
    },
  });
  assert.equal((await route.POST(request('POST', { deckId: 'deck' }), context)).status, 500);
  assert.equal(deleted, 'copy');
});

test('deck imports require an active share message in a conversation the requester belongs to', async () => {
  const sourceDeck = { id: 'deck', userId: 'owner' };
  const message = {
    senderUserId: 'owner',
    conversationId: 'conversation',
    deletedAt: null,
    shareCard: { type: 'flashdeck', deckId: 'deck' },
  };
  for (const [sharedMessage, participantIds, allowed] of [
    [message, ['recipient'], true],
    [message, ['outsider'], false],
    [{ ...message, deletedAt: 123 }, ['recipient'], false],
    [{ ...message, senderUserId: 'outsider' }, ['recipient'], false],
    [{ ...message, shareCard: { type: 'flashdeck', deckId: 'other' } }, ['recipient'], false],
  ]) {
    const store = createStore({
      'messages_v1/message': sharedMessage,
      'conversations_v1/conversation': { participantIds },
    });
    const api = store.load('app/api/lib/flashcardsDb.ts');
    assert.equal(await api.canImportDeck(sourceDeck, 'recipient', 'message'), allowed);
    assert.equal(await api.canImportDeck(sourceDeck, 'recipient'), false);
    assert.equal(await api.canImportDeck(sourceDeck, 'recipient', 'missing'), false);
    assert.equal(await api.canImportDeck(sourceDeck, 'owner'), true);
  }
});

test('unauthorized imports do not read source cards or create a copy', async () => {
  const route = loadRoute('flashcards/import', true, {
    '@/app/api/lib/flashcardsDb': {
      getDeckByIdAny: async () => ({ id: 'deck', userId: 'owner' }),
      canImportDeck: async () => false,
    },
  });
  assert.equal((await route.POST(request('POST', { deckId: 'deck' }), context)).status, 404);
});

test('valid creates, metadata edits, and study reviews preserve their response contracts', async () => {
  const cases = [
    ['notes', 'POST', {}, 'createNote', 'note', 201],
    ['notes/[id]', 'PUT', { content: 'Updated' }, 'updateNote', 'note', 200],
    ['flashcards', 'POST', { title: 'Deck' }, 'createDeck', 'deck', 201],
    ['flashcards/[deckId]', 'PATCH', { subjectId: null, color: 'sky' }, 'updateDeck', 'deck', 200],
    ['flashcards/[deckId]/cards', 'POST', { front: 'Question' }, 'createCard', 'card', 201],
    ['flashcards/[deckId]/cards', 'POST', { cards: [cardInput] }, 'bulkCreateCards', 'cards', 201],
    [
      'flashcards/[deckId]/cards/[cardId]',
      'PATCH',
      { repetitions: 2, interval: 6, easeFactor: 2.5, nextReview: 1000, lastReview: null },
      'updateCard',
      'card',
      200,
    ],
    [
      'countdowns',
      'POST',
      { title: 'Exam', targetDate: 1000, category: 'exam' },
      'createCountdown',
      'countdown',
      201,
    ],
    ['countdowns', 'PATCH', { pinned: true }, 'updateCountdown', 'countdown', 200],
  ];
  for (const [routePath, method, body, operation, key, status] of cases) {
    let calls = 0;
    const database = {
      getDeckById: async () => ({ id: 'deck' }),
      [operation]: async (...args) => {
        calls++;
        assert.ok(args.includes('first.last'));
        return key === 'cards' ? [{ id: 'created' }] : { id: 'created' };
      },
    };
    const route = loadRoute(routePath, true, {
      '@/app/api/lib/notesDb': database,
      '@/app/api/lib/flashcardsDb': database,
      '@/app/api/lib/countdownsDb': database,
      '@/app/api/lib/statsHelper': { trackNoteCreated: () => {} },
    });
    const response = await route[method](request(method, body), context);
    assert.equal(response.status, status, routePath);
    const result = await response.json();
    assert.equal(result.success, true);
    assert.ok(result[key]);
    assert.equal(calls, 1);
  }
});

test('username verification has an upstream deadline and handles malformed session responses', async () => {
  let responseData = { user: { userName: 'First.Last' } };
  const auth = createLoader({
    axios: {
      get: async (url, config) => {
        assert.equal(config.timeout, 5000);
        assert.ok(config.signal instanceof AbortSignal);
        return { status: 200, data: responseData };
      },
    },
  })('app/api/lib/auth.ts');
  assert.equal(await auth.authUserWithUsername('cookie', ' FIRST.LAST '), true);
  responseData = {};
  assert.equal(await auth.authUserWithUsername('cookie', 'first.last'), false);
});

test('message changes require the URL conversation and its current membership', async () => {
  const initial = {
    'conversations_v1/first': { participantIds: ['123456'], type: 'dm' },
    'conversations_v1/second': { participantIds: ['123456'], type: 'group', adminUserId: '123456' },
    'messages_v1/message': {
      conversationId: 'first',
      senderUserId: '123456',
      content: 'Original',
      deletedAt: null,
    },
  };
  const store = createStore(initial);
  const api = store.load('app/api/lib/messagingDb.ts');
  assert.equal(await api.editMessage('message', 'second', '123456', 'Changed'), null);
  assert.equal(await api.deleteMessage('message', 'second', '123456'), false);
  assert.equal(await api.editMessage('message', 'first', '654321', 'Changed'), null);
  assert.equal(store.data.get('messages_v1/message').content, 'Original');
  assert.equal((await api.editMessage('message', 'first', '123456', 'Changed')).content, 'Changed');
  await api.setMessagePinned('message', 'first', '123456', true);
  await api.setMessagePinned('message', 'first', '123456', true);
  assert.equal(store.data.get('messages_v1/message').pinned, true);
});

test('passkey challenges cannot be consumed twice', async () => {
  const store = createStore({
    'passkey_challenges/challenge': { challenge: 'test', type: 'authentication', userHandle: '' },
  });
  // Preserve a Timestamp-shaped object without relying on structuredClone methods.
  const timestamp = require('firebase-admin/firestore').Timestamp.now();
  const db = {
    collection: (name) => ({ doc: (id) => ({ path: `${name}/${id}` }) }),
    runTransaction: async (callback) => {
      let deleted = false;
      const result = await callback({
        get: async (ref) => ({
          exists: store.data.has(ref.path),
          data: () => ({ ...store.data.get(ref.path), createdAt: timestamp }),
        }),
        delete: (ref) => {
          store.data.delete(ref.path);
          deleted = true;
        },
      });
      assert.ok(deleted || result === null);
      return result;
    },
  };
  const api = createLoader({ './firebaseAdmin': { db } })('app/api/lib/passkeyDb.ts');
  assert.ok(await api.consumeChallenge('challenge'));
  assert.equal(await api.consumeChallenge('challenge'), null);
});

test('group creation stores ID members and leaving transfers administration', async () => {
  const store = createStore();
  const api = store.load('app/api/lib/messagingDb.ts');
  const group = await api.createGroupChat({
    creatorUserId: '123456',
    creatorDisplayName: 'Creator',
    groupName: 'Group',
    members: [{ userId: '654321', displayName: 'Member' }],
  });
  assert.equal(group.participantIds.join(','), '123456,654321');
  assert.equal(group.participantNames['654321'], 'Member');
  assert.equal(group.adminUserId, '123456');
  const left = await api.removeGroupMember(group.id, '123456', '123456');
  assert.equal(left.adminUserId, '654321');
  assert.equal(left.participantIds.join(','), '654321');
  assert.equal(await api.updateGroupInfo(group.id, '123456', { groupName: 'Forbidden' }), null);
});
