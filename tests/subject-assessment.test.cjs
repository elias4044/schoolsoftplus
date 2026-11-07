/* eslint-disable @typescript-eslint/no-require-imports -- Isolated route tests. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const { NextRequest } = require('next/server');

function loadModule(filename, stubs = {}, cache = new Map()) {
  filename = path.resolve(filename);
  if (cache.has(filename)) return cache.get(filename);
  const exports = {};
  cache.set(filename, exports);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    module: { exports },
    URL,
    Buffer,
    console,
    require(name) {
      if (name in stubs) return stubs[name];
      if (name.startsWith('@/')) return loadModule(`${name.slice(2)}.ts`, stubs, cache);
      if (name.startsWith('.'))
        return loadModule(path.resolve(path.dirname(filename), `${name}.ts`), stubs, cache);
      return require(name);
    },
  });
  return exports;
}

const schoolsoftStub = { createSchoolsoftClient: () => null, getRequestSession: () => null };
function loadAssessment() {
  return loadModule('app/api/lib/subjectAssessment.ts', { './schoolsoft': schoolsoftStub });
}

function loadMapping() {
  return loadModule('app/api/lib/subjectMapping.ts', { './schoolsoft': schoolsoftStub });
}

function holisticRow(holisticAssessmentId, title, extra = {}) {
  return {
    holisticAssessmentId,
    title,
    subTitle: 'Published assessment',
    published: true,
    status: { name: 'Ongoing', isOngoing: true },
    ...extra,
  };
}

function upstreamError(status) {
  return Object.assign(new Error('Upstream failed'), { isAxiosError: true, response: { status } });
}

test('all five resources use the holistic ID and cookie authentication', async () => {
  const calls = [];
  const api = {
    get: async (url, config) => {
      calls.push(url);
      assert.equal(config.headers.Cookie, 'JSESSIONID=test');
      assert.equal(config.headers.Authorization, undefined);
      if (url.endsWith('/subject_warning'))
        return { data: { holisticAssessmentId: 294143, active: false, published: false } };
      if (url.endsWith('/assessed_assignments')) return { data: [] };
      if (url.endsWith('/matrix')) return { data: { gradeCriteria: [] } };
      if (url.endsWith('/overview')) return { data: { gradeCriteriaOverview: [] } };
      return { data: { lessons: 0, attendance: 0, absence: 0, reportedAbsence: 0 } };
    },
  };
  const result = await loadAssessment().fetchSubjectAssessment(api, 'JSESSIONID=test', '294143');
  assert.equal(calls.length, 5);
  assert.ok(calls.every((url) => url.startsWith('/rest-api/student/holistic_assessment/294143/')));
  assert.ok(calls.some((url) => url.endsWith('CURRENT_SCHOOL_YEAR?fromDate=&toDate=')));
  assert.equal(result.attendance.data.attendance, 0);
  assert.equal(result.results.status, 'available');
});

test('unavailable attendance and failed criteria do not discard published results', async () => {
  const api = {
    get: async (url) => {
      if (url.includes('/attendance/')) throw upstreamError(404);
      if (url.endsWith('/matrix')) throw upstreamError(500);
      if (url.endsWith('/overview')) return { data: { gradeCriteriaOverview: [] } };
      return {
        data: [
          {
            id: 1,
            activityId: 57016,
            name: 'Essay',
            formativeComment:
              '<p>Good <strong>work</strong></p><script>alert(1)</script><img src=x onerror=alert(1)>',
            assessedCriteria: [],
          },
        ],
      };
    },
  };
  const result = await loadAssessment().fetchSubjectAssessment(api, 'cookie', '294143');
  assert.equal(result.attendance.status, 'unavailable');
  assert.equal(result.criteria.status, 'error');
  assert.equal(result.results.status, 'available');
  assert.ok(result.results.data[0].formativeComment.includes('<strong>work</strong>'));
  assert.ok(!/script|onerror/.test(result.results.data[0].formativeComment));
});

test('expired authentication is propagated and malformed successful payloads are errors', async () => {
  const helper = loadAssessment();
  await assert.rejects(
    helper.fetchSubjectAssessment(
      {
        get: async () => {
          throw upstreamError(401);
        },
      },
      'cookie',
      '294143'
    )
  );
  for (const data of ['<html>Login</html>', { bad: 'shape' }]) {
    const result = await helper.fetchSubjectAssessment(
      { get: async () => ({ data }) },
      'cookie',
      '294143'
    );
    assert.ok(Object.values(result).every((resource) => resource.status === 'error'));
  }
});

test('assessment route rejects invalid holistic IDs before any upstream call and requires a session', async () => {
  let calls = 0;
  const route = loadModule('app/api/subjects/[id]/assessment/route.ts', {
    '@/app/api/lib/schoolsoft': { ...schoolsoftStub, requireSession: async () => null },
    '@/app/api/lib/subjectAssessment': {
      fetchSubjectAssessment: async () => {
        calls++;
      },
    },
  });
  const context = { params: Promise.resolve({ id: '57016' }) };
  for (const value of ['', '-1', '1/path', '9007199254740992']) {
    const response = await route.GET(
      new NextRequest(
        `http://localhost/api/subjects/57016/assessment?holisticId=${encodeURIComponent(value)}`
      ),
      context
    );
    assert.equal(response.status, 400);
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  }
  const response = await route.GET(
    new NextRequest('http://localhost/api/subjects/57016/assessment?holisticId=294143'),
    context
  );
  assert.equal(response.status, 401);
  assert.equal(calls, 0);
});

test('holistic rows ignore sentinel IDs and sanitize only published feedback', async () => {
  const rows = [
    holisticRow(-1, 'Not in study plan'),
    holisticRow(294143, 'Svenska', {
      formativeAssessment: '<p>Feedback</p><script>alert(1)</script>',
      subjectWarning: true,
      subjectWarningComment: '<p>Practice</p><img src=x onerror=alert(1)>',
    }),
    holisticRow(311699, 'Engelska', {
      published: false,
      formativeAssessment: '<p>Unpublished feedback</p>',
      subjectWarning: true,
      studentKnowledgeDevelopment: 'Unpublished development',
    }),
  ];
  const resource = await loadMapping().fetchHolisticSubjects(
    {
      get: async (url, config) => {
        assert.equal(url, '/rest-api/student/holistic_assessment/rows');
        assert.equal(config.headers.Cookie, 'session-cookie');
        assert.equal(config.headers.Authorization, undefined);
        return { data: rows };
      },
    },
    'session-cookie'
  );
  assert.equal(resource.status, 'available');
  assert.equal(resource.data.length, 2);
  assert.equal(resource.data[0].formativeAssessment, '<p>Feedback</p>');
  assert.ok(!resource.data[0].subjectWarningComment.includes('onerror'));
  assert.equal(resource.data[1].formativeAssessment, '');
  assert.equal(resource.data[1].studentKnowledgeDevelopment, '');
  assert.equal(resource.data[1].subjectWarning, false);
  assert.equal(resource.data[1].subTitle, '');
});

test('a unique normalized subject name resolves without scanning assignments', async () => {
  const helper = loadMapping();
  const result = await helper.resolveSubjectAssessment(
    {
      get: async () => {
        throw new Error('Unexpected request');
      },
    },
    'cookie',
    { id: '57016', subject: '  SVENSKA  ', assignmentIds: [] },
    { status: 'available', data: [holisticRow(294143, 'Svenska'), holisticRow(311699, 'Engelska')] }
  );
  assert.equal(result.status, 'matched');
  assert.equal(result.subject.holisticAssessmentId, 294143);
});

test('matching assignment IDs resolve different room labels with bounded concurrency', async () => {
  let active = 0;
  let maxActive = 0;
  const helper = loadMapping();
  const result = await helper.resolveSubjectAssessment(
    {
      get: async (url) => {
        maxActive = Math.max(maxActive, ++active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active--;
        return {
          data: url.includes('/294143/') ? [{ id: 144282, activityId: 47876, name: 'Essay' }] : [],
        };
      },
    },
    'cookie',
    { id: '57016', subject: 'Language course', assignmentIds: [144282] },
    {
      status: 'available',
      data: [
        holisticRow(294143, 'Svenska'),
        holisticRow(311699, 'Engelska'),
        holisticRow(12, 'History'),
        holisticRow(13, 'Science'),
      ],
    }
  );
  assert.equal(result.status, 'matched');
  assert.equal(result.subject.holisticAssessmentId, 294143);
  assert.ok(maxActive <= 3);
});

test('duplicate names and conflicting assignment evidence remain ambiguous', async () => {
  const helper = loadMapping();
  const room = { id: '57016', subject: 'Svenska', assignmentIds: [1] };
  const rows = {
    status: 'available',
    data: [holisticRow(1, 'Svenska'), holisticRow(2, 'Svenska')],
  };
  for (const data of [[], [{ id: 1, activityId: 57016, name: 'Shared task' }]]) {
    const result = await helper.resolveSubjectAssessment(
      { get: async () => ({ data }) },
      'cookie',
      room,
      rows
    );
    assert.equal(result.status, 'ambiguous');
    assert.equal(result.subject, null);
  }
});

test('one observed match cannot override unavailable candidate evidence', async () => {
  const result = await loadMapping().resolveSubjectAssessment(
    {
      get: async (url) => {
        if (url.includes('/2/')) throw upstreamError(403);
        return { data: [{ id: 1, activityId: 57016, name: 'Task' }] };
      },
    },
    'cookie',
    { id: '57016', subject: 'Course', assignmentIds: [1] },
    {
      status: 'available',
      data: [holisticRow(1, 'Svenska'), holisticRow(2, 'English')],
    }
  );
  assert.equal(result.status, 'unavailable');
  assert.equal(result.subject, null);
});

test('discovery failures are distinguishable from missing matches and preserve authentication errors', async () => {
  const helper = loadMapping();
  const room = { id: '57016', subject: 'Svenska', assignmentIds: [] };
  for (const status of ['unavailable', 'error']) {
    const result = await helper.resolveSubjectAssessment({}, 'cookie', room, {
      status,
      data: null,
    });
    assert.equal(result.status, status);
  }
  const empty = await helper.resolveSubjectAssessment({}, 'cookie', room, {
    status: 'available',
    data: [],
  });
  assert.equal(empty.status, 'unmatched');
  const badRows = await helper.fetchHolisticSubjects(
    { get: async () => ({ data: '<html>Login</html>' }) },
    'cookie'
  );
  assert.equal(badRows.status, 'error');
  await assert.rejects(
    helper.fetchHolisticSubjects(
      {
        get: async () => {
          throw upstreamError(401);
        },
      },
      'cookie'
    )
  );
});

test('room detail opts in to automatic mapping while ordinary prefetch remains lightweight', async () => {
  const calls = [];
  const route = loadModule('app/api/subjects/[id]/route.ts', {
    '@/app/api/lib/schoolsoft': {
      ...schoolsoftStub,
      requireSession: async () => ({ school: 'engelska', cookieString: 'session-cookie' }),
      createSchoolsoftClient: () => ({
        get: async (url, config) => {
          calls.push(url);
          assert.equal(config.headers.Cookie, 'session-cookie');
          if (url.endsWith('/holistic_assessment/rows'))
            return { data: [holisticRow(294143, 'Svenska')] };
          if (url.endsWith('/subjectroom/57016'))
            return { data: { subject: 'Svenska', activityId: 57016 } };
          return { data: [] };
        },
      }),
    },
  });
  const context = { params: Promise.resolve({ id: '57016' }) };
  const plain = await route.GET(new NextRequest('http://localhost/api/subjects/57016'), context);
  assert.equal(plain.status, 200);
  assert.equal(calls.length, 4);
  const detailed = await route.GET(
    new NextRequest('http://localhost/api/subjects/57016?includeAssessment=true'),
    context
  );
  const body = await detailed.json();
  assert.equal(body.subject.activityId, 57016);
  assert.equal(body.subject.holisticAssessmentId, 294143);
  assert.equal(body.assessmentLink, 'matched');
  assert.equal(body.assessmentSummary.title, 'Svenska');
  assert.equal(calls.length, 9);
});

test('coursework and assignment views never wait for holistic discovery or unused overview calls', async () => {
  const calls = [];
  const route = loadModule('app/api/subjects/[id]/route.ts', {
    '@/app/api/lib/schoolsoft': {
      ...schoolsoftStub,
      requireSession: async () => ({ school: 'engelska', cookieString: 'cookie' }),
      createSchoolsoftClient: () => ({
        get: async (url) => {
          calls.push(url);
          assert.ok(!url.includes('holistic_assessment'));
          assert.ok(!url.includes('examinations') && !url.includes('submissions'));
          return { data: url.endsWith('/table/rows') ? [] : { subject: 'Svenska' } };
        },
      }),
    },
  });
  const context = { params: Promise.resolve({ id: '57016' }) };
  const coursework = await route.GET(
    new NextRequest('http://localhost/api/subjects/57016?view=coursework'),
    context
  );
  assert.equal(coursework.status, 200);
  assert.equal(calls.length, 2);
  const assignments = await route.GET(
    new NextRequest('http://localhost/api/subjects/57016?view=assignments'),
    context
  );
  assert.equal(assignments.status, 200);
  assert.equal(calls.length, 3);
});

test('the subject catalog returns names without waiting for per-subject enrichment', async () => {
  let calls = 0;
  const route = loadModule('app/api/subjects/route.ts', {
    '@/app/api/lib/schoolsoft': {
      ...schoolsoftStub,
      applySessionCookieUpdates: () => {},
      requireSession: async () => ({ school: 'engelska', cookieString: 'cookie' }),
      createSchoolsoftClient: () => ({
        get: async (url) => {
          calls++;
          assert.equal(url, '/rest-api/student/ps/subjectroom/all');
          return {
            data: [
              { activityId: 57016, subject: 'Svenska' },
              { activityId: 57017, subject: 'English' },
            ],
          };
        },
      }),
    },
  });
  const response = await route.GET(new NextRequest('http://localhost/api/subjects?view=catalog'));
  const body = await response.json();
  assert.equal(calls, 1);
  assert.equal(body.subjects[0].id, 57016);
  assert.equal(body.subjects[1].subject, 'English');
});

test('an attendance section request does not fetch or wait for results and criteria', async () => {
  const calls = [];
  const route = loadModule('app/api/subjects/[id]/assessment/route.ts', {
    '@/app/api/lib/schoolsoft': {
      ...schoolsoftStub,
      requireSession: async () => ({ school: 'engelska', cookieString: 'cookie' }),
      createSchoolsoftClient: () => ({
        get: async (url) => {
          calls.push(url);
          assert.ok(url.includes('/attendance/'));
          return { data: { lessons: 10, attendance: 100, absence: 0, reportedAbsence: 0 } };
        },
      }),
    },
  });
  const response = await route.GET(
    new NextRequest(
      'http://localhost/api/subjects/57016/assessment?holisticId=294143&section=attendance'
    ),
    { params: Promise.resolve({ id: '57016' }) }
  );
  const body = await response.json();
  assert.equal(body.resource.data.attendance, 100);
  assert.equal(calls.length, 1);
});

test('server cache deduplicates reads, isolates cookies and schools, and supports forced refresh', async () => {
  const { cachedSchoolsoftGet } = loadModule('app/api/lib/schoolsoftReadCache.ts');
  let calls = 0;
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const client = (baseURL) => ({
    defaults: { baseURL },
    get: async () => {
      calls++;
      await gate;
      return { data: { count: calls } };
    },
  });
  const first = cachedSchoolsoftGet(client('https://sms.schoolsoft.se/one'), 'account-a', '/rows');
  const second = cachedSchoolsoftGet(client('https://sms.schoolsoft.se/one'), 'account-a', '/rows');
  assert.equal(calls, 1);
  release();
  await Promise.all([first, second]);
  await cachedSchoolsoftGet(client('https://sms.schoolsoft.se/one'), 'account-a', '/rows');
  assert.equal(calls, 1);
  await cachedSchoolsoftGet(client('https://sms.schoolsoft.se/one'), 'account-b', '/rows');
  await cachedSchoolsoftGet(client('https://sms.schoolsoft.se/two'), 'account-a', '/rows');
  assert.equal(calls, 3);
  await cachedSchoolsoftGet(client('https://sms.schoolsoft.se/one'), 'account-a', '/rows', {
    force: true,
  });
  assert.equal(calls, 4);
});

test('server cache expires reads and does not retain failures or login HTML', async () => {
  const { cachedSchoolsoftGet } = loadModule('app/api/lib/schoolsoftReadCache.ts');
  let calls = 0;
  const client = {
    defaults: { baseURL: 'https://sms.schoolsoft.se/one' },
    get: async () => {
      calls++;
      return { data: {} };
    },
  };
  await cachedSchoolsoftGet(client, 'cookie', '/expired', { maxAge: 0 });
  await cachedSchoolsoftGet(client, 'cookie', '/expired');
  assert.equal(calls, 2);
  client.get = async () => {
    calls++;
    throw upstreamError(401);
  };
  await assert.rejects(cachedSchoolsoftGet(client, 'cookie', '/auth'));
  await assert.rejects(cachedSchoolsoftGet(client, 'cookie', '/auth'));
  assert.equal(calls, 4);
  client.get = async () => {
    calls++;
    return { data: '<html>Log in</html>' };
  };
  await cachedSchoolsoftGet(client, 'cookie', '/login');
  await cachedSchoolsoftGet(client, 'cookie', '/login');
  assert.equal(calls, 6);
});

test('browser cache has a freshness window, explicit refresh and logout-safe pending reads', async () => {
  const cache = loadModule('lib/cache/index.ts');
  let calls = 0;
  const read = async () => ++calls;
  assert.equal(await cache.fetchCached('test', 60_000, read), 1);
  assert.equal(await cache.fetchCached('test', 60_000, read), 1);
  assert.equal(await cache.fetchCached('test', 60_000, read, true), 2);
  assert.equal(await cache.fetchCached('test', 0, read), 3);
  let releaseOld;
  let releaseNew;
  const old = cache.fetchCached(
    'pending',
    60_000,
    () =>
      new Promise((resolve) => {
        releaseOld = resolve;
      })
  );
  cache.clearCache();
  const fresh = cache.fetchCached(
    'pending',
    60_000,
    () =>
      new Promise((resolve) => {
        releaseNew = resolve;
      })
  );
  releaseOld('old account');
  await old;
  assert.equal(cache.readCache('pending'), null);
  const shared = cache.fetchCached('pending', 60_000, () => {
    throw new Error('Duplicate request');
  });
  releaseNew('new account');
  assert.equal(await fresh, 'new account');
  assert.equal(await shared, 'new account');
  assert.equal(cache.readCache('pending').data, 'new account');
});

test('subject warning uses the resolved ID and cookie, sanitizes published comments and retains metadata', async () => {
  const helper = loadAssessment();
  const result = await helper.fetchAssessmentResource(
    {
      get: async (url, config) => {
        assert.equal(url, '/rest-api/student/holistic_assessment/256985/subject_warning');
        assert.equal(config.headers.Cookie, 'JSESSIONID=warning');
        assert.equal(config.headers.Authorization, undefined);
        return {
          data: {
            holisticAssessmentId: 256985,
            active: true,
            published: true,
            comment: '<p>Needs <strong>more evidence</strong></p><script>alert(1)</script>',
            lastUpdatedBy: 'Teacher',
            lastUpdatedAt: '22 Oct 10:32',
            publishedAtDateString: '2026-10-22T10:32:38',
          },
        };
      },
    },
    'JSESSIONID=warning',
    '256985',
    'warning'
  );
  assert.equal(result.status, 'available');
  assert.ok(result.data.comment.includes('<strong>more evidence</strong>'));
  assert.ok(!result.data.comment.includes('script'));
  assert.equal(result.data.lastUpdatedBy, 'Teacher');
  assert.equal(result.data.publishedAtDateString, '2026-10-22T10:32:38');
});

test('missing warning failures remain unavailable while expired authentication propagates', async () => {
  const helper = loadAssessment();
  for (const status of [403, 404, 500]) {
    const result = await helper.fetchAssessmentResource(
      {
        get: async () => {
          throw upstreamError(status);
        },
      },
      'cookie',
      '256985',
      'warning'
    );
    assert.equal(result.status, 'unavailable');
    assert.equal(result.data, null);
  }
  await assert.rejects(
    helper.fetchAssessmentResource(
      {
        get: async () => {
          throw upstreamError(401);
        },
      },
      'cookie',
      '256985',
      'warning'
    )
  );
});

test('inactive and unpublished warnings disclose no feedback, mismatched records are rejected', async () => {
  const helper = loadAssessment();
  for (const flags of [
    { active: false, published: true },
    { active: true, published: false },
  ]) {
    const result = await helper.fetchAssessmentResource(
      {
        get: async () => ({
          data: { holisticAssessmentId: 256985, ...flags, comment: 'PRIVATE FEEDBACK' },
        }),
      },
      'cookie',
      '256985',
      'warning'
    );
    assert.equal(result.status, 'unavailable');
    assert.equal(result.data, null);
  }
  const mismatch = await helper.fetchAssessmentResource(
    {
      get: async () => ({
        data: { holisticAssessmentId: 1, active: true, published: true, comment: 'Wrong subject' },
      }),
    },
    'cookie',
    '256985',
    'warning'
  );
  assert.equal(mismatch.status, 'error');
  assert.equal(mismatch.data, null);
});

test('a missing-warning server response does not discard the other subject sections', async () => {
  const api = {
    get: async (url) => {
      if (url.endsWith('/subject_warning')) throw upstreamError(500);
      if (url.endsWith('/assessed_assignments')) return { data: [] };
      if (url.endsWith('/matrix')) return { data: { gradeCriteria: [] } };
      if (url.endsWith('/overview')) return { data: { gradeCriteriaOverview: [] } };
      return { data: { lessons: 10, attendance: 100, absence: 0, reportedAbsence: 0 } };
    },
  };
  const result = await loadAssessment().fetchSubjectAssessment(api, 'cookie', '256985');
  assert.equal(result.warning.status, 'unavailable');
  assert.equal(result.attendance.status, 'available');
  assert.equal(result.results.status, 'available');
  assert.equal(result.criteria.status, 'available');
});

test('warning section proxy fetches only the requested warning and returns private no-warning state', async () => {
  const calls = [];
  const route = loadModule('app/api/subjects/[id]/assessment/route.ts', {
    '@/app/api/lib/schoolsoft': {
      ...schoolsoftStub,
      requireSession: async () => ({ school: 'engelska', cookieString: 'cookie' }),
      createSchoolsoftClient: () => ({
        get: async (url) => {
          calls.push(url);
          throw upstreamError(500);
        },
      }),
    },
  });
  const response = await route.GET(
    new NextRequest(
      'http://localhost/api/subjects/57016/assessment?holisticId=256985&section=warning'
    ),
    { params: Promise.resolve({ id: '57016' }) }
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(calls.length, 1);
  assert.equal(calls[0], '/rest-api/student/holistic_assessment/256985/subject_warning');
  const body = await response.json();
  assert.equal(body.resource.status, 'unavailable');
  assert.equal(body.resource.data, null);
});
