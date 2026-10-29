'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardList,
  Clock,
} from 'lucide-react';

import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { WidgetSize } from '@/lib/widgets/types';
import { Badge } from '@/components/ui/badge';

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

interface Props {
  size: WidgetSize;
}

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
  const parts = subTitle.split(',');
  return parts.length >= 3
    ? parts[parts.length - 1].trim()
    : (parts[parts.length - 1]?.trim() ?? '');
}

function formatDue(sortDate: string): string {
  const d = new Date(sortDate);
  if (isNaN(d.getTime())) return sortDate;
  return d.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' });
}

function isDueSoon(sortDate: string): boolean {
  const d = new Date(sortDate);
  const diff = d.getTime() - Date.now();
  return diff >= 0 && diff < 3 * 24 * 60 * 60 * 1000;
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'SUBMITTED' || status === 'FINISHED')
    return <CheckCircle2 className="h-3 w-3 shrink-0 text-green-400" />;
  return <Circle className="text-muted-foreground/40 h-3 w-3 shrink-0" />;
}

export default function AssignmentsWidget({ size }: Props) {
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { week, year } = getWeekAndYear();
    apiFetch<{ success: boolean; data: Assignment[] }>(
      `/api/assignments/week?week=${week}&year=${year}`
    )
      .then((d) => setItems(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const compact = size === '4x1' || size === '2x1';
  const limit = compact ? 2 : 6;

  if (loading) return <LoadingRows rows={compact ? 2 : 4} />;
  if (items.length === 0) return <Empty text="No assignments this week — enjoy!" />;

  return (
    <div className="flex h-full flex-col gap-1.5 overflow-y-auto">
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
              className="border-border/40 flex items-start gap-2.5 border-b py-2 last:border-0"
            >
              <StatusIcon status={item.submissionStatus} />

              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'text-foreground/90 text-sm leading-snug',
                    compact ? 'truncate' : 'line-clamp-2'
                  )}
                >
                  {item.title}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  {subject && (
                    <Badge
                      variant="secondary"
                      className="px-1.5 py-0 text-[10px]"
                      style={{
                        background: 'oklch(0.65 0.22 278 / 15%)',
                        color: 'oklch(0.75 0.15 278)',
                        border: '1px solid oklch(0.65 0.22 278 / 20%)',
                      }}
                    >
                      {subject}
                    </Badge>
                  )}
                  <span
                    className={cn(
                      'flex items-center gap-1 text-[10px]',
                      soon ? 'text-amber-400' : 'text-muted-foreground'
                    )}
                  >
                    {soon && <AlertCircle className="h-2.5 w-2.5" />}
                    <Clock className="h-2.5 w-2.5" />
                    {formatDue(item.sortDate)}
                  </span>
                </div>
              </div>
            </motion.div>
          </Link>
        );
      })}

      {items.length > limit && (
        <a
          href="/subjects"
          className="text-muted-foreground hover:text-primary flex shrink-0 items-center gap-1 pt-1 text-[11px] transition-colors"
        >
          +{items.length - limit} more <ChevronRight className="h-3 w-3" />
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
          className="h-9 animate-pulse rounded-md"
          style={{ background: 'oklch(1 0 0 / 5%)', width: `${65 + i * 10}%` }}
        />
      ))}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-muted-foreground py-6 text-center text-xs">{text}</p>;
}
