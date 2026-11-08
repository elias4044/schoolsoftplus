'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  Download,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';

import { ApiError, apiFetch } from '@/lib/api-client';
import {
  computeFinalGradesInsights,
  FINAL_GRADE_LETTERS,
  FINAL_GRADE_POINTS,
} from '@/lib/final-grades/analytics';
import { exportFinalGradesFile } from '@/lib/final-grades/format';
import {
  getGradeChanges,
  getGradePeriods,
  getTermHistory,
  projectGrades,
} from '@/lib/final-grades/progress';
import type { FinalGradeLetter, FinalGradeSubject } from '@/lib/final-grades/types';
import { FinalGradesOverview } from '@/components/final-grades/FinalGradesOverview';
import { GradeImport } from '@/components/final-grades/GradeImport';
import { GradeSelect } from '@/components/final-grades/GradeSelect';

import styles from './page.module.css';

type View = 'overview' | 'subjects' | 'planner';
type Filter = 'all' | 'improved' | 'declined' | 'failing' | 'missing';

export default function FinalGradesPage() {
  const [subjects, setSubjects] = useState<FinalGradeSubject[]>([]);
  const [savedSnapshot, setSavedSnapshot] = useState('[]');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [view, setView] = useState<View>('overview');
  const viewContent = useRef<HTMLDivElement>(null);
  const tabIndicator = useRef<HTMLSpanElement>(null);
  const [showImport, setShowImport] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState('name');
  const [targets, setTargets] = useState<Record<string, FinalGradeLetter>>({});
  const [goal, setGoal] = useState('');
  const [removed, setRemoved] = useState<{ subject: FinalGradeSubject; index: number } | null>(
    null
  );
  const insights = useMemo(() => computeFinalGradesInsights(subjects), [subjects]);
  const periods = useMemo(() => getGradePeriods(subjects), [subjects]);
  const changes = useMemo(() => getGradeChanges(subjects), [subjects]);
  const history = useMemo(() => getTermHistory(subjects), [subjects]);
  const projected = useMemo(
    () => computeFinalGradesInsights(projectGrades(subjects, targets)),
    [subjects, targets]
  );
  const dirty = JSON.stringify(subjects) !== savedSnapshot;
  const gradedCount = insights.approvedCount + insights.failingCount;
  const changedTargets = insights.subjects.filter(
    (subject) => Object.hasOwn(targets, subject.id) && targets[subject.id] !== subject.currentGrade
  ).length;

  function load() {
    return apiFetch<{ finalGrades: { subjects: FinalGradeSubject[] } | null }>('/api/final-grades')
      .then((data) => {
        const next = data.finalGrades?.subjects ?? [];
        setSubjects(next);
        setSavedSnapshot(JSON.stringify(next));
        setMessage(null);
      })
      .catch((error) => {
        setLoadError(true);
        setMessage({
          text:
            error instanceof ApiError ? error.message : 'Could not load final grades. Try again.',
          error: true,
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    const content = viewContent.current;
    if (!content) return;
    const keyboard = document.activeElement?.matches(':focus-visible');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const easing = getComputedStyle(content).getPropertyValue('--grade-ease-out').trim();
    const indicator = tabIndicator.current;
    const nav = indicator?.parentElement;
    const selected = nav?.querySelector<HTMLElement>('button[aria-current]');
    const animations: Animation[] = [];
    if (indicator && nav && selected) {
      const target = `translateX(${selected.offsetLeft}px) scaleX(${selected.offsetWidth})`;
      indicator.style.transition = keyboard || reduce ? 'none' : `transform 200ms ${easing}`;
      indicator.style.transform = target;
    }
    if (!keyboard) {
      const sections = content.querySelectorAll(':scope > section, :scope > div > section');
      sections.forEach((section, index) =>
        animations.push(
          section.animate(
            reduce
              ? [{ opacity: 0.85 }, { opacity: 1 }]
              : [
                  { opacity: 0.65, transform: 'translateY(6px)' },
                  { opacity: 1, transform: 'translateY(0)' },
                ],
            { duration: reduce ? 120 : 200, delay: reduce ? 0 : Math.min(index, 3) * 40, easing }
          )
        )
      );
    }
    return () => animations.forEach((animation) => animation.cancel());
  }, [view, loading]);
  useEffect(() => {
    const indicator = tabIndicator.current;
    const nav = indicator?.parentElement;
    if (!nav || !indicator) return;
    const observer = new ResizeObserver(() => {
      const selected = nav.querySelector<HTMLElement>('button[aria-current]');
      if (!selected) return;
      const transform = `translateX(${selected.offsetLeft}px) scaleX(${selected.offsetWidth})`;
      indicator.style.transform = transform;
    });
    observer.observe(nav);
    return () => observer.disconnect();
  }, [loading, subjects.length]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  async function save() {
    if (subjects.some((subject) => !subject.subject.trim())) {
      setMessage({ text: 'Give every subject a name before saving.', error: true });
      setView('subjects');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const data = await apiFetch<{ finalGrades: { subjects: FinalGradeSubject[] } }>(
        '/api/final-grades',
        { method: 'PUT', body: { subjects } as unknown as BodyInit }
      );
      setSubjects(data.finalGrades.subjects);
      setSavedSnapshot(JSON.stringify(data.finalGrades.subjects));
      setMessage({ text: 'Your grades are saved to your account.' });
    } catch (error) {
      setMessage({
        text:
          error instanceof ApiError
            ? error.message
            : 'Could not save. Your edits are still here; try again.',
        error: true,
      });
    } finally {
      setSaving(false);
    }
  }
  function updateSubject(id: string, patch: Partial<FinalGradeSubject>) {
    setSubjects((current) =>
      current.map((subject) => (subject.id === id ? { ...subject, ...patch } : subject))
    );
  }
  function updateGrade(id: string, period: string, grade: FinalGradeLetter | null) {
    setSubjects((current) =>
      current.map((subject) => {
        if (subject.id !== id) return subject;
        const existing = subject.grades.find((cell) => cell.period === period);
        const cell = {
          period,
          grade,
          isPreviousTerm: existing?.isPreviousTerm ?? false,
          raw: grade ? (existing?.isPreviousTerm ? `(${grade})` : grade) : '',
        };
        const grades = existing
          ? subject.grades.map((item) => (item.period === period ? cell : item))
          : [...subject.grades, cell];
        grades.sort((a, b) => periods.indexOf(a.period) - periods.indexOf(b.period));
        return { ...subject, grades };
      })
    );
  }
  function addSubject() {
    if (subjects.length >= 80) return;
    const period = periods.at(-1) ?? 'Final grade';
    setSubjects((current) => [
      {
        id: crypto.randomUUID(),
        subject: '',
        grades: [{ period, grade: null, isPreviousTerm: false, raw: '' }],
        comment: '',
        manual: true,
      },
      ...current,
    ]);
    setQuery('');
    setFilter('all');
    setView('subjects');
  }
  function importGrades(next: FinalGradeSubject[]) {
    setSubjects(next);
    setTargets({});
    setRemoved(null);
    setShowImport(false);
    setView('subjects');
    setFilter('all');
    setQuery('');
    setMessage({ text: 'Imported ' + next.length + ' subjects. Review your grades, then save.' });
  }
  function exportGrades() {
    try {
      const json = exportFinalGradesFile(subjects);
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'final-grades.v1.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : 'Could not export grades.',
        error: true,
      });
    }
  }
  const visibleSubjects = insights.subjects
    .filter((subject) => {
      const change = changes.find((item) => item.id === subject.id);
      return (
        subject.subject.toLowerCase().includes(query.toLowerCase()) &&
        (filter === 'all' ||
          (filter === 'improved' && change?.delta != null && change.delta > 0) ||
          (filter === 'declined' && change?.delta != null && change.delta < 0) ||
          (filter === 'failing' && subject.currentGrade === 'F') ||
          (filter === 'missing' && subject.currentGrade === null))
      );
    })
    .sort((a, b) =>
      sort === 'highest'
        ? b.meritPoints - a.meritPoints
        : sort === 'lowest'
          ? a.meritPoints - b.meritPoints
          : a.subject.localeCompare(b.subject)
    );

  if (loading)
    return (
      <div className={styles.page} aria-busy="true">
        <h1>Final grades</h1>
        <p className={styles.loading}>
          <Loader2 className="size-4 animate-spin" /> Loading your grade overview...
        </p>
      </div>
    );
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Final grades</h1>
          <p>Your results, the bigger picture, and your next step.</p>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.button}
            onClick={() => setShowImport(!showImport)}
            disabled={saving || loadError}
            aria-expanded={showImport}
            aria-controls="grade-import"
          >
            <Upload /> Import grades
          </button>
          <button
            className={styles.primaryButton}
            onClick={() => void save()}
            disabled={saving || !dirty || loadError}
          >
            {saving ? <Loader2 className="animate-spin" /> : dirty ? <Save /> : <Check />}
            {saving ? 'Saving...' : dirty ? 'Save changes' : 'All changes saved'}
          </button>
        </div>
      </header>
      {message && (
        <div
          className={message.error ? styles.error : styles.notice}
          role={message.error ? 'alert' : 'status'}
        >
          {message.text}
          {loadError && (
            <button
              className={styles.button}
              onClick={() => {
                setLoading(true);
                setLoadError(false);
                void load();
              }}
            >
              Try again
            </button>
          )}
        </div>
      )}
      {showImport && (
        <GradeImport
          subjectCount={subjects.length}
          disabled={saving}
          onImport={importGrades}
          onClose={() => setShowImport(false)}
        />
      )}
      {!loadError && subjects.length === 0 ? (
        <section className={styles.empty}>
          <div className={styles.emptyGrades} aria-hidden="true">
            <span>A</span>
            <span>B</span>
            <span>C</span>
          </div>
          <h2>See what your grades add up to</h2>
          <p>
            Add your final grades to explore your merit, follow progress across terms, and try out
            your next goal.
          </p>
          <div className={styles.actions}>
            <button className={styles.primaryButton} onClick={() => setShowImport(true)}>
              <Upload /> Import from SchoolSoft
            </button>
            <button className={styles.button} onClick={addSubject}>
              <Plus /> Add a subject
            </button>
          </div>
          <p className={styles.small}>Your grades stay in your account. You decide when to save.</p>
        </section>
      ) : (
        !loadError && (
          <>
            <div className={styles.summary}>
              <div>
                <p>Current merit</p>
                <strong>
                  {insights.merit.toFixed(1)}
                  <small> / {insights.maxMerit}</small>
                </strong>
                <span>Best 16 + language option</span>
              </div>
              <div>
                <p>Passing subjects</p>
                <strong>
                  {insights.approvedCount}
                  <small> / {gradedCount}</small>
                </strong>
                <span>
                  {insights.failingCount
                    ? `${insights.failingCount} with grade F`
                    : gradedCount
                      ? 'All recorded grades are passing'
                      : 'No grades recorded yet'}
                </span>
              </div>
              <div>
                <p>Average grade points</p>
                <strong>
                  {gradedCount ? insights.averagePoints.toFixed(1) : '--'}
                  <small> / 20</small>
                </strong>
                <span>
                  {gradedCount} graded, {subjects.length - gradedCount} ungraded
                </span>
              </div>
              <div>
                <p>Subject progress</p>
                <strong>
                  {changes.filter((change) => change.delta !== null && change.delta > 0).length}
                  <small> improved</small>
                </strong>
                <span>Across each subject&apos;s last two awarded grades</span>
              </div>
            </div>
            <nav className={styles.tabs} aria-label="Final grade views">
              {(['overview', 'subjects', 'planner'] as View[]).map((item) => (
                <button
                  key={item}
                  aria-current={view === item ? 'page' : undefined}
                  onClick={() => setView(item)}
                >
                  {item === 'overview'
                    ? 'Overview'
                    : item === 'subjects'
                      ? `Subjects (${subjects.length})`
                      : 'Merit planner'}
                </button>
              ))}
              <span ref={tabIndicator} className={styles.tabIndicator} aria-hidden="true" />
              <span className={styles.editStatus}>
                {dirty ? 'Unsaved changes' : 'Saved to your account'}
              </span>
            </nav>
            <div ref={viewContent}>
              {view === 'overview' && (
                <FinalGradesOverview
                  insights={insights}
                  changes={changes}
                  history={history}
                  onPlan={() => setView('planner')}
                  onSubjects={(nextFilter) => {
                    setFilter(nextFilter);
                    setQuery('');
                    setView('subjects');
                  }}
                />
              )}
              {view === 'subjects' && (
                <section aria-labelledby="subjects-heading">
                  <div className={styles.sectionHeader}>
                    <div>
                      <h2 id="subjects-heading">Your subject record</h2>
                      <p>Edit term grades and notes. Changes update the overview immediately.</p>
                    </div>
                    <div className={styles.actions}>
                      <button className={styles.button} onClick={exportGrades}>
                        <Download /> Export JSON
                      </button>
                      <button
                        className={styles.button}
                        onClick={addSubject}
                        disabled={subjects.length >= 80 || saving}
                      >
                        <Plus /> Add subject
                      </button>
                    </div>
                  </div>
                  <div className={styles.toolbar}>
                    <label className={styles.search}>
                      <Search />
                      <span className="sr-only">Search subjects</span>
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search subjects"
                      />
                    </label>
                    <label>
                      <span className="sr-only">Filter subjects</span>
                      <GradeSelect
                        label="Filter subjects"
                        value={filter}
                        onChange={(value) => setFilter(value as Filter)}
                        options={[
                          { value: 'all', label: 'All subjects' },
                          { value: 'improved', label: 'Improved' },
                          { value: 'declined', label: 'Declined' },
                          { value: 'failing', label: 'Grade F' },
                          { value: 'missing', label: 'Ungraded' },
                        ]}
                      />
                    </label>
                    <label>
                      <span className="sr-only">Sort subjects</span>
                      <GradeSelect
                        label="Sort subjects"
                        value={sort}
                        onChange={setSort}
                        options={[
                          { value: 'name', label: 'Subject name' },
                          { value: 'highest', label: 'Highest points' },
                          { value: 'lowest', label: 'Lowest points' },
                        ]}
                      />
                    </label>
                  </div>
                  {removed && (
                    <div className={styles.notice} role="status">
                      Removed {removed.subject.subject || 'unnamed subject'}.
                      <button
                        className={styles.button}
                        onClick={() => {
                          setSubjects((current) => [
                            ...current.slice(0, removed.index),
                            removed.subject,
                            ...current.slice(removed.index),
                          ]);
                          setRemoved(null);
                        }}
                      >
                        Undo
                      </button>
                    </div>
                  )}
                  <p className={styles.small}>
                    {visibleSubjects.length} of {subjects.length} subjects. Parentheses mark a grade
                    carried forward from an earlier term.
                  </p>
                  <fieldset disabled={saving} className={styles.records}>
                    <legend className="sr-only">Edit subject grades</legend>
                    {visibleSubjects.map((subject) => {
                      const change = changes.find((item) => item.id === subject.id);
                      return (
                        <article key={subject.id} className={styles.subjectRow}>
                          <div className={styles.subjectIdentity}>
                            <label>
                              <span className="sr-only">Subject name</span>
                              <input
                                className={styles.subjectName}
                                value={subject.subject}
                                onChange={(event) =>
                                  updateSubject(subject.id, { subject: event.target.value })
                                }
                                placeholder="Subject name"
                                maxLength={120}
                              />
                            </label>
                            <span className={styles.small}>
                              {subject.countsAsLanguageBonus
                                ? 'Language bonus'
                                : subject.includedInBaseMerit
                                  ? 'Counted in best 16'
                                  : subject.currentGrade === 'F'
                                    ? 'Not passing'
                                    : subject.currentGrade
                                      ? 'Outside best 16'
                                      : 'No grade yet'}
                            </span>
                          </div>
                          <div className={styles.gradeCells}>
                            {periods.map((period) => {
                              const cell = subject.grades.find((item) => item.period === period);
                              return (
                                <label key={period}>
                                  <span>{period}</span>
                                  <GradeSelect
                                    label={`${subject.subject || 'Unnamed subject'}, ${period}`}
                                    value={cell?.grade ?? 'ungraded'}
                                    onChange={(value) =>
                                      updateGrade(
                                        subject.id,
                                        period,
                                        value === 'ungraded' ? null : (value as FinalGradeLetter)
                                      )
                                    }
                                    failing={cell?.grade === 'F'}
                                    disabled={saving}
                                    options={[
                                      { value: 'ungraded', label: '--' },
                                      ...FINAL_GRADE_LETTERS.map((letter) => ({
                                        value: letter,
                                        label: cell?.isPreviousTerm ? `(${letter})` : letter,
                                      })),
                                    ]}
                                  />
                                </label>
                              );
                            })}
                          </div>
                          <div className={styles.subjectPoints}>
                            <strong>
                              {subject.currentGrade ? subject.meritPoints.toFixed(1) : '--'}
                            </strong>
                            <span className={styles.small}>points</span>
                            {change?.delta != null && change.delta !== 0 && (
                              <span
                                className={change.delta > 0 ? styles.positive : styles.negative}
                              >
                                {change.delta > 0 ? <ArrowUpRight /> : <ArrowDownRight />}
                                {change.delta > 0 ? '+' : ''}
                                {change.delta.toFixed(1)}
                              </span>
                            )}
                          </div>
                          <label className={styles.comment}>
                            <span className="sr-only">
                              Notes for {subject.subject || 'subject'}
                            </span>
                            <input
                              value={subject.comment}
                              onChange={(event) =>
                                updateSubject(subject.id, { comment: event.target.value })
                              }
                              placeholder="Add a note..."
                              maxLength={1000}
                            />
                          </label>
                          <button
                            className={styles.iconButton}
                            aria-label={`Remove ${subject.subject || 'unnamed subject'}`}
                            onClick={() => {
                              setRemoved({
                                subject,
                                index: subjects.findIndex((item) => item.id === subject.id),
                              });
                              setSubjects((current) =>
                                current.filter((item) => item.id !== subject.id)
                              );
                              setTargets((current) => {
                                const next = { ...current };
                                delete next[subject.id];
                                return next;
                              });
                            }}
                          >
                            <Trash2 />
                          </button>
                        </article>
                      );
                    })}
                  </fieldset>
                  {!visibleSubjects.length && (
                    <div className={styles.emptyInline}>
                      <h3>No matching subjects</h3>
                      <p>Try another search or show all subjects.</p>
                      <button
                        className={styles.button}
                        onClick={() => {
                          setQuery('');
                          setFilter('all');
                        }}
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </section>
              )}
              {view === 'planner' && (
                <section aria-labelledby="planner-heading">
                  <div className={styles.sectionHeader}>
                    <div>
                      <h2 id="planner-heading">Make room for your next goal</h2>
                      <p>
                        Try different grades. This is a scenario; your actual grades stay as they
                        are.
                      </p>
                    </div>
                    <button
                      className={styles.button}
                      onClick={() => {
                        setTargets({});
                        setGoal('');
                      }}
                      disabled={!changedTargets && !goal}
                    >
                      <RotateCcw /> Reset plan
                    </button>
                  </div>
                  <div className={styles.plannerGrid}>
                    <div className={styles.panel}>
                      <h3>Target grades</h3>
                      <p className={styles.small}>
                        Merit is recalculated from the full list, including changes to your best 16.
                      </p>
                      {insights.subjects
                        .filter((subject) => subject.currentGrade)
                        .sort((a, b) => a.meritPoints - b.meritPoints)
                        .map((subject) => (
                          <div className={styles.targetRow} key={subject.id}>
                            <div>
                              <label htmlFor={`target-${subject.id}`}>
                                {subject.subject || 'Unnamed subject'}
                              </label>
                              <span className={styles.small}>
                                Current {subject.currentGrade} / {subject.meritPoints.toFixed(1)}{' '}
                                points
                              </span>
                            </div>
                            <ArrowRight className="text-muted-foreground size-4" />
                            <GradeSelect
                              id={`target-${subject.id}`}
                              label={`Target grade for ${subject.subject || 'Unnamed subject'}`}
                              value={
                                (Object.hasOwn(targets, subject.id)
                                  ? targets[subject.id]
                                  : undefined) ??
                                subject.currentGrade ??
                                'F'
                              }
                              onChange={(value) =>
                                setTargets((current) => ({
                                  ...current,
                                  [subject.id]: value as FinalGradeLetter,
                                }))
                              }
                              options={FINAL_GRADE_LETTERS.map((letter) => ({
                                value: letter,
                                label: `${letter} / ${FINAL_GRADE_POINTS[letter]}`,
                              }))}
                            />
                          </div>
                        ))}
                      {!gradedCount && (
                        <p className={styles.emptyInline}>
                          Record at least one grade in Subjects to start a plan.
                        </p>
                      )}
                    </div>
                    <aside className={styles.planResult}>
                      <h3>Your projected merit</h3>
                      <output className={styles.projected} aria-live="polite">
                        {projected.merit.toFixed(1)}
                        <small> / 340</small>
                      </output>
                      <p
                        className={
                          projected.merit > insights.merit
                            ? styles.positive
                            : projected.merit < insights.merit
                              ? styles.negative
                              : styles.small
                        }
                      >
                        {projected.merit > insights.merit ? '+' : ''}
                        {(projected.merit - insights.merit).toFixed(1)} points compared with your
                        current merit
                      </p>
                      <div className={styles.track}>
                        <span style={{ transform: `scaleX(${projected.merit / 340})` }} />
                      </div>
                      <p className={styles.small}>
                        {changedTargets} subject{changedTargets === 1 ? '' : 's'} changed in this
                        plan.
                      </p>
                      <label className={styles.goal}>
                        Your merit goal (optional)
                        <input
                          type="number"
                          min="0"
                          max="340"
                          step="2.5"
                          value={goal}
                          onChange={(event) => setGoal(event.target.value)}
                          placeholder="e.g. 280"
                        />
                      </label>
                      {goal !== '' && (
                        <p className={styles.goalMessage}>
                          {Number(goal) < 0 || Number(goal) > 340
                            ? 'Choose a goal between 0 and 340.'
                            : projected.merit >= Number(goal)
                              ? 'This plan reaches your goal.'
                              : `${(Number(goal) - projected.merit).toFixed(1)} points to go in this plan.`}
                        </p>
                      )}
                      <details className={styles.explainer}>
                        <summary>How the calculation works</summary>
                        <p>
                          Your best 16 passing subjects contribute up to 320 points. The highest
                          passing modern-language subject is counted separately, adding up to 20. A
                          = 20, B = 17.5, C = 15, D = 12.5, E = 10, F = 0.
                        </p>
                        <p>
                          This tool uses the latest recorded grade in each subject. It is a planning
                          estimate, not an admission decision. Check which language options qualify
                          with your school.
                        </p>
                      </details>
                    </aside>
                  </div>
                </section>
              )}
            </div>
            <footer className={styles.footer}>
              Based on your latest recorded grades. Carried-forward grades are included in merit,
              but not treated as a new award.
            </footer>
          </>
        )
      )}
    </div>
  );
}
