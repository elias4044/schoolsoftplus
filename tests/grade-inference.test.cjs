/* eslint-disable @typescript-eslint/no-require-imports -- Exercises shared TypeScript estimator without a browser. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

function loadGradeModule(file) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { exports });
  return exports;
}

const { inferGrade } = loadGradeModule('lib/grades/inferGrade.ts');
const { parseGradeFromReview } = loadGradeModule('lib/grades/constants.ts');
const moment = (points, max = 100) => ({ name: 'Assessment', points, max });
const tab = (values) => ({
  assessedCriteria: values.map((value) => ({
    level: { value, levelEnum: 'MEET_C_LEVEL' },
    steps: [],
  })),
});

test('completion messages and ordinary prose do not become reported letter grades', () => {
  for (const review of [
    'Reviewed',
    'Completed',
    'A good piece of work',
    'Reviewed with a clear argument',
    'You made a strong argument.',
  ]) {
    assert.equal(parseGradeFromReview(review), null, review);
  }
});

test('explicit reported grades remain recognized', () => {
  for (const [review, grade] of [
    [' C ', 'C'],
    ['b', 'B'],
    ['Grade: A', 'A'],
    ['Betyg: D', 'D'],
    ['C - Completed', 'C'],
    ['Result: E', 'E'],
    ['Completed - C', 'C'],
    ['Reviewed (B)', 'B'],
    ['Grade: A, great work', 'A'],
    ['Your grade is D', 'D'],
  ]) {
    assert.equal(parseGradeFromReview(review), grade, review);
  }
});

test('existing point thresholds are retained, including a scored zero', () => {
  for (const [points, grade] of [
    [95, 'A'],
    [85, 'B'],
    [70, 'C'],
    [50, 'D'],
    [40, 'E'],
    [39, 'F'],
    [0, 'F'],
  ]) {
    const result = inferGrade([moment(points)], []);
    assert.equal(result.grade, grade);
    assert.equal(result.source, 'points');
    assert.equal(result.confidence, 'estimated');
  }
});

test('criteria take precedence over points and preserve the existing weighting', () => {
  const result = inferGrade([moment(100)], [tab([9, 10, 9])]);
  assert.equal(result.grade, 'C');
  assert.equal(result.source, 'criteria');
  assert.equal(result.confidence, 'estimated');
});

test('empty or unassessed criteria fall back to valid points', () => {
  assert.equal(inferGrade([moment(85)], [{ assessedCriteria: [] }]).grade, 'B');
  const result = inferGrade(
    [moment(70)],
    [{ assessedCriteria: [{ level: { value: 10, levelEnum: 'NO_ASSESSMENT_MADE' } }] }]
  );
  assert.equal(result.source, 'points');
  assert.equal(result.grade, 'C');
});

test('missing and invalid evidence does not produce an estimate', () => {
  assert.equal(inferGrade([], []), null);
  assert.equal(
    inferGrade(
      [moment(0, 0), moment(-1), moment(NaN), moment(20, Infinity)],
      [tab([0, NaN, Infinity])]
    ),
    null
  );
});

test('invalid point parts do not distort valid scored evidence', () => {
  assert.equal(inferGrade([moment(70), moment(100, 0), moment(NaN), moment(-10)], []).grade, 'C');
});

test('the supplied failed criterion estimates F even though every available grade column is present', () => {
  const failed = {
    level: { levelEnum: 'FAIL_TO_MEET_CRITERIA', value: 1, description: 'N\u00e5r ej kriteriet' },
    steps: ['E', 'D', 'C', 'B', 'A'].map((letter, index) => ({
      gradeCriteriaGroupId: 27382,
      text: `Description for ${letter}`,
      level: { levelEnum: `MEET_${letter}_LEVEL`, value: index + 7, description: letter },
    })),
  };
  const result = inferGrade([], [{ content: { name: 'Engelska' }, assessedCriteria: [failed] }]);
  assert.equal(result.grade, 'F');
  assert.equal(result.source, 'criteria');
  assert.equal(result.confidence, 'estimated');
});

test('one failed criterion overrides passing criteria and high points across tabs', () => {
  const failed = { level: { levelEnum: 'FAIL_TO_MEET_CRITERIA', value: 1 }, steps: [] };
  const result = inferGrade([moment(100)], [tab([11, 11]), { assessedCriteria: [failed] }]);
  assert.equal(result.grade, 'F');
  assert.equal(result.source, 'criteria');
});

test('an explicit F level is also a failed criterion', () => {
  const result = inferGrade(
    [moment(100)],
    [{ assessedCriteria: [{ level: { levelEnum: 'MEET_F_LEVEL', value: 0 }, steps: [] }] }]
  );
  assert.equal(result.grade, 'F');
  assert.equal(result.source, 'criteria');
});

test('not assessed is not confused with failed criteria', () => {
  const result = inferGrade(
    [],
    [
      tab([11]),
      { assessedCriteria: [{ level: { levelEnum: 'NO_ASSESSMENT_MADE', value: 0 }, steps: [] }] },
    ]
  );
  assert.equal(result.grade, 'A');
});
