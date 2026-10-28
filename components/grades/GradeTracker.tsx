'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Scan,
  Settings2,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

import { ApiError, apiFetch } from '@/lib/api-client';
import { computeAnalytics } from '@/lib/grades/analytics';
import { GRADE_LETTERS, OVERALL_GRADE_STYLE } from '@/lib/grades/constants';
import type { GradeEntry, GradeTrackerDoc, ScannedGradeResult } from '@/lib/grades/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  GradeDistributionChart,
  GradeTrendChart,
  SnapshotHistoryChart,
} from './GradeTrackerCharts';

interface GradeTrackerProps {
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  /** desktop sidebar vs mobile inline */
  variant?: 'sidebar' | 'mobile';
}

function GradeBadge({ grade, size = 'md' }: { grade: string; size?: 'sm' | 'md' | 'lg' }) {
  const g = grade.trim().toUpperCase().charAt(0);
  const style = OVERALL_GRADE_STYLE[g] ?? OVERALL_GRADE_STYLE.F;
  const dim =
    size === 'lg' ? 'w-14 h-14 text-2xl' : size === 'sm' ? 'w-7 h-7 text-xs' : 'w-10 h-10 text-lg';
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl font-black ${dim}`}
      style={{
        background: style.bg,
        color: style.color,
        border: `1.5px solid ${style.border}`,
      }}
    >
      {g || '—'}
    </div>
  );
}

function TrendIcon({ label }: { label: string }) {
  if (label === 'improving') return <TrendingUp className="h-3.5 w-3.5 text-green-400" />;
  if (label === 'declining') return <TrendingDown className="h-3.5 w-3.5 text-red-400/80" />;
  return <Minus className="text-muted-foreground h-3.5 w-3.5" />;
}

export function GradeTracker({
  subjectId,
  subjectName,
  subjectColor,
  variant = 'sidebar',
}: GradeTrackerProps) {
  const [tracker, setTracker] = useState<GradeTrackerDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(variant === 'sidebar');
  const [showSettings, setShowSettings] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [chartTab, setChartTab] = useState<'trend' | 'dist' | 'history'>('trend');

  const [manualTitle, setManualTitle] = useState('');
  const [manualGrade, setManualGrade] = useState('C');
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10));
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await apiFetch<{ success: boolean; tracker: GradeTrackerDoc | null }>(
      `/api/grade-tracker/${subjectId}`
    );
    if (res?.tracker) setTracker(res.tracker);
    else {
      setTracker({
        username: '',
        subjectId: Number(subjectId),
        subjectName,
        subjectColor,
        settings: {
          targetGrade: 'C',
          weightMode: 'equal',
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
      settings?: GradeTrackerDoc['settings'];
      scanned?: ScannedGradeResult[];
      addSnapshot?: boolean;
    }) => {
      setSaving(true);
      try {
        const res = await apiFetch<{ success: boolean; tracker: GradeTrackerDoc }>(
          `/api/grade-tracker/${subjectId}`,
          {
            method: 'PUT',
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
      }>(`/api/subjects/${subjectId}/grades`, { method: 'POST' });
      if (scanRes?.grades) {
        await persist({ scanned: scanRes.grades, addSnapshot: true });
        const n = scanRes.scanned ?? scanRes.grades.length;
        const total = scanRes.total ?? n;
        if (n === 0) {
          setScanMessage('No reported grades found for this subject yet.');
        } else if (scanRes.skipped && scanRes.skipped > 0) {
          setScanMessage(`Imported ${n} of ${total} assignments (some could not be loaded).`);
        } else {
          setScanMessage(`Imported ${n} grade${n === 1 ? '' : 's'}.`);
        }
      }
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : 'Scan failed. Try again or add grades manually.';
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
      type: 'Manual',
      endDate: manualDate,
      source: 'manual',
      reported: false,
      grade: manualGrade.toUpperCase(),
      gradeSource: 'manual',
      excluded: false,
      userOverride: true,
      scannedAt: Date.now(),
      updatedAt: Date.now(),
    };
    await persist({ entries: [entry, ...tracker.entries], addSnapshot: true });
    setManualTitle('');
    setShowAdd(false);
  };

  const updateEntry = async (id: string, patch: Partial<GradeEntry>) => {
    if (!tracker) return;
    const entries = tracker.entries.map((e) =>
      e.id === id
        ? {
            ...e,
            ...patch,
            updatedAt: Date.now(),
            userOverride: patch.grade != null ? true : e.userOverride,
          }
        : e
    );
    await persist({ entries, addSnapshot: false });
    setEditingId(null);
  };

  const analytics = useMemo(
    () => (tracker ? computeAnalytics(tracker.entries, tracker.settings) : null),
    [tracker]
  );

  const isMobile = variant === 'mobile';

  if (loading) {
    return (
      <div className="bg-card text-muted-foreground flex min-h-[120px] items-center justify-center gap-2 rounded-xl border border-white/7 p-4 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading grades…
      </div>
    );
  }

  if (!tracker || !analytics) return null;

  const targetStyle = OVERALL_GRADE_STYLE[tracker.settings.targetGrade] ?? OVERALL_GRADE_STYLE.C;
  const avgStyle = OVERALL_GRADE_STYLE[analytics.averageGrade] ?? OVERALL_GRADE_STYLE.F;

  const summaryBlock = (
    <div className="flex items-center gap-3">
      <GradeBadge grade={analytics.averageGrade} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-[10px] tracking-widest uppercase">Average</p>
        <p className="text-lg font-bold" style={{ color: avgStyle.color }}>
          {analytics.count > 0 ? analytics.averageGrade : '—'}
          <span className="text-muted-foreground ml-1.5 text-xs font-normal">
            {analytics.count} graded
          </span>
        </p>
        <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-[10px]">
          <TrendIcon label={analytics.trendLabel} />
          <span className="capitalize">{analytics.trendLabel}</span>
          {analytics.recentChange != null && (
            <span
              style={{
                color: analytics.recentChange >= 0 ? 'oklch(0.65 0.22 148)' : 'oklch(0.65 0.2 25)',
              }}
            >
              {analytics.recentChange >= 0 ? '+' : ''}
              {analytics.recentChange.toFixed(1)} last
            </span>
          )}
        </div>
      </div>
    </div>
  );

  const statsRow = (
    <div className="mt-3 grid grid-cols-3 gap-2">
      <div className="rounded-lg bg-white/3 px-2 py-2 text-center">
        <p className="text-muted-foreground text-[9px] uppercase">Target</p>
        <p className="text-sm font-bold" style={{ color: targetStyle.color }}>
          {tracker.settings.targetGrade}
        </p>
        <p className="text-muted-foreground text-[9px]">
          {analytics.targetGap >= 0 ? '+' : ''}
          {analytics.targetGap.toFixed(1)}
        </p>
      </div>
      <div className="rounded-lg bg-white/3 px-2 py-2 text-center">
        <p className="text-muted-foreground text-[9px] uppercase">Volatility</p>
        <p className="text-sm font-bold tabular-nums">{analytics.volatility.toFixed(1)}</p>
      </div>
      <div className="rounded-lg bg-white/3 px-2 py-2 text-center">
        <p className="text-muted-foreground text-[9px] uppercase">Streak</p>
        <p className="text-sm font-bold tabular-nums">
          {analytics.streakUp > 0
            ? `↑${analytics.streakUp}`
            : analytics.streakDown > 0
              ? `↓${analytics.streakDown}`
              : '—'}
        </p>
      </div>
    </div>
  );

  const inner = (
    <>
      {summaryBlock}
      {statsRow}

      {/* Chart tabs */}
      <div className="mt-4 flex gap-1 rounded-lg bg-white/4 p-0.5">
        {(
          [
            { id: 'trend' as const, label: 'Trend', icon: TrendingUp },
            { id: 'dist' as const, label: 'Mix', icon: BarChart3 },
            { id: 'history' as const, label: 'Scans', icon: Sparkles },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setChartTab(id)}
            className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[10px] font-medium transition-colors ${
              chartTab === id
                ? 'text-foreground bg-white/10'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-3 w-3" /> {label}
          </button>
        ))}
      </div>
      <div className="mt-2">
        {chartTab === 'trend' && (
          <GradeTrendChart analytics={analytics} subjectColor={subjectColor} />
        )}
        {chartTab === 'dist' && <GradeDistributionChart analytics={analytics} />}
        {chartTab === 'history' && (
          <SnapshotHistoryChart snapshots={tracker.snapshots} subjectColor={subjectColor} />
        )}
      </div>

      {scanMessage && (
        <p className="text-muted-foreground mt-2 text-[10px] leading-snug">{scanMessage}</p>
      )}

      {/* Actions */}
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          className="h-8 flex-1 gap-1.5 text-xs"
          onClick={handleScan}
          disabled={scanning || saving}
        >
          {scanning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Scan className="h-3 w-3" />}
          Scan subject
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 border-white/10 px-2.5 text-xs"
          onClick={() => setShowAdd((a) => !a)}
        >
          <Plus className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 border-white/10 px-2.5 text-xs"
          onClick={() => setShowSettings((s) => !s)}
        >
          <Settings2 className="h-3 w-3" />
        </Button>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 space-y-2 overflow-hidden rounded-lg border border-white/7 bg-white/2 p-3"
          >
            <div>
              <Label className="text-muted-foreground text-[10px]">Target grade</Label>
              <select
                className="mt-1 h-8 w-full rounded-md border border-white/10 bg-white/5 px-2 text-xs"
                value={tracker.settings.targetGrade}
                onChange={(e) =>
                  persist({
                    settings: {
                      ...tracker.settings,
                      targetGrade: e.target.value as typeof tracker.settings.targetGrade,
                    },
                  })
                }
              >
                {GRADE_LETTERS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-muted-foreground text-[10px]">Weighting</Label>
              <select
                className="mt-1 h-8 w-full rounded-md border border-white/10 bg-white/5 px-2 text-xs"
                value={tracker.settings.weightMode}
                onChange={(e) =>
                  persist({
                    settings: {
                      ...tracker.settings,
                      weightMode: e.target.value as 'equal' | 'recent',
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
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 space-y-2 overflow-hidden rounded-lg border border-white/7 bg-white/2 p-3"
          >
            <Input
              placeholder="Title"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              className="h-8 border-white/10 bg-white/5 text-xs"
            />
            <div className="flex gap-2">
              <select
                className="h-8 flex-1 rounded-md border border-white/10 bg-white/5 px-2 text-xs"
                value={manualGrade}
                onChange={(e) => setManualGrade(e.target.value)}
              >
                {GRADE_LETTERS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <Input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="h-8 flex-1 border-white/10 bg-white/5 text-xs"
              />
            </div>
            <Button
              size="sm"
              className="h-8 w-full text-xs"
              onClick={handleAddManual}
              disabled={saving}
            >
              Add entry
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entry list */}
      <div className="mt-4 max-h-[280px] scrollbar-thin space-y-1 overflow-y-auto pr-0.5">
        {tracker.entries.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-xs">
            Scan reported assignments or add a grade manually
          </p>
        ) : (
          tracker.entries.map((entry) => {
            const g = entry.excluded ? '—' : entry.grade;
            const href = entry.assignmentId
              ? `/subjects/${subjectId}/${entry.assignmentId}?type=assignment`
              : undefined;
            const isEditing = editingId === entry.id;

            return (
              <div
                key={entry.id}
                className={`rounded-lg border px-2 py-2 transition-colors ${
                  entry.excluded ? 'border-white/4 opacity-45' : 'border-white/6 hover:bg-white/3'
                }`}
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <select
                      className="h-7 w-full rounded border border-white/10 bg-white/5 text-xs"
                      value={entry.grade}
                      onChange={(e) =>
                        updateEntry(entry.id, { grade: e.target.value.toUpperCase() })
                      }
                    >
                      {GRADE_LETTERS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                    <Input
                      placeholder="Notes"
                      defaultValue={entry.notes ?? ''}
                      className="h-7 border-white/10 bg-white/5 text-xs"
                      onBlur={(e) => updateEntry(entry.id, { notes: e.target.value })}
                    />
                    <button className="text-primary text-[10px]" onClick={() => setEditingId(null)}>
                      Done
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <GradeBadge grade={g} size="sm" />
                    <div className="min-w-0 flex-1">
                      {href ? (
                        <Link
                          href={href}
                          className="hover:text-primary line-clamp-1 text-xs font-medium"
                        >
                          {entry.title}
                        </Link>
                      ) : (
                        <p className="line-clamp-1 text-xs font-medium">{entry.title}</p>
                      )}
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        {entry.source === 'manual' && (
                          <Badge className="h-3.5 bg-white/8 px-1 text-[8px]">Manual</Badge>
                        )}
                        {entry.estimatedGrade &&
                          entry.estimatedGrade !== entry.grade &&
                          tracker.settings.showEstimated && (
                            <span className="text-muted-foreground text-[9px]">
                              est. {entry.estimatedGrade}
                            </span>
                          )}
                        {entry.totalPoints && (
                          <span className="text-muted-foreground text-[9px]">
                            {entry.totalPoints}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-0.5">
                      <button
                        className="text-muted-foreground rounded p-1 hover:bg-white/8"
                        onClick={() => setEditingId(entry.id)}
                        title="Edit"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        className="text-muted-foreground rounded p-1 hover:bg-white/8"
                        onClick={() => updateEntry(entry.id, { excluded: !entry.excluded })}
                        title={entry.excluded ? 'Include' : 'Exclude'}
                      >
                        {entry.excluded ? (
                          <Eye className="h-3 w-3" />
                        ) : (
                          <EyeOff className="h-3 w-3" />
                        )}
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
        <div className="text-muted-foreground mt-3 flex items-center gap-2 border-t border-white/6 pt-3 text-[10px]">
          <Target className="h-3 w-3 shrink-0" style={{ color: subjectColor }} />
          <span>
            Best:{' '}
            <span
              style={{ color: OVERALL_GRADE_STYLE[analytics.bestEntry.grade.charAt(0)]?.color }}
            >
              {analytics.bestEntry.grade}
            </span>
            {' · '}
            {analytics.worstEntry && (
              <>
                Lowest:{' '}
                <span
                  style={{
                    color: OVERALL_GRADE_STYLE[analytics.worstEntry.grade.charAt(0)]?.color,
                  }}
                >
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
      <div className="bg-card mb-4 overflow-hidden rounded-xl border border-white/7">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex w-full items-center justify-between px-4 py-3.5 transition-colors hover:bg-white/3"
        >
          <div className="flex items-center gap-2.5">
            <BarChart3 className="text-primary h-4 w-4" />
            <span className="text-sm font-semibold">Grade tracker</span>
            {analytics.count > 0 && <GradeBadge grade={analytics.averageGrade} size="sm" />}
          </div>
          <motion.div animate={{ rotate: expanded ? 0 : -90 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="text-muted-foreground h-4 w-4" />
          </motion.div>
        </button>
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="px-4 pb-4">{inner}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="bg-card overflow-hidden rounded-xl border border-white/7 lg:sticky lg:top-6">
      <div
        className="flex items-center gap-2 border-b border-white/6 px-4 py-3"
        style={{ borderTop: `2px solid ${subjectColor}55` }}
      >
        <BarChart3 className="h-4 w-4" style={{ color: subjectColor }} />
        <span className="flex-1 text-sm font-semibold">Grade tracker</span>
        {saving && <Loader2 className="text-muted-foreground h-3 w-3 animate-spin" />}
      </div>
      <div className="p-4">{inner}</div>
    </div>
  );
}
