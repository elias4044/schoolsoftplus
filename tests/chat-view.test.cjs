/* eslint-disable @typescript-eslint/no-require-imports -- Matches the repository's isolated TypeScript test loader. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const loadedModule = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync('lib/chat-view.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText,
  { module: loadedModule, exports: loadedModule.exports }
);
const { getDraftKey, isConversationUnread, mergeMessageTimeline, searchConversationMessages } =
  loadedModule.exports;

test('conversation exports include shared titles and keep locked ciphertext out', () => {
  const messages = [
    {
      id: 'locked',
      content: 'private-ciphertext',
      senderDisplayName: 'Alex',
      createdAt: 100,
      deletedAt: null,
      shareCard: null,
    },
  ];
  const locked = loadedModule.exports.buildConversationTranscript('Study', messages, true, {});
  assert.ok(!locked.includes('private-ciphertext'));
  assert.match(locked, /unlock the conversation/);
  const unlocked = loadedModule.exports.buildConversationTranscript('Study', messages, true, {
    locked: 'Revision notes',
  });
  assert.match(unlocked, /Revision notes/);
});
const message = (id, extra = {}) => ({
  id,
  conversationId: 'study',
  senderUserId: 'alex',
  senderDisplayName: 'Alex',
  createdAt: 100,
  deletedAt: null,
  content: 'Homework for tomorrow',
  shareCard: null,
  ...extra,
});

test('live acknowledgements replace pending messages by ID without hiding identical sends', () => {
  const timeline = mergeMessageTimeline(
    [message('first')],
    [message('first'), message('second', { createdAt: 101 })],
    'study'
  );
  assert.equal(timeline.length, 2);
  assert.equal(timeline[0].id, 'first');
  assert.equal(timeline[1].id, 'second');
});

test('switching chats excludes stale snapshots and pending messages from other conversations', () => {
  const timeline = mergeMessageTimeline(
    [message('old', { conversationId: 'other' })],
    [message('pending')],
    'other'
  );
  assert.equal(timeline.length, 1);
  assert.equal(timeline[0].id, 'old');
});

test('deleted messages cannot reappear from a pending acknowledgement', () => {
  assert.equal(
    mergeMessageTimeline([message('removed', { deletedAt: 200 })], [message('removed')], 'study')
      .length,
    0
  );
});

test('unread state requires an incoming message newer than the current user receipt', () => {
  const conversation = { lastAt: 100, lastSenderUserId: 'alex', lastReadAt: { me: 99 } };
  assert.equal(isConversationUnread(conversation, 'me'), true);
  assert.equal(isConversationUnread({ ...conversation, lastReadAt: { me: 100 } }, 'me'), false);
  assert.equal(isConversationUnread({ ...conversation, lastSenderUserId: 'me' }, 'me'), false);
  assert.equal(isConversationUnread({ ...conversation, lastSenderUserId: '' }, 'me'), false);
});

test('encrypted search uses only decrypted text and returns readable results', () => {
  const messages = [message('secret', { content: 'ciphertext' })];
  assert.equal(searchConversationMessages(messages, 'ciphertext', true, {}).length, 0);
  const matches = searchConversationMessages(messages, ' HOMEWORK ', true, {
    secret: 'Homework notes',
  });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].content, 'Homework notes');
});

test('search includes titles on shared study materials', () => {
  assert.equal(
    searchConversationMessages(
      [
        message('deck', {
          content: '',
          shareCard: { type: 'flashdeck', title: 'Biology revision' },
        }),
      ],
      'biology',
      false,
      {}
    ).length,
    1
  );
});

test('draft keys isolate accounts and conversations, including separator characters', () => {
  assert.notEqual(getDraftKey('a:b', 'c'), getDraftKey('a', 'b:c'));
  assert.notEqual(getDraftKey('me', 'study'), getDraftKey('other', 'study'));
  assert.notEqual(getDraftKey('me', 'study'), getDraftKey('me', 'other'));
});
