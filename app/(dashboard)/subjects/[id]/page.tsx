"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  ArrowLeft,
  ClipboardList,
  FlaskConical,
  FileText,
  CheckSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { staggerContainer, fadeUp } from "@/components/dashboard-card";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";
import Link from "next/link";

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
  entityType: "ASSIGNMENT" | "PLANNING" | string;
  activityId: number;
  title: string;
  subTitle?: string | null;
  type: string;
  endDate: string;
  endTime?: string;
  submissionDate?: string | null;
  submissionStatus: string;
  resultReportStatus: string;
  status: "ACTIVE" | "EXPIRED" | "UPCOMING" | string;
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
  "Classroom Activity": ClipboardList,
};

function getTypeIcon(type: string): React.ElementType {
  return TYPE_ICON[type] ?? ClipboardList;
}

function statusStyle(status: string): { bg: string; color: string; border: string } {
  switch (status) {
    case "ACTIVE":
      return {
        bg: "oklch(0.65 0.22 148 / 15%)",
        color: "oklch(0.65 0.22 148)",
        border: "oklch(0.65 0.22 148 / 30%)",
      };
    case "UPCOMING":
      return {
        bg: "oklch(0.65 0.22 278 / 15%)",
        color: "oklch(0.75 0.15 278)",
        border: "oklch(0.65 0.22 278 / 30%)",
      };
    default: // EXPIRED
      return {
        bg: "oklch(1 0 0 / 5%)",
        color: "oklch(0.55 0 0)",
        border: "oklch(1 0 0 / 10%)",
      };
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-SE", { day: "numeric", month: "short", year: "numeric" });
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
    <div className="rounded-xl border border-white/7 bg-card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/3 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">{title}</span>
          {count != null && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/8 text-muted-foreground tabular-nums">
              {count}
            </span>
          )}
        </div>
        <motion.div animate={{ rotate: open ? 0 : -90 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: "hidden" }}
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
      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
    >
      <ArrowLeft className="w-4 h-4" /> Back
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
        "flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0 rounded-lg px-2 -mx-2 transition-colors",
        href ? "cursor-pointer hover:bg-white/4 active:bg-white/6" : "",
      ].join(" ")}
      onClick={href ? handleClick : undefined}
      tabIndex={href ? 0 : undefined}
      role={href ? "button" : undefined}
      onKeyDown={href ? (e) => { if (e.key === "Enter" || e.key === " ") handleClick(); } : undefined}
      style={href ? { outline: "none" } : undefined}
    >
      <div
        className="flex items-center justify-center w-7 h-7 rounded-md shrink-0 mt-0.5"
        style={{ background: s.bg, border: `1px solid ${s.border}` }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: s.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-foreground/90 truncate">{item.title}</p>
          {!item.read && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
          )}
        </div>
        {item.subTitle && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.subTitle}</p>
        )}
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {formatDate(item.endDate)}
            {item.endTime && item.endTime !== "00:00" && ` · ${item.endTime}`}
          </span>
          <Badge
            className="text-[9px] h-4 px-1.5"
            style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
          >
            {item.status}
          </Badge>
          {item.resultReportStatus === "REPORTED" && (
            <span className="flex items-center gap-0.5 text-[9px] text-green-400/70">
              <CheckCircle2 className="w-2.5 h-2.5" /> Reported
            </span>
          )}
        </div>
      </div>
      <span
        className="text-[10px] shrink-0 mt-1"
        style={{ color: s.color, opacity: 0.7 }}
      >
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
      .then(d => {
        if (d?.success) setData(d);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <div className="h-8 w-48 rounded-lg bg-card animate-pulse" />
        <div className="h-24 rounded-xl bg-card animate-pulse" />
        <div className="h-64 rounded-xl bg-card animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
          <AlertCircle className="w-8 h-8 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Failed to load subject data.</p>
        </div>
      </div>
    );
  }

  const { subject, assignments } = data;

  const subjectColor = subject.color ?? "oklch(0.65 0.22 278)";
  const subjectName = subject.subject;

  // Split assignments by entity type
  const tasks = assignments.filter(a => a.entityType === "ASSIGNMENT");
  const plannings = assignments.filter(a => a.entityType === "PLANNING");

  // Split tasks by status
  const active = tasks.filter(a => a.status === "ACTIVE" || a.status === "UPCOMING");
  const expired = tasks.filter(a => a.status === "EXPIRED");

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Back */}
      <BackButton onClick={() => router.back()} />

      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-xl border border-white/7 bg-card px-5 py-4 mb-5 flex items-center gap-4"
        style={{ borderLeft: `4px solid ${subjectColor}` }}
      >
        <div
          className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0 font-bold text-lg"
          style={{ background: `${subjectColor}20`, color: subjectColor }}
        >
          <BookOpen className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight">{subjectName}</h1>
          {subject.groupNames && subject.groupNames.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {subject.groupNames.map(g => (
                <span
                  key={g}
                  className="text-[10px] px-2 py-0.5 rounded-full"
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
        <div className="flex flex-col items-end gap-1 shrink-0 text-xs text-muted-foreground">
          <span>{tasks.length} tasks</span>
          {active.length > 0 && (
            <span className="text-green-400/80">{active.length} active</span>
          )}
        </div>
      </motion.div>

      {/* Sections */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="space-y-3"
      >
        {/* Active / Upcoming */}
        {active.length > 0 && (
          <motion.div variants={fadeUp}>
            <Section title="Active & Upcoming" icon={CheckCircle2} count={active.length}>
              <motion.div variants={staggerContainer} initial="hidden" animate="show">
                {active.map((a, i) => (
                  <AssignmentRow key={a.id} item={a} index={i} href={`/subjects/${id}/${a.id}?type=${a.entityType.toLowerCase()}`} />
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
                  <AssignmentRow key={a.id} item={a} index={i} href={`/subjects/${id}/${a.id}?type=${a.entityType.toLowerCase()}`} />
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
                  <AssignmentRow key={a.id} item={a} index={i} href={`/subjects/${id}/${a.id}?type=${a.entityType.toLowerCase()}`} />
                ))}
              </motion.div>
            </Section>
          </motion.div>
        )}

        {assignments.length === 0 && (
          <motion.div
            variants={fadeUp}
            className="text-center py-16 text-muted-foreground text-sm"
          >
            No assignments found for this subject.
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
