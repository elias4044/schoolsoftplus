/* eslint-disable @typescript-eslint/no-require-imports -- Isolated image service contract tests. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

function load(file, globals = {}, imports = {}) {
  const loaded = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(source, {
    module: loaded,
    exports: loaded.exports,
    require: (name) => imports[name] ?? require(name),
    FormData,
    File,
    Response,
    URL,
    Uint8Array,
    AbortSignal,
    setTimeout,
    process: { env: { IMAGE_HOST_API_TOKEN: 'server-key' } },
    ...globals,
  });
  return loaded.exports;
}

const metadata = (state, extra = {}) => ({
  id: 'image-123',
  state,
  public: true,
  url: state === 'ready' ? '/i/image-123.webp' : null,
  ...extra,
});

test('multipart upload remains pending until scanning approves the public WebP URL', async () => {
  const calls = [];
  const host = load('app/api/lib/imageHost.ts', {
    fetch: async (url, options) => {
      calls.push({ url, options });
      return Response.json(metadata(calls.length === 1 ? 'pending' : 'ready'));
    },
  });
  const result = await host.uploadHostedImage(
    new File(['png'], 'profile.png', { type: 'image/png' })
  );
  assert.equal(result.pending, true);
  assert.equal(result.url, undefined);
  assert.equal(calls[0].url, 'https://img.e4044.com/api/v1/images');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer server-key');
  assert.equal(calls[0].options.body.get('file').name, 'profile.png');
  assert.equal(calls[0].options.body.get('public'), 'true');
  const ready = await host.getHostedImage(result.id);
  assert.equal(ready.url, 'https://img.e4044.com/i/image-123.webp');
  assert.equal(ready.pending, false);
  assert.equal(calls[1].options.cache, 'no-store');
});

test('blocked, expired, failed, private and malformed images never publish a URL', async () => {
  for (const [data, status] of [
    [metadata('blocked'), 422],
    [metadata('expired'), 410],
    [metadata('scan_error'), 502],
    [metadata('unknown'), 502],
    [metadata('ready', { public: false }), 502],
    [metadata('ready', { url: 'https://other.example/image.webp' }), 502],
    [null, 502],
  ]) {
    const host = load('app/api/lib/imageHost.ts', { fetch: async () => Response.json(data) });
    await assert.rejects(host.getHostedImage('image-123'), (error) => error.status === status);
  }
});

test('service failures and invalid IDs produce useful errors without exposing credentials', async () => {
  for (const status of [401, 413, 422, 429, 500]) {
    const host = load('app/api/lib/imageHost.ts', {
      fetch: async () => new Response('secret details', { status }),
    });
    await assert.rejects(host.getHostedImage('image-123'), (error) => {
      assert.doesNotMatch(error.message, /server-key|secret details/);
      return error.status === ([413, 422, 429].includes(status) ? status : 502);
    });
  }
  const host = load('app/api/lib/imageHost.ts', {
    fetch: async () => {
      throw new Error('timeout');
    },
  });
  await assert.rejects(host.getHostedImage('image-123'), /Could not reach/);
  await assert.rejects(host.getHostedImage('../private'), (error) => error.status === 400);
  const missing = load('app/api/lib/imageHost.ts', { process: { env: {} } });
  assert.throws(
    () => missing.requireImageHostToken(),
    (error) => error.status === 503
  );
});

function route(session = true) {
  let uploads = 0;
  const host = load('app/api/lib/imageHost.ts');
  const handlers = load(
    'app/api/lib/imageUploadRoute.ts',
    {},
    {
      'next/server': { NextResponse: Response },
      './schoolsoft': { requireSession: async () => session },
      './routeValidation': {
        withValidation: (handler) => handler,
        readRequestBytes: async (req) => new Uint8Array(await req.arrayBuffer()),
      },
      './imageHost': {
        ...host,
        uploadHostedImage: async () => {
          uploads++;
          return { success: true, pending: true, id: 'image-123', state: 'pending' };
        },
        getHostedImage: async () => ({
          success: true,
          pending: false,
          url: 'https://img.e4044.com/i/image-123.webp',
        }),
      },
    }
  ).createImageUploadHandlers(5);
  return { ...handlers, uploads: () => uploads };
}

function uploadRequest(type = 'image/png', body = 'png') {
  const form = new FormData();
  form.set('image', new File([body], 'image.png', { type }));
  return new Request('https://ssp.example/api/pfp-upload', { method: 'POST', body: form });
}

test('upload and polling require a session; invalid types, empty and oversized files are rejected', async () => {
  const denied = route(false);
  assert.equal((await denied.POST(uploadRequest())).status, 401);
  assert.equal(
    (await denied.GET(new Request('https://ssp.example/api/pfp-upload?id=image-123'))).status,
    401
  );
  const handlers = route();
  for (const [type, body] of [
    ['image/gif', 'gif'],
    ['image/png', ''],
    ['image/png', '123456'],
  ])
    assert.equal((await handlers.POST(uploadRequest(type, body))).status, 400);
  assert.equal(handlers.uploads(), 0);
  assert.equal((await handlers.POST(uploadRequest())).status, 202);
  const request = new Request('https://ssp.example/api/pfp-upload?id=image-123');
  request.nextUrl = new URL(request.url);
  assert.equal((await handlers.GET(request)).status, 200);
});

test('browser uploads poll without saving a premature URL and surface scan rejection', async () => {
  for (const endpoint of ['/api/pfp-upload', '/api/msg-upload']) {
    const calls = [];
    const client = load('lib/image-upload.ts', {
      setTimeout: (callback) => callback(),
      fetch: async (url) => {
        calls.push(url);
        return Response.json(
          calls.length === 1
            ? { success: true, pending: true, id: 'image-123' }
            : { success: true, pending: false, url: 'https://img.e4044.com/i/image-123.webp' }
        );
      },
    });
    assert.equal(
      await client.uploadImage(new File(['png'], 'image.png', { type: 'image/png' }), endpoint),
      'https://img.e4044.com/i/image-123.webp'
    );
    assert.equal(calls[1], `${endpoint}?id=image-123`);
  }
  const client = load('lib/image-upload.ts', {
    fetch: async () => Response.json({ success: false, error: 'Image rejected.' }, { status: 422 }),
  });
  await assert.rejects(
    client.uploadImage(new File(['png'], 'image.png', { type: 'image/png' }), '/api/pfp-upload'),
    /Image rejected/
  );
});

test('legacy migration updates avatar snapshots and message URLs while retaining Giphy and failed images', () => {
  const { collectUrls, replaceUrls } = require('../scripts/migrate-images.cjs');
  const legacy = 'https://i.ibb.co/old/avatar.png';
  const giphy = 'https://media.giphy.com/example.gif';
  const other = 'https://i.ibb.co/old/failed.gif';
  const value = { 'user.name': legacy, content: `${legacy}\n${giphy}\n${other}` };
  assert.deepEqual(collectUrls(value), [legacy, legacy, other]);
  const result = replaceUrls(value, { [legacy]: { url: 'https://img.e4044.com/i/new.webp' } });
  assert.equal(result['user.name'], 'https://img.e4044.com/i/new.webp');
  assert.equal(result.content, `https://img.e4044.com/i/new.webp\n${giphy}\n${other}`);
});
