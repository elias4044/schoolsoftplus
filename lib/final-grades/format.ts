import { getGradePeriods } from './progress';
import type { FinalGradeLetter, FinalGradeSubject } from './types';

export const FINAL_GRADES_FORMAT = 'schoolsoftplus.final-grades';
export const FINAL_GRADES_VERSION = 1;
export const MAX_GRADE_IMPORT_BYTES = 2 * 1024 * 1024;

export interface FinalGradesFile {
  format: typeof FINAL_GRADES_FORMAT;
  version: typeof FINAL_GRADES_VERSION;
  exportedAt?: string;
  periods: string[];
  subjects: FinalGradeSubject[];
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${path} must be an object.`);
  return value as Record<string, unknown>;
}

function text(value: unknown, path: string, max: number, allowEmpty = false): string {
  if (typeof value !== 'string' || value.length > max || (!allowEmpty && !value.trim())) {
    throw new Error(
      `${path} must be ${allowEmpty ? '' : 'a non-empty '}text of at most ${max} characters.`
    );
  }
  return value;
}

export function parseFinalGradesFile(input: string): FinalGradesFile {
  if (new TextEncoder().encode(input).length > MAX_GRADE_IMPORT_BYTES)
    throw new Error('Grade files must be 2 MiB or smaller.');
  let value: unknown;
  try {
    value = JSON.parse(input.replace(/^\uFEFF/, ''));
  } catch {
    throw new Error('This is not valid JSON. Check the file and try again.');
  }
  const file = record(value, 'File');
  if (file.format !== FINAL_GRADES_FORMAT)
    throw new Error(`Expected format "${FINAL_GRADES_FORMAT}".`);
  if (file.version !== FINAL_GRADES_VERSION)
    throw new Error(
      `Unsupported grade format version: ${String(file.version)}. This app supports version 1.`
    );
  if (!Array.isArray(file.periods) || file.periods.length > 20)
    throw new Error('periods must be an array of up to 20 period names.');
  const periods = file.periods.map((period, index) => text(period, `periods[${index}]`, 60));
  if (new Set(periods).size !== periods.length) throw new Error('Period names must be unique.');
  if (!Array.isArray(file.subjects) || file.subjects.length > 80)
    throw new Error('subjects must be an array of up to 80 subjects.');
  const ids = new Set<string>();
  const subjects = file.subjects.map((value, index): FinalGradeSubject => {
    const path = `subjects[${index}]`;
    const subject = record(value, path);
    const id = text(subject.id, `${path}.id`, 140);
    if (ids.has(id)) throw new Error(`${path}.id duplicates another subject ID.`);
    ids.add(id);
    if (subject.manual !== undefined && typeof subject.manual !== 'boolean')
      throw new Error(`${path}.manual must be a boolean.`);
    if (!Array.isArray(subject.grades) || subject.grades.length > 20)
      throw new Error(`${path}.grades must be an array of up to 20 cells.`);
    const seen = new Set<string>();
    const grades = subject.grades
      .map((value, cellIndex) => {
        const cellPath = `${path}.grades[${cellIndex}]`;
        const cell = record(value, cellPath);
        const period = text(cell.period, `${cellPath}.period`, 60);
        if (!periods.includes(period))
          throw new Error(`${cellPath}.period is not listed in periods.`);
        if (seen.has(period)) throw new Error(`${path} has more than one grade for ${period}.`);
        seen.add(period);
        if (cell.grade !== null && (typeof cell.grade !== 'string' || !/^[A-F]$/.test(cell.grade)))
          throw new Error(`${cellPath}.grade must be A, B, C, D, E, F, or null.`);
        if (cell.isPreviousTerm !== undefined && typeof cell.isPreviousTerm !== 'boolean')
          throw new Error(`${cellPath}.isPreviousTerm must be a boolean.`);
        const grade = cell.grade as FinalGradeLetter | null;
        const isPreviousTerm = cell.isPreviousTerm === true;
        const raw =
          cell.raw === undefined
            ? grade
              ? isPreviousTerm
                ? `(${grade})`
                : grade
              : ''
            : text(cell.raw, `${cellPath}.raw`, 20, true);
        return { period, grade, isPreviousTerm, raw };
      })
      .sort((a, b) => periods.indexOf(a.period) - periods.indexOf(b.period));
    const byPeriod = new Map(grades.map((cell) => [cell.period, cell]));
    return {
      id,
      subject: text(subject.subject, `${path}.subject`, 120),
      comment:
        subject.comment === undefined ? '' : text(subject.comment, `${path}.comment`, 1000, true),
      manual: subject.manual === true,
      grades: periods.map(
        (period) => byPeriod.get(period) ?? { period, grade: null, isPreviousTerm: false, raw: '' }
      ),
    };
  });
  const exportedAt =
    file.exportedAt === undefined ? undefined : text(file.exportedAt, 'exportedAt', 40);
  if (
    exportedAt !== undefined &&
    (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(exportedAt) ||
      !Number.isFinite(Date.parse(exportedAt)))
  )
    throw new Error('exportedAt must be an ISO 8601 UTC timestamp.');
  return {
    format: FINAL_GRADES_FORMAT,
    version: FINAL_GRADES_VERSION,
    ...(exportedAt ? { exportedAt } : {}),
    periods,
    subjects,
  };
}

export function exportFinalGradesFile(subjects: FinalGradeSubject[]): string {
  const file = {
    format: FINAL_GRADES_FORMAT,
    version: FINAL_GRADES_VERSION,
    exportedAt: new Date().toISOString(),
    periods: getGradePeriods(subjects),
    subjects: subjects.map(({ id, subject, grades, comment, manual }) => ({
      id,
      subject,
      comment,
      manual,
      grades: grades.map(({ period, grade, isPreviousTerm, raw }) => ({
        period,
        grade,
        isPreviousTerm,
        raw,
      })),
    })),
  };
  return JSON.stringify(parseFinalGradesFile(JSON.stringify(file)), null, 2) + '\n';
}
