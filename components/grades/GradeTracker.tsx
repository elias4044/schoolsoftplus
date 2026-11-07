'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ChartNoAxesCombined, ListChecks, Plus, Save, Scan, Settings2 } from 'lucide-react';

import { apiFetch } from '@/lib/api-client';
import { useCachedResource, writeCache } from '@/lib/cache';
import { fetchGradeTracker, gradeTrackerKey } from '@/lib/cache/grade-tracker';
import { computeAnalytics } from '@/lib/grades/analytics';
import { GRADE_LETTERS } from '@/lib/grades/constants';
import { createManualEntry, updateGradeEntry } from '@/lib/grades/entries';
import type { GradeEntry, GradeTrackerDoc, ScannedGradeResult } from '@/lib/grades/types';
import { subjectDate } from '@/lib/subjects/presentation';
import { AnimatedDisclosure, AnimatedPanel } from '@/components/subjects/SubjectMotion';
import { SubjectSelect } from '@/components/subjects/SubjectSelect';

import { GradeSummary } from './GradeSummary';

const TrackerCharts = dynamic(() => import('./TrackerCharts'), {
  loading: () => <p className="text-muted-foreground py-5 text-sm">Loading chart...</p>,
});

interface GradeTrackerProps {
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  variant?: 'sidebar' | 'mobile';
  refreshKey?: number;
}

export function GradeTracker(props: GradeTrackerProps) {
  return <Tracker key={`${props.subjectId}:${props.refreshKey ?? 0}`} {...props} />;
}

