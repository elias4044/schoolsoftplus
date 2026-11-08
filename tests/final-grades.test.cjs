/* eslint-disable @typescript-eslint/no-require-imports -- Run shared grade calculations without a browser. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

function load(file, dependencies = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    crypto: globalThis.crypto,
    TextEncoder,
    require: (name) => dependencies[name],
  });
  return exports;
}
const schoolsoft = load('lib/final-grades/schoolsoft-import.ts');
const analytics = load('lib/final-grades/analytics.ts', { './schoolsoft-import': schoolsoft });
const { computeFinalGradesInsights: compute } = analytics;
const { getGradePeriods, getGradeChanges, getTermHistory, projectGrades } = load(
  'lib/final-grades/progress.ts',
  { './analytics': analytics }
);
const format = load('lib/final-grades/format.ts', { './progress': { getGradePeriods } });
const subject = (id, grades, name = id) => ({
  id,
  subject: name,
  comment: '',
  manual: true,
  grades: grades.map((grade, index) => ({
    period: `Term ${index + 1}`,
    grade,
    raw: grade ?? '',
    isPreviousTerm: false,
  })),
});

test('missing grades are excluded from averages but F is included as zero', () => {
  const result = compute([
    subject('english', ['A']),
    subject('maths', ['F']),
    subject('art', [null]),
  ]);
  assert.equal(result.averagePoints, 10);
  assert.equal(result.approvedCount, 1);
  assert.equal(result.failingCount, 1);
  assert.equal(
    Object.values(result.gradeDistribution).reduce((a, b) => a + b),
    2
  );
});
test('best 16 and one language bonus reconcile and cap at 340', () => {
  const subjects = Array.from({ length: 18 }, (_, i) => subject(String(i), ['A']));
  subjects.push(subject('spanish', ['A'], 'Modern Languages, Spanish'));
  const result = compute(subjects);
  assert.equal(result.merit, 340);
  assert.equal(result.includedSubjects.length, 16);
  assert.equal(result.languageBonusSubject.id, 'spanish');
});
test('an excluded subject has no gain until it overtakes a counted subject', () => {
  const subjects = Array.from({ length: 16 }, (_, i) => subject(String(i), ['A']));
  subjects.push(subject('extra', ['D']));
  const result = compute(subjects);
  assert.equal(result.improvementCandidates.find((item) => item.subject === 'extra').meritGain, 0);
});
test('an F to E step uses actual selection rather than an automatic ten-point gain', () => {
  const subjects = Array.from({ length: 16 }, (_, i) => subject(String(i), ['A']));
  subjects.push(subject('extra', ['F']));
  assert.equal(compute(subjects).improvementCandidates[0].meritGain, 0);
  assert.equal(compute([subject('only', ['F'])]).improvementCandidates[0].meritGain, 10);
});
test('scenario recalculates best 16 without changing actual records', () => {
  const subjects = Array.from({ length: 16 }, (_, i) => subject(String(i), ['C']));
  subjects.push(subject('extra', ['D']));
  const original = JSON.stringify(subjects);
  const projected = projectGrades(subjects, { extra: 'A' });
  assert.equal(compute(projected).merit - compute(subjects).merit, 5);
  assert.equal(JSON.stringify(subjects), original);
});
test('a new subject with only the latest term does not reorder history', () => {
  const latest = subject('new', ['B']);
  latest.grades[0].period = 'Term 3';
  const subjects = [latest, subject('old', ['E', 'D', 'C'])];
  assert.deepEqual(Array.from(getGradePeriods(subjects)), ['Term 1', 'Term 2', 'Term 3']);
  assert.deepEqual(
    Array.from(getTermHistory(subjects), (term) => term.merit),
    [10, 12.5, 32.5]
  );
});
test('carried-forward grades contribute merit but are not new awards', () => {
  const record = subject('maths', ['C', 'B', 'B']);
  record.grades[2].isPreviousTerm = true;
  const change = getGradeChanges([record])[0];
  assert.equal(change.latest.period, 'Term 2');
  assert.equal(change.delta, 2.5);
  assert.equal(compute([record]).merit, 17.5);
});
test('parser preserves parenthesized grades and multiline SchoolSoft headers', () => {
  const parsed = analytics.parseFinalGradesPaste(
    'Subject\t24/25\nFall\t24/25\nSpring\tComments\nEnglish\tC\t(B)\tGood progress'
  );
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].grades[1].grade, 'B');
  assert.equal(parsed[0].grades[1].isPreviousTerm, true);
  assert.equal(parsed[0].comment, 'Good progress');
});
test('empty records and plans return honest zero values', () => {
  const result = compute([]);
  assert.equal(result.merit, 0);
  assert.equal(result.averagePoints, 0);
  assert.equal(getTermHistory([]).length, 0);
});

const jsonFile = (subjects, periods = ['Term 1']) => ({
  format: 'schoolsoftplus.final-grades',
  version: 1,
  periods,
  subjects,
});
const readFile = (file) => format.parseFinalGradesFile(JSON.stringify(file));

test('JSON exports round-trip records without calculated or account fields', () => {
  const original = subject('english', ['C', 'B']);
  original.grades[1].isPreviousTerm = true;
  original.grades[1].raw = '(B)';
  original.comment = 'A tab\tand a newline\nwith quotes: "yes"';
  const exported = format.exportFinalGradesFile([
    { ...original, userId: 'private', meritPoints: 99 },
  ]);
  const result = format.parseFinalGradesFile(exported);
  assert.deepEqual(JSON.parse(JSON.stringify(result.subjects[0])), original);
  assert.equal(exported.includes('private'), false);
  assert.equal(exported.includes('meritPoints'), false);
  assert.equal(result.version, 1);
});
test('JSON fills sparse periods, orders grades, and derives missing optional values', () => {
  const result = readFile(
    jsonFile(
      [
        {
          id: 'x',
          subject: 'Maths',
          grades: [
            { period: 'Term 3', grade: 'B', isPreviousTerm: true },
            { period: 'Term 1', grade: 'E' },
          ],
        },
      ],
      ['Term 1', 'Term 2', 'Term 3']
    )
  );
  assert.equal(result.subjects[0].grades[1].grade, null);
  assert.equal(result.subjects[0].grades[2].raw, '(B)');
  assert.equal(result.subjects[0].comment, '');
  assert.equal(result.subjects[0].manual, false);
  assert.equal(
    format.parseFinalGradesFile(format.exportFinalGradesFile(result.subjects)).periods.join(','),
    'Term 1,Term 2,Term 3'
  );
});
test('JSON rejects invalid versions, grade values, flags, IDs and period references', () => {
  const record = subject('maths', ['C']);
  const invalid = [
    { ...jsonFile([record]), format: 'other' },
    { ...jsonFile([record]), version: 2 },
    jsonFile([record, record]),
    jsonFile([record], ['Term 1', 'Term 1']),
    jsonFile([{ ...record, grades: [{ period: 'unknown', grade: 'A' }] }]),
    jsonFile([{ ...record, grades: [...record.grades, ...record.grades] }]),
    jsonFile([{ ...record, grades: [{ period: 'Term 1', grade: 'b' }] }]),
    jsonFile([{ ...record, grades: [{ period: 'Term 1', grade: '' }] }]),
    jsonFile([{ ...record, grades: [{ period: 'Term 1', grade: 'A', isPreviousTerm: 'false' }] }]),
    jsonFile([{ ...record, subject: '   ' }]),
    jsonFile([{ ...record, manual: 'true' }]),
    { ...jsonFile([record]), exportedAt: 'yesterday' },
  ];
  invalid.forEach((file) => assert.throws(() => readFile(file)));
  assert.throws(() => format.parseFinalGradesFile('{broken'), /valid JSON/);
});
test('JSON enforces storage and byte limits and accepts a BOM', () => {
  const record = subject('x', ['A']);
  assert.throws(() =>
    readFile(jsonFile(Array.from({ length: 81 }, (_, i) => ({ ...record, id: String(i) }))))
  );
  assert.throws(() =>
    readFile(
      jsonFile(
        [record],
        Array.from({ length: 21 }, (_, i) => String(i))
      )
    )
  );
  assert.throws(() => readFile(jsonFile([{ ...record, comment: 'x'.repeat(1001) }])));
  assert.throws(
    () => format.parseFinalGradesFile(' '.repeat(format.MAX_GRADE_IMPORT_BYTES + 1)),
    /2 MiB/
  );
  assert.equal(
    format.parseFinalGradesFile('\uFEFF' + JSON.stringify(jsonFile([record]))).subjects.length,
    1
  );
});
test('JSON null and F remain distinct and empty exports are valid', () => {
  const result = readFile(jsonFile([subject('empty', [null]), subject('fail', ['F'])]));
  assert.equal(result.subjects[0].grades[0].grade, null);
  assert.equal(result.subjects[1].grades[0].grade, 'F');
  assert.equal(format.parseFinalGradesFile(format.exportFinalGradesFile([])).subjects.length, 0);
});
test('SchoolSoft single-row headings work without a comments column', () => {
  const result = schoolsoft.parseSchoolSoftGrades('Subject\tFall\tSpring\nMaths\tD\tC\nArt\t\tE');
  assert.equal(result.periods.join(','), 'Fall,Spring');
  assert.equal(result.subjects[1].grades[0].grade, null);
  assert.equal(result.subjects[0].grades[1].grade, 'C');
});
test('SchoolSoft ignores trailing empty header cells after Comments', () => {
  const result = schoolsoft.parseSchoolSoftGrades('Subject\tFall\tSpring\tComments\t\nArt\tC\tB\tGood progress\t');
  assert.equal(result.periods.length,2);
  assert.equal(result.subjects[0].grades[1].grade,'B');
  assert.equal(result.subjects[0].comment,'Good progress');
});
test('SchoolSoft aligned year/season headers and Swedish headings are recognized', () => {
  const result = schoolsoft.parseSchoolSoftGrades(
    '\u00c4mne\t24/25\t24/25\tKommentar\n\tH\u00f6st\tV\u00e5r\t\nMatematik\t(c)\tB\tBra'
  );
  assert.equal(result.periods.join(','), '24/25 H\u00f6st,24/25 V\u00e5r');
  assert.equal(result.subjects[0].grades[0].isPreviousTerm, true);
  assert.equal(result.subjects[0].comment, 'Bra');
});
test('SchoolSoft repeated subject labels never become periods or shift the latest grade', () => {
  for (const label of ['\u00c4mne', 'Subject']) {
    const result = schoolsoft.parseSchoolSoftGrades(
      `${label}\t${label}\t25/26 ht\t25/26 vt\tNoteringar\nMatematik\tC\tB\t`
    );
    assert.equal(result.periods.join(','), '25/26 ht,25/26 vt');
    assert.equal(result.subjects[0].grades.at(-1).grade, 'B');
    assert.equal(result.subjects[0].grades.at(-1).period, '25/26 vt');
    assert.equal(result.warnings.length, 0);
  }
});
test('SchoolSoft subject labels in aligned header rows are excluded from term names', () => {
  for (const label of ['\u00c4mne', 'Subject', 'A\u0308mne']) {
    const result = schoolsoft.parseSchoolSoftGrades(
      `${label}\t25/26\t25/26\tComments\n${label}\tht\tvt\t\nEnglish\tC\tA\t`
    );
    assert.equal(result.periods.join(','), '25/26 ht,25/26 vt');
    assert.equal(result.subjects.length, 1);
    assert.equal(result.subjects[0].grades.at(-1).grade, 'A');
    assert.equal(result.warnings.length, 0);
  }
});
test('SchoolSoft handles quoted tabs, multiline comments, escaped quotes and duplicate names', () => {
  const result = schoolsoft.parseSchoolSoftGrades(
    'Subject\tTerm 1\tComments\nArt\tC\t"A tab\tand\na ""quote"""\nArt\tE\t'
  );
  assert.equal(result.subjects[0].comment, 'A tab\tand\na "quote"');
  assert.notEqual(result.subjects[0].id, result.subjects[1].id);
});
test('SchoolSoft reports uncertain grades, missing columns and inferred terms', () => {
  const result = schoolsoft.parseSchoolSoftGrades(
    'Subject\tFall\tSpring\tComments\nArt\tPending\tE\t\nEnglish\tA'
  );
  assert.equal(result.warnings.length, 2);
  assert.equal(result.subjects[0].grades[0].raw, 'Pending');
  assert.equal(result.subjects[0].grades[0].grade, null);
  const noHeader = schoolsoft.parseSchoolSoftGrades('Art\tC\tB\nEnglish\tA\tA');
  assert.equal(noHeader.subjects.length, 2);
  assert.equal(noHeader.warnings.length, 1);
});
test('SchoolSoft rejects unmatched quotes, duplicate terms, malformed grades and oversized tables', () => {
  assert.throws(() => schoolsoft.parseSchoolSoftGrades('Subject\tFall\nArt\t"B'));
  assert.throws(() => schoolsoft.parseSchoolSoftGrades('Subject\tFall\tFall\nArt\tB\tC'));
  assert.equal(
    schoolsoft.parseSchoolSoftGrades('Subject\tFall\nArt\t(B').subjects[0].grades[0].grade,
    null
  );
  assert.throws(() =>
    schoolsoft.parseSchoolSoftGrades(
      'Subject\tFall\n' + Array.from({ length: 81 }, (_, i) => `Subject ${i}\tA`).join('\n')
    )
  );
  assert.throws(() => schoolsoft.parseSchoolSoftGrades('Not a grade table'));
});
test('opaque external IDs cannot accidentally become inherited planner targets', () => {
  const records = [subject('constructor', ['C']), subject('__proto__', ['B'])];
  assert.equal(JSON.stringify(projectGrades(records, {})), JSON.stringify(records));
});
