/* eslint-disable @typescript-eslint/no-require-imports -- Isolated client state tests. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

function load(path, fetch, dependencies = {}) {
  const loaded = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      module: loaded,
      exports: loaded.exports,
      fetch,
      AbortSignal,
      Date,
      document: { cookie: 'ssp_auth_type=authv2' },
      require: (name) => dependencies[name] || {},
    }
  );
  return loaded.exports;
}

test('concurrent token refreshes share one request and release after completion', async () => {
  let calls = 0;
  let finish;
  const api = load('lib/session-refresh.ts', () => {
    calls++;
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  const first = api.refreshSessionToken();
  assert.equal(api.refreshSessionToken(), first);
  assert.equal(calls, 1);
  finish({ ok: true });
  assert.equal(await first, true);
  const next = api.refreshSessionToken();
  assert.equal(calls, 2);
  finish({ status: 401 });
  assert.equal(await next, false);
});

test('session initialization deduplicates callers and retries once after expiration', async () => {
  let calls = 0;
  let refreshes = 0;
  const api = load(
    'lib/useSession.ts',
    async () => {
      calls++;
      return calls === 1
        ? { status: 401 }
        : {
            ok: true,
            json: async () => ({ success: true, session: { user: { id: 1 } } }),
          };
    },
    {
      './session-refresh': {
        refreshSessionToken: async () => {
          refreshes++;
          return true;
        },
      },
    }
  );
  await Promise.all([api.reloadSession(), api.reloadSession(), api.reloadSession()]);
  assert.equal(calls, 2);
  assert.equal(refreshes, 1);
});

test('reset prevents an old session response from replacing the next login', async () => {
  let resolveOld;
  let calls = 0;
  const api = load(
    'lib/useSession.ts',
    () => {
      calls++;
      if (calls === 1)
        return new Promise((resolve) => {
          resolveOld = resolve;
        });
      return Promise.resolve({ status: 401 });
    },
    { './session-refresh': {} }
  );
  const old = api.reloadSession();
  api.resetSession();
  await api.reloadSession();
  resolveOld({
    ok: true,
    json: async () => {
      throw new Error('Stale response was consumed');
    },
  });
  await old;
  assert.equal(calls, 2);
});
