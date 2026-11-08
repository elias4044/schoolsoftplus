/* eslint-disable @typescript-eslint/no-require-imports -- Isolated TypeScript module loader. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const loadedModule = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync('lib/command-actions.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  {
    module: loadedModule,
    exports: loadedModule.exports,
    require: () => ({ useSyncExternalStore: (subscribe, getSnapshot) => getSnapshot() }),
  }
);
const { registerCommandActions, useCommandActions } = loadedModule.exports;
const command = (id, run = () => {}) => ({ id, label: id, group: 'Chat', icon: () => null, run });

test('page commands disappear on unmount while active call commands remain available', () => {
  const closeChat = registerCommandActions('messages', [command('search')]);
  const closeCall = registerCommandActions('voice-call', [command('mute')]);
  assert.equal(useCommandActions().length, 2);
  closeChat();
  assert.equal(useCommandActions().length, 1);
  assert.equal(useCommandActions()[0].id, 'mute');
  closeCall();
  assert.equal(useCommandActions().length, 0);
});

test('stale registrations cannot remove commands for the newly selected conversation', () => {
  const closeOld = registerCommandActions('messages', [command('old-chat')]);
  const closeCurrent = registerCommandActions('messages', [command('current-chat')]);
  closeOld();
  assert.equal(useCommandActions()[0].id, 'current-chat');
  closeCurrent();
});

test('updated commands invoke the current action instead of an old conversation callback', () => {
  let result = '';
  const closeOld = registerCommandActions('messages', [
    command('open', () => {
      result = 'old';
    }),
  ]);
  const closeCurrent = registerCommandActions('messages', [
    command('open', () => {
      result = 'current';
    }),
  ]);
  useCommandActions()[0].run();
  assert.equal(result, 'current');
  closeOld();
  closeCurrent();
});
