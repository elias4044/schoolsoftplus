export const GRADE_LETTERS = ["A", "B", "C", "D", "E", "F"] as const;

/** Swedish A–F mapped to a 0–20 scale for analytics */
export const GRADE_NUMERIC: Record<string, number> = {
  A: 20,
  B: 17.5,
  C: 15,
  D: 12.5,
  E: 10,
  F: 0,
};

export const DEFAULT_SETTINGS = {
  targetGrade: "C" as const,
  weightMode: "equal" as const,
  showEstimated: true,
  includeManual: true,
};

export const OVERALL_GRADE_STYLE: Record<
  string,
  { bg: string; color: string; border: string; glow: string }
> = {
  A: {
    bg: "oklch(0.65 0.22 278 / 18%)",
    color: "oklch(0.80 0.18 278)",
    border: "oklch(0.65 0.22 278 / 40%)",
    glow: "oklch(0.65 0.22 278 / 22%)",
  },
  B: {
    bg: "oklch(0.65 0.20 245 / 18%)",
    color: "oklch(0.78 0.17 245)",
    border: "oklch(0.65 0.20 245 / 40%)",
    glow: "oklch(0.65 0.20 245 / 22%)",
  },
  C: {
    bg: "oklch(0.65 0.18 210 / 18%)",
    color: "oklch(0.78 0.16 210)",
    border: "oklch(0.65 0.18 210 / 40%)",
    glow: "oklch(0.65 0.18 210 / 22%)",
  },
  D: {
    bg: "oklch(0.65 0.20 175 / 18%)",
    color: "oklch(0.75 0.18 175)",
    border: "oklch(0.65 0.20 175 / 40%)",
    glow: "oklch(0.65 0.20 175 / 22%)",
  },
  E: {
    bg: "oklch(0.65 0.22 148 / 18%)",
    color: "oklch(0.72 0.18 148)",
    border: "oklch(0.65 0.22 148 / 40%)",
    glow: "oklch(0.65 0.22 148 / 22%)",
  },
  F: {
    bg: "oklch(1 0 0 / 6%)",
    color: "oklch(0.55 0 0)",
    border: "oklch(1 0 0 / 12%)",
    glow: "oklch(1 0 0 / 8%)",
  },
};

export function gradeToNumeric(grade: string): number | null {
  const g = grade.trim().toUpperCase().charAt(0);
  return GRADE_NUMERIC[g] ?? null;
}

export function numericToGrade(n: number): string {
  if (n >= 18.75) return "A";
  if (n >= 16.25) return "B";
  if (n >= 13.75) return "C";
  if (n >= 11.25) return "D";
  if (n >= 5) return "E";
  return "F";
}

export function parseGradeFromReview(review: string): string | null {
  const t = review.trim();
  if (/^[A-F]$/i.test(t)) return t.toUpperCase();
  const m = t.match(/\b([A-F])\b/i);
  return m ? m[1].toUpperCase() : null;
}
