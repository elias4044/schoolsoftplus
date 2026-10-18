"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { staggerContainer, fadeUp } from "@/lib/animations";
import { apiFetch } from "@/lib/api-client";

/* =========================================================
   Types
========================================================= */
interface Teacher {
  firstName: string;
  lastName: string;
}

interface Subject {
  id: string | number;
  subject: string;
  teachers: Teacher[];
  unreadEntities?: number;
  color: string;
}

interface DetailAssignment {
  id: number;
  entityType: string;
  title: string;
  type: string;
  endDate: string;
  endTime?: string;
  status: string;
}

interface DetailResponse {
  success: boolean;
  assignments: DetailAssignment[];
}

interface DueItem {
  id: number;
  title: string;
  type: string;
  entityType: string;
  endDate: string;
  endTime?: string;
}

interface Insight {
  ok: boolean;
  active: number;
  overdue: number;
  upcoming: DueItem[];
}

interface CompletedRow {
  assignmentId: number;
  activityId: number;
  title: string;
  subjects: { name: string; color?: string }[];
  assignmentType: string;
  teacher?: string;
  teacherPictureUrl?: string;
  publishDate: string; // "YYYY-MM-DD HH:mm"
  read: boolean;
}

interface CompletedResponse {
  success: boolean;
  rows: CompletedRow[];
}

type Tab = "subjects" | "completed";
type ViewMode = "grid" | "list";
type SortMode = "name" | "unread" | "due";
type FilterMode = "all" | "unread" | "active";
type CompletedSort = "newest" | "oldest" | "title";

/* =========================================================
   Constants / helpers
========================================================= */
const PINS_KEY = "subjects:pins";
const PREFS_KEY = "subjects:prefs";
const FALLBACK_COLOR = "#7c6cf0";
const PAGE_SIZE = 40;

const SORT_LABELS: Record<SortMode, string> = {
  name: "A–Z",
  unread: "Unread",
  due: "Next due",
};

const COMPLETED_SORT_LABELS: Record<CompletedSort, string> = {
  newest: "Newest",
  oldest: "Oldest",
  title: "A–Z",
};

const TYPE_ICON: Record<string, React.ElementType> = {
  Test: FlaskConical,
  Checkpoint: CheckSquare,
  Assessment: ClipboardCheck,
  Planning: FileText,
  "Classroom Activity": ClipboardList,
};

const URGENT = "oklch(0.70 0.19 25)";
const SOON = "oklch(0.80 0.14 80)";
const CALM = "oklch(0.75 0.15 278)";

function patchPrefs(next: Record<string, unknown>) {
  try {
    const cur = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") ?? {};
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
  if (!name) return "?";
  const w = name.trim().split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] ?? "") + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase() || "?";
}

function teacherName(t?: Teacher): string {
  return t ? `${t.firstName} ${t.lastName}`.trim() : "";
}

