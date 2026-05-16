export interface PartialMoment {
  id?: number;
  name: string;
  points: number;
  max: number;
}

export interface CriteriaLevel {
  levelEnum: string;
  value: number;
  description: string;
}

export interface CriteriaStep {
  gradeCriteriaGroupId: number;
  text: string;
  level: CriteriaLevel;
}

export interface AssessedCriteria {
  level: CriteriaLevel;
  steps: CriteriaStep[];
}

export interface CriteriaTabContent {
  type: string;
  id: number;
  typeId: number;
  name: string;
}

export interface AssessedCriteriaTab {
  content: CriteriaTabContent;
  assessedCriteria: AssessedCriteria[];
}

export interface GradeInference {
  grade: string;
  confidence: "confirmed" | "estimated";
  source: "points" | "criteria";
}

export type GradeLetter = "A" | "B" | "C" | "D" | "E" | "F";

export interface GradeTrackerSettings {
  targetGrade: GradeLetter;
  weightMode: "equal" | "recent";
  showEstimated: boolean;
  includeManual: boolean;
}

export interface GradeEntry {
  id: string;
  assignmentId?: number;
  title: string;
  type: string;
  endDate: string;
  source: "scanned" | "manual";
  reported: boolean;
  review?: string;
  grade: string;
  estimatedGrade?: string;
  confidence?: "confirmed" | "estimated";
  gradeSource?: "points" | "criteria" | "review" | "manual";
  totalPoints?: string;
  pointsPct?: number;
  excluded: boolean;
  notes?: string;
  customWeight?: number;
  userOverride: boolean;
  scannedAt: number;
  updatedAt: number;
}

export interface GradeSnapshot {
  at: number;
  averageNumeric: number;
  entryCount: number;
  grades: { id: string; grade: string }[];
}

export interface GradeTrackerDoc {
  username: string;
  subjectId: number;
  subjectName: string;
  subjectColor?: string;
  settings: GradeTrackerSettings;
  entries: GradeEntry[];
  snapshots: GradeSnapshot[];
  updatedAt: number;
}

export interface ScannedGradeResult {
  assignmentId: number;
  title: string;
  type: string;
  endDate: string;
  reported: boolean;
  review: string;
  estimatedGrade?: string;
  confidence?: "confirmed" | "estimated";
  gradeSource?: "points" | "criteria" | "review";
  grade: string;
  totalPoints?: string;
  pointsPct?: number;
}
