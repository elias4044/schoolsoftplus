'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  BookOpen,
  CalendarClock,
  CheckCheck,
  CheckSquare,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FlaskConical,
  LayoutGrid,
  List,
  Search,
  Star,
  X,
} from 'lucide-react';

import { fadeUp, staggerContainer } from '@/lib/animations';
import { useCachedResource, useIsoLayoutEffect } from '@/lib/cache';
import {
  buildInsight,
  COMPLETED_KEY,
  daysUntil,
  fetchCompleted,
  fetchSubjectAssignments,
  fetchSubjects,
  readCachedInsight,
  SUBJECTS_KEY,
  type CompletedRow,
  type DueItem,
  type Insight,
  type Subject,
  type Teacher,
} from '@/lib/cache/subjects';

/* 
   Types
 */
type Tab = 'subjects' | 'completed';
type ViewMode = 'grid' | 'list';
type SortMode = 'name' | 'unread' | 'due';
type FilterMode = 'all' | 'unread' | 'active';
type CompletedSort = 'newest' | 'oldest' | 'title';

/* 
   Constants / helpers
 */
const PINS_KEY = 'subjects:pins';
const PREFS_KEY = 'subjects:prefs';
const FALLBACK_COLOR = '#7c6cf0';
const PAGE_SIZE = 40;

const SORT_LABELS: Record<SortMode, string> = {
  name: 'A–Z',
  unread: 'Unread',
  due: 'Next due',
};

const COMPLETED_SORT_LABELS: Record<CompletedSort, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  title: 'A–Z',
};

const TYPE_ICON: Record<string, React.ElementType> = {
  Test: FlaskConical,
  Checkpoint: CheckSquare,
  Assessment: ClipboardCheck,
  Planning: FileText,
  'Classroom Activity': ClipboardList,
};

const URGENT = 'oklch(0.70 0.19 25)';
const SOON = 'oklch(0.80 0.14 80)';
const CALM = 'oklch(0.75 0.15 278)';

function patchPrefs(next: Record<string, unknown>) {
  try {
    const cur = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') ?? {};
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...cur, ...next }));
  } catch {
    /* storage unavailable */
  }
}

/**
 * True once the entrance animation for `key` has had time to play.
 * Cards mounted after that (because a filter or sort changed) skip the
 * entrance animation, so results swap instantly instead of re-animating.
 */
function useSettled(key: string) {
  const [done, setDone] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setDone(key), 900);
    return () => clearTimeout(t);
  }, [key]);
  return done === key;
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

function personInitials(name?: string): string {
  if (!name) return '?';
  const w = name.trim().split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] ?? '') + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase() || '?';
}

function teacherName(t?: Teacher): string {
  return t ? `${t.firstName} ${t.lastName}`.trim() : '';
}

function dueInfo(dateStr: string): { label: string; color: string } {
  const days = daysUntil(dateStr);
  if (days === null) return { label: '', color: CALM };
  if (days < 0) return { label: 'Overdue', color: URGENT };
  if (days === 0) return { label: 'Today', color: URGENT };
  if (days === 1) return { label: 'Tomorrow', color: SOON };
  if (days <= 2) return { label: `In ${days} days`, color: SOON };
  if (days < 7) return { label: `In ${days} days`, color: CALM };
  const label = new Date(dateStr).toLocaleDateString('en-SE', { day: 'numeric', month: 'short' });
  return { label, color: CALM };
}