function daysUntil(dateStr: string): number | null {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function dueInfo(dateStr: string): { label: string; color: string } {
  const days = daysUntil(dateStr);
  if (days === null) return { label: "", color: CALM };
  if (days < 0) return { label: "Overdue", color: URGENT };
  if (days === 0) return { label: "Today", color: URGENT };
  if (days === 1) return { label: "Tomorrow", color: SOON };
  if (days <= 2) return { label: `In ${days} days`, color: SOON };
  if (days < 7) return { label: `In ${days} days`, color: CALM };
  const label = new Date(dateStr).toLocaleDateString("en-SE", { day: "numeric", month: "short" });
  return { label, color: CALM };
}

function buildInsight(assignments: DetailAssignment[]): Insight {
  const open = assignments
    .filter(a => a.entityType === "ASSIGNMENT" && (a.status === "ONGOING" || a.status === "UPCOMING"))
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

  return {
    ok: true,
    active: open.length,
    overdue: open.filter(a => (daysUntil(a.endDate) ?? 0) < 0).length,
    upcoming: open.slice(0, 2).map(a => ({
      id: a.id,
      title: a.title,
      type: a.type,
      entityType: a.entityType,
      endDate: a.endDate,
      endTime: a.endTime,
    })),
  };
}

function nextDueTime(i?: Insight): number {
  const first = i?.upcoming[0];
  if (!first) return Number.POSITIVE_INFINITY;
  const t = new Date(first.endDate).getTime();
  return isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

function parseResultDate(s: string): Date {
  // "2025-11-26 15:41" -> ISO-ish so Safari parses it too
  return new Date(s.replace(" ", "T"));
}

function resultTime(s: string): number {
  const t = parseResultDate(s).getTime();
  return isNaN(t) ? 0 : t;
}

function formatResultDate(s: string): string {
  const d = parseResultDate(s);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-SE", { day: "numeric", month: "short", year: "numeric" });
}

function monthLabel(s: string): string {
  const d = parseResultDate(s);
  if (isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

/* =========================================================
   Shared small components
========================================================= */
function UnreadBadge({ count }: { count?: number }) {
  if (!count || count <= 0) return null;
  return (
    <span
      className="text-[10px] font-semibold px-1.5 h-4 min-w-4 inline-flex items-center justify-center rounded-full tabular-nums"
      style={{
        background: "oklch(0.65 0.22 278 / 20%)",
        color: "oklch(0.78 0.15 278)",
        border: "1px solid oklch(0.65 0.22 278 / 30%)",
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
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      aria-label={pinned ? "Unpin subject" : "Pin subject"}
      aria-pressed={pinned}
      className={[
        "relative z-10 p-1 rounded-md transition-all",
        pinned
          ? "text-amber-300 opacity-100"
          : "text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-foreground",
      ].join(" ")}
    >
      <Star className="w-3.5 h-3.5" fill={pinned ? "currentColor" : "none"} />
    </button>
  );
}

function DueChip({ item }: { item: DueItem }) {
  const info = dueInfo(item.endDate);
  return (
    <span
      className="text-[10px] font-medium px-1.5 py-0.5 rounded-md shrink-0 tabular-nums"
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
    <div className="rounded-xl border border-white/7 bg-card px-4 py-3 flex items-center gap-3">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `color-mix(in oklch, ${accent} 15%, transparent)`, color: accent }}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold leading-none tabular-nums">
          {value === null ? <span className="inline-block w-5 h-4 rounded bg-white/8 animate-pulse" /> : value}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">{label}</p>
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
      <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        ref={inputRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="w-full h-10 rounded-xl border border-white/7 bg-card pl-9 pr-16 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition"
      />
      {value ? (
        <button
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : (
        <kbd className="hidden sm:block absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/70 border border-white/10 rounded px-1.5 py-0.5">
          /
        </kbd>
      )}
    </div>
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
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        clear();
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, inputRef, clear]);
}

/* =========================================================
   Subjects: card + row
========================================================= */
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
      className="group relative rounded-xl border border-white/7 bg-card overflow-hidden transition-colors hover:border-white/15"
    >
      <div className="absolute inset-y-0 left-0 w-0.75" style={{ background: color }} />

      {/* Stretched link covers the whole card */}
      <Link
        href={`/subjects/${subject.id}`}
        className="absolute inset-0 z-0 rounded-xl focus-visible:outline-2 focus-visible:outline-primary"
        aria-label={`Open ${subject.subject}`}
      />

      <div className="relative px-4 pt-4 pb-3 pl-5 pointer-events-none">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: `${color}22`, color, border: `1px solid ${color}40` }}
          >
            {initials(subject.subject)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-snug truncate group-hover:text-primary transition-colors">
              {subject.subject}
            </p>
            {teacher && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {teacher}
                {extraTeachers > 0 && ` +${extraTeachers}`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 pointer-events-auto">
            <UnreadBadge count={subject.unreadEntities} />
            <PinButton pinned={pinned} onToggle={onTogglePin} />
          </div>
        </div>

        {/* Inline info */}
        <div className="mt-3.5 pt-3 border-t border-white/5 min-h-[58px]">
          {!insight ? (
            <div className="space-y-2">
              <div className="h-3 w-3/4 rounded bg-white/6 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-white/6 animate-pulse" />
            </div>
          ) : !loaded ? (
            <p className="text-[11px] text-muted-foreground/70">Couldn&apos;t load details</p>
          ) : insight.upcoming.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/80 flex items-center gap-1.5">
              <ClipboardList className="w-3 h-3" /> Nothing due
            </p>
          ) : (
            <ul className="space-y-1.5">
              {insight.upcoming.map(item => (
                <li key={item.id} className="pointer-events-auto relative z-10">
                  <Link
                    href={`/subjects/${subject.id}/${item.id}?type=${item.entityType.toLowerCase()}`}
                    className="flex items-center gap-2 rounded-md -mx-1.5 px-1.5 py-1 hover:bg-white/5 transition-colors"
                  >
                    <span className="text-xs text-foreground/85 truncate flex-1">{item.title}</span>
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
      className="group relative flex items-center gap-3 rounded-xl border border-white/7 bg-card pl-4 pr-3 py-2.5 hover:border-white/15 hover:bg-white/3 transition-colors overflow-hidden"
    >
      <div className="absolute inset-y-0 left-0 w-0.75" style={{ background: color }} />
      <Link
        href={`/subjects/${subject.id}`}
        className="absolute inset-0 z-0"
        aria-label={`Open ${subject.subject}`}
      />
      <div
        className="relative w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 pointer-events-none"
        style={{ background: `${color}22`, color, border: `1px solid ${color}40` }}
      >
        {initials(subject.subject)}
      </div>
      <div className="relative flex-1 min-w-0 pointer-events-none">
        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
          {subject.subject}
        </p>
        {teacher && <p className="text-[11px] text-muted-foreground truncate">{teacher}</p>}
      </div>

      <div className="relative hidden sm:flex items-center gap-2 min-w-0 max-w-[40%] pointer-events-none">
        {next ? (
          <>
            <span className="text-xs text-foreground/75 truncate">{next.title}</span>
            <DueChip item={next} />
          </>
        ) : insight?.ok ? (
          <span className="text-[11px] text-muted-foreground/70">Nothing due</span>
        ) : !insight ? (
          <span className="h-3 w-24 rounded bg-white/6 animate-pulse" />
        ) : null}
      </div>

      <div className="relative flex items-center gap-1.5 shrink-0">
        <UnreadBadge count={subject.unreadEntities} />
        <PinButton pinned={pinned} onToggle={onTogglePin} />
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors pointer-events-none" />
      </div>
    </motion.div>
  );
}

/* =========================================================
   Subjects view
========================================================= */
function SubjectsView({ active }: { active: boolean }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<Record<string, Insight>>({});

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [sort, setSort] = useState<SortMode>("name");
  const [view, setView] = useState<ViewMode>("grid");
  const [pins, setPins] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  const clearQuery = useCallback(() => setQuery(""), []);
  useSearchShortcuts(active, searchRef, clearQuery);

  /* Load subjects */
  useEffect(() => {
    apiFetch<{ success: boolean; subjects: Subject[] }>("/api/subjects")
      .then(d => setSubjects(d?.success && Array.isArray(d.subjects) ? d.subjects : []))
      .catch(() => setSubjects([]))
      .finally(() => setLoading(false));
  }, []);

  /* Restore prefs + pins */
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null");
      if (p?.view === "grid" || p?.view === "list") setView(p.view);
      if (p?.sort === "name" || p?.sort === "unread" || p?.sort === "due") setSort(p.sort);
      const stored = JSON.parse(localStorage.getItem(PINS_KEY) ?? "[]");
      if (Array.isArray(stored)) setPins(stored.map(String));
    } catch {
      /* defaults are fine */
    }
  }, []);

  const togglePin = useCallback((id: string) => {
    setPins(prev => {
      const next = prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id];
      try {
        localStorage.setItem(PINS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  /* Progressively enrich each subject with its upcoming work (3 at a time) */
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
          const d = await apiFetch<DetailResponse>(`/api/subjects/${s.id}`);
          if (cancelled) return;
          const insight: Insight =
            d?.success && Array.isArray(d.assignments)
              ? buildInsight(d.assignments)
              : { ok: false, active: 0, overdue: 0, upcoming: [] };
          setInsights(prev => ({ ...prev, [key]: insight }));
        } catch {
          if (cancelled) return;
          setInsights(prev => ({ ...prev, [key]: { ok: false, active: 0, overdue: 0, upcoming: [] } }));
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
  const allLoaded = subjects.length > 0 && subjects.every(s => insights[String(s.id)]);
  const totalUnread = subjects.reduce((n, s) => n + (s.unreadEntities ?? 0), 0);
  const totalActive = allLoaded
    ? subjects.reduce((n, s) => n + (insights[String(s.id)]?.active ?? 0), 0)
    : null;
  const dueSoon = allLoaded
    ? subjects.reduce(
        (n, s) =>
          n +
          (insights[String(s.id)]?.upcoming ?? []).filter(u => {
            const d = daysUntil(u.endDate);
            return d !== null && d <= 3;
          }).length,
        0
      )
    : null;

  /* Filtered + sorted */
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = subjects.filter(s => {
      if (q) {
        const hay =
          s.subject.toLowerCase() +
          " " +
          (s.teachers ?? []).map(t => `${t.firstName} ${t.lastName}`.toLowerCase()).join(" ");
        if (!hay.includes(q)) return false;
      }
      if (filter === "unread" && !(s.unreadEntities && s.unreadEntities > 0)) return false;
      if (filter === "active" && !((insights[String(s.id)]?.active ?? 0) > 0)) return false;
      return true;
    });

    list.sort((a, b) => {
      const pa = pins.includes(String(a.id)) ? 0 : 1;
      const pb = pins.includes(String(b.id)) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      if (sort === "unread") {
        const diff = (b.unreadEntities ?? 0) - (a.unreadEntities ?? 0);
        if (diff) return diff;
      }
      if (sort === "due") {
        const da = nextDueTime(insights[String(a.id)]);
        const db = nextDueTime(insights[String(b.id)]);
        if (da !== db) return da < db ? -1 : 1;
      }
      return a.subject.localeCompare(b.subject, "sv");
    });
    return list;
  }, [subjects, insights, query, filter, sort, pins]);

  const unreadSubjects = subjects.filter(s => (s.unreadEntities ?? 0) > 0).length;
  const filtersActive = query.trim() !== "" || filter !== "all";

  const FILTERS: { id: FilterMode; label: string; count?: number }[] = [
    { id: "all", label: "All", count: subjects.length },
    { id: "unread", label: "Unread", count: unreadSubjects },
    { id: "active", label: "Has open tasks" },
  ];

  return (
    <div className={active ? "" : "hidden"}>
      <p className="text-sm text-muted-foreground mb-4">
        {loading
          ? "Loading…"
          : filtersActive
            ? `${visible.length} of ${subjects.length} subjects`
            : `${subjects.length} subjects`}
      </p>

      {/* Summary strip */}
      {!loading && subjects.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <StatTile label="Unread" value={totalUnread} icon={BookOpen} accent="oklch(0.75 0.15 278)" />
          <StatTile label="Open tasks" value={totalActive} icon={ClipboardList} accent="oklch(0.70 0.18 148)" />
          <StatTile label="Due in 3 days" value={dueSoon} icon={CalendarClock} accent={SOON} />
        </div>
      )}

      {/* Toolbar */}
      {!loading && subjects.length > 0 && (
        <div className="sticky top-0 z-20 -mx-2 px-2 py-2 mb-4 backdrop-blur-md bg-background/70 space-y-2.5">
          <div className="flex items-center gap-2">
            <SearchBox
              inputRef={searchRef}
              value={query}
              onChange={setQuery}
              placeholder="Search subjects or teachers"
              label="Search subjects"
            />

            {/* View toggle */}
            <div className="flex rounded-xl border border-white/7 bg-card p-0.5 shrink-0">
              {([
                { id: "grid", icon: LayoutGrid, label: "Grid view" },
                { id: "list", icon: List, label: "List view" },
              ] as const).map(v => (
                <button
                  key={v.id}
                  onClick={() => {
                    setView(v.id);
                    patchPrefs({ view: v.id });
                  }}
                  aria-label={v.label}
                  aria-pressed={view === v.id}
                  className={[
                    "w-9 h-9 rounded-[10px] flex items-center justify-center transition-colors",
                    view === v.id
                      ? "bg-white/10 text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  <v.icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {FILTERS.map(f => {
                const on = filter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    aria-pressed={on}
                    className={[
                      "h-7 px-3 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5",
                      on
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : "border-white/8 text-muted-foreground hover:text-foreground hover:border-white/20",
                    ].join(" ")}
                  >
                    {f.label}
                    {f.count != null && <span className="tabular-nums opacity-70">{f.count}</span>}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Sort</span>
              <div className="flex rounded-lg border border-white/7 bg-card p-0.5">
                {(Object.keys(SORT_LABELS) as SortMode[]).map(s => (
                  <button
                    key={s}
                    onClick={() => {
                      setSort(s);
                      patchPrefs({ sort: s });
                    }}
                    aria-pressed={sort === s}
                    className={[
                      "h-6 px-2.5 rounded-md text-[11px] font-medium transition-colors",
                      sort === s ? "bg-white/10 text-foreground" : "hover:text-foreground",
                    ].join(" ")}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-36 rounded-xl bg-card border border-white/7 animate-pulse" />
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No subjects found.</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No subjects match your filters.</p>
          <button
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
            className="mt-3 text-xs text-primary hover:underline underline-offset-2"
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
            view === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
              : "flex flex-col gap-2"
          }
        >
          {visible.map(s => {
            const key = String(s.id);
            const common = {
              subject: s,
              insight: insights[key],
              pinned: pins.includes(key),
              onTogglePin: () => togglePin(key),
              instant: settled,
            };
            return view === "grid" ? (
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

/* =========================================================
   Completed: row
========================================================= */
function CompletedRowItem({ row, instant }: { row: CompletedRow; instant: boolean }) {
  const first = row.subjects[0];
  const color = first?.color || FALLBACK_COLOR;
  const Icon = TYPE_ICON[row.assignmentType] ?? ClipboardList;
  const extra = row.subjects.length - 1;

  return (
    <motion.div variants={fadeUp} initial={instant ? false : undefined}>
      <Link
        href={`/subjects/${row.activityId}/${row.assignmentId}?type=assignment`}
        className="group relative flex items-center gap-3 rounded-xl border border-white/7 bg-card pl-4 pr-3 py-3 overflow-hidden hover:border-white/15 hover:bg-white/3 transition-colors"
      >
        <div className="absolute inset-y-0 left-0 w-0.75" style={{ background: color }} />
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${color}22`, color, border: `1px solid ${color}40` }}
        >
          <Icon className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
              {row.title.trim()}
            </p>
            {!row.read && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" title="Unread" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-muted-foreground">
            {first && (
              <span
                className="px-1.5 py-0.5 rounded-md font-medium"
                style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
              >
                {first.name}
                {extra > 0 && ` +${extra}`}
              </span>
            )}
            <span>{row.assignmentType}</span>
            {row.teacher && (
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="w-4 h-4 rounded-full bg-white/8 text-[8px] font-semibold flex items-center justify-center shrink-0">
                  {personInitials(row.teacher)}
                </span>
                <span className="truncate">{row.teacher}</span>
              </span>
            )}
          </div>
        </div>

        <span className="hidden sm:block text-[11px] text-muted-foreground tabular-nums shrink-0">
          {formatResultDate(row.publishDate)}
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      </Link>
    </motion.div>
  );
}

/* =========================================================
   Completed view
========================================================= */
function CompletedView({ active }: { active: boolean }) {
  const [rows, setRows] = useState<CompletedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [sort, setSort] = useState<CompletedSort>("newest");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const searchRef = useRef<HTMLInputElement>(null);

  const clearQuery = useCallback(() => setQuery(""), []);
  useSearchShortcuts(active, searchRef, clearQuery);

  useEffect(() => {
    apiFetch<CompletedResponse>("/api/subjects/results_all")
      .then(d => {
        if (d?.success && Array.isArray(d.rows)) setRows(d.rows);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

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
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "sv"));
  }, [rows]);

  const typeOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.assignmentType, (map.get(r.assignmentType) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter(r => {
      if (q) {
        const hay = `${r.title} ${r.teacher ?? ""} ${r.subjects.map(s => s.name).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (subjectFilter && !r.subjects.some(s => s.name === subjectFilter)) return false;
      if (typeFilter && r.assignmentType !== typeFilter) return false;
      if (unreadOnly && r.read) return false;
      return true;
    });

    list.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title, "sv");
      const diff = resultTime(b.publishDate) - resultTime(a.publishDate);
      return sort === "newest" ? diff : -diff;
    });
    return list;
  }, [rows, query, subjectFilter, typeFilter, unreadOnly, sort]);

  const shown = filtered.slice(0, limit);

  const groups = useMemo(() => {
    if (sort === "title") return [{ label: "", items: shown }];
    const out: { label: string; items: CompletedRow[] }[] = [];
    for (const r of shown) {
      const label = monthLabel(r.publishDate);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(r);
      else out.push({ label, items: [r] });
    }
    return out;
  }, [shown, sort]);

  const unreadCount = rows.filter(r => !r.read).length;
  const filtersActive = query.trim() !== "" || subjectFilter !== null || typeFilter !== null || unreadOnly;

  const clearAll = () => {
    setQuery("");
    setSubjectFilter(null);
    setTypeFilter(null);
    setUnreadOnly(false);
  };

  return (
    <div className={active ? "" : "hidden"}>
      <p className="text-sm text-muted-foreground mb-4">
        {loading
          ? "Loading…"
          : filtersActive
            ? `${filtered.length} of ${rows.length} assignments`
            : `${rows.length} assignments${unreadCount > 0 ? ` · ${unreadCount} unread` : ""}`}
      </p>

      {loading ? (
        <div className="space-y-2">
          <div className="h-10 rounded-xl bg-card border border-white/7 animate-pulse" />
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-16 rounded-xl bg-card border border-white/7 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-20 text-muted-foreground">
          <X className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Failed to load completed assignments.</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <CheckCheck className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Nothing completed yet.</p>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="sticky top-0 z-20 -mx-2 px-2 py-2 mb-4 backdrop-blur-md bg-background/70 space-y-2.5">
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
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-1 scrollbar-thin">
              <button
                onClick={() => setSubjectFilter(null)}
                aria-pressed={subjectFilter === null}
                className={[
                  "h-7 px-3 rounded-full text-xs font-medium border shrink-0 transition-colors",
                  subjectFilter === null
                    ? "bg-primary/15 border-primary/40 text-primary"
                    : "border-white/8 text-muted-foreground hover:text-foreground hover:border-white/20",
                ].join(" ")}
              >
                All subjects
              </button>
              {subjectOptions.map(s => {
                const on = subjectFilter === s.name;
                return (
                  <button
                    key={s.name}
                    onClick={() => setSubjectFilter(on ? null : s.name)}
                    aria-pressed={on}
                    className="h-7 px-3 rounded-full text-xs font-medium border shrink-0 transition-colors flex items-center gap-1.5"
                    style={
                      on
                        ? { background: `${s.color}25`, borderColor: `${s.color}70`, color: s.color }
                        : { borderColor: "oklch(1 0 0 / 8%)", color: "oklch(0.65 0 0)" }
                    }
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                    {s.name}
                    <span className="tabular-nums opacity-60">{s.count}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                {typeOptions.map(([type, count]) => {
                  const on = typeFilter === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(on ? null : type)}
                      aria-pressed={on}
                      className={[
                        "h-6 px-2.5 rounded-md text-[11px] font-medium border transition-colors flex items-center gap-1.5",
                        on
                          ? "bg-white/10 border-white/25 text-foreground"
                          : "border-white/8 text-muted-foreground hover:text-foreground hover:border-white/20",
                      ].join(" ")}
                    >
                      {type}
                      <span className="tabular-nums opacity-60">{count}</span>
                    </button>
                  );
                })}
                {unreadCount > 0 && (
                  <button
                    onClick={() => setUnreadOnly(u => !u)}
                    aria-pressed={unreadOnly}
                    className={[
                      "h-6 px-2.5 rounded-md text-[11px] font-medium border transition-colors flex items-center gap-1.5",
                      unreadOnly
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : "border-white/8 text-muted-foreground hover:text-foreground hover:border-white/20",
                    ].join(" ")}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Unread only
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Sort</span>
                <div className="flex rounded-lg border border-white/7 bg-card p-0.5">
                  {(Object.keys(COMPLETED_SORT_LABELS) as CompletedSort[]).map(s => (
                    <button
                      key={s}
                      onClick={() => setSort(s)}
                      aria-pressed={sort === s}
                      className={[
                        "h-6 px-2.5 rounded-md text-[11px] font-medium transition-colors",
                        sort === s ? "bg-white/10 text-foreground" : "hover:text-foreground",
                      ].join(" ")}
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
            <div className="text-center py-20 text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No assignments match your filters.</p>
              <button
                onClick={clearAll}
                className="mt-3 text-xs text-primary hover:underline underline-offset-2"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {groups.map(g => (
                <section key={g.label || "all"}>
                  {g.label && (
                    <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 px-1 flex items-center gap-2">
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
                    {g.items.map(r => (
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
                    onClick={() => setLimit(l => l + PAGE_SIZE)}
                    className="h-9 px-5 rounded-xl border border-white/10 bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors"
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

/* =========================================================
   Page
========================================================= */
export default function SubjectsPage() {
  const [tab, setTab] = useState<Tab>("subjects");
  const [completedVisited, setCompletedVisited] = useState(false);

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null");
      if (p?.tab === "completed") {
        setTab("completed");
        setCompletedVisited(true);
      }
    } catch {
      /* default tab */
    }
  }, []);

  const switchTab = (t: Tab) => {
    setTab(t);
    if (t === "completed") setCompletedVisited(true);
    patchPrefs({ tab: t });
  };

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "subjects", label: "Subjects", icon: BookOpen },
    { id: "completed", label: "Completed", icon: CheckCheck },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 flex items-center justify-between gap-4 flex-wrap"
      >
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          {tab === "subjects" ? (
            <BookOpen className="w-6 h-6 text-primary" />
          ) : (
            <CheckCheck className="w-6 h-6 text-primary" />
          )}
          {tab === "subjects" ? "Subjects" : "Completed"}
        </h1>

        <div role="tablist" className="inline-flex rounded-xl border border-white/7 bg-card p-0.5">
          {TABS.map(t => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => switchTab(t.id)}
              className={[
                "h-8 px-3.5 rounded-[10px] text-xs font-medium flex items-center gap-1.5 transition-colors",
                tab === t.id
                  ? "bg-white/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Both views stay mounted once opened, so switching tabs is instant and keeps filters */}
      <SubjectsView active={tab === "subjects"} />
      {completedVisited && <CompletedView active={tab === "completed"} />}
    </div>
  );
}