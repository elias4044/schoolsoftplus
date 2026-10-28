'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  Clock,
  FileText,
  FlaskConical,
} from 'lucide-react';

import { fadeUp, staggerContainer } from '@/lib/animations';
import { apiFetch } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { GradeTracker } from '@/components/grades/GradeTracker';

/* -- Types ------------------------------------------------ */
interface SubjectDetail {
  activityId: number;
  subject: string;
  groupNames?: string[];
  color?: string;
  isPreSchool?: boolean;
  access?: boolean;
  isSubjectRoom?: boolean;
}

interface Assignment {
  id: number;
  partId: number | null;
  entityType: 'ASSIGNMENT' | 'PLANNING' | string;
  activityId: number;
  title: string;
  subTitle?: string | null;
  type: string;
  endDate: string;
  endTime?: string;
  submissionDate?: string | null;
  submissionStatus: string;
  resultReportStatus: string;
  status: 'ONGOING' | 'EXPIRED' | 'UPCOMING' | string;
  subjectNames?: string[];
  read?: boolean;
}

interface SubjectResponse {
  success: boolean;
  subject: SubjectDetail;
  overview: {
    examinations: unknown[];
    submissions: unknown[];
  };
  assignments: Assignment[];
}

/* -- Helpers ---------------------------------------------- */
const TYPE_ICON: Record<string, React.ElementType> = {
  Test: FlaskConical,
  Checkpoint: CheckSquare,
  Planning: FileText,
  'Classroom Activity': ClipboardList,
};

function getTypeIcon(type: string): React.ElementType {
  return TYPE_ICON[type] ?? ClipboardList;
}

