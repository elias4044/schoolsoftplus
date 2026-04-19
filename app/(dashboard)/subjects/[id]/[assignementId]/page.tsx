"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  AlertCircle,
  ClipboardList,
  FlaskConical,
  FileText,
  CheckSquare,
  Clock,
  CheckCircle2,
  MessageSquare,
  BookMarked,
  Link2,
  ChevronDown,
  CalendarDays,
  User,
  Tag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { staggerContainer, fadeUp } from "@/components/dashboard-card";
import { apiFetch } from "@/lib/api-client";

/* -------------------------------------------------------------------------
   Types
-------------------------------------------------------------------------- */
interface AssignmentMeta {
  id: number;
  title: string;
  subTitle?: string | null;
  description?: string | null;
  type: string;
  status: string;
  endDate?: string | null;
  endTime?: string | null;
  publishDate?: string | null;
  subjectNames?: string;
  subjectRoomId?: number | null;
  submissionStatus: string;
  resultReportStatus: string;
}

interface Assessment {
  review: string;
  teacherComment: string | null;
  studentComment: string;
  partialMoments: unknown[];
  assessedCriteriaTabs: unknown[];
}

interface Grading {
  availableColumns: unknown[];
  selectedCriteria: unknown[];
}

interface AssignmentDetailResponse {
  success: boolean;
  type: "assignment" | "planning";
  assignment: AssignmentMeta;
  sections: Record<string, unknown>[];
  connectedPlannings: Record<string, unknown>[];
  assessment: Assessment;
  grading: Grading;
}

/* -------------------------------------------------------------------------
   Constants / helpers
-------------------------------------------------------------------------- */
const TYPE_ICONS: Record<string, React.ElementType> = {
  Test:               FlaskConical,
  Checkpoint:         CheckSquare,
  Planning:           FileText,
  "Classroom Activity": ClipboardList,
};

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string; label: string }> = {
  ACTIVE:   { bg: "oklch(0.65 0.22 148 / 15%)", color: "oklch(0.65 0.22 148)",  border: "oklch(0.65 0.22 148 / 30%)",  label: "Active"   },
  UPCOMING: { bg: "oklch(0.65 0.22 278 / 15%)", color: "oklch(0.75 0.15 278)",  border: "oklch(0.65 0.22 278 / 30%)",  label: "Upcoming" },
  EXPIRED:  { bg: "oklch(1 0 0 / 5%)",          color: "oklch(0.55 0 0)",        border: "oklch(1 0 0 / 10%)",          label: "Expired"  },
};

const SUBMISSION_STYLE: Record<string, { color: string; label: string }> = {
  SUBMITTED:  { color: "oklch(0.65 0.22 148)", label: "Submitted"  },
  NO_STATUS:  { color: "oklch(0.55 0 0)",       label: "Not submitted" },
  LATE:       { color: "oklch(0.65 0.18 40)",   label: "Late"       },
};

const RESULT_STYLE: Record<string, { color: string; label: string }> = {
  REPORTED:   { color: "oklch(0.65 0.22 148)", label: "Reported"     },
  NO_STATUS:  { color: "oklch(0.55 0 0)",       label: "Not reported" },
};

function getStatusStyle(status: string) {
  return STATUS_STYLE[status] ?? STATUS_STYLE.EXPIRED;
}

function formatDate(dateStr?: string | null, timeStr?: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const date = d.toLocaleDateString("en-SE", { day: "numeric", month: "short", year: "numeric" });
  if (timeStr && timeStr !== "00:00" && timeStr !== "") return `${date} · ${timeStr}`;
  return date;
}

/* -------------------------------------------------------------------------
   Sub-components
-------------------------------------------------------------------------- */

