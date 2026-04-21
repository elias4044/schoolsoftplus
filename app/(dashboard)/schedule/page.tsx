"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface Lesson {
  eventId: number | string;
  name: string;
  teacher?: string;
  room?: string;
  teachingGroup?: string;
  start: string;   // "HH:MM"
  end: string;     // "HH:MM"
  date: string;    // "YYYY-MM-DD"
  eventColor?: string;
  category?: string;
  status?: number;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

/* ── ISO week helpers ──────────────────────────────────────── */
function isoWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86_400_000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    )
  );
}

function getWeekBounds(offset: number) {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff + offset * 7);
  monday.setHours(0, 0, 0, 0);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const week = isoWeek(monday);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-SE", { month: "short", day: "numeric" });

  return {
    monday,
    friday,
    week,
    label: `Week ${week} · ${fmt(monday)} – ${fmt(friday)}, ${monday.getFullYear()}`,
  };
}

function localDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function timeStr(raw: string) {
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? "" : d.toTimeString().slice(0, 5);
}

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function durationLabel(start: string, end: string) {
  const diff = toMinutes(end) - toMinutes(start);
  if (diff <= 0) return null;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function lessonAccent(hex?: string): string {
  if (hex && /^#[0-9a-f]{6}$/i.test(hex)) return hex;
  return "oklch(0.62 0.16 263)"; // primary fallback
}

/* ── Lesson card ───────────────────────────────────────────── */
function LessonCard({ lesson, isOngoing }: { lesson: Lesson; isOngoing: boolean }) {
  const dur = durationLabel(lesson.start, lesson.end);
  const accent = lessonAccent(lesson.eventColor);

  return (
    <div
      className={cn(
        "rounded-lg overflow-hidden flex",
        isOngoing
          ? "bg-white/[0.07] ring-1 ring-white/15"
          : "bg-white/4 hover:bg-white/6 transition-colors"
      )}
    >
      {/* Left accent strip */}
      <div
        className="w-0.5 shrink-0 self-stretch"
        style={{ background: accent }}
      />

      <div className="flex-1 min-w-0 px-2.5 py-2">
        {/* Name row */}
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "text-xs font-semibold leading-snug truncate flex-1",
            isOngoing ? "text-foreground" : "text-foreground/80"
          )}>
            {lesson.name}
          </p>
          {isOngoing && (
            <span className="shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
              Now
            </span>
          )}
        </div>

        {/* Time + duration */}
        <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
          <Clock className="w-2.5 h-2.5 shrink-0" />
          <span>{lesson.start}–{lesson.end}</span>
          {dur && <span className="opacity-50">· {dur}</span>}
        </div>

        {/* Room / Teacher / Group — collapsed into one line when possible */}
        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
          {lesson.room && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <MapPin className="w-2.5 h-2.5 shrink-0" />
              {lesson.room}
            </span>
          )}
          {lesson.teacher && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <User className="w-2.5 h-2.5 shrink-0" />
              {lesson.teacher}
            </span>
          )}
          {lesson.teachingGroup && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Users className="w-2.5 h-2.5 shrink-0" />
              {lesson.teachingGroup}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────── */
export default function SchedulePage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const todayColRef = useRef<HTMLDivElement>(null);

  const { monday, week, label } = getWeekBounds(weekOffset);

  const nowTime = new Date();
  const todayKey = localDateKey(nowTime);
  const nowMinutes = nowTime.getHours() * 60 + nowTime.getMinutes();

  function isOngoing(l: Lesson) {
    if (l.date !== todayKey) return false;
    return nowMinutes >= toMinutes(l.start) && nowMinutes < toMinutes(l.end);
  }

  /* Scroll today's column into view on mobile when week loads */
  useEffect(() => {
    if (!loading && weekOffset === 0 && todayColRef.current) {
      todayColRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [loading, weekOffset]);

  useEffect(() => {
    setLoading(true);
    setLessons([]);

    apiFetch<{ success: boolean; schedule: any[] }>(`/api/schedule?week=${week}`)
      .then((res) => {
        const arr = Array.isArray(res?.schedule) ? res.schedule : [];
        const mapped: Lesson[] = arr.map((ev) => ({
          eventId: ev.eventId,
          name: ev.name ?? ev.title ?? ev.subject ?? "Lesson",
          teacher: ev.teacher || undefined,
          room: ev.room || undefined,
          teachingGroup: ev.teachingGroup || undefined,
          start: timeStr(ev.startDate ?? ""),
          end: timeStr(ev.endDate ?? ""),
          date: ev.startDate ? localDateKey(new Date(ev.startDate)) : "",
          eventColor: ev.eventColor || undefined,
          category: ev.category,
          status: ev.status,
        }));
        setLessons(mapped);
      })
      .catch(() => setLessons([]))
      .finally(() => setLoading(false));
  }, [week]);

  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const key = localDateKey(d);
    const dayLessons = lessons
      .filter((l) => l.date === key)
      .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
    return {
      key,
      label: DAYS[i],
      short: d.toLocaleDateString("en-SE", { month: "short", day: "numeric" }),
      isToday: key === todayKey,
      lessons: dayLessons,
    };
  });

  const totalLessons = days.reduce((s, d) => s + d.lessons.length, 0);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-3 mb-6"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" />
            Schedule
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {label}
            {!loading && totalLessons > 0 && (
              <span className="ml-2 opacity-50">· {totalLessons} lessons</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="w-8 h-8 border-white/10 bg-white/5"
            onClick={() => setWeekOffset((o) => o - 1)}
            aria-label="Previous week"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 bg-white/5 text-xs"
            onClick={() => setWeekOffset(0)}
            disabled={weekOffset === 0}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="w-8 h-8 border-white/10 bg-white/5"
            onClick={() => setWeekOffset((o) => o + 1)}
            aria-label="Next week"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      {/* Day columns */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {DAYS.map((d) => (
            <div
              key={d}
              className="rounded-xl bg-card border border-white/7 p-3 space-y-2 animate-pulse"
            >
              <div className="h-4 w-20 rounded bg-white/5 mb-3" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-white/5" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {days.map((day, i) => (
            <motion.div
              key={day.key}
              ref={day.isToday ? todayColRef : undefined}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={cn(
                "rounded-xl border flex flex-col min-h-0",
                day.isToday
                  ? "border-primary/20 bg-white/3"
                  : "border-white/7 bg-card"
              )}
            >
              {/* Day header */}
              <div className={cn(
                "flex items-center justify-between px-3 py-2.5 border-b shrink-0",
                day.isToday ? "border-primary/10" : "border-white/5"
              )}>
                <div>
                  <p className={cn(
                    "text-xs font-semibold",
                    day.isToday ? "text-primary" : "text-foreground/90"
                  )}>
                    {day.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{day.short}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {day.lessons.length > 0 && (
                    <span className={cn(
                      "text-[10px]",
                      day.isToday ? "text-primary/60" : "text-muted-foreground"
                    )}>
                      {day.lessons.length}
                    </span>
                  )}
                  {day.isToday && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                      Today
                    </span>
                  )}
                </div>
              </div>

              {/* Lesson cards */}
              <div className="flex-1 p-2 space-y-1.5 overflow-y-auto">
                {day.lessons.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground/40 text-center py-8">
                    No lessons
                  </p>
                ) : (
                  day.lessons.map((l) => (
                    <LessonCard key={l.eventId} lesson={l} isOngoing={isOngoing(l)} />
                  ))
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