function statusStyle(status: string): { bg: string; color: string; border: string } {
  switch (status) {
    case 'ONGOING':
      return {
        bg: 'oklch(0.65 0.22 148 / 15%)',
        color: 'oklch(0.65 0.22 148)',
        border: 'oklch(0.65 0.22 148 / 30%)',
      };
    case 'UPCOMING':
      return {
        bg: 'oklch(0.65 0.22 278 / 15%)',
        color: 'oklch(0.75 0.15 278)',
        border: 'oklch(0.65 0.22 278 / 30%)',
      };
    default: // EXPIRED
      return {
        bg: 'oklch(1 0 0 / 5%)',
        color: 'oklch(0.55 0 0)',
        border: 'oklch(1 0 0 / 10%)',
      };
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-SE', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* -- Section component ------------------------------------ */
function Section({
  title,
  icon: Icon,
  count,
  children,
}: {
  title: string;
  icon: React.ElementType;
  count?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-card overflow-hidden rounded-xl border border-white/7">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3.5 transition-colors hover:bg-white/3"
      >
        <div className="flex items-center gap-2.5">
          <Icon className="text-primary h-4 w-4" />
          <span className="text-sm font-semibold">{title}</span>
          {count != null && (
            <span className="text-muted-foreground rounded-full bg-white/8 px-1.5 py-0.5 text-[10px] tabular-nums">
              {count}
            </span>
          )}
        </div>
        <motion.div animate={{ rotate: open ? 0 : -90 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="text-muted-foreground h-4 w-4" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      className="text-muted-foreground hover:text-foreground mb-5 flex items-center gap-1.5 text-sm transition-colors"
    >
      <ArrowLeft className="h-4 w-4" /> Back
    </motion.button>
  );
}

/* -- Assignment row --------------------------------------- */
function AssignmentRow({ item, index, href }: { item: Assignment; index: number; href?: string }) {
  const Icon = getTypeIcon(item.type);
  const s = statusStyle(item.status);
  const router = useRouter();

  const handleClick = () => {
    if (href) router.push(href);
  };

  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      className={[
        '-mx-2 flex items-start gap-3 rounded-lg border-b border-white/5 px-2 py-2.5 transition-colors last:border-0',
        href ? 'cursor-pointer hover:bg-white/4 active:bg-white/6' : '',
      ].join(' ')}
      onClick={href ? handleClick : undefined}
      tabIndex={href ? 0 : undefined}
      role={href ? 'button' : undefined}
      onKeyDown={
        href
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') handleClick();
            }
          : undefined
      }
      style={href ? { outline: 'none' } : undefined}
    >
      <div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
        style={{ background: s.bg, border: `1px solid ${s.border}` }}
      >
        <Icon className="h-3.5 w-3.5" style={{ color: s.color }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-foreground/90 truncate text-sm font-medium">{item.title}</p>
          {!item.read && <span className="bg-primary h-1.5 w-1.5 shrink-0 rounded-full" />}
        </div>
        {item.subTitle && (
          <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">{item.subTitle}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <span className="text-muted-foreground flex items-center gap-1 text-[10px]">
            <Clock className="h-2.5 w-2.5" />
            {formatDate(item.endDate)}
            {item.endTime && item.endTime !== '00:00' && ` · ${item.endTime}`}
          </span>
          <Badge
            className="h-4 px-1.5 text-[9px]"
            style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
          >
            {item.status}
          </Badge>
          {item.resultReportStatus === 'REPORTED' && (
            <span className="flex items-center gap-0.5 text-[9px] text-green-400/70">
              <CheckCircle2 className="h-2.5 w-2.5" /> Reported
            </span>
          )}
        </div>
      </div>
      <span className="mt-1 shrink-0 text-[10px]" style={{ color: s.color, opacity: 0.7 }}>
        {item.type}
      </span>
    </motion.div>
  );
}

/* -- Page ------------------------------------------------- */
export default function SubjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<SubjectResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiFetch<SubjectResponse>(`/api/subjects/${id}`)
      .then((d) => {
        if (d?.success) setData(d);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <div className="bg-card h-8 w-48 animate-pulse rounded-lg" />
        <div className="bg-card h-24 animate-pulse rounded-xl" />
        <div className="bg-card h-64 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <button
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <AlertCircle className="text-muted-foreground h-8 w-8" />
          <p className="text-muted-foreground text-sm">Failed to load subject data.</p>
        </div>
      </div>
    );
  }

  const { subject, assignments } = data;

  const subjectColor = subject.color ?? 'oklch(0.65 0.22 278)';
  const subjectName = subject.subject;

  // Split assignments by entity type
  const tasks = assignments.filter((a) => a.entityType === 'ASSIGNMENT');
  const plannings = assignments.filter((a) => a.entityType === 'PLANNING');

  // Split tasks by status
  const active = tasks.filter((a) => a.status === 'ONGOING' || a.status === 'UPCOMING');
  const expired = tasks.filter((a) => a.status === 'EXPIRED');

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Back */}
      <BackButton onClick={() => router.back()} />

      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-card mb-5 flex items-center gap-4 rounded-xl border border-white/7 px-5 py-4"
        style={{ borderLeft: `4px solid ${subjectColor}` }}
      >
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold"
          style={{ background: `${subjectColor}20`, color: subjectColor }}
        >
          <BookOpen className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold tracking-tight">{subjectName}</h1>
          {subject.groupNames && subject.groupNames.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {subject.groupNames.map((g) => (
                <span
                  key={g}
                  className="rounded-full px-2 py-0.5 text-[10px]"
                  style={{
                    background: `${subjectColor}15`,
                    color: subjectColor,
                    border: `1px solid ${subjectColor}30`,
                  }}
                >
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="text-muted-foreground flex shrink-0 flex-col items-end gap-1 text-xs">
          <span>{tasks.length} tasks</span>
          {active.length > 0 && <span className="text-green-400/80">{active.length} active</span>}
        </div>
      </motion.div>

      {/* Mobile grade tracker */}
      <div className="lg:hidden">
        <GradeTracker
          subjectId={id}
          subjectName={subjectName}
          subjectColor={subjectColor}
          variant="mobile"
        />
      </div>

      <div className="lg:grid lg:grid-cols-[1fr_300px] lg:items-start lg:gap-6">
        {/* Sections */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="min-w-0 space-y-3"
        >
          {/* Active / Upcoming */}
          {active.length > 0 && (
            <motion.div variants={fadeUp}>
              <Section title="Active & Upcoming" icon={CheckCircle2} count={active.length}>
                <motion.div variants={staggerContainer} initial="hidden" animate="show">
                  {active.map((a, i) => (
                    <AssignmentRow
                      key={a.id}
                      item={a}
                      index={i}
                      href={`/subjects/${id}/${a.id}?type=${a.entityType.toLowerCase()}`}
                    />
                  ))}
                </motion.div>
              </Section>
            </motion.div>
          )}

          {/* Past assignments */}
          {expired.length > 0 && (
            <motion.div variants={fadeUp}>
              <Section title="Past Assignments" icon={ClipboardList} count={expired.length}>
                <motion.div variants={staggerContainer} initial="hidden" animate="show">
                  {expired.map((a, i) => (
                    <AssignmentRow
                      key={a.id}
                      item={a}
                      index={i}
                      href={`/subjects/${id}/${a.id}?type=${a.entityType.toLowerCase()}`}
                    />
                  ))}
                </motion.div>
              </Section>
            </motion.div>
          )}

          {/* Planning */}
          {plannings.length > 0 && (
            <motion.div variants={fadeUp}>
              <Section title="Planning" icon={FileText} count={plannings.length}>
                <motion.div variants={staggerContainer} initial="hidden" animate="show">
                  {plannings.map((a, i) => (
                    <AssignmentRow
                      key={a.id}
                      item={a}
                      index={i}
                      href={`/subjects/${id}/${a.id}?type=${a.entityType.toLowerCase()}`}
                    />
                  ))}
                </motion.div>
              </Section>
            </motion.div>
          )}

          {assignments.length === 0 && (
            <motion.div
              variants={fadeUp}
              className="text-muted-foreground py-16 text-center text-sm"
            >
              No assignments found for this subject.
            </motion.div>
          )}
        </motion.div>

        {/* Desktop grade tracker sidebar */}
        <div className="hidden lg:block">
          <GradeTracker
            subjectId={id}
            subjectName={subjectName}
            subjectColor={subjectColor}
            variant="sidebar"
          />
        </div>
      </div>
    </div>
  );
}
