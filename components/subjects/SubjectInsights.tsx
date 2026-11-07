'use client';

import { useState } from 'react';
import { ListChecks } from 'lucide-react';

import { useCachedResource } from '@/lib/cache';
import { fetchSubjectLink, fetchSubjectSection, subjectLinkKey } from '@/lib/cache/subjects';
import { subjectDate } from '@/lib/subjects/presentation';
import type { HolisticSubject, SubjectAssessment } from '@/lib/subjects/types';

import { AttendancePanel, CriteriaPanel, ResultsPanel } from './SubjectAssessment';
import { SubjectContentReveal } from './SubjectContentReveal';
import { AnimatedDisclosure } from './SubjectMotion';
import { SubjectWarning } from './SubjectWarning';

export function SubjectInsights({
  id,
  kind,
  currentIds,
  revision = 0,
}: {
  id: string;
  kind: 'results' | 'attendance' | 'warning';
  currentIds: Set<number>;
  revision?: number;
}) {
  return (
    <LinkedInsights
      key={`${id}:${revision}`}
      id={id}
      kind={kind}
      currentIds={currentIds}
      force={revision > 0}
    />
  );
}

function LinkedInsights({
  id,
  kind,
  currentIds,
  force,
}: {
  id: string;
  kind: 'results' | 'attendance' | 'warning';
  currentIds: Set<number>;
  force: boolean;
}) {
  const link = useCachedResource(subjectLinkKey(id), (refresh) =>
    fetchSubjectLink(id, force || refresh)
  );
  const holisticId = link.data?.subject.holisticAssessmentId;
  if (!holisticId) {
    if (kind !== 'results') return null;
    return (
      <section className="subject-panel p-5" aria-busy={link.loading}>
        <h2 className="font-semibold">Subject assessment</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          {link.loading
            ? 'Loading subject assessment separately from coursework...'
            : link.error
              ? 'Subject assessment could not be loaded.'
              : link.data?.assessmentLink === 'ambiguous'
                ? 'More than one subject record matches this room.'
                : 'No subject assessment record is available.'}
        </p>
        {link.error && (
          <button className="subject-action mt-3" onClick={() => link.refresh()}>
            Try again
          </button>
        )}
      </section>
    );
  }
  if (kind === 'warning') return <SubjectWarning id={id} holisticId={holisticId} force={force} />;
  return (
    <SubjectContentReveal className="space-y-6">
      {kind === 'results' && link.error && (
        <p className="text-muted-foreground text-sm" role="status">
          Showing saved subject details. Could not refresh.{' '}
          <button className="min-h-11 underline" onClick={() => link.refresh()}>
            Try again
          </button>
        </p>
      )}
      {kind === 'results' && link.data?.assessmentSummary && (
        <SubjectSummary summary={link.data.assessmentSummary} />
      )}
      <AssessmentSection
        id={id}
        holisticId={holisticId}
        section={kind === 'results' ? 'results' : 'attendance'}
        currentIds={currentIds}
        force={force}
      />
      {kind === 'results' && <LazyCriteria id={id} holisticId={holisticId} force={force} />}
    </SubjectContentReveal>
  );
}

function AssessmentSection({
  id,
  holisticId,
  section,
  currentIds,
  force,
}: {
  id: string;
  holisticId: number;
  section: 'results' | 'attendance';
  currentIds: Set<number>;
  force: boolean;
}) {
  const resource = useCachedResource(`subjects:section:${id}:${holisticId}:${section}`, (refresh) =>
    fetchSubjectSection(id, holisticId, section, force || refresh)
  );
  if (resource.loading)
    return (
      <div className="subject-panel p-5" role="status">
        Loading {section === 'results' ? 'published results' : 'attendance'}...
      </div>
    );
  const data = resource.data ?? { status: 'error' as const, data: null };
  return (
    <SubjectContentReveal>
      {resource.error && (
        <p className="text-muted-foreground mb-3 text-sm" role="status">
          Could not update {section}.{' '}
          <button className="min-h-11 underline" onClick={() => resource.refresh()}>
            Try again
          </button>
        </p>
      )}
      {section === 'attendance' ? (
        <AttendancePanel resource={data as SubjectAssessment['attendance']} />
      ) : (
        <ResultsPanel
          resource={data as SubjectAssessment['results']}
          roomId={id}
          currentIds={currentIds}
        />
      )}
    </SubjectContentReveal>
  );
}

function LazyCriteria({
  id,
  holisticId,
  force,
}: {
  id: string;
  holisticId: number;
  force: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <AnimatedDisclosure
      className="subject-panel"
      icon={ListChecks}
      title={<span className="font-semibold">Grading criteria</span>}
      onOpenChange={(value) => {
        if (value) setOpen(true);
      }}
    >
      {open && <LoadedCriteria id={id} holisticId={holisticId} force={force} />}
    </AnimatedDisclosure>
  );
}

function LoadedCriteria({
  id,
  holisticId,
  force,
}: {
  id: string;
  holisticId: number;
  force: boolean;
}) {
  const criteria = useCachedResource(`subjects:section:${id}:${holisticId}:criteria`, (refresh) =>
    fetchSubjectSection(id, holisticId, 'criteria', force || refresh)
  );
  const overview = useCachedResource(
    `subjects:section:${id}:${holisticId}:criteriaOverview`,
    (refresh) => fetchSubjectSection(id, holisticId, 'criteriaOverview', force || refresh)
  );
  if (criteria.loading || overview.loading)
    return (
      <p className="text-muted-foreground p-5 text-sm" role="status">
        Loading grading criteria...
      </p>
    );
  return (
    <>
      <CriteriaPanel
        embedded
        criteria={criteria.data ?? { status: 'error', data: null }}
        overview={overview.data ?? { status: 'error', data: null }}
      />
      {(criteria.error || overview.error) && (
        <button
          className="subject-action m-5"
          onClick={() => {
            criteria.refresh();
            overview.refresh();
          }}
        >
          Try again
        </button>
      )}
    </>
  );
}

function SubjectSummary({ summary }: { summary: HolisticSubject }) {
  return (
    <section className="subject-panel p-5" aria-labelledby="summary-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 id="summary-title" className="font-semibold">
          Subject assessment
        </h2>
        {summary.status.name && (
          <span className="text-muted-foreground text-xs">{summary.status.name}</span>
        )}
      </div>
      <p className="mt-3 text-sm">
        {summary.subTitle ||
          (summary.published ? 'Assessment published' : 'No assessment published yet.')}
      </p>
      {summary.published && (
        <>
          {summary.studentKnowledgeDevelopment &&
            summary.studentKnowledgeDevelopment !== summary.subTitle && (
              <p className="mt-3 text-sm font-medium">{summary.studentKnowledgeDevelopment}</p>
            )}
          {summary.formativeAssessment && (
            <div
              className="subject-copy mt-4 max-w-[75ch]"
              dangerouslySetInnerHTML={{ __html: summary.formativeAssessment }}
            />
          )}
          {summary.publishedAt && (
            <p className="text-muted-foreground mt-4 text-xs">
              Published {subjectDate(summary.publishedAt)}
            </p>
          )}
        </>
      )}
    </section>
  );
}
