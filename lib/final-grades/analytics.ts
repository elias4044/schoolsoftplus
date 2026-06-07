import type {
  FinalGradeCell,
  FinalGradeLetter,
  FinalGradeSubject,
  FinalGradesInsights,
  MeritSubject,
} from "./types";

export const FINAL_GRADE_LETTERS: FinalGradeLetter[] = ["A", "B", "C", "D", "E", "F"];

export const FINAL_GRADE_POINTS: Record<FinalGradeLetter, number> = {
  A: 20,
  B: 17.5,
  C: 15,
  D: 12.5,
  E: 10,
  F: 0,
};

const NEXT_GRADE: Partial<Record<FinalGradeLetter, FinalGradeLetter>> = {
  F: "E",
  E: "D",
  D: "C",
  C: "B",
  B: "A",
};

function normalizeGrade(value: string): { grade: FinalGradeLetter | null; isPreviousTerm: boolean } {
  const trimmed = value.trim();
  const match = trimmed.match(/^\(?\s*([A-F])\s*\)?$/i);
  if (!match) return { grade: null, isPreviousTerm: false };
  return {
    grade: match[1].toUpperCase() as FinalGradeLetter,
    isPreviousTerm: trimmed.startsWith("(") && trimmed.endsWith(")"),
  };
}

function makeSubjectId(subject: string): string {
  return subject
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9åäö]+/gi, "-")
    .replace(/^-+|-+$/g, "") || crypto.randomUUID();
}

function splitLine(line: string): string[] {
  if (line.includes("\t")) return line.split("\t").map(cell => cell.trim());
  return line.split(/\s{2,}/).map(cell => cell.trim());
}

function buildPeriods(headerLines: string[][]): string[] {
  const flatHeader = headerLines.flat().map(part => part.trim()).filter(Boolean);
  if (flatHeader.length > headerLines[0].length) {
    const tokens = flatHeader
      .filter(token => !/^subject$/i.test(token))
      .filter(token => !/^comments?$/i.test(token));
    const periods: string[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const next = tokens[i + 1];
      if (/^\d{2}\/\d{2}$/.test(token) && next && !/^\d{2}\/\d{2}$/.test(next)) {
        periods.push(`${token} ${next}`);
        i++;
      } else {
        periods.push(token);
      }
    }

    return periods;
  }

  const periodCount = Math.max(...headerLines.map(line => Math.max(0, line.length - 2)), 0);
  const periods: string[] = [];

  for (let i = 0; i < periodCount; i++) {
    const parts = headerLines
      .map(line => line[i + 1])
      .filter(Boolean)
      .filter(part => !/^comments?$/i.test(part));
    periods.push(parts.join(" ").trim() || `Period ${i + 1}`);
  }

  return periods;
}

export function parseFinalGradesPaste(input: string): FinalGradeSubject[] {
  const lines = input
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map(line => line.trimEnd())
    .filter(line => line.trim().length > 0);

  if (!lines.length) return [];

  const rows = lines.map(splitLine);
  const firstSubjectIndex = rows.findIndex((row, index) => {
    if (index === 0) return false;
    return row.length >= 2 && row.slice(1).some(cell => normalizeGrade(cell).grade != null);
  });

  const headerRows = firstSubjectIndex > 0 ? rows.slice(0, firstSubjectIndex) : [rows[0]];
  const periods = buildPeriods(headerRows);
  const subjectRows = firstSubjectIndex >= 0 ? rows.slice(firstSubjectIndex) : rows.slice(1);

  return subjectRows
    .map(row => {
      const subject = row[0]?.trim();
      if (!subject) return null;

      const gradeCells = row.slice(1, 1 + periods.length);
      const grades: FinalGradeCell[] = periods.map((period, index) => {
        const raw = gradeCells[index] ?? "";
        const parsed = normalizeGrade(raw);
        return { period, raw, grade: parsed.grade, isPreviousTerm: parsed.isPreviousTerm };
      });

      const comment = row.slice(1 + periods.length).join(" ").trim();
      return {
        id: makeSubjectId(subject),
        subject,
        grades,
        comment,
        manual: false,
      };
    })
    .filter((subject): subject is FinalGradeSubject => subject != null);
}

export function currentGrade(subject: FinalGradeSubject): {
  grade: FinalGradeLetter | null;
  period: string | null;
} {
  for (let i = subject.grades.length - 1; i >= 0; i--) {
    const cell = subject.grades[i];
    if (cell.grade) return { grade: cell.grade, period: cell.period };
  }
  return { grade: null, period: null };
}