function Tracker({ subjectId, subjectName, subjectColor, refreshKey = 0 }: GradeTrackerProps) {
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const resource = useCachedResource(gradeTrackerKey(subjectId), (force) =>
    fetchGradeTracker(subjectId, force || refreshKey > 0)
  );
  const [edited, setEdited] = useState<GradeTrackerDoc | null>(null);
  const empty: GradeTrackerDoc = useMemo(
    () => ({
      userId: '',
      subjectId: Number(subjectId),
      subjectName,
      subjectColor,
      settings: { targetGrade: 'C', weightMode: 'equal', showEstimated: true, includeManual: true },
      entries: [],
      snapshots: [],
      updatedAt: 0,
    }),
    [subjectId, subjectName, subjectColor]
  );
  const tracker =
    edited && (!resource.data || edited.updatedAt >= resource.data.updatedAt)
      ? edited
      : (resource.data ?? empty);
  const analytics = useMemo(() => computeAnalytics(tracker.entries, tracker.settings), [tracker]);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [title, setTitle] = useState('');
  const [grade, setGrade] = useState('C');
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const busy = saving || scanning || resource.refreshing;

  async function persist(patch: {
    entries?: GradeEntry[];
    settings?: GradeTrackerDoc['settings'];
    scanned?: ScannedGradeResult[];
    addSnapshot?: boolean;
  }) {
    setSaving(true);
    setMessage('');
    try {
      const response = await apiFetch<{ success: boolean; tracker: GradeTrackerDoc }>(
        `/api/grade-tracker/${subjectId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ subjectName, subjectColor, ...patch }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      if (!response.success || !response.tracker) throw new Error('Could not save your changes.');
      if (!active.current) return false;
      writeCache(gradeTrackerKey(subjectId), response.tracker);
      setEdited(response.tracker);
      setMessage('Saved');
      return true;
    } catch {
      setMessage('Could not save your changes. Try again.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function scan() {
    setScanning(true);
    setMessage('');
    try {
      const response = await apiFetch<{
        success: boolean;
        grades: ScannedGradeResult[];
        skipped?: number;
      }>(`/api/subjects/${subjectId}/grades`, { method: 'POST' });
      if (!response.success || !Array.isArray(response.grades))
        throw new Error('Invalid scan response');
      if (!active.current) return;
      if (await persist({ scanned: response.grades, addSnapshot: true })) {
        setMessage(
          `${response.grades.length} results imported${response.skipped ? `; ${response.skipped} could not be loaded` : ''}.`
        );
      }
    } catch {
      setMessage('Results could not be imported. Try again or add an entry.');
    } finally {
      setScanning(false);
    }
  }

  async function handleAddEntry(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || busy) return;
    const entry = createManualEntry(title, grade, date);
    if (await persist({ entries: [entry, ...tracker.entries], addSnapshot: true })) {
      setTitle('');
      setShowAdd(false);
    }
  }

  async function updateEntry(entry: GradeEntry, patch: Partial<GradeEntry>) {
    await persist({
      entries: tracker.entries.map((row) =>
        row.id === entry.id ? updateGradeEntry(row, patch) : row
      ),
    });
  }

  const fieldClass = 'border-border bg-background min-h-11 w-full rounded-lg border px-3 text-sm';
  return (
    <section
      id={`grade-tracker-${subjectId}`}
      className="subject-panel grade-tracker"
      aria-label="Grade tracker"
    >
      <header className="flex items-start justify-between gap-3 p-5 pb-4">
        <div>
          <h2 className="font-semibold">Grade tracker</h2>
          <p className="text-muted-foreground mt-1 text-xs">Your personal progress</p>
        </div>
        <button
          className="subject-action"
          aria-label="Grade tracker settings"
          aria-expanded={showSettings}
          onClick={() => setShowSettings((value) => !value)}
        >
          <Settings2 className="size-4" />
        </button>
      </header>
      {resource.loading && !edited ? (
        <div className="px-5 pb-5" role="status">
          <div className="bg-secondary h-12 rounded" />
          <p className="text-muted-foreground mt-3 text-sm">Loading saved grades...</p>
        </div>
      ) : resource.error && !resource.data && !edited ? (
        <div className="p-5 pt-0" role="alert">
          <p className="text-sm">Your saved grades could not be loaded.</p>
          <button className="subject-action mt-3" onClick={() => resource.refresh()}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="px-5 pb-5">
            {resource.error && (
              <p className="text-muted-foreground mb-3 text-xs" role="status">
                Showing saved grades. Could not refresh.{' '}
                <button className="min-h-11 underline" onClick={() => resource.refresh()}>
                  Try again
                </button>
              </p>
            )}
            <GradeSummary
              grade={analytics.averageGrade}
              target={tracker.settings.targetGrade}
              count={analytics.count}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="subject-action subject-action-primary flex-1"
                disabled={busy}
                onClick={() => void scan()}
              >
                <Scan className="size-4" />
                {scanning ? 'Importing...' : 'Import results'}
              </button>
              <button
                className="subject-action"
                aria-label="Add grade entry"
                aria-expanded={showAdd}
                disabled={busy}
                onClick={() => setShowAdd((value) => !value)}
              >
                <Plus className="size-4" />
                Add
              </button>
            </div>
            {message && (
              <p className="mt-3 text-sm leading-relaxed" role="status">
                {message}
              </p>
            )}
            <AnimatedPanel open={showAdd}>
              <form
                onSubmit={(event) => void handleAddEntry(event)}
                className="border-border mt-5 space-y-3 border-t pt-5"
              >
                <label className="block text-sm">
                  Assignment name
                  <input
                    required
                    disabled={busy}
                    maxLength={200}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className={`${fieldClass} mt-2`}
                  />
                </label>
                <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-3">
                  <label className="text-sm">
                    Grade
                    <SubjectSelect
                      label="Entry grade"
                      value={grade}
                      disabled={busy}
                      onValueChange={setGrade}
                      className="mt-2"
                      options={GRADE_LETTERS.map((letter) => ({ value: letter, label: letter }))}
                    />
                  </label>
                  <label className="min-w-0 text-sm">
                    Date
                    <input
                      required
                      type="date"
                      disabled={busy}
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                      className={`${fieldClass} mt-2 min-w-0`}
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  className="subject-action w-full"
                  disabled={busy || !title.trim()}
                >
                  <Save className="size-4" /> Save entry
                </button>
              </form>
            </AnimatedPanel>
            <AnimatedPanel open={showSettings}>
              <div className="border-border mt-5 space-y-4 border-t pt-5">
                <label className="block text-sm">
                  Goal grade
                  <SubjectSelect
                    label="Goal grade"
                    className="mt-2"
                    value={tracker.settings.targetGrade}
                    disabled={busy}
                    onValueChange={(value) =>
                      void persist({
                        settings: {
                          ...tracker.settings,
                          targetGrade: value as GradeTrackerDoc['settings']['targetGrade'],
                        },
                      })
                    }
                    options={GRADE_LETTERS.map((letter) => ({ value: letter, label: letter }))}
                  />
                </label>
                <label className="block text-sm">
                  Weighting
                  <SubjectSelect
                    label="Weighting"
                    className="mt-2"
                    value={tracker.settings.weightMode}
                    disabled={busy}
                    onValueChange={(value) =>
                      void persist({
                        settings: { ...tracker.settings, weightMode: value as 'equal' | 'recent' },
                      })
                    }
                    options={[
                      { value: 'equal', label: 'All results equally' },
                      { value: 'recent', label: 'Recent results count more' },
                    ]}
                  />
                </label>
                <label className="flex min-h-11 items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={tracker.settings.includeManual}
                    disabled={busy}
                    onChange={(event) =>
                      void persist({
                        settings: { ...tracker.settings, includeManual: event.target.checked },
                      })
                    }
                  />
                  Include manual entries
                </label>
                <label className="flex min-h-11 items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={tracker.settings.showEstimated}
                    disabled={busy}
                    onChange={(event) =>
                      void persist({
                        settings: { ...tracker.settings, showEstimated: event.target.checked },
                      })
                    }
                  />
                  Show estimates on entries
                </label>
              </div>
            </AnimatedPanel>
          </div>
          <div className="border-border border-t">
            <h3 className="flex items-center gap-2 px-5 pt-4 text-sm font-medium">
              <ListChecks className="subject-accent size-4" /> Tracked results{' '}
              <span className="text-muted-foreground font-normal">{tracker.entries.length}</span>
            </h3>
            {tracker.entries.length === 0 ? (
              <p className="text-muted-foreground p-5 text-sm leading-relaxed">
                Import published results or add your first grade to start tracking progress.
              </p>
            ) : (
              (showAll ? tracker.entries : tracker.entries.slice(0, 4)).map((entry) => (
                <AnimatedDisclosure
                  key={entry.id}
                  className="border-border border-b last:border-0"
                  title={
                    <span className="inline-flex w-full items-start justify-between gap-3 align-top">
                      <span className="min-w-0">
                        <span className="block leading-relaxed font-medium">{entry.title}</span>
                        <span className="text-muted-foreground mt-1 block text-xs">
                          {subjectDate(entry.endDate)} /{' '}
                          {entry.excluded
                            ? 'Excluded'
                            : entry.source === 'manual'
                              ? 'Manual'
                              : entry.confidence === 'estimated'
                                ? 'Estimated'
                                : 'Imported'}
                          {entry.totalPoints ? ` / ${entry.totalPoints} points` : ''}
                        </span>
                      </span>
                      <span
                        className={`text-lg font-medium tabular-nums ${entry.excluded ? 'text-muted-foreground line-through' : ''}`}
                      >
                        {entry.grade}
                      </span>
                    </span>
                  }
                >
                  <div className="space-y-3 px-5 pb-5">
                    {entry.assignmentId && (
                      <Link
                        className="inline-flex min-h-11 items-center text-sm underline"
                        href={`/subjects/${subjectId}/${entry.assignmentId}?type=assignment`}
                      >
                        Open assignment
                      </Link>
                    )}
                    <label className="block text-sm">
                      Correct grade
                      <SubjectSelect
                        label={`Correct grade for ${entry.title}`}
                        className="mt-2"
                        disabled={busy}
                        value={entry.grade}
                        onValueChange={(value) => void updateEntry(entry, { grade: value })}
                        options={Array.from(new Set([entry.grade, ...GRADE_LETTERS])).map(
                          (letter) => ({ value: letter, label: letter })
                        )}
                      />
                    </label>
                    {tracker.settings.showEstimated &&
                      entry.estimatedGrade &&
                      entry.estimatedGrade !== entry.grade && (
                        <p className="text-muted-foreground text-xs">
                          Original estimate: {entry.estimatedGrade}
                        </p>
                      )}
                    <button
                      className="subject-action w-full"
                      disabled={busy}
                      onClick={() => void updateEntry(entry, { excluded: !entry.excluded })}
                    >
                      {entry.excluded ? 'Include in average' : 'Exclude from average'}
                    </button>
                  </div>
                </AnimatedDisclosure>
              ))
            )}
            {tracker.entries.length > 4 && (
              <button
                className="subject-action m-5 mt-3"
                aria-expanded={showAll}
                onClick={() => setShowAll((value) => !value)}
              >
                {showAll ? 'Show fewer' : `All ${tracker.entries.length} results`}
              </button>
            )}
          </div>
          {analytics.count > 0 && (
            <AnimatedDisclosure
              className="border-border border-t"
              icon={ChartNoAxesCombined}
              title={<span className="font-medium">Explore your progress</span>}
              onOpenChange={(open) => {
                if (open) setShowCharts(true);
              }}
            >
              {showCharts && (
                <div className="p-5">
                  <TrackerCharts
                    analytics={analytics}
                    snapshots={tracker.snapshots}
                    subjectColor="var(--subject-data)"
                  />
                </div>
              )}
            </AnimatedDisclosure>
          )}
        </>
      )}
    </section>
  );
}
