"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCachedResource } from "@/lib/cache";
import { fetchSchedule, prefetchScheduleWeeks, scheduleKey } from "@/lib/cache/schedule";
import { cn } from "@/lib/utils";
import { PrintScheduleDialog } from "@/components/schedule-print";
import {
  DAYS,
  DAYS_SHORT,
  durationLabel,
  formatMinutes,
  getTimeRange,
  getWeekBounds,
  layoutLessons,
  lessonAccent,
  localDateKey,
  toMinutes,
  type Lesson,
} from "@/lib/schedule-utils";

type View = "days" | "timetable";
type LessonState = "none" | "past" | "now" | "upcoming";

interface WeekDay {
  key: string;
  label: string;
  short: string;
  date: string;
  dayNumber: number;
  isToday: boolean;
  lessons: Lesson[];
}

const VIEW_KEY = "schedule:view";
const PX_PER_MIN = 2;
const pillSpring = { type: "spring", stiffness: 420, damping: 34 } as const;

export default function SchedulePage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState<View>("days");
  const [selectedDay, setSelectedDay] = useState(0);
  const [printOpen, setPrintOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const { monday, week, range, label } = useMemo(() => getWeekBounds(weekOffset), [weekOffset]);

  // Cached lessons for this week show instantly; the API response replaces them when it arrives.
  // Each week has its own cache entry, so flipping between weeks you've seen is instant too.
  const { data, refreshing, error, refresh } = useCachedResource(scheduleKey(week), () =>
    fetchSchedule(week)
  );
  const lessons = useMemo(() => data ?? [], [data]);
  // Nothing to show yet (also covers the frame between switching weeks and reading the cache).
  const loading = data === null && !error;
  // Only show the error state when there's no cached data to fall back on.
  const failed = error && data === null;

  const todayKey = localDateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === "days" || saved === "timetable") setView(saved);
    } catch {}
  }, []);

  function changeView(next: View) {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {}
  }

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (weekOffset !== 0) return;
    const dow = (new Date().getDay() + 6) % 7;
    setSelectedDay(dow <= 4 ? dow : 0);
  }, [weekOffset]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (printOpen || e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable) return;
      if (e.key === "ArrowLeft") setWeekOffset((o) => o - 1);
      if (e.key === "ArrowRight") setWeekOffset((o) => o + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [printOpen]);

  // Once the visible week has settled, quietly warm the neighbouring weeks so the arrows feel instant.
  // Weeks cached within the last minute are skipped, so stepping through weeks doesn't refetch constantly.
  useEffect(() => {
    if (refreshing) return;
    void prefetchScheduleWeeks([weekOffset + 1, weekOffset - 1], { maxAgeMs: 60_000 });
  }, [weekOffset, refreshing]);

  const days: WeekDay[] = useMemo(
    () =>
      DAYS.map((dayLabel, i) => {
        const d = new Date(monday);
        d.setDate(d.getDate() + i);
        const key = localDateKey(d);
        return {
          key,
          label: dayLabel,
          short: DAYS_SHORT[i],
          date: d.toLocaleDateString("en-SE", { month: "short", day: "numeric" }),
          dayNumber: d.getDate(),
          isToday: key === todayKey,
          lessons: lessons
            .filter((l) => l.date === key)
            .sort((a, b) => toMinutes(a.start) - toMinutes(b.start)),
        };
      }),
    [monday, lessons, todayKey]
  );

  const totalLessons = lessons.length;

  function stateOf(l: Lesson): LessonState {
    if (l.date !== todayKey) return "none";
    if (nowMinutes >= toMinutes(l.end)) return "past";
    if (nowMinutes >= toMinutes(l.start)) return "now";
    return "upcoming";
  }

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <CalendarDays className="size-6 text-brand-strong" />
            Schedule
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {label}
            {!loading && totalLessons > 0 && (
              <span className="ml-2 opacity-60">· {totalLessons} lessons</span>
            )}
            {refreshing && !loading && (
              <span className="ml-2 animate-pulse text-xs opacity-60">· Updating</span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle value={view} onChange={changeView} />
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setWeekOffset((o) => o - 1)}
              aria-label="Previous week"
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekOffset(0)}
              disabled={weekOffset === 0}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setWeekOffset((o) => o + 1)}
              aria-label="Next week"
            >
              <ChevronRight />
            </Button>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPrintOpen(true)}
            disabled={loading || failed}
          >
            <Printer />
            Print
          </Button>
        </div>
      </motion.div>

      {loading ? (
        <ScheduleSkeleton />
      ) : failed ? (
        <EmptyState
          title="Couldn't load the schedule"
          action={
            <Button variant="secondary" size="sm" onClick={refresh}>
              Try again
            </Button>
          }
        />
      ) : totalLessons === 0 ? (
        <EmptyState title="No lessons this week" description="Nothing is scheduled for these days." />
      ) : view === "timetable" ? (
        <Timetable
          days={days}
          nowMinutes={nowMinutes}
          showNow={weekOffset === 0}
          stateOf={stateOf}
        />
      ) : (
        <DaysView
          days={days}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          stateOf={stateOf}
        />
      )}

      <PrintScheduleDialog
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        lessons={lessons}
        monday={monday}
        week={week}
        rangeLabel={range}
      />
    </div>
  );
}