function nextDueTime(i?: Insight): number {
  const first = i?.upcoming[0];
  if (!first) return Number.POSITIVE_INFINITY;
  const t = new Date(first.endDate).getTime();
  return isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

function parseResultDate(s: string): Date {
  // "2025-11-26 15:41" -> ISO-ish so Safari parses it too
  return new Date(s.replace(' ', 'T'));
}

function resultTime(s: string): number {
  const t = parseResultDate(s).getTime();
  return isNaN(t) ? 0 : t;
}

function formatResultDate(s: string): string {
  const d = parseResultDate(s);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-SE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function monthLabel(s: string): string {
  const d = parseResultDate(s);
  if (isNaN(d.getTime())) return 'Unknown date';
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

/* 
   Shared small components
 */
function UnreadBadge({ count }: { count?: number }) {
  if (!count || count <= 0) return null;
  return (
    <span
      className="inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums"
      style={{
        background: 'oklch(0.65 0.22 278 / 20%)',
        color: 'oklch(0.78 0.15 278)',
        border: '1px solid oklch(0.65 0.22 278 / 30%)',
      }}
      title={`${count} unread`}
    >
      {count}
    </span>
  );
}

function PinButton({ pinned, onToggle }: { pinned: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      aria-label={pinned ? 'Unpin subject' : 'Pin subject'}
      aria-pressed={pinned}
      className={[
        'relative z-10 rounded-md p-1 transition-all',
        pinned
          ? 'text-amber-300 opacity-100'
          : 'text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
      ].join(' ')}
    >
      <Star className="h-3.5 w-3.5" fill={pinned ? 'currentColor' : 'none'} />
    </button>
  );
}

function DueChip({ item }: { item: DueItem }) {
  const info = dueInfo(item.endDate);
  return (
    <span
      className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium tabular-nums"
      style={{
        color: info.color,
        background: `color-mix(in oklch, ${info.color} 14%, transparent)`,
        border: `1px solid color-mix(in oklch, ${info.color} 30%, transparent)`,
      }}
    >
      {info.label}
    </span>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | null;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="bg-card flex items-center gap-3 rounded-xl border border-white/7 px-4 py-3">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `color-mix(in oklch, ${accent} 15%, transparent)`, color: accent }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-lg leading-none font-bold tabular-nums">
          {value === null ? (
            <span className="inline-block h-4 w-5 animate-pulse rounded bg-white/8" />
          ) : (
            value
          )}
        </p>
        <p className="text-muted-foreground mt-1 text-[10px] tracking-wide uppercase">{label}</p>
      </div>
    </div>
  );
}

function SearchBox({
  inputRef,
  value,
  onChange,
  placeholder,
  label,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <div className="relative flex-1">
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="bg-card placeholder:text-muted-foreground/60 focus:border-primary/40 focus:ring-primary/15 h-10 w-full rounded-xl border border-white/7 pr-16 pl-9 text-sm transition focus:ring-2 focus:outline-none"
      />
      {value ? (
        <button
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 hover:bg-white/5"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : (
        <kbd className="text-muted-foreground/70 absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-white/10 px-1.5 py-0.5 text-[10px] sm:block">
          /
        </kbd>
      )}
    </div>
  );
}

/** Small "Updating" hint shown while a background refresh runs on top of cached data. */
function UpdatingHint({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="text-muted-foreground/70 ml-2 animate-pulse text-[11px]">· Updating</span>
  );
}

/** "/" focuses the search box, Escape clears it. Only listens while the tab is active. */
function useSearchShortcuts(
  active: boolean,
  inputRef: React.RefObject<HTMLInputElement | null>,
  clear: () => void
) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA';
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        clear();
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, inputRef, clear]);
}

/* 
   Subjects: card + row
 */
