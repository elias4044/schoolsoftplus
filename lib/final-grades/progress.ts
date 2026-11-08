import { computeFinalGradesInsights, FINAL_GRADE_POINTS } from './analytics';
import type { FinalGradeLetter, FinalGradeSubject } from './types';

export function getGradePeriods(subjects: FinalGradeSubject[]): string[] {
  const sequences = subjects
    .map((subject) => subject.grades.map((cell) => cell.period))
    .sort((a, b) => b.length - a.length);
  const periods: string[] = [];
  for (const sequence of sequences) {
    for (const [index, period] of sequence.entries()) {
      if (periods.includes(period)) continue;
      const following = sequence.slice(index + 1).find((item) => periods.includes(item));
      if (following) periods.splice(periods.indexOf(following), 0, period);
      else periods.push(period);
    }
  }
  return periods;
}

export function getGradeChanges(subjects: FinalGradeSubject[]) {
  return subjects.map((subject) => {
    const awarded = subject.grades.filter((cell) => cell.grade && !cell.isPreviousTerm);
    const latest = awarded.at(-1);
    const previous = awarded.at(-2);
    const delta =
      latest?.grade && previous?.grade
        ? FINAL_GRADE_POINTS[latest.grade] - FINAL_GRADE_POINTS[previous.grade]
        : null;
    return { id: subject.id, subject: subject.subject, latest, previous, delta };
  });
}

export function getTermHistory(subjects: FinalGradeSubject[]) {
  const periods = getGradePeriods(subjects);
  return periods.map((period, index) => {
    const available = new Set(periods.slice(0, index + 1));
    const snapshot = subjects.map((subject) => ({
      ...subject,
      grades: subject.grades.filter((cell) => available.has(cell.period)),
    }));
    const insights = computeFinalGradesInsights(snapshot);
    return {
      period,
      merit: insights.merit,
      graded: insights.approvedCount + insights.failingCount,
    };
  });
}

export function projectGrades(
  subjects: FinalGradeSubject[],
  targets: Record<string, FinalGradeLetter>
) {
  return subjects.map((subject) => {
    const target = Object.hasOwn(targets, subject.id) ? targets[subject.id] : undefined;
    if (!target) return subject;
    const latest = subject.grades.findLastIndex((cell) => cell.grade !== null);
    return {
      ...subject,
      grades: subject.grades.map((cell, index) =>
        index === latest ? { ...cell, grade: target } : cell
      ),
    };
  });
}
