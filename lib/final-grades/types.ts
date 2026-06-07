export type FinalGradeLetter = "A" | "B" | "C" | "D" | "E" | "F";

export interface FinalGradeCell {
  period: string;
  grade: FinalGradeLetter | null;
  isPreviousTerm: boolean;
  raw: string;
}

export interface FinalGradeSubject {
  id: string;
  subject: string;
  grades: FinalGradeCell[];
  comment: string;
  manual: boolean;
}

export interface FinalGradesDoc {
  username: string;
  subjects: FinalGradeSubject[];
  updatedAt: number;
}

export interface MeritSubject extends FinalGradeSubject {
  currentGrade: FinalGradeLetter | null;
  currentPeriod: string | null;
  meritPoints: number;
  countsAsLanguageBonus: boolean;
  includedInBaseMerit: boolean;
}

export interface FinalGradesInsights {
  merit: number;
  maxMerit: number;
  approvedCount: number;
  failingCount: number;
  averagePoints: number;
  gradeDistribution: Record<FinalGradeLetter, number>;
  subjects: MeritSubject[];
  includedSubjects: MeritSubject[];
  languageBonusSubject: MeritSubject | null;
  improvementCandidates: {
    subject: string;
    currentGrade: FinalGradeLetter;
    nextGrade: FinalGradeLetter;
    meritGain: number;
    reason: string;
  }[];
  decliningSubjects: {
    subject: string;
    from: FinalGradeLetter;
    to: FinalGradeLetter;
    period: string;
  }[];
}
