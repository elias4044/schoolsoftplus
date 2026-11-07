'use client';

import { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, BookOpen, ListChecks, RefreshCw } from 'lucide-react';

import { apiFetch } from '@/lib/api-client';
import { fetchCached, useCachedResource } from '@/lib/cache';
import { parseGradeFromReview } from '@/lib/grades/constants';
import { inferGrade } from '@/lib/grades/inferGrade';
import type { AssessedCriteria, AssessedCriteriaTab, PartialMoment } from '@/lib/grades/types';
import { subjectDate } from '@/lib/subjects/presentation';
import { AssignmentCriteria, CriteriaRows } from '@/components/grades/AssignmentCriteria';
import { AssignmentResultExperience } from '@/components/grades/AssignmentResultExperience';
import ShareConversationPicker from '@/components/ShareConversationPicker';
import { SubjectContentReveal } from '@/components/subjects/SubjectContentReveal';
import { AnimatedDisclosure } from '@/components/subjects/SubjectMotion';
import { SubjectLink as Link } from '@/components/subjects/SubjectNavigation';

interface AssignmentResponse {
  success: boolean;
  type: 'assignment' | 'planning';
  assignment: {
    id: number;
    title: string;
    subTitle?: string;
    description?: string;
    type?: string;
    status: string;
    endDate?: string;
    endTime?: string;
    publishDate?: string;
    subjectNames?: string;
    submissionStatus: string;
    resultReportStatus: string;
  };
  sections: Record<string, unknown>[];
  connectedPlannings: Record<string, unknown>[];
  assessment: {
    review: string;
    teacherComment: string;
    studentComment: string;
    partialMoments: PartialMoment[];
    assessedCriteriaTabs: AssessedCriteriaTab[];
  };
  grading: { availableColumns: Record<string, unknown>[]; selectedCriteria: AssessedCriteria[] };
}

