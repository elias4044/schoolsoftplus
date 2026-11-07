'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ListChecks, MessageSquareText } from 'lucide-react';

import { criterionLabel } from '@/lib/subjects/presentation';
import type {
  SubjectAssessment as Assessment,
  SubjectResource,
  SubjectResult,
} from '@/lib/subjects/types';

import { AnimatedDisclosure } from './SubjectMotion';

function ResourceNotice({
  resource,
  empty,
}: {
  resource: SubjectResource<unknown>;
  empty: string;
}) {
  return (
    <p className="text-muted-foreground px-5 py-5 text-sm">
      {resource.status === 'error'
        ? 'SchoolSoft could not load this section. Refresh to try again.'
        : empty}
    </p>
  );
}

export function AttendancePanel({ resource }: { resource: Assessment['attendance'] }) {
  const attendance = resource.data;
  const valid =
    attendance &&
    [
      attendance.attendance,
      attendance.absence,
      attendance.reportedAbsence,
      attendance.lessons,
    ].every(Number.isFinite);
  const segments = valid
    ? [
        { label: 'Present', value: attendance.attendance, color: 'var(--subject-data)' },
        { label: 'Absent', value: attendance.absence, color: 'var(--muted-foreground)' },
        {
          label: 'Reported absence',
          value: attendance.reportedAbsence,
          color: 'var(--border-strong)',
        },
      ]
    : [];
  return (
    <section className="subject-panel" aria-labelledby="attendance-title">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5">
        <h2 id="attendance-title" className="font-semibold">
          Attendance
        </h2>
        <span className="text-muted-foreground text-xs">Current school year</span>
      </div>
      {!valid ? (
        <ResourceNotice resource={resource} empty="Attendance is not available for this subject." />
      ) : (
        <div className="p-5">
          <p className="text-3xl tabular-nums">
            {attendance.attendance.toLocaleString('en-GB', { maximumFractionDigits: 1 })}
            <span className="text-muted-foreground ml-1 text-base">% present</span>
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {attendance.lessons} lessons recorded
          </p>
          <div
            className="bg-secondary my-5 flex h-3 overflow-hidden rounded-full"
            role="img"
            aria-label={segments.map((s) => `${s.label}: ${s.value}%`).join(', ')}
          >
            {segments.map((segment) => (
              <span
                key={segment.label}
                style={{
                  width: `${Math.max(0, Math.min(100, segment.value))}%`,
                  background: segment.color,
                }}
              />
            ))}
          </div>
          <dl className="space-y-2 text-sm">
            {segments.map((segment) => (
              <div key={segment.label} className="flex items-center justify-between gap-4">
                <dt className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: segment.color }} />
                  {segment.label}
                </dt>
                <dd className="tabular-nums">
                  {segment.value.toLocaleString('en-GB', { maximumFractionDigits: 1 })}%
                </dd>
              </div>
            ))}
          </dl>
          {attendance.publishedAt && (
            <p className="text-muted-foreground mt-5 text-xs leading-relaxed">
              {attendance.publishedAt}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export function ResultsPanel({
  resource,
  roomId,
  currentIds,
}: {
  resource: Assessment['results'];
  roomId: string;
  currentIds: Set<number>;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const results = resource.data ?? [];
  const current = results.filter((result) => currentIds.has(result.id));
  const history = results.filter((result) => !currentIds.has(result.id));
  const visible = showHistory ? results : current;
  return (
    <section className="subject-panel" aria-labelledby="results-title">
      <div className="flex flex-wrap items-center justify-between gap-2 p-5 pb-3">
        <h2 id="results-title" className="font-semibold">
          Published results{' '}
          <span className="text-muted-foreground ml-1 font-normal tabular-nums">
            {visible.length}
          </span>
        </h2>
        {history.length > 0 && (
          <button
            className="subject-action"
            onClick={() => setShowHistory((value) => !value)}
            aria-pressed={showHistory}
          >
            {showHistory ? 'Current room' : `Other results (${history.length})`}
          </button>
        )}
      </div>
      {resource.status !== 'available' ? (
        <ResourceNotice resource={resource} empty="No published results are available." />
      ) : visible.length === 0 ? (
        <p className="text-muted-foreground px-5 pb-5 text-sm">
          No results match this subject room yet.
          {history.length > 0 ? ' Other results are available above.' : ''}
        </p>
      ) : (
        <div className="divide-border divide-y">
          {visible.map((result) => (
            <ResultRow
              key={`${result.activityId}:${result.id}`}
              result={result}
              roomId={roomId}
              historical={!currentIds.has(result.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ResultRow({
  result,
  roomId,
  historical,
}: {
  result: SubjectResult;
  roomId: string;
  historical: boolean;
}) {
  return (
    <article className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            className="font-medium underline-offset-4 hover:underline"
            href={`/subjects/${historical ? result.activityId : roomId}/${result.id}?type=assignment`}
          >
            {result.name}
          </Link>
          <p className="text-muted-foreground mt-1 text-xs">
            {result.type}
            {historical ? ' / Other subject room' : ''}
          </p>
        </div>
        <div className="shrink-0 text-right text-sm">
          <p>{result.review}</p>
          {result.points && <p className="tabular-nums">{result.points} points</p>}
        </div>
      </div>
      {result.assessedCriteria.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {Array.from(new Set(result.assessedCriteria.map((c) => c.level))).map((level) => (
            <span key={level} className="bg-secondary rounded-md px-2 py-1 text-xs">
              {criterionLabel(level)}
            </span>
          ))}
        </div>
      )}
      {result.formativeComment && (
        <AnimatedDisclosure className="mt-3" title="Teacher feedback" icon={MessageSquareText}>
          <div
            className="subject-copy"
            dangerouslySetInnerHTML={{ __html: result.formativeComment }}
          />
        </AnimatedDisclosure>
      )}
    </article>
  );
}

export function CriteriaPanel({
  criteria,
  overview,
  embedded = false,
}: {
  criteria: Assessment['criteria'];
  overview: Assessment['criteriaOverview'];
  embedded?: boolean;
}) {
  const rows = criteria.data?.gradeCriteria ?? [];
  const summaries = overview.data?.gradeCriteriaOverview ?? [];
  return (
    <section className={embedded ? '' : 'subject-panel'} aria-labelledby="criteria-title">
      <div className="p-5">
        <h2 id="criteria-title" className="font-semibold">
          Grading criteria
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          The knowledge your teacher assesses. These are not a predicted final grade.
        </p>
      </div>
      {overview.status === 'error' && (
        <p role="status" className="text-muted-foreground px-5 pb-4 text-sm">
          The overall assessment could not be loaded. Refresh to try again.
        </p>
      )}
      {rows.length === 0 && summaries.length === 0 ? (
        <ResourceNotice
          resource={
            criteria.status === 'error'
              ? criteria
              : overview.status === 'error'
                ? overview
                : criteria
          }
          empty="Grading criteria have not been published for this subject."
        />
      ) : (
        <div className="divide-border divide-y">
          {(rows.length > 0
            ? rows
            : summaries.map((row) => ({ ...row, gradeCriteriaSteps: [] }))
          ).map((row) => {
            const summary = summaries.find((item) => item.id === row.id);
            return (
              <AnimatedDisclosure
                key={row.id}
                icon={ListChecks}
                title={
                  <>
                    <span className="leading-relaxed">{row.name}</span>
                    <span className="text-muted-foreground mt-1 block text-xs">
                      {summary?.label ||
                        (summary?.level
                          ? criterionLabel(summary.level)
                          : overview.status === 'error'
                            ? 'Overall assessment could not be loaded'
                            : 'No overall assessment published')}
                    </span>
                  </>
                }
              >
                <div className="space-y-5 p-5">
                  {row.gradeCriteriaSteps.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Detailed criteria are not available.
                    </p>
                  ) : (
                    [...row.gradeCriteriaSteps]
                      .sort((a, b) => a.stepOrder - b.stepOrder)
                      .map((step) => (
                        <div
                          key={`${step.id}:${step.gradeStep}`}
                          className="grid grid-cols-[28px_1fr] gap-3"
                        >
                          <span className="text-lg tabular-nums">{step.gradeStep}</span>
                          <div>
                            <div
                              className="subject-copy"
                              dangerouslySetInnerHTML={{ __html: step.text }}
                            />
                            <p className="text-muted-foreground mt-2 text-xs">
                              {step.level.label || criterionLabel(step.level.level)}
                            </p>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </AnimatedDisclosure>
            );
          })}
        </div>
      )}
      {overview.data?.publishedAtInfo && (
        <p className="text-muted-foreground px-5 py-4 text-xs">{overview.data.publishedAtInfo}</p>
      )}
    </section>
  );
}
