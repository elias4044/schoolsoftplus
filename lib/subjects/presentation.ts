export function subjectDate(value?: string | null): string {
  if (!value) return 'No date';
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime())
    ? 'No date'
    : date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
}

export function criterionLabel(level: string): string {
  const grade = /^MEET_([A-F])_LEVEL$/.exec(level)?.[1];
  if (grade) return `Meets ${grade} level`;
  if (level === 'NO_ASSESSMENT_MADE') return 'Not assessed';
  return level.replaceAll('_', ' ').toLowerCase();
}