function isModernLanguage(subject: string): boolean {
  const normalized = subject.toLowerCase();
  return normalized.includes("modern languages") || normalized.includes("moderna språk");
}

function previousSetGrade(subject: FinalGradeSubject): { grade: FinalGradeLetter; period: string } | null {
  const current = currentGrade(subject);
  if (!current.grade || !current.period) return null;
  const currentIndex = subject.grades.findIndex(cell => cell.period === current.period && cell.grade === current.grade);

  for (let i = currentIndex - 1; i >= 0; i--) {
    const cell = subject.grades[i];
    if (cell.grade && !cell.isPreviousTerm) return { grade: cell.grade, period: cell.period };
  }

  return null;
}

export function computeFinalGradesInsights(subjects: FinalGradeSubject[]): FinalGradesInsights {
  const distribution = Object.fromEntries(FINAL_GRADE_LETTERS.map(letter => [letter, 0])) as Record<FinalGradeLetter, number>;
  const meritSubjects: MeritSubject[] = subjects.map(subject => {
    const current = currentGrade(subject);
    const meritPoints = current.grade ? FINAL_GRADE_POINTS[current.grade] : 0;
    if (current.grade) distribution[current.grade]++;
    return {
      ...subject,
      currentGrade: current.grade,
      currentPeriod: current.period,
      meritPoints,
      countsAsLanguageBonus: false,
      includedInBaseMerit: false,
    };
  });

  const eligible = meritSubjects.filter(subject => subject.currentGrade && subject.currentGrade !== "F");
  const languageBonusSubject = eligible
    .filter(subject => isModernLanguage(subject.subject))
    .sort((a, b) => b.meritPoints - a.meritPoints)[0] ?? null;
  const baseCandidates = eligible.filter(subject => subject.id !== languageBonusSubject?.id);
  const includedSubjects = baseCandidates
    .sort((a, b) => b.meritPoints - a.meritPoints || a.subject.localeCompare(b.subject))
    .slice(0, 16);

  const includedIds = new Set(includedSubjects.map(subject => subject.id));
  for (const subject of meritSubjects) {
    subject.includedInBaseMerit = includedIds.has(subject.id);
    subject.countsAsLanguageBonus = subject.id === languageBonusSubject?.id;
  }

  const merit =
    includedSubjects.reduce((sum, subject) => sum + subject.meritPoints, 0) +
    (languageBonusSubject?.meritPoints ?? 0);

  const approvedCount = meritSubjects.filter(subject => subject.currentGrade && subject.currentGrade !== "F").length;
  const failingCount = meritSubjects.filter(subject => subject.currentGrade === "F").length;
  const averagePoints = meritSubjects.length
    ? meritSubjects.reduce((sum, subject) => sum + subject.meritPoints, 0) / meritSubjects.length
    : 0;

  const improvementCandidates = meritSubjects
    .filter(subject => subject.currentGrade && subject.currentGrade !== "A")
    .map(subject => {
      const current = subject.currentGrade as FinalGradeLetter;
      const nextGrade = NEXT_GRADE[current] as FinalGradeLetter;
      const meritGain = FINAL_GRADE_POINTS[nextGrade] - FINAL_GRADE_POINTS[current];
      return {
        subject: subject.subject,
        currentGrade: current,
        nextGrade,
        meritGain,
        reason:
          subject.includedInBaseMerit || subject.countsAsLanguageBonus
            ? `Raises your merit by ${meritGain} points.`
            : "Could enter your best 16 if it overtakes a stronger subject.",
      };
    })
    .sort((a, b) => b.meritGain - a.meritGain || a.currentGrade.localeCompare(b.currentGrade))
    .slice(0, 6);

  const decliningSubjects = meritSubjects
    .map(subject => {
      const previous = previousSetGrade(subject);
      if (!previous || !subject.currentGrade || !subject.currentPeriod) return null;
      if (FINAL_GRADE_POINTS[subject.currentGrade] >= FINAL_GRADE_POINTS[previous.grade]) return null;
      return {
        subject: subject.subject,
        from: previous.grade,
        to: subject.currentGrade,
        period: subject.currentPeriod,
      };
    })
    .filter((subject): subject is NonNullable<typeof subject> => subject != null)
    .slice(0, 6);

  return {
    merit,
    maxMerit: 340,
    approvedCount,
    failingCount,
    averagePoints,
    gradeDistribution: distribution,
    subjects: meritSubjects,
    includedSubjects,
    languageBonusSubject,
    improvementCandidates,
    decliningSubjects,
  };
}
