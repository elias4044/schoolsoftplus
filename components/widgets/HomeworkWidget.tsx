"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ClipboardList, Clock, ChevronRight, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { WidgetSize } from "@/lib/widgets/types";
import Link from "next/link";

interface Assignment {
  id: number;
  activityId: number;
  title: string;
  subTitle: string;
  read: boolean;
  submissionStatus: string;
  resultReportStatus: string;
  sortDate: string;
}

interface Props { size: WidgetSize }

function getWeekAndYear() {
  const now = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const diff = now.getTime() - startOfWeek1.getTime();
  const week = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
  return { week, year: now.getFullYear() };
}

function parseSubject(subTitle: string): string {
  // subTitle format: "mån 02 mars 00:00 - tors 30 apr. 00:00, Assessment, Swedish"
  const parts = subTitle.split(",");
  return parts.length >= 3 ? parts[parts.length - 1].trim() : parts[parts.length - 1]?.trim() ?? "";
}

function formatDue(sortDate: string): string {
  const d = new Date(sortDate);
  if (isNaN(d.getTime())) return sortDate;
  return d.toLocaleDateString("sv-SE", { month: "short", day: "numeric" });
}

function isDueSoon(sortDate: string): boolean {
  const d = new Date(sortDate);
  const diff = d.getTime() - Date.now();
  return diff >= 0 && diff < 3 * 24 * 60 * 60 * 1000;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "SUBMITTED" || status === "FINISHED")
    return <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />;
  return <Circle className="w-3 h-3 text-muted-foreground/40 shrink-0" />;
}

export default function AssignmentsWidget({ size }: Props) {
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { week, year } = getWeekAndYear();
    apiFetch<{ success: boolean; data: Assignment[] }>(
      `/api/assignments/week?week=${week}&year=${year}`
    )
      .then(d => setItems(d.data ?? []))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const compact = size === "4x1" || size === "2x1";
  const limit = compact ? 2 : 6;

  if (loading) return <LoadingRows rows={compact ? 2 : 4} />;
  if (items.length === 0) return <Empty text="No assignments this week — enjoy!" />;

  return (
    <div className="flex flex-col gap-1.5 h-full overflow-y-auto">
      {items.slice(0, limit).map((item, i) => {
        const subject = parseSubject(item.subTitle);
        const soon = isDueSoon(item.sortDate);
        return (
          <Link href={`/subjects/${item.activityId}/${item.id}`} key={item.id} className="block">
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-2.5 py-2 border-b border-border/40 last:border-0"
            >
              <StatusIcon status={item.submissionStatus} />

              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm text-foreground/90 leading-snug",
                  compact ? "truncate" : "line-clamp-2"
                )}>
                  {item.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {subject && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0"
                      style={{
                        background: "oklch(0.65 0.22 278 / 15%)",
                        color: "oklch(0.75 0.15 278)",
                        border: "1px solid oklch(0.65 0.22 278 / 20%)",
                      }}
                    >
                      {subject}
                    </Badge>
                  )}
                  <span
                    className={cn(
                      "text-[10px] flex items-center gap-1",
                      soon ? "text-amber-400" : "text-muted-foreground"
                    )}
                  >
                    {soon && <AlertCircle className="w-2.5 h-2.5" />}
                    <Clock className="w-2.5 h-2.5" />
                    {formatDue(item.sortDate)}
                  </span>
                </div>
              </div>
            </motion.div></Link>
        );
      })}

      {items.length > limit && (
        <a
          href="/subjects"
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors pt-1 shrink-0"
        >
          +{items.length - limit} more <ChevronRight className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

function LoadingRows({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-9 rounded-md animate-pulse"
          style={{ background: "oklch(1 0 0 / 5%)", width: `${65 + i * 10}%` }}
        />
      ))}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-xs text-muted-foreground text-center py-6">{text}</p>;
}