function ViewToggle({ value, onChange }: { value: View; onChange: (v: View) => void }) {
  const options: { value: View; label: string }[] = [
    { value: "days", label: "Days" },
    { value: "timetable", label: "Timetable" },
  ];

  return (
    <div className="relative flex rounded-lg border border-border bg-overlay p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "relative h-8 rounded-md px-3 text-xs font-medium transition-colors",
            value === o.value ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {value === o.value && (
            <motion.span
              layoutId="schedule-view-pill"
              transition={pillSpring}
              className="absolute inset-0 rounded-md bg-brand-soft"
            />
          )}
          <span className="relative z-10">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

function DaysView({
  days,
  selectedDay,
  onSelectDay,
  stateOf,
}: {
  days: WeekDay[];
  selectedDay: number;
  onSelectDay: (i: number) => void;
  stateOf: (l: Lesson) => LessonState;
}) {
  const current = days[selectedDay] ?? days[0];

  return (
    <>
      <div className="hidden items-start gap-3 lg:grid lg:grid-cols-5">
        {days.map((day, i) => (
          <motion.div
            key={day.key}
            initial={{ opacity: 0, y: 8, filter: "blur(5px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: i * 0.05, duration: 0.3, ease: "easeOut" }}
          >
            <DayCard day={day} stateOf={stateOf} />
          </motion.div>
        ))}
      </div>

      <div className="lg:hidden">
        <div className="mb-3 grid grid-cols-5 gap-1 rounded-xl border border-border bg-card p-1">
          {days.map((day, i) => (
            <button
              key={day.key}
              type="button"
              onClick={() => onSelectDay(i)}
              className={cn(
                "relative flex flex-col items-center gap-0.5 rounded-lg py-2 transition-colors",
                selectedDay === i ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {selectedDay === i && (
                <motion.span
                  layoutId="schedule-day-pill"
                  transition={pillSpring}
                  className="absolute inset-0 rounded-lg bg-brand-soft"
                />
              )}
              <span className="relative z-10 text-[11px] uppercase tracking-wide">{day.short}</span>
              <span className="relative z-10 text-sm font-semibold">{day.dayNumber}</span>
              {day.isToday && (
                <span className="absolute bottom-1 z-10 size-1 rounded-full bg-brand" />
              )}
            </button>
          ))}
        </div>

        <motion.div
          key={current.key}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <DayCard day={current} stateOf={stateOf} />
        </motion.div>
      </div>
    </>
  );
}

function DayCard({ day, stateOf }: { day: WeekDay; stateOf: (l: Lesson) => LessonState }) {
  return (
    <section className={cn("rounded-xl border", day.isToday ? "today-card" : "card-base")}>
      <header className="flex items-center justify-between px-4 pb-1.5 pt-3">
        <div className="flex items-baseline gap-2">
          <h2 className={cn("text-sm font-semibold", day.isToday && "text-brand-strong")}>
            {day.label}
          </h2>
          <span className="text-xs text-muted-foreground">{day.date}</span>
        </div>
        {day.isToday && (
          <span className="badge-today rounded-full px-2 py-0.5 text-[10px] font-medium">Today</span>
        )}
      </header>

      <div className="space-y-0.5 p-1.5">
        {day.lessons.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground/60">No lessons</p>
        ) : (
          day.lessons.map((l) => <LessonRow key={l.eventId} lesson={l} state={stateOf(l)} />)
        )}
      </div>
    </section>
  );
}

function LessonRow({ lesson, state }: { lesson: Lesson; state: LessonState }) {
  const accent = lessonAccent(lesson.eventColor, "var(--brand)");
  const duration = durationLabel(lesson.start, lesson.end);
  const details = [lesson.room, lesson.teacher, lesson.teachingGroup].filter(Boolean).join(" · ");

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg px-2.5 py-2 transition-colors",
        state === "now" ? "bg-brand-dim ring-1 ring-inset ring-brand/25" : "hover:bg-overlay",
        state === "past" && "opacity-50"
      )}
    >
      <span className="w-1 shrink-0 self-stretch rounded-full" style={{ background: accent }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium">{lesson.name}</p>
          {state === "now" && (
            <span className="shrink-0 rounded-full bg-brand-soft px-1.5 py-0.5 text-[9px] font-medium text-brand-strong">
              Now
            </span>
          )}
        </div>
        <p className="text-xs tabular-nums text-muted-foreground">
          {lesson.start}–{lesson.end}
          {duration && <span className="opacity-60"> · {duration}</span>}
        </p>
        {details && <p className="mt-0.5 truncate text-xs text-muted-foreground">{details}</p>}
      </div>
    </div>
  );
}

function Timetable({
  days,
  nowMinutes,
  showNow,
  stateOf,
}: {
  days: WeekDay[];
  nowMinutes: number;
  showNow: boolean;
  stateOf: (l: Lesson) => LessonState;
}) {
  const laid = useMemo(
    () => days.map((day) => ({ day, items: layoutLessons(day.lessons) })),
    [days]
  );
  const range = useMemo(() => getTimeRange(days.flatMap((d) => d.lessons)), [days]);

  const height = (range.end - range.start) * PX_PER_MIN;
  const hours: number[] = [];
  for (let m = range.start; m <= range.end; m += 60) hours.push(m);

  return (
    <div className="card-base overflow-x-auto">
      <div className="min-w-200 p-3">
        <div className="grid grid-cols-[3rem_repeat(5,minmax(0,1fr))]">
          <div />
          {days.map((d) => (
            <div
              key={d.key}
              className={cn(
                "pb-2 text-center text-sm",
                d.isToday ? "font-semibold text-brand-strong" : "font-medium"
              )}
            >
              {d.short} <span className="text-xs font-normal text-muted-foreground">{d.dayNumber}</span>
            </div>
          ))}

          <div className="relative" style={{ height }}>
            {hours.map((m) => (
              <span
                key={m}
                className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground"
                style={{ top: (m - range.start) * PX_PER_MIN }}
              >
                {formatMinutes(m)}
              </span>
            ))}
          </div>

          {laid.map(({ day, items }) => (
            <div
              key={day.key}
              className={cn("relative border-l border-border", day.isToday && "bg-brand-dim")}
              style={{ height }}
            >
              {hours.map((m) => (
                <div
                  key={m}
                  className="absolute inset-x-0 border-t border-border/60"
                  style={{ top: (m - range.start) * PX_PER_MIN }}
                />
              ))}

              {items.map((it) => (
                <TimetableBlock
                  key={it.lesson.eventId}
                  item={it}
                  rangeStart={range.start}
                  state={stateOf(it.lesson)}
                />
              ))}

              {showNow && day.isToday && nowMinutes >= range.start && nowMinutes <= range.end && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                  style={{ top: (nowMinutes - range.start) * PX_PER_MIN }}
                >
                  <span className="size-2 -translate-x-1 rounded-full bg-brand" />
                  <span className="h-px flex-1 bg-brand" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TimetableBlock({
  item,
  rangeStart,
  state,
}: {
  item: ReturnType<typeof layoutLessons>[number];
  rangeStart: number;
  state: LessonState;
}) {
  const { lesson, lane, lanes } = item;
  const accent = lessonAccent(lesson.eventColor, "var(--brand)");
  const top = (item.start - rangeStart) * PX_PER_MIN;
  const blockHeight = Math.max((item.end - item.start) * PX_PER_MIN - 2, 18);
  const details = [lesson.room, lesson.teacher].filter(Boolean).join(" · ");

  return (
    <div
      title={`${lesson.name}\n${lesson.start}–${lesson.end}`}
      className={cn(
        "absolute overflow-hidden rounded-md px-2.5 py-1 text-xs leading-tight",
        state === "now" && "ring-1 ring-brand/50",
        state === "past" && "opacity-50"
      )}
      style={{
        top: top + 1,
        height: blockHeight,
        left: `calc(${(lane / lanes) * 100}% + 2px)`,
        width: `calc(${100 / lanes}% - 4px)`,
        background: `color-mix(in oklch, ${accent} 18%, var(--card))`,
        boxShadow: `inset 3px 0 0 ${accent}`,
      }}
    >
      <p className="truncate font-medium text-foreground">{lesson.name}</p>
      {blockHeight >= 40 && details && (
        <p className="truncate text-muted-foreground">{details}</p>
      )}
      {blockHeight >= 58 && (
        <p className="tabular-nums text-muted-foreground">
          {lesson.start}–{lesson.end}
        </p>
      )}
    </div>
  );
}

function ScheduleSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {DAYS.map((d) => (
        <div key={d} className="card-base space-y-2 p-3">
          <div className="skeleton mb-3 h-4 w-20" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-14" />
          ))}
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card-base flex flex-col items-center gap-2 px-6 py-16 text-center">
      <CalendarDays className="size-8 text-muted-foreground/50" />
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}