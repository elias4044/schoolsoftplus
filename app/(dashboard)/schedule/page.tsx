"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

/* ── Color helpers ─────────────────────────────────────────── */
function lessonColor(hex?: string) {
  if (hex && /^#[0-9a-f]{6}$/i.test(hex)) return hex;
  return null; // use brand colour below
}

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ── Lesson card ───────────────────────────────────────────── */
function LessonCard({ lesson, isOngoing }: { lesson: Lesson; isOngoing: boolean }) {
  const color = lessonColor(lesson.eventColor);
  const stripColor = color ?? "oklch(0.62 0.16 263)";
  const cardBg = color
    ? hexToRgba(color, 0.08)
    : "oklch(0.62 0.16 263 / 8%)";

  return (
    <div
      className={cn(
        "relative rounded-lg overflow-hidden flex gap-0",
        isOngoing && "ring-1 ring-white/20"
      )}
      style={{ background: cardBg }}
    >
      {/* Left colour strip */}
      <div
        className="w-1 shrink-0 self-stretch"
        style={{ background: stripColor }}
      />

      <div className="flex-1 min-w-0 p-2">
        {/* Name + "Now" badge */}
        <div className="flex items-start justify-between gap-1">
          <p className="text-xs font-semibold leading-snug truncate flex-1">{lesson.name}</p>
          {isOngoing && (
            <span
              className="shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-full"
              style={{
                background: "oklch(0.72 0.18 148 / 18%)",
                color: "oklch(0.72 0.18 148)",
              }}
            >
              Now
            </span>
          )}
        </div>

        {/* Time */}
        <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
          <Clock className="w-2.5 h-2.5 shrink-0" />
          <span>{lesson.start}–{lesson.end}</span>
        </div>

        {/* Room */}
        {lesson.room && (
          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
            <MapPin className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{lesson.room}</span>
          </div>
        )}

        {/* Teacher */}
        {lesson.teacher && (
          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
            <User className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{lesson.teacher}</span>
          </div>
        )}

        {/* Teaching group */}
        {lesson.teachingGroup && (
          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
            <Users className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{lesson.teachingGroup}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────── */
export default function SchedulePage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  const { monday, week, label } = getWeekBounds(weekOffset);

  const nowTime = new Date();
  const todayKey = localDateKey(nowTime);
  const nowMinutes = nowTime.getHours() * 60 + nowTime.getMinutes();

  function isOngoing(l: Lesson) {
    if (l.date !== todayKey) return false;
    const [sh, sm] = l.start.split(":").map(Number);
    const [eh, em] = l.end.split(":").map(Number);
    return nowMinutes >= sh * 60 + sm && nowMinutes < eh * 60 + em;
  }

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
    return {
      key,
      label: DAYS[i],
      short: d.toLocaleDateString("en-SE", { month: "short", day: "numeric" }),
      isToday: key === todayKey,
      lessons: lessons.filter((l) => l.date === key),
    };
  });

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
          <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
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
            This week
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
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "rounded-xl border flex flex-col min-h-0",
                day.isToday
                  ? "border-primary/30 bg-brand-dim"
                  : "border-white/7 bg-card"
              )}
            >
              {/* Day header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/5 shrink-0">
                <div>
                  <p className="text-xs font-semibold text-foreground/90">{day.label}</p>
                  <p className="text-[10px] text-muted-foreground">{day.short}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {day.lessons.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {day.lessons.length}
                    </span>
                  )}
                  {day.isToday && (
                    <Badge
                      className="text-[9px] px-1.5 py-0 h-4"
                      style={{
                        background: "oklch(0.65 0.22 278 / 20%)",
                        color: "oklch(0.75 0.15 278)",
                        border: "1px solid oklch(0.65 0.22 278 / 30%)",
                      }}
                    >
                      Today
                    </Badge>
                  )}
                </div>
              </div>

              {/* Lesson cards */}
              <div className="flex-1 p-2 space-y-1.5 overflow-y-auto">
                {day.lessons.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center py-6">
                    Free day
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
