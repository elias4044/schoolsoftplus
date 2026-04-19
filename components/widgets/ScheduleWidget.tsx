"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { WidgetSize } from "@/lib/widgets/types";

interface Lesson {
  name: string;
  teacher?: string;
  room?: string;
  start: string;
  end: string;
  startDate?: string;
}

interface Props { size: WidgetSize }

export default function ScheduleWidget({ size }: Props) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ success: boolean; schedule?: any[] }>("/api/schedule")
      .then(res => {
        const arr = Array.isArray(res?.schedule) ? res.schedule : [];
        const today = new Date().toISOString().slice(0, 10);
        const toTime = (d: Date) => d.toTimeString().slice(0, 5);
        const mapped: Lesson[] = arr
          .filter(ev => {
            const s = ev.startDate ?? ev.start ?? "";
            return s.startsWith(today);
          })
          .map(ev => {
            const s = new Date(ev.startDate ?? ev.start);
            const e = new Date(ev.endDate ?? ev.end);
            return {
              name: ev.name ?? ev.title ?? ev.subject ?? "Lesson",
              teacher: ev.teacher ?? undefined,
              room: ev.room ?? ev.location ?? undefined,
              start: isNaN(s.getTime()) ? "" : toTime(s),
              end: isNaN(e.getTime()) ? "" : toTime(e),
              startDate: ev.startDate ?? ev.start ?? "",
            };
          });
        setLessons(mapped);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();

  const limit = size.endsWith("x1") ? 3 : 8;

  if (loading) return <LoadingRows rows={3} />;
  if (lessons.length === 0) return <Empty text="No lessons today!" />;

  return (
    <div className="space-y-1.5 h-full overflow-y-auto">
      {lessons.slice(0, limit).map((lesson, i) => {
        const start = parseTime(lesson.start, now);
        const end   = parseTime(lesson.end, now);
        const isNow = start <= now && now <= end;

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors",
              isNow ? "bg-brand-dim" : "hover:bg-white/3"
            )}
          >
            <div className="text-[10px] text-muted-foreground w-20 shrink-0 tabular-nums">
              {lesson.start}–{lesson.end}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{lesson.name}</p>
              {lesson.room && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5" />{lesson.room}
                </p>
              )}
            </div>
            {isNow && (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0"
                style={{ background: "oklch(0.65 0.22 278 / 20%)", color: "oklch(0.75 0.15 278)" }}
              >
                NOW
              </span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

function parseTime(timeStr: string, base: Date): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date(base);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

function LoadingRows({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-8 rounded-md animate-pulse" style={{ background: "oklch(1 0 0 / 5%)" }} />
      ))}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-xs text-muted-foreground text-center py-6">{text}</p>;
}
