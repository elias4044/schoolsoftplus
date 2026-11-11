export interface AssessmentSummary {
  id: number;
  activityId: number;
  title: string;
  subTitle: string;
  read: boolean;
}

export interface AssignmentSummary extends AssessmentSummary {
  submissionStatus: string;
  resultReportStatus: string;
  sortDate: string;
}

export interface BookingSummary {
  id: number;
  name: string;
  fromDate: string;
  toDate: string;
  read: boolean;
}
