"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Scan,
  Plus,
  Settings2,
  ChevronDown,
  Loader2,
  Target,
  Pencil,
  EyeOff,
  Eye,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { GradeEntry, GradeTrackerDoc, ScannedGradeResult } from "@/lib/grades/types";
import { computeAnalytics } from "@/lib/grades/analytics";
import { OVERALL_GRADE_STYLE, GRADE_LETTERS } from "@/lib/grades/constants";
import {
  GradeTrendChart,
  GradeDistributionChart,
  SnapshotHistoryChart,
} from "./GradeTrackerCharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface GradeTrackerProps {
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  /** desktop sidebar vs mobile inline */
  variant?: "sidebar" | "mobile";
}

function GradeBadge({ grade, size = "md" }: { grade: string; size?: "sm" | "md" | "lg" }) {
  const g = grade.trim().toUpperCase().charAt(0);
  const style = OVERALL_GRADE_STYLE[g] ?? OVERALL_GRADE_STYLE.F;
  const dim =
    size === "lg" ? "w-14 h-14 text-2xl" : size === "sm" ? "w-7 h-7 text-xs" : "w-10 h-10 text-lg";
  return (
    <div
      className={`flex items-center justify-center rounded-xl font-black shrink-0 ${dim}`}
      style={{
        background: style.bg,
        color: style.color,
        border: `1.5px solid ${style.border}`,
        boxShadow: size === "lg" ? `0 4px 20px ${style.glow}` : undefined,
      }}
    >
      {g || "—"}
    </div>
  );
}