/** Collapsible card section */
function Section({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
  badge,
}: {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: string | number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-white/7 bg-card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/3 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-semibold">{title}</span>
          {badge != null && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/8 text-muted-foreground tabular-nums">
              {badge}
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
            key="body"
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

/** Key-value meta row */
function MetaRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-1.5 w-32 shrink-0 text-xs text-muted-foreground mt-0.5">
        <Icon className="w-3 h-3 shrink-0" />
        {label}
      </div>
      <div className="flex-1 text-xs text-foreground/90">{children}</div>
    </div>
  );
}

/** Inline comment block */
function CommentBlock({ label, text }: { label: string; text: string }) {
  if (!text) return null;
  return (
    <div className="rounded-lg bg-white/4 border border-white/6 px-3 py-2.5 mb-2">
      <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide">{label}</p>
      <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">{text}</p>
    </div>
  );
}

/** Skeleton loader */
function Skeleton() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <div className="h-6 w-40 rounded-lg bg-card animate-pulse" />
      <div className="h-28 rounded-xl bg-card animate-pulse" />
      <div className="h-48 rounded-xl bg-card animate-pulse" />
      <div className="h-32 rounded-xl bg-card animate-pulse" />
    </div>
  );
}

/* -------------------------------------------------------------------------
   Page
-------------------------------------------------------------------------- */
export default function AssignmentDetailPage() {
  const { assignementId: id } = useParams<{ assignementId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const type = searchParams.get("type") ?? "assignment";

  const [data, setData] = useState<AssignmentDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiFetch<AssignmentDetailResponse>(`/api/assignment/${id}?type=${type}`)
      .then(d => {
        if (d?.success) setData(d);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id, type]);

  if (loading) return <Skeleton />;

  if (error || !data) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <BackButton onClick={() => router.back()} />
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Failed to load assignment data.</p>
        </div>
      </div>
    );
  }

  const { assignment, sections, connectedPlannings, assessment, grading } = data;
  const TypeIcon = TYPE_ICONS[assignment.type] ?? ClipboardList;
  const s = getStatusStyle(assignment.status);
  const submission = SUBMISSION_STYLE[assignment.submissionStatus] ?? SUBMISSION_STYLE.NO_STATUS;
  const result = RESULT_STYLE[assignment.resultReportStatus] ?? RESULT_STYLE.NO_STATUS;

  const hasAssessment =
    Boolean(assessment.review) ||
    Boolean(assessment.teacherComment) ||
    Boolean(assessment.studentComment) ||
    assessment.partialMoments.length > 0 ||
    (assessment.assessedCriteriaTabs as AssessedCriteriaTab[]).some(t => (t.assessedCriteria ?? []).length > 0);

  // Filter out non-object entries (e.g. empty arrays) that the API sometimes returns
  const validSelectedCriteria = (grading.selectedCriteria as unknown[]).filter(
    c => c !== null && typeof c === "object" && !Array.isArray(c) && "level" in (c as object)
  ) as AssessedCriteria[];

  const hasGrading =
    grading.availableColumns.length > 0 || validSelectedCriteria.length > 0;
  const hasConnected = connectedPlannings.length > 0;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <BackButton onClick={() => router.back()} />

      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38 }}
        className="rounded-xl border border-white/7 bg-card px-5 py-4 mb-4"
        style={{ borderLeft: `4px solid ${s.color}` }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
            style={{ background: s.bg, border: `1px solid ${s.border}` }}
          >
            <TypeIcon className="w-4.5 h-4.5" style={{ color: s.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold tracking-tight leading-snug">{assignment.title}</h1>
            {assignment.subTitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{assignment.subTitle}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge
                className="text-[10px] h-5"
                style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
              >
                {s.label}
              </Badge>
              <span className="text-[10px] text-muted-foreground">{assignment.type}</span>
              {assignment.subjectNames && (
                <span className="text-[10px] text-muted-foreground">{assignment.subjectNames}</span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main content */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="space-y-3"
      >
        {/* Details */}
        <motion.div variants={fadeUp}>
          <Section title="Details" icon={Tag}>
            <MetaRow icon={CalendarDays} label="Due date">
              {formatDate(assignment.endDate, assignment.endTime)}
            </MetaRow>
            {assignment.publishDate && (
              <MetaRow icon={Clock} label="Published">
                {assignment.publishDate}
              </MetaRow>
            )}
            <MetaRow icon={CheckCircle2} label="Submission">
              <span style={{ color: submission.color }}>{submission.label}</span>
            </MetaRow>
            <MetaRow icon={User} label="Result">
              <span style={{ color: result.color }}>{result.label}</span>
            </MetaRow>
            {assignment.description && (
              <div className="pt-3 mt-1 border-t border-white/5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Description</p>
                <div
                  className="text-xs text-foreground/80 leading-relaxed [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:break-all [&_p]:mb-1.5 last:[&_p]:mb-0"
                  dangerouslySetInnerHTML={{ __html: assignment.description }}
                />
              </div>
            )}

          </Section>
        </motion.div>

        {/* Assessment */}
        {hasAssessment && (
          <motion.div variants={fadeUp}>
            <AssessmentCard assessment={assessment} />
          </motion.div>
        )}

        {/* Grading */}
        {hasGrading && (
          <motion.div variants={fadeUp}>
            <Section title="Grading" icon={BookMarked} defaultOpen={false}>
              {grading.availableColumns.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
                    Available columns
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(grading.availableColumns as Record<string, unknown>[]).map((col, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-1 rounded-md"
                        style={{
                          background: "oklch(0.65 0.22 278 / 12%)",
                          color: "oklch(0.75 0.15 278)",
                          border: "1px solid oklch(0.65 0.22 278 / 20%)",
                        }}
                      >
                        {String(col.name ?? col.label ?? col.id ?? i)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {validSelectedCriteria.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
                    Selected criteria
                  </p>
                  <div className="space-y-1.5">
                    {validSelectedCriteria.map((c, i) => (
                      <CriterionRow key={i} criterion={c} index={i} />
                    ))}
                  </div>
                </div>
              )}
            </Section>
          </motion.div>
        )}

        {/* Sections */}
        {sections.length > 0 && (
          <motion.div variants={fadeUp}>
            <Section title="Content sections" icon={FileText} defaultOpen={false} badge={sections.length}>
              <div className="space-y-2">
                {sections.map((sec, i) => (
                  <SectionRow key={i} section={sec} />
                ))}
              </div>
            </Section>
          </motion.div>
        )}

        {/* Connected plannings */}
        {hasConnected && (
          <motion.div variants={fadeUp}>
            <Section title="Connected plannings" icon={Link2} defaultOpen={false} badge={connectedPlannings.length}>
              <div className="space-y-2">
                {(connectedPlannings as Record<string, unknown>[]).map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0"
                  >
                    <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {String(p.title ?? p.name ?? `Planning ${i + 1}`)}
                      </p>
                      {Boolean(p.endDate) && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {formatDate(String(p.endDate))}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Helper sub-components
-------------------------------------------------------------------------- */
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

function PartialMomentRow({ moment }: { moment: Record<string, unknown> }) {
  // legacy fallback – primary display is AssessmentCard
  const label = String(moment.title ?? moment.name ?? "Moment");
  const value = String(moment.grade ?? moment.value ?? moment.result ?? "");
  return (
    <div className="flex items-center justify-between py-1.5 text-xs border-b border-white/5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      {value && <span className="font-medium">{value}</span>}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Assessment types
-------------------------------------------------------------------------- */

interface PartialMoment {
  id?: number;
  name: string;
  points: number;
  max: number;
}

interface CriteriaLevel {
  levelEnum: string;
  value: number;
  description: string;
}

interface CriteriaStep {
  gradeCriteriaGroupId: number;
  text: string; // may contain HTML
  level: CriteriaLevel;
}

interface AssessedCriteria {
  level: CriteriaLevel;
  steps: CriteriaStep[];
}

interface CriteriaTabContent {
  type: string;
  id: number;
  typeId: number;
  name: string;
}

interface AssessedCriteriaTab {
  content: CriteriaTabContent;
  assessedCriteria: AssessedCriteria[];
}

interface GradeInference {
  grade: string;
  confidence: "confirmed" | "estimated";
  source: "points" | "criteria";
}

/* -------------------------------------------------------------------------
   Grade inference
-------------------------------------------------------------------------- */

function inferGradeFromPoints(moments: PartialMoment[]): GradeInference | null {
  // Only treat as E/C/A grading if names match the Swedish grade-level pattern:
  // name is exactly the letter, or starts with the letter followed by a space/hyphen
  const isGradeLevel = (name: string, letter: string) => {
    const n = name.trim().toLowerCase();
    return n === letter || n.startsWith(letter + " ") || n.startsWith(letter + "-");
  };
  const find = (letter: string) => moments.find(m => isGradeLevel(m.name, letter));

  const e = find("e");
  const c = find("c");
  const a = find("a");

  // --- Named E/C/A threshold mode --- [old]
  // if (e && e.max > 0) {
  //   const ePct = e.points / e.max;
  //   const cPct = c && c.max > 0 ? c.points / c.max : 0;
  //   const aPct = a && a.max > 0 ? a.points / a.max : 0;

  //   if (ePct < 1.0) {
  //     return { grade: "F", confidence: ePct < 0.5 ? "confirmed" : "estimated", source: "points" };
  //   }
  //   if (c && cPct >= 1.0) {
  //     if (a && aPct >= 1.0) return { grade: "A", confidence: "confirmed", source: "points" };
  //     if (a && aPct >= 0.5) return { grade: "B", confidence: "estimated", source: "points" };
  //     return { grade: "C", confidence: "confirmed", source: "points" };
  //   }
  //   if (c && cPct >= 0.5) return { grade: "D", confidence: "estimated", source: "points" };
  //   return { grade: "E", confidence: "confirmed", source: "points" };
  // }

  // --- Generic total-percentage mode ---
  const totalMax = moments.reduce((s, m) => s + m.max, 0);
  if (totalMax === 0) return null;
  const totalPoints = moments.reduce((s, m) => s + m.points, 0);
  const pct = (totalPoints / totalMax) * 100;

  const grade =
    pct >= 95 ? "A" :
    pct >= 85 ? "B" :
    pct >= 70 ? "C" :
    pct >= 50 ? "D" :
    pct >= 40 ? "E" : "F";

  return { grade, confidence: "estimated", source: "points" };
}

function inferGradeFromCriteria(tabs: AssessedCriteriaTab[]): GradeInference | null {
  const allCriteria = tabs.flatMap(t => t.assessedCriteria ?? []);
  if (!allCriteria.length) return null;
  const levels = allCriteria.map(c => c.level?.value ?? 0).filter(v => v >= 7);
  if (!levels.length) return null;
  const minLevel = Math.min(...levels);
  const avgLevel = levels.reduce((s, v) => s + v, 0) / levels.length;
  // In Swedish grading the minimum criterion is the ceiling; weight toward it
  const effective = minLevel * 0.65 + avgLevel * 0.35;
  const grade =
    effective >= 10.5 ? "A" :
    effective >= 9.5  ? "B" :
    effective >= 8.5  ? "C" :
    effective >= 7.5  ? "D" :
    effective >= 7    ? "E" : "F";
  return { grade, confidence: "estimated", source: "criteria" };
}

function inferGrade(moments: PartialMoment[], tabs: AssessedCriteriaTab[]): GradeInference | null {
  if (tabs.length > 0) return inferGradeFromCriteria(tabs);
  if (moments.length > 0) {
    const r = inferGradeFromPoints(moments);
    if (r) return r;
  }
  return null;
}

/* -------------------------------------------------------------------------
   Shared style maps
-------------------------------------------------------------------------- */

const OVERALL_GRADE_STYLE: Record<string, { bg: string; color: string; border: string; glow: string }> = {
  A: { bg: "oklch(0.65 0.22 278 / 18%)", color: "oklch(0.80 0.18 278)", border: "oklch(0.65 0.22 278 / 40%)", glow: "oklch(0.65 0.22 278 / 22%)" },
  B: { bg: "oklch(0.65 0.20 245 / 18%)", color: "oklch(0.78 0.17 245)", border: "oklch(0.65 0.20 245 / 40%)", glow: "oklch(0.65 0.20 245 / 22%)" },
  C: { bg: "oklch(0.65 0.18 210 / 18%)", color: "oklch(0.78 0.16 210)", border: "oklch(0.65 0.18 210 / 40%)", glow: "oklch(0.65 0.18 210 / 22%)" },
  D: { bg: "oklch(0.65 0.20 175 / 18%)", color: "oklch(0.75 0.18 175)", border: "oklch(0.65 0.20 175 / 40%)", glow: "oklch(0.65 0.20 175 / 22%)" },
  E: { bg: "oklch(0.65 0.22 148 / 18%)", color: "oklch(0.72 0.18 148)", border: "oklch(0.65 0.22 148 / 40%)", glow: "oklch(0.65 0.22 148 / 22%)" },
  F: { bg: "oklch(1 0 0 / 6%)",           color: "oklch(0.55 0 0)",      border: "oklch(1 0 0 / 12%)",          glow: "oklch(1 0 0 / 8%)"          },
};

const GRADE_LEVEL_STYLE: Record<string, { track: string; fill: string; glow: string; label: string }> = {
  e: { track: "oklch(0.65 0.22 148 / 12%)", fill: "oklch(0.65 0.22 148)", glow: "oklch(0.65 0.22 148 / 35%)", label: "E" },
  c: { track: "oklch(0.65 0.18 210 / 12%)", fill: "oklch(0.65 0.18 210)", glow: "oklch(0.65 0.18 210 / 35%)", label: "C" },
  a: { track: "oklch(0.65 0.22 278 / 12%)", fill: "oklch(0.65 0.22 278)", glow: "oklch(0.65 0.22 278 / 35%)", label: "A" },
};

// Cycling palette for generic (non–grade-level) partial moments
const GENERIC_BAR_PALETTE = [
  { track: "oklch(0.65 0.18 200 / 12%)", fill: "oklch(0.70 0.16 200)", glow: "oklch(0.65 0.18 200 / 30%)" },
  { track: "oklch(0.65 0.18 260 / 12%)", fill: "oklch(0.70 0.16 260)", glow: "oklch(0.65 0.18 260 / 30%)" },
  { track: "oklch(0.65 0.18 320 / 12%)", fill: "oklch(0.70 0.16 320)", glow: "oklch(0.65 0.18 320 / 30%)" },
  { track: "oklch(0.65 0.18 30  / 12%)", fill: "oklch(0.70 0.16 30 )", glow: "oklch(0.65 0.18 30  / 30%)" },
  { track: "oklch(0.65 0.18 160 / 12%)", fill: "oklch(0.70 0.16 160)", glow: "oklch(0.65 0.18 160 / 30%)" },
];

const LEVEL_BADGE_STYLE: Record<string, { bg: string; color: string }> = {
  MEET_A_LEVEL: { bg: "oklch(0.65 0.22 278 / 18%)", color: "oklch(0.80 0.18 278)" },
  MEET_B_LEVEL: { bg: "oklch(0.65 0.20 245 / 18%)", color: "oklch(0.78 0.17 245)" },
  MEET_C_LEVEL: { bg: "oklch(0.65 0.18 210 / 18%)", color: "oklch(0.78 0.16 210)" },
  MEET_D_LEVEL: { bg: "oklch(0.65 0.20 175 / 15%)", color: "oklch(0.75 0.18 175)" },
  MEET_E_LEVEL: { bg: "oklch(0.65 0.22 148 / 15%)", color: "oklch(0.72 0.18 148)" },
};

/* -------------------------------------------------------------------------
   AssessmentCard sub-components
-------------------------------------------------------------------------- */

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

function GradeLevelBar({ moment, index }: { moment: PartialMoment; index: number }) {
  const [width, setWidth] = useState(0);
  const pct = moment.max > 0 ? Math.min((moment.points / moment.max) * 100, 100) : 0;
  const key = moment.name.trim().split(/[\s-]/)[0].toLowerCase();
  const isGradeLevelBar = key in GRADE_LEVEL_STYLE;

  const style = isGradeLevelBar
    ? GRADE_LEVEL_STYLE[key]
    : { ...GENERIC_BAR_PALETTE[index % GENERIC_BAR_PALETTE.length], label: "" };

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 120 + index * 80);
    return () => clearTimeout(t);
  }, [pct, index]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.08, duration: 0.35 }}
      className="space-y-1.5"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold">{moment.name}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] tabular-nums" style={{ color: style.fill }}>
            {moment.points}
            <span className="text-muted-foreground"> / {moment.max}</span>
          </span>
          {isGradeLevelBar ? (
            <span
              className="text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded"
              style={{
                background: pct >= 100 ? `${style.fill}30` : "oklch(1 0 0 / 6%)",
                color: pct >= 100 ? style.fill : "oklch(0.40 0 0)",
              }}
            >
              {"label" in style ? style.label : ""}
            </span>
          ) : (
            <span
              className="text-[10px] font-semibold tabular-nums"
              style={{ color: pct >= 100 ? style.fill : "oklch(0.50 0 0)" }}
            >
              {Math.round(pct)}%
            </span>
          )}
        </div>
      </div>
      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: style.track }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${width}%`,
            background: `linear-gradient(90deg, ${style.fill}99, ${style.fill})`,
            boxShadow: pct > 0 ? `0 0 8px ${style.glow}` : "none",
          }}
        />
        <div className="absolute inset-y-0 right-0 w-px bg-white/20" />
      </div>
    </motion.div>
  );
}

function CriterionRow({ criterion, index }: { criterion: AssessedCriteria; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const assessed = criterion.level;
  const badgeStyle = LEVEL_BADGE_STYLE[assessed?.levelEnum ?? ""] ?? { bg: "oklch(1 0 0 / 6%)", color: "oklch(0.55 0 0)" };
  const gradeLabel = assessed?.description?.replace(/^Meets?\s*/i, "").replace(/\s*level$/i, "") || assessed?.levelEnum?.replace("MEET_", "").replace("_LEVEL", "") || "?";

  const assessedStep = criterion.steps?.find(s => s.level?.levelEnum === assessed?.levelEnum);
  const stepText = assessedStep ? stripHtml(assessedStep.text) : "";
  const isLong = stepText.length > 130;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 + index * 0.04 }}
      className="rounded-lg border border-white/6 bg-white/2 overflow-hidden"
    >
      <div className="flex items-start gap-3 px-3 py-2.5">
        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0 mt-0.5"
          style={{
            background: badgeStyle.bg,
            color: badgeStyle.color,
            border: `1px solid ${badgeStyle.color}40`,
          }}
        >
          {gradeLabel}
        </span>
        {stepText ? (
          <div className="flex-1 min-w-0">
            <p
              className="text-[11px] text-foreground/70 leading-relaxed"
              style={{ display: expanded || !isLong ? "block" : "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: expanded ? "visible" : "hidden" } as React.CSSProperties}
            >
              {stepText}
            </p>
            {isLong && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="text-[10px] mt-1 transition-colors"
                style={{ color: "oklch(0.65 0.22 278 / 70%)" }}
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground italic">No description</span>
        )}
      </div>
    </motion.div>
  );
}

function CriteriaTabSection({ tab, tabIndex }: { tab: AssessedCriteriaTab; tabIndex: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: tabIndex * 0.08 }}
    >
      {tab.content?.name && (
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2.5">
          {tab.content.name}
        </p>
      )}
      <div className="space-y-1.5">
        {(tab.assessedCriteria ?? []).map((c, i) => (
          <CriterionRow key={i} criterion={c} index={i} />
        ))}
      </div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------
   AssessmentCard — cinematic results section
-------------------------------------------------------------------------- */

function AssessmentCard({ assessment }: { assessment: Assessment }) {
  const moments = (assessment.partialMoments as PartialMoment[]).filter(
    m => typeof m.points === "number" && typeof m.max === "number"
  );
  const tabs = (assessment.assessedCriteriaTabs as AssessedCriteriaTab[]) ?? [];

  const inference = inferGrade(moments, tabs);
  const gradeStyle = inference ? (OVERALL_GRADE_STYLE[inference.grade] ?? OVERALL_GRADE_STYLE.F) : null;

  const hasReview   = Boolean(assessment.review);
  const hasComments = assessment.teacherComment || assessment.studentComment;
  const hasPoints   = moments.length > 0;
  const hasCriteria = tabs.some(t => (t.assessedCriteria ?? []).length > 0);

  const totalPoints = moments.reduce((s, m) => s + m.points, 0);
  const totalMax    = moments.reduce((s, m) => s + m.max, 0);
  const totalPct    = totalMax > 0 ? Math.round((totalPoints / totalMax) * 100) : null;

  // Show hero strip if we have a review text, a grade inference, or a total score to display
  const showHero = hasReview || Boolean(inference) || totalPct !== null;

  return (
    <div
      className="rounded-xl border border-white/7 bg-card overflow-hidden"
      style={gradeStyle ? { borderTop: `2px solid ${gradeStyle.border}` } : {}}
    >
      {/* Hero strip */}
      {showHero && (
        <div
          className="px-5 py-5 flex items-center justify-between gap-4"
          style={{
            background: gradeStyle
              ? `linear-gradient(135deg, ${gradeStyle.glow} 0%, transparent 65%)`
              : "transparent",
          }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Result</p>
            {hasReview && (
              <p className="text-xl font-bold tracking-tight wrap-break-word leading-snug">
                {assessment.review}
              </p>
            )}
            {totalPct !== null && (
              <p className="text-xs text-muted-foreground mt-1">
                {totalPoints} / {totalMax} pts &middot; {totalPct}%
              </p>
            )}
          </div>

          {inference && gradeStyle && (
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <motion.div
                initial={{ scale: 0.65, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 280, damping: 18, delay: 0.12 }}
                className="flex items-center justify-center w-16 h-16 rounded-2xl font-black select-none"
                style={{
                  background: gradeStyle.bg,
                  color: gradeStyle.color,
                  border: `1.5px solid ${gradeStyle.border}`,
                  boxShadow: `0 4px 28px ${gradeStyle.glow}`,
                  fontSize: inference.grade.length === 1 ? "2rem" : "0.9rem",
                  letterSpacing: inference.grade.length === 1 ? "-0.02em" : "0",
                  textAlign: "center",
                  padding: "4px",
                }}
              >
                {inference.grade}
              </motion.div>
              {inference.confidence === "estimated" && (
                <span className="text-[9px] text-muted-foreground text-center leading-tight max-w-18">
                  Estimated
                  <br />
                  {inference.source === "criteria" ? "from criteria" : "from points"}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Point bars */}
      {hasPoints && (
        <div className="px-5 pb-5 space-y-3.5">
          {showHero && <div className="h-px bg-white/5 -mx-5 mb-4" />}
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Grade points</p>
          {moments.map((m, i) => (
            <GradeLevelBar key={m.id ?? i} moment={m} index={i} />
          ))}
        </div>
      )}

      {/* Criteria */}
      {hasCriteria && (
        <div className="px-5 pb-5">
          {(showHero || hasPoints) && <div className="h-px bg-white/5 -mx-5 mb-4" />}
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">
            Assessment criteria
          </p>
          <div className="space-y-5">
            {tabs.map((tab, i) => (
              <CriteriaTabSection key={i} tab={tab} tabIndex={i} />
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      {hasComments && (
        <div className="px-5 pb-5 space-y-2">
          <div className="h-px bg-white/5 -mx-5 mb-4" />
          {assessment.teacherComment && (
            <div className="rounded-lg bg-white/3 border border-white/6 px-4 py-3">
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1.5">
                Teacher comment
              </p>
              <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap wrap-break-word" dangerouslySetInnerHTML={{ __html: assessment.teacherComment }} />
            </div>
          )}
          {assessment.studentComment && (
            <div className="rounded-lg bg-white/3 border border-white/6 px-4 py-3">
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1.5">
                Your comment
              </p>
              <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap wrap-break-word">
                {assessment.studentComment}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionRow({ section }: { section: Record<string, unknown> }) {
  const type  = String(section.type ?? "");
  const title = String(section.title ?? section.name ?? type);
  const desc  = String(section.description ?? section.content ?? "");

  const SECTION_TYPE_LABELS: Record<string, string> = {
    CENTRALCONTENT:    "Central content",
    SUBJECTDESCRIPTION:"Subject description",
    GRADECRITERIA:     "Grade criteria",
    RESULTREPORT:      "Result report",
  };

  return (
    <div className="py-2 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wide"
          style={{
            background: "oklch(0.65 0.22 278 / 10%)",
            color: "oklch(0.65 0.22 278 / 70%)",
          }}
        >
          {SECTION_TYPE_LABELS[type] ?? type}
        </span>
        {title !== type && <p className="text-xs font-medium">{title}</p>}
      </div>
      {desc && <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-3">{desc}</p>}
    </div>
  );
}

/** Standalone icon for Message sections */
function _MessageSquareIcon() {
  return <MessageSquare className="w-3.5 h-3.5" />;
}
