import type { FinalGradeLetter, FinalGradeSubject } from './types';

export interface SchoolSoftImport {
  subjects: FinalGradeSubject[];
  periods: string[];
  warnings: string[];
}

// Theres a lot of RegEx in this code, read about it here if you don't know it as it can be a bit hard to read: 
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions

const SUBJECT_HEADER = /^(subject|\u00e4mne)$/i;
const COMMENT_HEADER = /^(comments?|notering(?:ar)?|kommentar(?:er)?)$/i;
const EMPTY_GRADE = /^(?:[-\u2013\u2014]|n\/a)?$/i;

function isSubjectHeader(value: string): boolean {
  return SUBJECT_HEADER.test(value.trim().normalize('NFC'));
}

function gradeValue(raw: string) {
  const match = raw.trim().match(/^(?:([A-F])|\(\s*([A-F])\s*\))$/i);
  return {
    grade: match ? ((match[1] ?? match[2]).toUpperCase() as FinalGradeLetter) : null,
    isPreviousTerm: Boolean(match?.[2]),
  };
}

// Spreadsheet quoting permits tabs and line breaks inside a comment.
function tabRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false;
  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    if (char === '"' && (quoted || !cell)) {
      if (quoted && input[index + 1] === '"') {
        cell += '"';
        index++;
      } else quoted = !quoted;
    } else if (!quoted && (char === '\t' || char === '\n')) {
      row.push(cell.trim());
      cell = '';
      if (char === '\n') {
        rows.push(row);
        row = [];
      }
    } else cell += char;
  }
  if (quoted) throw new Error('The pasted table has an unclosed quote. Copy the full table again.');
  row.push(cell.trim());
  rows.push(row);
  return rows.filter((row) => row.some(Boolean));
}

export function parseSchoolSoftGrades(input: string): SchoolSoftImport {
  const normalized = input
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ');
  if (!normalized.trim()) throw new Error('Paste a SchoolSoft grade table first.');
  const rows = normalized.includes('\t')
    ? tabRows(normalized)
    : normalized
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => line.trim().split(/ {2,}/));
  const warnings: string[] = [];
  const headerIndex = rows.findIndex((row) => isSubjectHeader(row[0] ?? ''));
  let dataStart: number;
  let periods: string[];
  let comments = false;
  if (headerIndex >= 0) {
    dataStart = headerIndex + 1;
    const headers = [rows[headerIndex]];
    while (
      dataStart < rows.length &&
      rows[dataStart].every(
        (cell) =>
          !cell ||
          isSubjectHeader(cell) ||
          COMMENT_HEADER.test(cell) ||
          /^(?:(?:\d{2,4}\/\d{2,4})(?:\s+(?:fall|spring|autumn|h\u00f6st|v\u00e5r|ht|vt))?|fall|spring|autumn|h\u00f6st|v\u00e5r|ht|vt)$/i.test(
            cell
          )
      )
    )
      headers.push(rows[dataStart++]);
    comments = headers.some((row) => row.some((cell) => COMMENT_HEADER.test(cell)));
    if (headers.length === 1) {
      const commentIndex = headers[0].findIndex((cell) => COMMENT_HEADER.test(cell));
      periods = headers[0].slice(1, commentIndex > 0 ? commentIndex : undefined);
      periods = periods.filter((cell) => !isSubjectHeader(cell));
      while (periods.length && !periods.at(-1)) periods.pop();
    } else if (headers.slice(1).every((row) => !row[0] || isSubjectHeader(row[0]))) {
      const width = Math.max(...headers.map((row) => row.length));
      periods = Array.from({ length: width - 1 }, (_, index) =>
        headers
          .map((row) => row[index + 1])
          .filter((cell) => cell && !isSubjectHeader(cell) && !COMMENT_HEADER.test(cell))
          .join(' ')
      ).filter(Boolean);
    } else {
      const tokens = headers
        .flat()
        .filter((cell) => cell && !isSubjectHeader(cell) && !COMMENT_HEADER.test(cell));
      periods = [];
      for (let index = 0; index < tokens.length; index++) {
        if (
          /^\d{2,4}\/\d{2,4}$/.test(tokens[index]) &&
          /^(fall|spring|autumn|h\u00f6st|v\u00e5r|ht|vt)$/i.test(tokens[index + 1] ?? '')
        )
          periods.push(`${tokens[index]} ${tokens[++index]}`);
        else periods.push(tokens[index]);
      }
    }
  } else {
    dataStart = rows.findIndex(
      (row) => row.length >= 2 && row.slice(1).some((cell) => gradeValue(cell).grade)
    );
    if (dataStart < 0)
      throw new Error('No grade table found. Include the Subject or Amne heading and term names.');
    const count = rows[dataStart]
      .slice(1)
      .findIndex((cell) => !gradeValue(cell).grade && !EMPTY_GRADE.test(cell));
    const width = count < 0 ? rows[dataStart].length - 1 : count;
    periods = Array.from({ length: width }, (_, index) => `Period ${index + 1}`);
    warnings.push(
      'No term headings found. Generated period names; check the order before importing.'
    );
  }
  periods = periods.map((period, index) => period || `Period ${index + 1}`);
  if (!periods.length || periods.length > 20)
    throw new Error('The table must contain between 1 and 20 grade periods.');
  if (new Set(periods).size !== periods.length)
    throw new Error('The table has duplicate term names. Give each term a unique heading.');
  if (periods.some((period) => period.length > 60))
    throw new Error('Term names must be at most 60 characters.');
  const subjects: FinalGradeSubject[] = [];
  for (const [index, row] of rows.slice(dataStart).entries()) {
    const subject = row[0];
    if (
      !subject ||
      isSubjectHeader(subject) ||
      /^(total|summa|merit(?:v\u00e4rde)?)$/i.test(subject)
    )
      continue;
    if (subject.length > 120)
      throw new Error(`Subject on row ${dataStart + index + 1} is longer than 120 characters.`);
    const grades = periods.map((period, cellIndex) => {
      const raw = row[cellIndex + 1] ?? '';
      const parsed = gradeValue(raw);
      if (!parsed.grade && !EMPTY_GRADE.test(raw))
        warnings.push(
          `${subject}, ${period}: "${raw.slice(0, 40)}" is not an A-F grade; kept as ungraded.`
        );
      return { period, ...parsed, raw: raw.slice(0, 20) };
    });
    if (row.length - 1 < periods.length)
      warnings.push(`${subject}: missing columns were left ungraded.`);
    const comment = row
      .slice(1 + periods.length)
      .join(' ')
      .trim();
    if (comment.length > 1000) throw new Error(`${subject}: the comment exceeds 1000 characters.`);
    if (!comments && comment) warnings.push(`${subject}: extra columns were treated as a comment.`);
    subjects.push({ id: crypto.randomUUID(), subject, grades, comment, manual: false });
  }
  if (!subjects.length || subjects.length > 80)
    throw new Error('The table must contain between 1 and 80 subjects.');
  return { subjects, periods, warnings };
}
