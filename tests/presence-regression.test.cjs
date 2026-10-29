/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS test and isolated module loader. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { FieldPath } = require('firebase-admin/firestore');

function loadDbModule(path, initial) {
  let data = structuredClone(initial);
  const writes = [];
  const ref = {};
  const db = {
    collection: () => ({ doc: () => ref }),
    runTransaction: async (callback) =>
      callback({
        get: async () => ({ data: () => data }),
        update: (target, field, value) => {
          assert.equal(target, ref);
          assert.ok(field.isEqual(new FieldPath('lastReadAt', 'first.last')));
          data.lastReadAt = { ...data.lastReadAt, 'first.last': value };
          writes.push(value);
        },
        set: (target, value) => {
          assert.equal(target, ref);
          data = { ...data, ...value };
          writes.push(value);
        },
      }),
  };
  const loadedModule = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, {
    module: loadedModule,
    exports: loadedModule.exports,
    Date,
    require: (name) =>
      name === './firebaseAdmin'
        ? { db }
        : name === './validation'
          ? { InputError: class InputError extends Error {} }
          : name === '@/lib/accountReferences' || name === './accountRegistry'
            ? {}
            : require(name),
  });
  return { api: loadedModule.exports, writes };
}

test('dotted usernames are literal keys and repeated read receipts do not write', async () => {
  const { api, writes } = loadDbModule('app/api/lib/messagingDb.ts', {
    participantIds: ['first.last'],
    lastAt: Date.now() - 1000,
    lastReadAt: { first: { last: 1 } },
  });
  await api.markConversationRead('conversation', 'first.last');
  for (let i = 0; i < 100; i++) await api.markConversationRead('conversation', 'first.last');
  assert.equal(writes.length, 1);
});

test('read receipt cannot write for a nonparticipant', async () => {
  const { api, writes } = loadDbModule('app/api/lib/messagingDb.ts', {
    participantIds: [],
    lastAt: Date.now(),
    lastReadAt: {},
  });
  await api.markConversationRead('conversation', 'first.last');
  assert.equal(writes.length, 0);
});

test('presence deduplicates repeated heartbeats and rapid status changes', async () => {
  const { api, writes } = loadDbModule('app/api/lib/presenceDb.ts', undefined);
  await api.updatePresence('first.last', 'online');
  for (let i = 0; i < 100; i++) {
    await api.updatePresence('first.last', i % 2 ? 'online' : 'offline');
  }
  assert.equal(writes.length, 1);
});

test('presence renews an expired heartbeat and respects explicit status', async () => {
  const { api, writes } = loadDbModule('app/api/lib/presenceDb.ts', {
    status: 'online',
    updatedAt: Date.now() - 120_000,
  });
  await api.updatePresence('first.last', 'online');
  assert.equal(writes.length, 1);
  assert.equal(api.computeStatus({ status: 'offline', lastSeen: Date.now() }), 'offline');
  assert.equal(api.computeStatus({ status: 'idle', lastSeen: Date.now() }), 'idle');
  assert.equal(
    api.computeStatus({ status: 'online', lastSeen: Date.now() - 16 * 60_000 }),
    'offline'
  );
});