function SubjectCard({
  subject,
  insight,
  pinned,
  onTogglePin,
  instant,
}: {
  subject: Subject;
  insight?: Insight;
  pinned: boolean;
  onTogglePin: () => void;
  instant: boolean;
}) {
  const color = subject.color || FALLBACK_COLOR;
  const teacher = teacherName(subject.teachers?.[0]);
  const extraTeachers = Math.max((subject.teachers?.length ?? 0) - 1, 0);
  const loaded = insight?.ok;

  return (
    <motion.div
      variants={fadeUp}
      initial={instant ? false : undefined}
      className="group bg-card relative overflow-hidden rounded-xl border border-white/7 transition-colors hover:border-white/15"
    >
      <div className="absolute inset-y-0 left-0 w-0.75" style={{ background: color }} />

      {/* Stretched link covers the whole card */}
      <Link
        href={`/subjects/${subject.id}`}
        className="focus-visible:outline-primary absolute inset-0 z-0 rounded-xl focus-visible:outline-2"
        aria-label={`Open ${subject.subject}`}
      />

      <div className="pointer-events-none relative px-4 pt-4 pb-3 pl-5">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
            style={{ background: `${color}22`, color, border: `1px solid ${color}40` }}
          >
            {initials(subject.subject)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="group-hover:text-primary truncate text-sm leading-snug font-semibold transition-colors">
              {subject.subject}
            </p>
            {teacher && (
              <p className="text-muted-foreground mt-0.5 truncate text-xs">
                {teacher}
                {extraTeachers > 0 && ` +${extraTeachers}`}
              </p>
            )}
          </div>
          <div className="pointer-events-auto flex items-center gap-1">
            <UnreadBadge count={subject.unreadEntities} />
            <PinButton pinned={pinned} onToggle={onTogglePin} />
          </div>
        </div>

        {/* Inline info */}
        <div className="mt-3.5 min-h-[58px] border-t border-white/5 pt-3">
          {!insight ? (
            <div className="space-y-2">
              <div className="h-3 w-3/4 animate-pulse rounded bg-white/6" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-white/6" />
            </div>
          ) : !loaded ? (
            <p className="text-muted-foreground/70 text-[11px]">Couldn&apos;t load details</p>
          ) : insight.upcoming.length === 0 ? (
            <p className="text-muted-foreground/80 flex items-center gap-1.5 text-[11px]">
              <ClipboardList className="h-3 w-3" /> Nothing due
            </p>
          ) : (
            <ul className="space-y-1.5">
              {insight.upcoming.map((item) => (
                <li key={item.id} className="pointer-events-auto relative z-10">
                  <Link
                    href={`/subjects/${subject.id}/${item.id}?type=${item.entityType.toLowerCase()}`}
                    className="-mx-1.5 flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-white/5"
                  >
                    <span className="text-foreground/85 flex-1 truncate text-xs">{item.title}</span>
                    <DueChip item={item} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function SubjectRow({
  subject,
  insight,
  pinned,
  onTogglePin,
  instant,
}: {
  subject: Subject;
  insight?: Insight;
  pinned: boolean;
  onTogglePin: () => void;
  instant: boolean;
}) {
  const color = subject.color || FALLBACK_COLOR;
  const teacher = teacherName(subject.teachers?.[0]);
  const next = insight?.ok ? insight.upcoming[0] : undefined;

  return (
    <motion.div
      variants={fadeUp}
      initial={instant ? false : undefined}
      className="group bg-card relative flex items-center gap-3 overflow-hidden rounded-xl border border-white/7 py-2.5 pr-3 pl-4 transition-colors hover:border-white/15 hover:bg-white/3"
    >
      <div className="absolute inset-y-0 left-0 w-0.75" style={{ background: color }} />
      <Link
        href={`/subjects/${subject.id}`}
        className="absolute inset-0 z-0"
        aria-label={`Open ${subject.subject}`}
      />
      <div
        className="pointer-events-none relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold"
        style={{ background: `${color}22`, color, border: `1px solid ${color}40` }}
      >
        {initials(subject.subject)}
      </div>
      <div className="pointer-events-none relative min-w-0 flex-1">
        <p className="group-hover:text-primary truncate text-sm font-medium transition-colors">
          {subject.subject}
        </p>
        {teacher && <p className="text-muted-foreground truncate text-[11px]">{teacher}</p>}
      </div>

      <div className="pointer-events-none relative hidden max-w-[40%] min-w-0 items-center gap-2 sm:flex">
        {next ? (
          <>
            <span className="text-foreground/75 truncate text-xs">{next.title}</span>
            <DueChip item={next} />
          </>
        ) : insight?.ok ? (
          <span className="text-muted-foreground/70 text-[11px]">Nothing due</span>
        ) : !insight ? (
          <span className="h-3 w-24 animate-pulse rounded bg-white/6" />
        ) : null}
      </div>

      <div className="relative flex shrink-0 items-center gap-1.5">
        <UnreadBadge count={subject.unreadEntities} />
        <PinButton pinned={pinned} onToggle={onTogglePin} />
        <ChevronRight className="text-muted-foreground group-hover:text-primary pointer-events-none h-4 w-4 transition-colors" />
      </div>
    </motion.div>
  );
}

/* 
   Subjects view
 */
function SubjectsView({ active }: { active: boolean }) {
  // Cached subject list shows instantly; the API response replaces it when it arrives.
  const {
    data: subjectsData,
    loading,
    refreshing,
  } = useCachedResource(SUBJECTS_KEY, fetchSubjects);
  const subjects = useMemo(() => subjectsData ?? [], [subjectsData]);

  const [insights, setInsights] = useState<Record<string, Insight>>({});

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [sort, setSort] = useState<SortMode>('name');
  const [view, setView] = useState<ViewMode>('grid');
  const [pins, setPins] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  const clearQuery = useCallback(() => setQuery(''), []);
  useSearchShortcuts(active, searchRef, clearQuery);

  /* Restore prefs + pins */
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null');
      if (p?.view === 'grid' || p?.view === 'list') setView(p.view);
      if (p?.sort === 'name' || p?.sort === 'unread' || p?.sort === 'due') setSort(p.sort);
      const stored = JSON.parse(localStorage.getItem(PINS_KEY) ?? '[]');
      if (Array.isArray(stored)) setPins(stored.map(String));
    } catch {
      /* defaults are fine */
    }
  }, []);

  const togglePin = useCallback((id: string) => {
    setPins((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id];
      try {
        localStorage.setItem(PINS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  /* Hydrate per-subject details from the cache before paint, so cards never flash skeletons */
  useIsoLayoutEffect(() => {
    if (!subjects.length) return;
    setInsights((prev) => {
      let next: Record<string, Insight> | null = null;
      for (const s of subjects) {
        const key = String(s.id);
        if (prev[key]) continue;
        const cached = readCachedInsight(s.id);
        if (cached) (next ??= { ...prev })[key] = cached;
      }
      return next ?? prev;
    });
  }, [subjects]);

  /* Refresh each subject's upcoming work from the API (3 at a time), updating the cache as we go */
  useEffect(() => {
    if (!subjects.length) return;
    let cancelled = false;
    const queue = [...subjects];

    const worker = async () => {
      while (!cancelled) {
        const s = queue.shift();
        if (!s) return;
        const key = String(s.id);
        try {
          const assignments = await fetchSubjectAssignments(s.id);
          if (cancelled) return;
          setInsights((prev) => ({ ...prev, [key]: buildInsight(assignments) }));
        } catch {
          if (cancelled) return;
          // Keep cached details on screen if the refresh fails.
          setInsights((prev) =>
            prev[key]
              ? prev
              : { ...prev, [key]: { ok: false, active: 0, overdue: 0, upcoming: [] } }
          );
        }
      }
    };

    for (let i = 0; i < 3; i++) void worker();
    return () => {
      cancelled = true;
    };
  }, [subjects]);

  const settled = useSettled(`${view}-${loading}`);

  /* Stats */
  const allLoaded = subjects.length > 0 && subjects.every((s) => insights[String(s.id)]);
  const totalUnread = subjects.reduce((n, s) => n + (s.unreadEntities ?? 0), 0);
  const totalActive = allLoaded
    ? subjects.reduce((n, s) => n + (insights[String(s.id)]?.active ?? 0), 0)
    : null;
  const dueSoon = allLoaded
    ? subjects.reduce(
        (n, s) =>
          n +
          (insights[String(s.id)]?.upcoming ?? []).filter((u) => {
            const d = daysUntil(u.endDate);
            return d !== null && d <= 3;
          }).length,
        0
      )
    : null;

  /* Filtered + sorted */
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = subjects.filter((s) => {
      if (q) {
        const hay =
          s.subject.toLowerCase() +
          ' ' +
          (s.teachers ?? []).map((t) => `${t.firstName} ${t.lastName}`.toLowerCase()).join(' ');
        if (!hay.includes(q)) return false;
      }
      if (filter === 'unread' && !(s.unreadEntities && s.unreadEntities > 0)) return false;
      if (filter === 'active' && !((insights[String(s.id)]?.active ?? 0) > 0)) return false;
      return true;
    });

    list.sort((a, b) => {
      const pa = pins.includes(String(a.id)) ? 0 : 1;
      const pb = pins.includes(String(b.id)) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      if (sort === 'unread') {
        const diff = (b.unreadEntities ?? 0) - (a.unreadEntities ?? 0);
        if (diff) return diff;
      }
      if (sort === 'due') {
        const da = nextDueTime(insights[String(a.id)]);
        const db = nextDueTime(insights[String(b.id)]);
        if (da !== db) return da < db ? -1 : 1;
      }
      return a.subject.localeCompare(b.subject, 'sv');
    });
    return list;
  }, [subjects, insights, query, filter, sort, pins]);

  const unreadSubjects = subjects.filter((s) => (s.unreadEntities ?? 0) > 0).length;
  const filtersActive = query.trim() !== '' || filter !== 'all';

  const FILTERS: { id: FilterMode; label: string; count?: number }[] = [
    { id: 'all', label: 'All', count: subjects.length },
    { id: 'unread', label: 'Unread', count: unreadSubjects },
    { id: 'active', label: 'Has open tasks' },
  ];

  return (
    <div className={active ? '' : 'hidden'}>
      <p className="text-muted-foreground mb-4 text-sm">
        {loading
          ? 'Loading…'
          : filtersActive
            ? `${visible.length} of ${subjects.length} subjects`
            : `${subjects.length} subjects`}
        <UpdatingHint show={refreshing && !loading} />
      </p>

      {/* Summary strip */}
      {!loading && subjects.length > 0 && (
        <div className="mb-5 grid grid-cols-3 gap-3">
          <StatTile
            label="Unread"
            value={totalUnread}
            icon={BookOpen}
            accent="oklch(0.75 0.15 278)"
          />
          <StatTile
            label="Open tasks"
            value={totalActive}
            icon={ClipboardList}
            accent="oklch(0.70 0.18 148)"
          />
          <StatTile label="Due in 3 days" value={dueSoon} icon={CalendarClock} accent={SOON} />
        </div>
      )}

      {/* Toolbar */}
      {!loading && subjects.length > 0 && (
        <div className="bg-background/70 sticky top-0 z-20 -mx-2 mb-4 space-y-2.5 px-2 py-2 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <SearchBox
              inputRef={searchRef}
              value={query}
              onChange={setQuery}
              placeholder="Search subjects or teachers"
              label="Search subjects"
            />

            {/* View toggle */}
            <div className="bg-card flex shrink-0 rounded-xl border border-white/7 p-0.5">
              {(
                [
                  { id: 'grid', icon: LayoutGrid, label: 'Grid view' },
                  { id: 'list', icon: List, label: 'List view' },
                ] as const
              ).map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setView(v.id);
                    patchPrefs({ view: v.id });
                  }}
                  aria-label={v.label}
                  aria-pressed={view === v.id}
                  className={[
                    'flex h-9 w-9 items-center justify-center rounded-[10px] transition-colors',
                    view === v.id
                      ? 'text-foreground bg-white/10'
                      : 'text-muted-foreground hover:text-foreground',
                  ].join(' ')}
                >
                  <v.icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {FILTERS.map((f) => {
                const on = filter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    aria-pressed={on}
                    className={[
                      'flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
                      on
                        ? 'bg-primary/15 border-primary/40 text-primary'
                        : 'text-muted-foreground hover:text-foreground border-white/8 hover:border-white/20',
                    ].join(' ')}
                  >
                    {f.label}
                    {f.count != null && <span className="tabular-nums opacity-70">{f.count}</span>}
                  </button>
                );
              })}
            </div>

            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <span>Sort</span>
              <div className="bg-card flex rounded-lg border border-white/7 p-0.5">
                {(Object.keys(SORT_LABELS) as SortMode[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setSort(s);
                      patchPrefs({ sort: s });
                    }}
                    aria-pressed={sort === s}
                    className={[
                      'h-6 rounded-md px-2.5 text-[11px] font-medium transition-colors',
                      sort === s ? 'text-foreground bg-white/10' : 'hover:text-foreground',
                    ].join(' ')}
                  >
                    {SORT_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-card h-36 animate-pulse rounded-xl border border-white/7" />
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-muted-foreground py-20 text-center">
          <BookOpen className="mx-auto mb-3 h-8 w-8 opacity-50" />
          <p className="text-sm">No subjects found.</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="text-muted-foreground py-20 text-center">
          <Search className="mx-auto mb-3 h-8 w-8 opacity-50" />
          <p className="text-sm">No subjects match your filters.</p>
          <button
            onClick={() => {
              setQuery('');
              setFilter('all');
            }}
            className="text-primary mt-3 text-xs underline-offset-2 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <motion.div
          key={view}
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className={
            view === 'grid'
              ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'
              : 'flex flex-col gap-2'
          }
        >
          {visible.map((s) => {
            const key = String(s.id);
            const common = {
              subject: s,
              insight: insights[key],
              pinned: pins.includes(key),
              onTogglePin: () => togglePin(key),
              instant: settled,
            };
            return view === 'grid' ? (
              <SubjectCard key={key} {...common} />
            ) : (
              <SubjectRow key={key} {...common} />
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

/* 
   Completed: row
 */
function CompletedRowItem({ row, instant }: { row: CompletedRow; instant: boolean }) {
  const first = row.subjects[0];
  const color = first?.color || FALLBACK_COLOR;
  const Icon = TYPE_ICON[row.assignmentType] ?? ClipboardList;
  const extra = row.subjects.length - 1;

  return (
    <motion.div variants={fadeUp} initial={instant ? false : undefined}>
      <Link
        href={`/subjects/${row.activityId}/${row.assignmentId}?type=assignment`}
        className="group bg-card relative flex items-center gap-3 overflow-hidden rounded-xl border border-white/7 py-3 pr-3 pl-4 transition-colors hover:border-white/15 hover:bg-white/3"
      >
        <div className="absolute inset-y-0 left-0 w-0.75" style={{ background: color }} />
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `${color}22`, color, border: `1px solid ${color}40` }}
        >
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="group-hover:text-primary truncate text-sm font-medium transition-colors">
              {row.title.trim()}
            </p>
            {!row.read && (
              <span className="bg-primary h-1.5 w-1.5 shrink-0 rounded-full" title="Unread" />
            )}
          </div>
          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-[11px]">
            {first && (
              <span
                className="rounded-md px-1.5 py-0.5 font-medium"
                style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
              >
                {first.name}
                {extra > 0 && ` +${extra}`}
              </span>
            )}
            <span>{row.assignmentType}</span>
            {row.teacher && (
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/8 text-[8px] font-semibold">
                  {personInitials(row.teacher)}
                </span>
                <span className="truncate">{row.teacher}</span>
              </span>
            )}
          </div>
        </div>

        <span className="text-muted-foreground hidden shrink-0 text-[11px] tabular-nums sm:block">
          {formatResultDate(row.publishDate)}
        </span>
        <ChevronRight className="text-muted-foreground group-hover:text-primary h-4 w-4 shrink-0 transition-colors" />
      </Link>
    </motion.div>
  );
}

/* 
   Completed view
 */
function CompletedView({ active }: { active: boolean }) {
  const {
    data,
    loading,
    refreshing,
    error: fetchFailed,
  } = useCachedResource(COMPLETED_KEY, fetchCompleted);
  const rows = useMemo(() => data ?? [], [data]);
  // Only show the error state when there's no cached data to fall back on.
  const error = fetchFailed && data === null;

  const [query, setQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [sort, setSort] = useState<CompletedSort>('newest');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const searchRef = useRef<HTMLInputElement>(null);

  const clearQuery = useCallback(() => setQuery(''), []);
  useSearchShortcuts(active, searchRef, clearQuery);

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [query, subjectFilter, typeFilter, unreadOnly, sort]);

  const settled = useSettled(`completed-${loading}`);

  const subjectOptions = useMemo(() => {
    const map = new Map<string, { name: string; color: string; count: number }>();
    for (const r of rows) {
      for (const s of r.subjects) {
        const cur = map.get(s.name);
        if (cur) cur.count++;
        else map.set(s.name, { name: s.name, color: s.color || FALLBACK_COLOR, count: 1 });
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'sv'));
  }, [rows]);

  const typeOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.assignmentType, (map.get(r.assignmentType) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (q) {
        const hay =
          `${r.title} ${r.teacher ?? ''} ${r.subjects.map((s) => s.name).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (subjectFilter && !r.subjects.some((s) => s.name === subjectFilter)) return false;
      if (typeFilter && r.assignmentType !== typeFilter) return false;
      if (unreadOnly && r.read) return false;
      return true;
    });

    list.sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title, 'sv');
      const diff = resultTime(b.publishDate) - resultTime(a.publishDate);
      return sort === 'newest' ? diff : -diff;
    });
    return list;
  }, [rows, query, subjectFilter, typeFilter, unreadOnly, sort]);

  const shown = filtered.slice(0, limit);

  const groups = useMemo(() => {
    if (sort === 'title') return [{ label: '', items: shown }];
    const out: { label: string; items: CompletedRow[] }[] = [];
    for (const r of shown) {
      const label = monthLabel(r.publishDate);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(r);
      else out.push({ label, items: [r] });
    }
    return out;
  }, [shown, sort]);

  const unreadCount = rows.filter((r) => !r.read).length;
  const filtersActive =
    query.trim() !== '' || subjectFilter !== null || typeFilter !== null || unreadOnly;

  const clearAll = () => {
    setQuery('');
    setSubjectFilter(null);
    setTypeFilter(null);
    setUnreadOnly(false);
  };

  return (
    <div className={active ? '' : 'hidden'}>
      <p className="text-muted-foreground mb-4 text-sm">
        {loading
          ? 'Loading…'
          : filtersActive
            ? `${filtered.length} of ${rows.length} assignments`
            : `${rows.length} assignments${unreadCount > 0 ? ` · ${unreadCount} unread` : ''}`}
        <UpdatingHint show={refreshing && !loading} />
      </p>

      {loading ? (
        <div className="space-y-2">
          <div className="bg-card h-10 animate-pulse rounded-xl border border-white/7" />
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-card h-16 animate-pulse rounded-xl border border-white/7" />
          ))}
        </div>
      ) : error ? (
        <div className="text-muted-foreground py-20 text-center">
          <X className="mx-auto mb-3 h-8 w-8 opacity-50" />
          <p className="text-sm">Failed to load completed assignments.</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="text-muted-foreground py-20 text-center">
          <CheckCheck className="mx-auto mb-3 h-8 w-8 opacity-50" />
          <p className="text-sm">Nothing completed yet.</p>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="bg-background/70 sticky top-0 z-20 -mx-2 mb-4 space-y-2.5 px-2 py-2 backdrop-blur-md">
            <div className="flex">
              <SearchBox
                inputRef={searchRef}
                value={query}
                onChange={setQuery}
                placeholder="Search title, subject or teacher"
                label="Search completed assignments"
              />
            </div>

            {/* Subject chips */}
            <div className="mb-1 flex scrollbar-thin items-center gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setSubjectFilter(null)}
                aria-pressed={subjectFilter === null}
                className={[
                  'h-7 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors',
                  subjectFilter === null
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : 'text-muted-foreground hover:text-foreground border-white/8 hover:border-white/20',
                ].join(' ')}
              >
                All subjects
              </button>
              {subjectOptions.map((s) => {
                const on = subjectFilter === s.name;
                return (
                  <button
                    key={s.name}
                    onClick={() => setSubjectFilter(on ? null : s.name)}
                    aria-pressed={on}
                    className="flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors"
                    style={
                      on
                        ? {
                            background: `${s.color}25`,
                            borderColor: `${s.color}70`,
                            color: s.color,
                          }
                        : { borderColor: 'oklch(1 0 0 / 8%)', color: 'oklch(0.65 0 0)' }
                    }
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
                    {s.name}
                    <span className="tabular-nums opacity-60">{s.count}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {typeOptions.map(([type, count]) => {
                  const on = typeFilter === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(on ? null : type)}
                      aria-pressed={on}
                      className={[
                        'flex h-6 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-medium transition-colors',
                        on
                          ? 'text-foreground border-white/25 bg-white/10'
                          : 'text-muted-foreground hover:text-foreground border-white/8 hover:border-white/20',
                      ].join(' ')}
                    >
                      {type}
                      <span className="tabular-nums opacity-60">{count}</span>
                    </button>
                  );
                })}
                {unreadCount > 0 && (
                  <button
                    onClick={() => setUnreadOnly((u) => !u)}
                    aria-pressed={unreadOnly}
                    className={[
                      'flex h-6 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-medium transition-colors',
                      unreadOnly
                        ? 'bg-primary/15 border-primary/40 text-primary'
                        : 'text-muted-foreground hover:text-foreground border-white/8 hover:border-white/20',
                    ].join(' ')}
                  >
                    <span className="bg-primary h-1.5 w-1.5 rounded-full" />
                    Unread only
                  </button>
                )}
              </div>

              <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <span>Sort</span>
                <div className="bg-card flex rounded-lg border border-white/7 p-0.5">
                  {(Object.keys(COMPLETED_SORT_LABELS) as CompletedSort[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSort(s)}
                      aria-pressed={sort === s}
                      className={[
                        'h-6 rounded-md px-2.5 text-[11px] font-medium transition-colors',
                        sort === s ? 'text-foreground bg-white/10' : 'hover:text-foreground',
                      ].join(' ')}
                    >
                      {COMPLETED_SORT_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <div className="text-muted-foreground py-20 text-center">
              <Search className="mx-auto mb-3 h-8 w-8 opacity-50" />
              <p className="text-sm">No assignments match your filters.</p>
              <button
                onClick={clearAll}
                className="text-primary mt-3 text-xs underline-offset-2 hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {groups.map((g) => (
                <section key={g.label || 'all'}>
                  {g.label && (
                    <h2 className="text-muted-foreground mb-2 flex items-center gap-2 px-1 text-[10px] tracking-widest uppercase">
                      {g.label}
                      <span className="tabular-nums opacity-60">{g.items.length}</span>
                    </h2>
                  )}
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="show"
                    className="space-y-2"
                  >
                    {g.items.map((r) => (
                      <CompletedRowItem
                        key={`${r.activityId}-${r.assignmentId}`}
                        row={r}
                        instant={settled}
                      />
                    ))}
                  </motion.div>
                </section>
              ))}

              {filtered.length > shown.length && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => setLimit((l) => l + PAGE_SIZE)}
                    className="bg-card text-muted-foreground hover:text-foreground h-9 rounded-xl border border-white/10 px-5 text-xs font-medium transition-colors hover:border-white/20"
                  >
                    Show more ({filtered.length - shown.length} left)
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* 
   Page
 */
export default function SubjectsPage() {
  const [tab, setTab] = useState<Tab>('subjects');
  const [completedVisited, setCompletedVisited] = useState(false);

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null');
      if (p?.tab === 'completed') {
        setTab('completed');
        setCompletedVisited(true);
      }
    } catch {
      /* default tab */
    }
  }, []);

  const switchTab = (t: Tab) => {
    setTab(t);
    if (t === 'completed') setCompletedVisited(true);
    patchPrefs({ tab: t });
  };

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'subjects', label: 'Subjects', icon: BookOpen },
    { id: 'completed', label: 'Completed', icon: CheckCheck },
  ];

  return (
    <div className="mx-auto max-w-5xl p-6">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 flex flex-wrap items-center justify-between gap-4"
      >
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          {tab === 'subjects' ? (
            <BookOpen className="text-primary h-6 w-6" />
          ) : (
            <CheckCheck className="text-primary h-6 w-6" />
          )}
          {tab === 'subjects' ? 'Subjects' : 'Completed'}
        </h1>

        <div role="tablist" className="bg-card inline-flex rounded-xl border border-white/7 p-0.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => switchTab(t.id)}
              className={[
                'flex h-8 items-center gap-1.5 rounded-[10px] px-3.5 text-xs font-medium transition-colors',
                tab === t.id
                  ? 'text-foreground bg-white/10'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Both views stay mounted once opened, so switching tabs is instant and keeps filters */}
      <SubjectsView active={tab === 'subjects'} />
      {completedVisited && <CompletedView active={tab === 'completed'} />}
    </div>
  );
}
