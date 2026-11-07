export interface SubjectAttendance {
  lessons: number;
  attendance: number;
  absence: number;
  reportedAbsence: number;
  displayName: string;
  publishedAt: string;
}

export interface SubjectResult {
  id: number;
  activityId: number;
  name: string;
  type: string;
  review: string;
  points: string;
  formativeComment: string;
  assessedCriteria: { id: number; level: string }[];
}

export interface SubjectCriterion {
  id: number;
  name: string;
  gradeCriteriaSteps: {
    id: number;
    gradeStep: string;
    stepOrder: number;
    text: string;
    level: { label: string; level: string };
  }[];
}

export interface CriteriaOverview {
  gradeCriteriaOverview: { id: number; name: string; label: string; level: string }[];
  publishedAtInfo?: string | null;
  publishedAt?: string | null;
}

export type SubjectResource<T> =
  { status: 'available'; data: T } | { status: 'unavailable' | 'error'; data: null };

export interface SubjectAssessment {
  attendance: SubjectResource<SubjectAttendance>;
  results: SubjectResource<SubjectResult[]>;
  criteria: SubjectResource<{ gradeCriteria: SubjectCriterion[] }>;
  criteriaOverview: SubjectResource<CriteriaOverview>;
  warning: SubjectResource<SubjectWarning>;
}

export interface SubjectWarning {
  holisticAssessmentId: number;
  comment: string;
  active: boolean;
  published: boolean;
  lastUpdatedBy: string;
  lastUpdatedAt: string;
  createdAt: string;
  publishedAt: string;
  publishedAtDateString: string;
  updatedAtDateString: string;
}

export interface HolisticSubject {
  holisticAssessmentId: number;
  title: string;
  subTitle: string;
  status: { name: string; isOngoing: boolean };
  published: boolean;
  read: boolean;
  subjectWarning: boolean;
  subjectWarningComment: string;
  studentKnowledgeDevelopment: string;
  formativeAssessment: string;
  publishedAt: string;
  updatedAt: string;
}

export interface SubjectAssessmentLink {
  status: 'matched' | 'unmatched' | 'ambiguous' | 'unavailable' | 'error';
  subject: HolisticSubject | null;
}
