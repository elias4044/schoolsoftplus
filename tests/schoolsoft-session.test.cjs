/* eslint-disable @typescript-eslint/no-require-imports -- Isolated server helper tests. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

function loadSessionHelper(get) {
  const loaded = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync('app/api/lib/mobileAuth.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(source, {
    module: loaded,
    exports: loaded.exports,
    require(name) {
      if (name === 'axios') return { get };
      if (name === './identity')
        return {
          assertSchool: () => {},
          normalizeUserId: (id) => (Number.isSafeInteger(id) && id > 0 ? String(id) : null),
        };
      return require(name);
    },
  });
  return loaded.exports.fetchSchoolsoftSession;
}

test('OAuth login exchanges the token before reading the cookie-authenticated session', async () => {
  const calls = [];
  const fetchSession = loadSessionHelper(async (url, options) => {
    calls.push({ url, options });
    assert.equal(options.headers.Authorization, undefined);
    if (url.endsWith('/eva-apps/auth/login/student')) {
      assert.equal(options.headers.token, 'access');
      assert.equal(options.headers.orgid, '18');
      assert.equal(options.headers.useros, 'android');
      assert.equal(options.headers.language, 'sw');
      assert.match(options.headers.Accept, /text\/html/);
      return {
        status: 302,
        headers: {
          'set-cookie': [
            'JSESSIONID=session; Path=/; HttpOnly',
            'hash=value=extra; Path=/',
            'usertype=1; Path=/',
          ],
        },
      };
    }
    assert.equal(options.headers.Cookie, 'JSESSIONID=session; hash=value=extra; usertype=1');
    return {
      status: 200,
      data: {
        user: { id: 104801, userName: 'Example.User' },
        organization: { name: 'School' },
      },
    };
  });
  const account = await fetchSession('engelska', 'access');
  assert.equal(account.userId, 104801);
  assert.equal(account.username, 'example.user');
  assert.equal(calls.length, 2);
});

test('missing cookies and rejected or malformed sessions cannot verify an account', async () => {
  for (const session of [
    { status: 401, data: {} },
    { status: 200, data: '<html>Login</html>' },
    { status: 200, data: { user: { id: 104801, userName: ' ' } } },
    { status: 200, data: { user: { userName: 'example.user' } } },
  ]) {
    const fetchSession = loadSessionHelper(async (url) =>
      url.endsWith('/rest-api/session')
        ? session
        : { headers: { 'set-cookie': 'JSESSIONID=session; Path=/' } }
    );
    assert.equal(await fetchSession('engelska', 'access'), null);
  }
  const fetchSession = loadSessionHelper(async () => ({ headers: {} }));
  assert.equal(await fetchSession('engelska', 'access'), null);
});
