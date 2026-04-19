"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import { DashboardCard, staggerContainer } from "@/components/dashboard-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface Lesson {
  name: string;
  teacher?: string;
  room?: string;
  start: string;
  end: string;
  date?: string;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function SchedulePage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  const { weekStart, weekEnd, label } = getWeekBounds(weekOffset);

  // Helper to format a local yyyy-mm-dd key (avoid toISOString UTC shift)
  const formatLocalDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  useEffect(() => {
    setLoading(true);

    // Compute week bounds locally to avoid referring to Date objects that
    // change identity each render (which caused the effect to re-run
    // continuously).
    const { weekStart: ws, weekEnd: we } = getWeekBounds(weekOffset);

    // The backend returns: { success: true, schedule: [...] } (example.json)
    apiFetch<{ success: boolean; schedule?: any[]; data?: any[] }>("/api/schedule")
      .then((res) => {
        const arr = Array.isArray(res?.schedule) ? res!.schedule! : Array.isArray(res?.data) ? res!.data! : [];

        // Keep only events whose startDate falls within this week's bounds
        const startTs = ws.getTime();
        const endTs = (() => {
          const tmp = new Date(we);
          tmp.setHours(23, 59, 59, 999);
          return tmp.getTime();
        })();

        const filtered = arr.filter((ev) => {
          const s = ev.startDate ?? ev.start ?? ev.from;
          if (!s) return false;
          const t = new Date(s).getTime();
          return !Number.isNaN(t) && t >= startTs && t <= endTs;
        });

        // use formatLocalDateKey defined in outer scope

        // Map to Lesson shape used by this page
        const mapped: Lesson[] = filtered.map((ev) => {
          const sRaw = ev.startDate ?? ev.start ?? ev.from ?? "";
          const eRaw = ev.endDate ?? ev.end ?? ev.to ?? "";
          const s = new Date(sRaw);
          const e = new Date(eRaw);

          const time = (d: Date) => d.toTimeString().slice(0, 5);
          const name = ev.name ?? ev.title ?? ev.eventTitle ?? ev.subject ?? ev.activity ?? "Lesson";
          return {
            name,
            teacher: ev.teacher ?? ev.lecturer ?? undefined,
            room: ev.room ?? ev.location ?? undefined,
            start: Number.isNaN(s.getTime()) ? "" : time(s),
            end: Number.isNaN(e.getTime()) ? "" : time(e),
            date: Number.isNaN(s.getTime()) ? undefined : formatLocalDateKey(s),
          };
        });

        setLessons(mapped);
      })
      .catch(() => setLessons([]))
      .finally(() => setLoading(false));
  }, [weekOffset]);

  // Group by day
  const byDay: Record<string, Lesson[]> = {};
  for (let i = 0; i < 5; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const key = formatLocalDateKey(d);
    byDay[key] = lessons.filter((l) => !l.date || l.date === key);
  }

  const now = new Date();
  const today = formatLocalDateKey(now);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
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
            onClick={() => setWeekOffset(o => o - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 bg-white/5 text-xs"
            onClick={() => setWeekOffset(0)}
          >
            This week
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="w-8 h-8 border-white/10 bg-white/5"
            onClick={() => setWeekOffset(o => o + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {DAYS.map(d => (
            <div key={d} className="rounded-xl bg-card border border-white/7 p-3 space-y-2 animate-pulse">
              <div className="h-4 w-20 rounded bg-white/5 mb-3" />
              {[1, 2, 3].map(i => <div key={i} className="h-12 rounded bg-white/5" />)}
            </div>
          ))}
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-5 gap-3"
        >
            {Array.from({ length: 5 }, (_, i) => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            const key = formatLocalDateKey(d);
            const dayLessons = lessons.filter(l => !l.date || l.date === key);
            const isToday = key === today;

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={cn(
                  "rounded-xl border p-3",
                  isToday
                    ? "border-primary/30 bg-brand-dim"
                    : "border-white/7 bg-card"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-foreground/80">{DAYS[i]}</p>
                  {isToday && (
                    <Badge
                      className="text-[9px] px-1.5 py-0"
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
                {dayLessons.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center py-4">Free day</p>
                ) : (
                  <div className="space-y-2">
                    {dayLessons.map((l, j) => (
                      <div key={j} className="rounded-lg bg-white/4 p-2">
                        <p className="text-xs font-medium truncate mb-0.5">{l.name}</p>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="w-2.5 h-2.5" />
                          {l.start}–{l.end}
                        </div>
                        {l.room && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <MapPin className="w-2.5 h-2.5" />
                            {l.room}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

function getWeekBounds(offset: number) {
  const now = new Date();
  const day = now.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff + offset * 7);
  monday.setHours(0, 0, 0, 0);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const fmt = (d: Date) => d.toLocaleDateString("en-SE", { month: "short", day: "numeric" });
  return {
    weekStart: monday,
    weekEnd: friday,
    label: `${fmt(monday)} – ${fmt(friday)}, ${monday.getFullYear()}`,
  };
}