function TrendIcon({ label }: { label: string }) {
  if (label === "improving") return <TrendingUp className="w-3.5 h-3.5 text-green-400" />;
  if (label === "declining") return <TrendingDown className="w-3.5 h-3.5 text-red-400/80" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

export function GradeTracker({
  subjectId,
  subjectName,
  subjectColor,
  variant = "sidebar",
}: GradeTrackerProps) {
  const [tracker, setTracker] = useState<GradeTrackerDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(variant === "sidebar");
  const [showSettings, setShowSettings] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [chartTab, setChartTab] = useState<"trend" | "dist" | "history">("trend");

  const [manualTitle, setManualTitle] = useState("");
  const [manualGrade, setManualGrade] = useState("C");
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10));
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await apiFetch<{ success: boolean; tracker: GradeTrackerDoc | null }>(
      `/api/grade-tracker/${subjectId}`
    );
    if (res?.tracker) setTracker(res.tracker);
    else {
      setTracker({
        username: "",
        subjectId: Number(subjectId),
        subjectName,
        subjectColor,
        settings: {
          targetGrade: "C",
          weightMode: "equal",
          showEstimated: true,
          includeManual: true,
        },
        entries: [],
        snapshots: [],
        updatedAt: Date.now(),
      });
    }
    setLoading(false);
  }, [subjectId, subjectName, subjectColor]);

  useEffect(() => {
    load();
  }, [load]);

  const persist = useCallback(
    async (patch: {
      entries?: GradeEntry[];
      settings?: GradeTrackerDoc["settings"];
      scanned?: ScannedGradeResult[];
      addSnapshot?: boolean;
    }) => {
      setSaving(true);
      try {
        const res = await apiFetch<{ success: boolean; tracker: GradeTrackerDoc }>(
          `/api/grade-tracker/${subjectId}`,
          {
            method: "PUT",
            body: {
              subjectName,
              subjectColor,
              ...patch,
            } as unknown as BodyInit,
          }
        );
        if (res?.tracker) setTracker(res.tracker);
      } finally {
        setSaving(false);
      }
    },
    [subjectId, subjectName, subjectColor]
  );

  const handleScan = async () => {
    setScanning(true);
    setScanMessage(null);
    try {
      const scanRes = await apiFetch<{
        success: boolean;
        grades: ScannedGradeResult[];
        scanned?: number;
        total?: number;
        skipped?: number;
      }>(`/api/subjects/${subjectId}/grades`, { method: "POST" });
      if (scanRes?.grades) {
        await persist({ scanned: scanRes.grades, addSnapshot: true });
        const n = scanRes.scanned ?? scanRes.grades.length;
        const total = scanRes.total ?? n;
        if (n === 0) {
          setScanMessage("No reported grades found for this subject yet.");
        } else if (scanRes.skipped && scanRes.skipped > 0) {
          setScanMessage(`Imported ${n} of ${total} assignments (some could not be loaded).`);
        } else {
          setScanMessage(`Imported ${n} grade${n === 1 ? "" : "s"}.`);
        }
      }
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : "Scan failed. Try again or add grades manually.";
      setScanMessage(msg);
    } finally {
      setScanning(false);
    }
  };

  const handleAddManual = async () => {
    if (!manualTitle.trim() || !tracker) return;
    const id = `manual-${crypto.randomUUID()}`;
    const entry: GradeEntry = {
      id,
      title: manualTitle.trim(),
      type: "Manual",
      endDate: manualDate,
      source: "manual",
      reported: false,
      grade: manualGrade.toUpperCase(),
      gradeSource: "manual",
      excluded: false,
      userOverride: true,
      scannedAt: Date.now(),
      updatedAt: Date.now(),
    };
    await persist({ entries: [entry, ...tracker.entries], addSnapshot: true });
    setManualTitle("");
    setShowAdd(false);
  };

  const updateEntry = async (id: string, patch: Partial<GradeEntry>) => {
    if (!tracker) return;
    const entries = tracker.entries.map(e =>
      e.id === id ? { ...e, ...patch, updatedAt: Date.now(), userOverride: patch.grade != null ? true : e.userOverride } : e
    );
    await persist({ entries, addSnapshot: false });
    setEditingId(null);
  };

  const analytics = useMemo(
    () => (tracker ? computeAnalytics(tracker.entries, tracker.settings) : null),
    [tracker]
  );

  const isMobile = variant === "mobile";

  if (loading) {
    return (
      <div className="rounded-xl border border-white/7 bg-card p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground min-h-[120px]">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading grades…
      </div>
    );
  }

  if (!tracker || !analytics) return null;

  const targetStyle = OVERALL_GRADE_STYLE[tracker.settings.targetGrade] ?? OVERALL_GRADE_STYLE.C;
  const avgStyle = OVERALL_GRADE_STYLE[analytics.averageGrade] ?? OVERALL_GRADE_STYLE.F;

  const summaryBlock = (
    <div className="flex items-center gap-3">
      <GradeBadge grade={analytics.averageGrade} size="lg" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Average</p>
        <p className="text-lg font-bold" style={{ color: avgStyle.color }}>
          {analytics.count > 0 ? analytics.averageGrade : "—"}
          <span className="text-xs font-normal text-muted-foreground ml-1.5">
            {analytics.count} graded
          </span>
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
          <TrendIcon label={analytics.trendLabel} />
          <span className="capitalize">{analytics.trendLabel}</span>
          {analytics.recentChange != null && (
            <span style={{ color: analytics.recentChange >= 0 ? "oklch(0.65 0.22 148)" : "oklch(0.65 0.2 25)" }}>
              {analytics.recentChange >= 0 ? "+" : ""}
              {analytics.recentChange.toFixed(1)} last
            </span>
          )}
        </div>
      </div>
    </div>
  );

  const statsRow = (
    <div className="grid grid-cols-3 gap-2 mt-3">
      <div className="rounded-lg bg-white/3 px-2 py-2 text-center">
        <p className="text-[9px] text-muted-foreground uppercase">Target</p>
        <p className="text-sm font-bold" style={{ color: targetStyle.color }}>
          {tracker.settings.targetGrade}
        </p>
        <p className="text-[9px] text-muted-foreground">
          {analytics.targetGap >= 0 ? "+" : ""}
          {analytics.targetGap.toFixed(1)}
        </p>
      </div>
      <div className="rounded-lg bg-white/3 px-2 py-2 text-center">
        <p className="text-[9px] text-muted-foreground uppercase">Volatility</p>
        <p className="text-sm font-bold tabular-nums">{analytics.volatility.toFixed(1)}</p>
      </div>
      <div className="rounded-lg bg-white/3 px-2 py-2 text-center">
        <p className="text-[9px] text-muted-foreground uppercase">Streak</p>
        <p className="text-sm font-bold tabular-nums">
          {analytics.streakUp > 0 ? `↑${analytics.streakUp}` : analytics.streakDown > 0 ? `↓${analytics.streakDown}` : "—"}
        </p>
      </div>
    </div>
  );

  const inner = (
    <>
      {summaryBlock}
      {statsRow}

      {/* Chart tabs */}
      <div className="mt-4 flex gap-1 p-0.5 rounded-lg bg-white/4">
        {(
          [
            { id: "trend" as const, label: "Trend", icon: TrendingUp },
            { id: "dist" as const, label: "Mix", icon: BarChart3 },
            { id: "history" as const, label: "Scans", icon: Sparkles },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setChartTab(id)}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-medium transition-colors ${
              chartTab === id ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-3 h-3" /> {label}
          </button>
        ))}
      </div>
      <div className="mt-2">
        {chartTab === "trend" && (
          <GradeTrendChart analytics={analytics} subjectColor={subjectColor} />
        )}
        {chartTab === "dist" && <GradeDistributionChart analytics={analytics} />}
        {chartTab === "history" && (
          <SnapshotHistoryChart snapshots={tracker.snapshots} subjectColor={subjectColor} />
        )}
      </div>

      {scanMessage && (
        <p className="mt-2 text-[10px] text-muted-foreground leading-snug">{scanMessage}</p>
      )}

      {/* Actions */}
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          className="flex-1 h-8 text-xs gap-1.5"
          onClick={handleScan}
          disabled={scanning || saving}
        >
          {scanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Scan className="w-3 h-3" />}
          Scan subject
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs px-2.5 border-white/10"
          onClick={() => setShowAdd(a => !a)}
        >
          <Plus className="w-3 h-3" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs px-2.5 border-white/10"
          onClick={() => setShowSettings(s => !s)}
        >
          <Settings2 className="w-3 h-3" />
        </Button>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-3 space-y-2 rounded-lg border border-white/7 p-3 bg-white/2"
          >
            <div>
              <Label className="text-[10px] text-muted-foreground">Target grade</Label>
              <select
                className="mt-1 w-full h-8 rounded-md bg-white/5 border border-white/10 text-xs px-2"
                value={tracker.settings.targetGrade}
                onChange={e =>
                  persist({ settings: { ...tracker.settings, targetGrade: e.target.value as typeof tracker.settings.targetGrade } })
                }
              >
                {GRADE_LETTERS.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Weighting</Label>
              <select
                className="mt-1 w-full h-8 rounded-md bg-white/5 border border-white/10 text-xs px-2"
                value={tracker.settings.weightMode}
                onChange={e =>
                  persist({
                    settings: {
                      ...tracker.settings,
                      weightMode: e.target.value as "equal" | "recent",
                    },
                  })
                }
              >
                <option value="equal">Equal</option>
                <option value="recent">Recent-heavy</option>
              </select>
            </div>
          </motion.div>
        )}
        {showAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-3 space-y-2 rounded-lg border border-white/7 p-3 bg-white/2"
          >
            <Input
              placeholder="Title"
              value={manualTitle}
              onChange={e => setManualTitle(e.target.value)}
              className="h-8 text-xs bg-white/5 border-white/10"
            />
            <div className="flex gap-2">
              <select
                className="h-8 rounded-md bg-white/5 border border-white/10 text-xs px-2 flex-1"
                value={manualGrade}
                onChange={e => setManualGrade(e.target.value)}
              >
                {GRADE_LETTERS.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <Input
                type="date"
                value={manualDate}
                onChange={e => setManualDate(e.target.value)}
                className="h-8 text-xs bg-white/5 border-white/10 flex-1"
              />
            </div>
            <Button size="sm" className="w-full h-8 text-xs" onClick={handleAddManual} disabled={saving}>
              Add entry
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entry list */}
      <div className="mt-4 space-y-1 max-h-[280px] overflow-y-auto pr-0.5 scrollbar-thin">
        {tracker.entries.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Scan reported assignments or add a grade manually
          </p>
        ) : (
          tracker.entries.map(entry => {
            const g = entry.excluded ? "—" : entry.grade;
            const href = entry.assignmentId
              ? `/subjects/${subjectId}/${entry.assignmentId}?type=assignment`
              : undefined;
            const isEditing = editingId === entry.id;

            return (
              <div
                key={entry.id}
                className={`rounded-lg px-2 py-2 border transition-colors ${
                  entry.excluded ? "opacity-45 border-white/4" : "border-white/6 hover:bg-white/3"
                }`}
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <select
                      className="w-full h-7 rounded bg-white/5 border border-white/10 text-xs"
                      value={entry.grade}
                      onChange={e => updateEntry(entry.id, { grade: e.target.value.toUpperCase() })}
                    >
                      {GRADE_LETTERS.map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                    <Input
                      placeholder="Notes"
                      defaultValue={entry.notes ?? ""}
                      className="h-7 text-xs bg-white/5 border-white/10"
                      onBlur={e => updateEntry(entry.id, { notes: e.target.value })}
                    />
                    <button
                      className="text-[10px] text-primary"
                      onClick={() => setEditingId(null)}
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <GradeBadge grade={g} size="sm" />
                    <div className="flex-1 min-w-0">
                      {href ? (
                        <Link href={href} className="text-xs font-medium hover:text-primary line-clamp-1">
                          {entry.title}
                        </Link>
                      ) : (
                        <p className="text-xs font-medium line-clamp-1">{entry.title}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {entry.source === "manual" && (
                          <Badge className="text-[8px] h-3.5 px-1 bg-white/8">Manual</Badge>
                        )}
                        {entry.estimatedGrade && entry.estimatedGrade !== entry.grade && tracker.settings.showEstimated && (
                          <span className="text-[9px] text-muted-foreground">
                            est. {entry.estimatedGrade}
                          </span>
                        )}
                        {entry.totalPoints && (
                          <span className="text-[9px] text-muted-foreground">{entry.totalPoints}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        className="p-1 rounded hover:bg-white/8 text-muted-foreground"
                        onClick={() => setEditingId(entry.id)}
                        title="Edit"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        className="p-1 rounded hover:bg-white/8 text-muted-foreground"
                        onClick={() => updateEntry(entry.id, { excluded: !entry.excluded })}
                        title={entry.excluded ? "Include" : "Exclude"}
                      >
                        {entry.excluded ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {analytics.bestEntry && (
        <div className="mt-3 pt-3 border-t border-white/6 flex items-center gap-2 text-[10px] text-muted-foreground">
          <Target className="w-3 h-3 shrink-0" style={{ color: subjectColor }} />
          <span>
            Best: <span style={{ color: OVERALL_GRADE_STYLE[analytics.bestEntry.grade.charAt(0)]?.color }}>{analytics.bestEntry.grade}</span>
            {" · "}
            {analytics.worstEntry && (
              <>
                Lowest:{" "}
                <span style={{ color: OVERALL_GRADE_STYLE[analytics.worstEntry.grade.charAt(0)]?.color }}>
                  {analytics.worstEntry.grade}
                </span>
              </>
            )}
          </span>
        </div>
      )}
    </>
  );

  if (isMobile) {
    return (
      <div className="rounded-xl border border-white/7 bg-card overflow-hidden mb-4">
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/3 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Grade tracker</span>
            {analytics.count > 0 && (
              <GradeBadge grade={analytics.averageGrade} size="sm" />
            )}
          </div>
          <motion.div animate={{ rotate: expanded ? 0 : -90 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        </button>
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              style={{ overflow: "hidden" }}
            >
              <div className="px-4 pb-4">{inner}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/7 bg-card overflow-hidden lg:sticky lg:top-6">
      <div
        className="px-4 py-3 border-b border-white/6 flex items-center gap-2"
        style={{ borderTop: `2px solid ${subjectColor}55` }}
      >
        <BarChart3 className="w-4 h-4" style={{ color: subjectColor }} />
        <span className="text-sm font-semibold flex-1">Grade tracker</span>
        {saving && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
      </div>
      <div className="p-4">{inner}</div>
    </div>
  );
}