function PointThing({ moments }: { moments: PartialMoment[] }) {
  return (
    <div className="space-y-5">
      {moments.map((moment, index) => {
        const ratio = moment.max > 0 ? Math.max(0, Math.min(1, moment.points / moment.max)) : 0;
        return (
          <div key={moment.id ?? index}>
            <div className="mb-2 flex items-center justify-between gap-4 text-sm">
              <span>{moment.name}</span>
              <span className="tabular-nums">
                {moment.points} / {moment.max} points
              </span>
            </div>
            <div
              className="bg-secondary h-2 overflow-hidden rounded-full"
              role="meter"
              aria-label={moment.name}
              aria-valuemin={0}
              aria-valuemax={Math.max(moment.max, moment.points, 1)}
              aria-valuenow={Math.max(0, moment.points)}
            >
              <div
                className="subject-fill h-full w-full bg-[var(--subject-data)]"
                style={{ transform: `scaleX(${ratio})` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AssignmentDetailPage() {
  const { id: roomId, assignementId: id } = useParams<{ id: string; assignementId: string }>();
  const type = useSearchParams().get('type') === 'planning' ? 'planning' : 'assignment';
  return <AssignmentDetail key={`${roomId}:${id}:${type}`} roomId={roomId} id={id} type={type} />;
}

function AssignmentDetail({
  roomId,
  id,
  type,
}: {
  roomId: string;
  id: string;
  type: 'assignment' | 'planning';
}) {
  const { data, loading, refreshing, error, refresh } = useCachedResource(
    `subjects:assignment:${type}:${id}`,
    (force) =>
      fetchCached(
        `subjects:assignment:${type}:${id}`,
        60_000,
        async () => {
          const response = await apiFetch<AssignmentResponse>(`/api/assignment/${id}`, {
            params: { type, refresh: force ? '1' : undefined },
          });
          if (!response.success) throw new Error('Invalid assignment response');
          return response;
        },
        force
      )
  );
  const [sharing, setSharing] = useState(false);

  const assignment = data?.assignment;
  const assessment = data?.assessment;
  const moments =
    assessment?.partialMoments.filter(
      (moment) => Number.isFinite(moment.points) && Number.isFinite(moment.max)
    ) ?? [];
  const totalPoints = moments.reduce((sum, moment) => sum + moment.points, 0);
  const totalMax = moments.reduce((sum, moment) => sum + moment.max, 0);
  const reportedGrade = parseGradeFromReview(assessment?.review ?? '');
  const estimate = reportedGrade
    ? null
    : inferGrade(moments, assessment?.assessedCriteriaTabs ?? []);
  const grade = reportedGrade ?? estimate?.grade ?? null;
  const hasAssessment =
    assessment &&
    (assignment?.resultReportStatus === 'REPORTED' ||
      assessment.review ||
      assessment.teacherComment ||
      assessment.studentComment ||
      moments.length > 0 ||
      assessment.assessedCriteriaTabs.some((tab) => tab.assessedCriteria?.length));
  const selectedCriteria =
    data?.grading.selectedCriteria
      .flat(Infinity)
      .filter((criterion) => criterion && !Array.isArray(criterion) && criterion.level) ?? [];

  const resultVersion = JSON.stringify([
    assignment?.id,
    assignment?.resultReportStatus,
    assessment?.review,
    assessment?.teacherComment,
    moments,
    assessment?.assessedCriteriaTabs,
  ]);

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      <nav
        aria-label="Breadcrumb"
        className="text-muted-foreground mb-5 flex min-h-11 flex-wrap items-center gap-3 text-sm"
      >
        <Link href="/subjects">Subjects</Link>
        <span aria-hidden="true">/</span>
        <Link className="inline-flex items-center gap-2" href={`/subjects/${roomId}`}>
          <ArrowLeft className="size-3.5" />
          {assignment?.subjectNames || 'Subject room'}
        </Link>
      </nav>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl leading-snug font-semibold tracking-tight">
            {assignment?.title || (loading ? 'Loading coursework...' : 'Coursework')}
          </h1>
          {assignment?.subTitle && (
            <p className="text-muted-foreground mt-2 text-sm">{assignment.subTitle}</p>
          )}
          <p className="text-muted-foreground mt-2 text-sm">
            {assignment?.type || (type === 'planning' ? 'Planning' : 'Assignment')}
          </p>
        </div>
        <button
          className="subject-action shrink-0"
          disabled={refreshing}
          onClick={() => {
            refresh();
          }}
          aria-label="Refresh coursework"
        >
          <RefreshCw className="size-4" />
        </button>
      </header>
      {loading && (
        <div aria-label="Loading coursework" className="space-y-4">
          <div className="bg-card h-24 rounded-xl" />
          <div className="bg-card h-72 rounded-xl" />
        </div>
      )}
      {error && (
        <div className="subject-panel p-8 text-center" role="alert">
          Could not load this coursework. Refresh to try again.
        </div>
      )}
      {data && assignment && assessment && (
        <SubjectContentReveal>
          {hasAssessment && (
            <AssignmentResultExperience
              key={resultVersion}
              published={assignment.resultReportStatus === 'REPORTED'}
              grade={grade}
              estimate={estimate}
              review={assessment.review}
              teacherComment={assessment.teacherComment}
              studentComment={assessment.studentComment}
              points={totalPoints}
              maximum={totalMax}
              onShare={() => setSharing(true)}
              breakdown={moments.length > 0 ? <PointThing moments={moments} /> : undefined}
              criteria={
                assessment.assessedCriteriaTabs.some((tab) => tab.assessedCriteria?.length) ? (
                  <AssignmentCriteria tabs={assessment.assessedCriteriaTabs} />
                ) : selectedCriteria.length > 0 ? (
                  <CriteriaRows criteria={selectedCriteria} />
                ) : undefined
              }
            />
          )}
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0 space-y-6">
              <section className="subject-panel p-5" aria-labelledby="description-title">
                <h2 id="description-title" className="mb-4 font-semibold">
                  {type === 'planning' ? 'Planning' : 'Assignment brief'}
                </h2>
                {assignment.description ? (
                  <div
                    className="subject-copy max-w-[75ch]"
                    dangerouslySetInnerHTML={{ __html: assignment.description }}
                  />
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No description has been published.
                  </p>
                )}
              </section>
              {data.sections.length > 0 && (
                <section className="subject-panel" aria-labelledby="content-title">
                  <h2 id="content-title" className="p-5 font-semibold">
                    Course content
                  </h2>
                  <div className="divide-border divide-y">
                    {data.sections.map((section, index) => (
                      <AnimatedDisclosure
                        key={String(section.id ?? index)}
                        icon={BookOpen}
                        title={
                          <>
                            {String(
                              section.title ||
                                section.name ||
                                (
                                  {
                                    CENTRALCONTENT: 'Central content',
                                    SUBJECTDESCRIPTION: 'Subject description',
                                    GRADECRITERIA: 'Grading criteria',
                                    RESULTREPORT: 'Result report',
                                  } as Record<string, string>
                                )[String(section.type)] ||
                                'Content'
                            )}
                          </>
                        }
                      >
                        <div
                          className="subject-copy p-5"
                          dangerouslySetInnerHTML={{
                            __html: String(
                              section.description ||
                                section.content ||
                                'No additional text available.'
                            ),
                          }}
                        />
                      </AnimatedDisclosure>
                    ))}
                  </div>
                </section>
              )}
              {(selectedCriteria.length > 0 || data.grading.availableColumns.length > 0) && (
                <AnimatedDisclosure
                  className="subject-panel"
                  title="Grading details"
                  icon={ListChecks}
                >
                  {selectedCriteria.length > 0 && <CriteriaRows criteria={selectedCriteria} />}
                  {data.grading.availableColumns.length > 0 && (
                    <div className="p-5">
                      <h3 className="mb-3 text-sm font-medium">Assessment categories</h3>
                      <p className="text-muted-foreground text-sm">
                        {data.grading.availableColumns
                          .map((column) => String(column.name || column.label || column.id))
                          .join(', ')}
                      </p>
                    </div>
                  )}
                </AnimatedDisclosure>
              )}
            </div>
            <aside className="min-w-0 space-y-6">
              <section className="subject-panel p-5" aria-labelledby="details-title">
                <h2 id="details-title" className="mb-5 font-semibold">
                  Details
                </h2>
                <dl className="space-y-5 text-sm">
                  <div>
                    <dt className="text-muted-foreground mb-1">Due date</dt>
                    <dd>
                      {subjectDate(assignment.endDate)}
                      {assignment.endTime && assignment.endTime !== '00:00'
                        ? ` at ${assignment.endTime}`
                        : ''}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground mb-1">Status</dt>
                    <dd>
                      {(
                        { ONGOING: 'Open', UPCOMING: 'Upcoming', EXPIRED: 'Past' } as Record<
                          string,
                          string
                        >
                      )[assignment.status] ?? 'Not available'}
                    </dd>
                  </div>
                  {type !== 'planning' && (
                    <>
                      <div>
                        <dt className="text-muted-foreground mb-1">Submission</dt>
                        <dd>
                          {(
                            {
                              SUBMITTED: 'Submitted',
                              LATE: 'Submitted late',
                              NO_STATUS: 'No submission recorded',
                            } as Record<string, string>
                          )[assignment.submissionStatus] ?? assignment.submissionStatus}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground mb-1">Result</dt>
                        <dd>
                          {assignment.resultReportStatus === 'REPORTED'
                            ? 'Published'
                            : 'Not published'}
                        </dd>
                      </div>
                    </>
                  )}
                  {assignment.publishDate && (
                    <div>
                      <dt className="text-muted-foreground mb-1">Published</dt>
                      <dd>{subjectDate(assignment.publishDate)}</dd>
                    </div>
                  )}
                </dl>
              </section>
              {data.connectedPlannings.length > 0 && (
                <section className="subject-panel p-5" aria-labelledby="planning-title">
                  <h2 id="planning-title" className="mb-4 font-semibold">
                    Connected planning
                  </h2>
                  <ul className="space-y-4">
                    {data.connectedPlannings.map((planning, index) => (
                      <li key={String(planning.id ?? index)}>
                        {planning.id || planning.planningId ? (
                          <Link
                            className="text-sm underline underline-offset-4"
                            href={`/subjects/${roomId}/${planning.planningId ?? planning.id}?type=planning`}
                          >
                            {String(planning.title || planning.name || 'Planning')}
                          </Link>
                        ) : (
                          <p className="text-sm">
                            {String(planning.title || planning.name || 'Planning')}
                          </p>
                        )}
                        {Boolean(planning.endDate) && (
                          <p className="text-muted-foreground mt-1 text-xs">
                            {subjectDate(String(planning.endDate))}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </aside>
          </div>
        </SubjectContentReveal>
      )}
      {sharing && assignment && (
        <ShareConversationPicker
          card={{
            type: 'grade',
            assignmentId: assignment.id,
            assignmentTitle: assignment.title,
            subjectName: assignment.subjectNames,
            grade: reportedGrade ?? undefined,
          }}
          onClose={() => setSharing(false)}
        />
      )}
    </div>
  );
}
