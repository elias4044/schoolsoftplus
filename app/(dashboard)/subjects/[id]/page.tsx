'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, RefreshCw, Search } from 'lucide-react';

import { useCachedResource } from '@/lib/cache';
import { fetchSubjectCoursework, subjectCourseworkKey } from '@/lib/cache/subjects';
import { subjectDate } from '@/lib/subjects/presentation';
import { GradeTracker } from '@/components/grades/GradeTracker';
import { ResultPublishedBadge } from '@/components/subjects/ResultPublishedBadge';
import { SubjectContentReveal } from '@/components/subjects/SubjectContentReveal';
import { SubjectInsights } from '@/components/subjects/SubjectInsights';
import { SubjectLink as Link } from '@/components/subjects/SubjectNavigation';

export default function SubjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <SubjectDetail key={id} id={id} />;
}

function SubjectDetail({ id }: { id: string }) {
  const { data, loading, refreshing, error, refresh } = useCachedResource(
    subjectCourseworkKey(id),
    (force) => fetchSubjectCoursework(id, force)
  );
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('active');

  const tasks = data?.assignments.filter((item) => item.entityType === 'ASSIGNMENT') ?? [];
  const active = tasks.filter((item) => item.status === 'ONGOING' || item.status === 'UPCOMING');
  const planning = data?.assignments.filter((item) => item.entityType === 'PLANNING') ?? [];
  const filtered = (filter === 'planning' ? planning : filter === 'active' ? active : tasks)
    .filter((item) => `${item.title} ${item.type}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) =>
      filter === 'active' ? a.endDate.localeCompare(b.endDate) : b.endDate.localeCompare(a.endDate)
    );

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <Link
          href="/subjects"
          className="text-muted-foreground inline-flex min-h-11 items-center gap-2 text-sm"
        >
          <ArrowLeft className="size-4" />
          All subjects
        </Link>
        <a className="subject-action" href={`#grade-tracker-${id}`}>
          Grade tracker
        </a>
      </div>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {data?.subject.subject ?? 'Subject'}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {data?.subject.groupNames?.join(', ') || 'Assignments, feedback and progress'}
          </p>
        </div>
        <button
          className="subject-action shrink-0"
          disabled={refreshing}
          onClick={() => {
            refresh();
            setRevision((value) => value + 1);
          }}
        >
          <RefreshCw className="size-4" />
          <span className="hidden sm:inline">Refresh</span>
          <span className="sr-only sm:hidden">Refresh subject</span>
        </button>
      </header>
      <SubjectInsights id={id} kind="warning" currentIds={new Set()} revision={revision} />
      {loading && (
        <div aria-label="Loading subject" className="space-y-4">
          <div className="bg-card h-24 rounded-xl" />
          <div className="bg-card h-64 rounded-xl" />
        </div>
      )}
      {!loading && !data && (
        <div className="subject-panel p-8 text-center" role="alert">
          <p>Could not load this subject. Refresh to try again.</p>
        </div>
      )}
      {data && (
        <SubjectContentReveal>
          <div className="border-border mb-6 grid grid-cols-3 gap-4 border-y py-5">
            {[
              { label: 'Open assignments', value: active.length },
              {
                label: 'Published results',
                value: tasks.filter((task) => task.resultReportStatus === 'REPORTED').length,
              },
              { label: 'Planning', value: planning.length },
            ].map((metric) => (
              <div key={metric.label}>
                <p className="text-muted-foreground text-xs sm:text-sm">{metric.label}</p>
                <p className="mt-2 text-2xl tabular-nums">{metric.value ?? '--'}</p>
              </div>
            ))}
          </div>
          {error && (
            <p role="alert" className="text-muted-foreground mb-5 text-sm">
              Some subject information could not be loaded. Refresh to try again.
            </p>
          )}
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-6">
              <section className="subject-panel" aria-labelledby="work-title">
                <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <h2 id="work-title" className="font-semibold">
                    Coursework
                  </h2>
                  <span className="text-muted-foreground text-sm">{filtered.length} shown</span>
                </div>
                <div className="flex flex-wrap gap-2 px-5 pb-4">
                  {[
                    { id: 'active', label: 'Open' },
                    { id: 'all', label: 'All assignments' },
                    { id: 'planning', label: 'Planning' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      className="subject-action"
                      aria-pressed={filter === option.id}
                      onClick={() => setFilter(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="relative mx-5 mb-3">
                  <Search className="text-muted-foreground absolute top-3.5 left-3 size-4" />
                  <input
                    aria-label="Search coursework"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search coursework"
                    className="border-border bg-background h-11 w-full rounded-lg border pr-3 pl-9 text-sm"
                  />
                </div>
                <div className="divide-border divide-y">
                  {filtered.length === 0 ? (
                    <p className="text-muted-foreground p-5 text-sm">
                      {query
                        ? 'No coursework matches your search.'
                        : filter === 'active'
                          ? 'No open assignments. View all assignments for earlier work.'
                          : 'No coursework is available here yet.'}
                    </p>
                  ) : (
                    filtered.map((item) => (
                      <Link
                        key={`${item.entityType}:${item.id}`}
                        className="subject-row flex items-start gap-3 p-5"
                        href={`/subjects/${id}/${item.id}?type=${item.entityType.toLowerCase()}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="min-w-0 flex-1 leading-relaxed font-medium">
                              {item.title}
                              {item.read === false && (
                                <span
                                  className="bg-foreground ml-2 inline-block size-1.5 rounded-full"
                                  aria-label="Unread"
                                />
                              )}
                            </p>
                            {item.resultReportStatus === 'REPORTED' && <ResultPublishedBadge />}
                          </div>
                          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                            {item.type} / {subjectDate(item.endDate)}
                            {item.submissionStatus === 'SUBMITTED' ? ' / Submitted' : ''}
                          </p>
                        </div>
                        <ArrowUpRight className="text-muted-foreground mt-1 size-4 shrink-0" />
                      </Link>
                    ))
                  )}
                </div>
              </section>
              <SubjectInsights
                id={id}
                kind="results"
                currentIds={new Set(tasks.map((task) => task.id))}
                revision={revision}
              />
            </div>
            <aside className="min-w-0 space-y-6">
              <GradeTracker
                subjectId={id}
                subjectName={data.subject.subject}
                subjectColor={data.subject.color ?? 'var(--subject-data)'}
                variant="sidebar"
                refreshKey={revision}
              />
              <SubjectInsights
                id={id}
                kind="attendance"
                currentIds={new Set(tasks.map((task) => task.id))}
                revision={revision}
              />
            </aside>
          </div>
        </SubjectContentReveal>
      )}
    </div>
  );
}
