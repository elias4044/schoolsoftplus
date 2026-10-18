'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  Pencil,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
  Timer,
  Check,
  X,
  ChevronDown,
  Loader2,
  Maximize2,
  Minimize2,
  MoreHorizontal,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Types 😀
type CountdownCategory = 'exam' | 'holiday' | 'birthday' | 'event' | 'deadline' | 'custom';
type CountdownTheme = 'violet' | 'rose' | 'amber' | 'emerald' | 'sky' | 'slate';

interface Countdown {
  id: string;
  title: string;
  description: string;
  targetDate: number;
  category: CountdownCategory;
  theme: CountdownTheme;
  emoji: string;
  pinned: boolean;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

// colors 🌈🌈🌈🌈🌈🌈🌈

const THEMES: { id: CountdownTheme; label: string; from: string; to: string; glow: string }[] = [
  {
    id: 'violet',
    label: 'Violet',
    from: 'oklch(0.65 0.22 278)',
    to: 'oklch(0.55 0.25 295)',
    glow: 'oklch(0.65 0.22 278 / 40%)',
  },
  {
    id: 'rose',
    label: 'Rose',
    from: 'oklch(0.68 0.22 10)',
    to: 'oklch(0.58 0.26 340)',
    glow: 'oklch(0.68 0.22 10 / 40%)',
  },
  {
    id: 'amber',
    label: 'Amber',
    from: 'oklch(0.78 0.17 75)',
    to: 'oklch(0.68 0.20 55)',
    glow: 'oklch(0.78 0.17 75 / 40%)',
  },
  {
    id: 'emerald',
    label: 'Emerald',
    from: 'oklch(0.70 0.18 148)',
    to: 'oklch(0.60 0.22 165)',
    glow: 'oklch(0.70 0.18 148 / 40%)',
  },
  {
    id: 'sky',
    label: 'Sky',
    from: 'oklch(0.72 0.17 220)',
    to: 'oklch(0.62 0.22 240)',
    glow: 'oklch(0.72 0.17 220 / 40%)',
  },
  {
    id: 'slate',
    label: 'Slate',
    from: 'oklch(0.60 0.04 255)',
    to: 'oklch(0.48 0.05 265)',
    glow: 'oklch(0.60 0.04 255 / 40%)',
  },
];

const CATEGORIES: { id: CountdownCategory; label: string; emoji: string }[] = [
  { id: 'exam', label: 'Exam', emoji: '📝' },
  { id: 'holiday', label: 'Holiday', emoji: '🌴' },
  { id: 'birthday', label: 'Birthday', emoji: '🎂' },
  { id: 'event', label: 'Event', emoji: '🎉' },
  { id: 'deadline', label: 'Deadline', emoji: '⚡' },
  { id: 'custom', label: 'Custom', emoji: '⏳' },
];

function getTheme(t: CountdownTheme) {
  return THEMES.find((x) => x.id === t) ?? THEMES[0];
}

// Helpers

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number; // ms remaining (negative = past)
}

function calcTimeLeft(targetDate: number): TimeLeft {
  const total = targetDate - Date.now();
  const abs = Math.max(0, total);
  return {
    total,
    days: Math.floor(abs / 86_400_000),
    hours: Math.floor((abs % 86_400_000) / 3_600_000),
    minutes: Math.floor((abs % 3_600_000) / 60_000),
    seconds: Math.floor((abs % 60_000) / 1_000),
  };
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function totalDuration(targetDate: number, createdAt: number) {
  return Math.max(1, targetDate - createdAt);
}

function progressPercent(c: Countdown) {
  const elapsed = Date.now() - c.createdAt;
  const duration = totalDuration(c.targetDate, c.createdAt);
  return Math.min(100, Math.max(0, (elapsed / duration) * 100));
}

/* ---------------------------------------------------------- */
/*  useIsMobile — true when the primary input is touch/coarse  */
/* ---------------------------------------------------------- */

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

/* ---------------------------------------------------------- */
/*  Cinematic full-screen overlay                               */
/* ---------------------------------------------------------- */

function CinematicView({ countdown, onClose }: { countdown: Countdown; onClose: () => void }) {
  const [time, setTime] = useState<TimeLeft>(calcTimeLeft(countdown.targetDate));
  const th = getTheme(countdown.theme);
  const past = time.total <= 0;

  useEffect(() => {
    const id = setInterval(() => setTime(calcTimeLeft(countdown.targetDate)), 500);
    return () => clearInterval(id);
  }, [countdown.targetDate]);

  // Animated particles
  const particles = Array.from({ length: 20 }, (_, i) => i);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{ background: 'oklch(0.06 0.01 260)' }}
    >
      {/* Radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 70% 60% at 50% 50%, ${th.glow}, transparent 70%)`,
        }}
      />

      {/* Floating particles */}
      {particles.map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full opacity-20"
          style={{
            width: 4 + (i % 5) * 4,
            height: 4 + (i % 5) * 4,
            background: th.from,
            left: `${5 + ((i * 4.7) % 90)}%`,
            top: `${5 + ((i * 7.3) % 90)}%`,
          }}
          animate={{
            y: [0, -30 - (i % 4) * 15, 0],
            opacity: [0.1, 0.35, 0.1],
            scale: [1, 1.4, 1],
          }}
          transition={{
            duration: 4 + (i % 5),
            repeat: Infinity,
            delay: (i * 0.37) % 3,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Pulsing rings */}
      {[1, 2, 3].map((r) => (
        <motion.div
          key={r}
          className="pointer-events-none absolute rounded-full border"
          style={{
            width: 200 + r * 180,
            height: 200 + r * 180,
            borderColor: th.from,
            opacity: 0.08,
          }}
          animate={{ scale: [1, 1.06, 1], opacity: [0.08, 0.14, 0.08] }}
          transition={{ duration: 3 + r, repeat: Infinity, ease: 'easeInOut', delay: r * 0.6 }}
        />
      ))}

      {/* Content */}
      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center gap-8 px-8 text-center">
        {/* Emoji */}
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="text-7xl select-none"
        >
          {countdown.emoji}
        </motion.div>

        {/* Title */}
        <div>
          <h1
            className="text-4xl font-bold tracking-tight sm:text-5xl"
            style={{
              background: `linear-gradient(135deg, ${th.from}, ${th.to})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {countdown.title}
          </h1>
          {countdown.description && (
            <p className="text-muted-foreground mt-2 text-base">{countdown.description}</p>
          )}
        </div>

        {/* Countdown units */}
        {past ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-4xl font-bold"
            style={{ color: th.from }}
          >
            🎉 It&apos;s here!
          </motion.div>
        ) : (
          <div className="flex gap-4 sm:gap-8">
            {(['days', 'hours', 'minutes', 'seconds'] as const).map((unit) => (
              <div key={unit} className="flex flex-col items-center">
                <motion.div
                  key={time[unit]}
                  initial={{ y: -12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  className="text-5xl font-bold tabular-nums sm:text-7xl"
                  style={{
                    background: `linear-gradient(135deg, ${th.from}, ${th.to})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {pad(time[unit])}
                </motion.div>
                <span className="text-muted-foreground mt-2 text-xs tracking-widest uppercase">
                  {unit}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Progress bar */}
        <div className="w-full max-w-md">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${th.from}, ${th.to})` }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent(countdown)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <p className="text-muted-foreground mt-1.5 text-xs">
            {progressPercent(countdown).toFixed(1)}% elapsed
          </p>
        </div>

        {/* Target date label */}
        <p className="text-muted-foreground text-sm">
          {new Date(countdown.targetDate).toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="text-muted-foreground hover:text-foreground absolute top-5 right-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/8 transition-colors hover:bg-white/15"
      >
        <Minimize2 className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

/* ---------------------------------------------------------- */
/*  Create / Edit form                                          */
/* ---------------------------------------------------------- */

interface FormState {
  title: string;
  description: string;
  targetDate: string; // datetime-local value
  category: CountdownCategory;
  theme: CountdownTheme;
  emoji: string;
  pinned: boolean;
}

const DEFAULT_FORM: FormState = {
  title: '',
  description: '',
  targetDate: '',
  category: 'custom',
  theme: 'violet',
  emoji: '⏳',
  pinned: false,
};

function countdownToForm(c: Countdown): FormState {
  const d = new Date(c.targetDate);
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const local = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return {
    title: c.title,
    description: c.description,
    targetDate: local,
    category: c.category,
    theme: c.theme,
    emoji: c.emoji,
    pinned: c.pinned,
  };
}

function CountdownForm({
  initial = DEFAULT_FORM,
  onSubmit,
  onCancel,
  saving,
}: {
  initial?: FormState;
  onSubmit: (f: FormState) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [f, setF] = useState<FormState>(initial);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setF((prev) => ({ ...prev, [k]: v }));

  const handleCategoryChange = (cat: CountdownCategory) => {
    const found = CATEGORIES.find((c) => c.id === cat);
    if (found) set('emoji', found.emoji);
    set('category', cat);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(f);
      }}
      className="space-y-4"
    >
      {/* Title */}
      <div className="space-y-1.5">
        <Label className="text-xs">Title *</Label>
        <Input
          value={f.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Summer break, Final exam…"
          required
          className="border-white/10 bg-white/5 text-sm"
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label className="text-xs">Description</Label>
        <Input
          value={f.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Optional short note"
          className="border-white/10 bg-white/5 text-sm"
        />
      </div>

      {/* Target date */}
      <div className="space-y-1.5">
        <Label className="text-xs">Target date & time *</Label>
        <Input
          type="datetime-local"
          value={f.targetDate}
          onChange={(e) => set('targetDate', e.target.value)}
          required
          className="border-white/10 bg-white/5 text-sm"
        />
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label className="text-xs">Category</Label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleCategoryChange(c.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors',
                f.category === c.id
                  ? 'border-primary/60 bg-primary/20 text-primary'
                  : 'text-muted-foreground border-white/10 bg-white/5 hover:border-white/20'
              )}
            >
              <span>{c.emoji}</span>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Emoji override */}
      <div className="space-y-1.5">
        <Label className="text-xs">Emoji</Label>
        <Input
          value={f.emoji}
          onChange={(e) => set('emoji', e.target.value)}
          placeholder="⏳"
          maxLength={4}
          className="w-24 border-white/10 bg-white/5 text-sm"
        />
      </div>

      {/* Theme */}
      <div className="space-y-1.5">
        <Label className="text-xs">Color theme</Label>
        <div className="flex flex-wrap gap-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => set('theme', t.id)}
              className={cn(
                'h-7 w-7 rounded-full border-2 transition-transform',
                f.theme === t.id ? 'scale-125 border-white' : 'scale-100 border-transparent'
              )}
              style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}
              title={t.label}
            />
          ))}
        </div>
      </div>

      {/* Pin toggle */}
      <label className="flex cursor-pointer items-center gap-2 select-none">
        <input
          type="checkbox"
          checked={f.pinned}
          onChange={(e) => set('pinned', e.target.checked)}
          className="accent-primary h-3.5 w-3.5"
        />
        <span className="text-muted-foreground text-xs">Pin to top</span>
      </label>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={saving} size="sm" className="flex-1">
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          <span className="ml-1.5">Save</span>
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="px-3">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </form>
  );
}

/* ---------------------------------------------------------- */
/*  Countdown card                                              */
/* ---------------------------------------------------------- */

function CountdownCard({
  countdown,
  onEdit,
  onDelete,
  onTogglePin,
  onToggleArchive,
  onOpen,
  isMobile,
  onMobileTap,
}: {
  countdown: Countdown;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onToggleArchive: () => void;
  onOpen: () => void;
  isMobile: boolean;
  onMobileTap: () => void;
}) {
  const [time, setTime] = useState<TimeLeft>(calcTimeLeft(countdown.targetDate));
  const th = getTheme(countdown.theme);
  const past = time.total <= 0;

  useEffect(() => {
    const id = setInterval(() => setTime(calcTimeLeft(countdown.targetDate)), 1000);
    return () => clearInterval(id);
  }, [countdown.targetDate]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-white/8',
        countdown.archived && 'opacity-50'
      )}
      style={{
        background: 'oklch(0.12 0.01 260 / 80%)',
        boxShadow: `0 0 0 1px ${th.from}18`,
      }}
    >
      {/* Gradient accent strip */}
      <div
        className="absolute inset-x-0 top-0 h-0.5"
        style={{ background: `linear-gradient(90deg, transparent, ${th.from}, transparent)` }}
      />

      {/* Glow bg */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% -10%, ${th.glow.replace('40%', '15%')}, transparent 70%)`,
        }}
      />

      <div className="relative z-10 p-5">
        {/* Header row */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="shrink-0 text-3xl">{countdown.emoji}</span>
            <div className="min-w-0">
              <h3 className="text-foreground truncate text-sm font-semibold">{countdown.title}</h3>
              {countdown.description && (
                <p className="text-muted-foreground truncate text-xs">{countdown.description}</p>
              )}
              <p className="text-muted-foreground/60 mt-0.5 text-[10px]">
                {new Date(countdown.targetDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex shrink-0 items-center gap-0.5">
            {isMobile ? (
              /* Mobile: single tap target that opens the sheet */
              <button
                onClick={onMobileTap}
                className="text-muted-foreground rounded-lg bg-white/5 p-1.5 transition-colors active:bg-white/15"
                title="Actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            ) : (
              /* Desktop: hover-revealed icon row */
              <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={onOpen}
                  className="text-muted-foreground hover:text-foreground rounded-lg p-1.5 transition-colors hover:bg-white/8"
                  title="Cinematic view"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={onEdit}
                  className="text-muted-foreground hover:text-foreground rounded-lg p-1.5 transition-colors hover:bg-white/8"
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={onTogglePin}
                  className="text-muted-foreground hover:text-foreground rounded-lg p-1.5 transition-colors hover:bg-white/8"
                  title={countdown.pinned ? 'Unpin' : 'Pin'}
                >
                  {countdown.pinned ? (
                    <PinOff className="h-3.5 w-3.5" />
                  ) : (
                    <Pin className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  onClick={onToggleArchive}
                  className="text-muted-foreground hover:text-foreground rounded-lg p-1.5 transition-colors hover:bg-white/8"
                  title={countdown.archived ? 'Restore' : 'Archive'}
                >
                  {countdown.archived ? (
                    <ArchiveRestore className="h-3.5 w-3.5" />
                  ) : (
                    <Archive className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  onClick={onDelete}
                  className="hover:bg-destructive/20 text-muted-foreground hover:text-destructive rounded-lg p-1.5 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Timer display */}
        {past ? (
          <div className="py-2 text-center">
            <span className="text-2xl">🎉</span>
            <p className="text-muted-foreground mt-1 text-xs">Reached!</p>
          </div>
        ) : (
          <div className="mb-4 flex justify-center gap-3">
            {(
              [
                ['days', time.days],
                ['hrs', time.hours],
                ['min', time.minutes],
                ['sec', time.seconds],
              ] as [string, number][]
            ).map(([label, val]) => (
              <div key={label} className="flex flex-col items-center">
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={val}
                    initial={{ y: -8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 8, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-xl font-bold tabular-nums"
                    style={{ color: th.from }}
                  >
                    {pad(val)}
                  </motion.span>
                </AnimatePresence>
                <span className="text-muted-foreground text-[9px] tracking-wider uppercase">
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Progress bar */}
        <div className="h-1 overflow-hidden rounded-full bg-white/8">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${th.from}, ${th.to})` }}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent(countdown)}%` }}
            transition={{ duration: 1 }}
          />
        </div>
        <p className="text-muted-foreground/50 mt-1 text-right text-[9px]">
          {progressPercent(countdown).toFixed(0)}%
        </p>
      </div>
    </motion.div>
  );
}

/* ---------------------------------------------------------- */
/*  Main page                                                   */
/* ---------------------------------------------------------- */

export default function CountdownPage() {
  const [countdowns, setCountdowns] = useState<Countdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Countdown | null>(null);
  const [saving, setSaving] = useState(false);
  const [cinematic, setCinematic] = useState<Countdown | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [mobileActionCountdown, setMobileActionCountdown] = useState<Countdown | null>(null);
  const isMobile = useIsMobile();

  /* Load */
  useEffect(() => {
    apiFetch<{ countdowns: Countdown[] }>('/api/countdowns')
      .then((d) => setCountdowns(Array.isArray(d.countdowns) ? d.countdowns : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* Create */
  const handleCreate = async (f: FormState) => {
    setSaving(true);
    try {
      const res = await apiFetch<{ countdown: Countdown }>('/api/countdowns', {
        method: 'POST',
        body: JSON.stringify({
          title: f.title,
          description: f.description,
          targetDate: new Date(f.targetDate).getTime(),
          category: f.category,
          theme: f.theme,
          emoji: f.emoji,
          pinned: f.pinned,
        }) as unknown as BodyInit,
      });
      setCountdowns((cs) => sortCountdowns([res.countdown, ...cs]));
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  /* Update */
  const handleUpdate = async (f: FormState) => {
    if (!editTarget) return;
    setSaving(true);
    try {
      const res = await apiFetch<{ countdown: Countdown }>(`/api/countdowns?id=${editTarget.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: f.title,
          description: f.description,
          targetDate: new Date(f.targetDate).getTime(),
          category: f.category,
          theme: f.theme,
          emoji: f.emoji,
          pinned: f.pinned,
        }) as unknown as BodyInit,
      });
      setCountdowns((cs) =>
        sortCountdowns(cs.map((c) => (c.id === editTarget.id ? res.countdown : c)))
      );
      setEditTarget(null);
    } finally {
      setSaving(false);
    }
  };

  /* Delete */
  const handleDelete = async (id: string) => {
    setCountdowns((cs) => cs.filter((c) => c.id !== id));
    await apiFetch(`/api/countdowns?id=${id}`, { method: 'DELETE' }).catch(() => {});
  };

  /* Toggle pin */
  const handleTogglePin = async (c: Countdown) => {
    const res = await apiFetch<{ countdown: Countdown }>(`/api/countdowns?id=${c.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ pinned: !c.pinned }) as unknown as BodyInit,
    });
    setCountdowns((cs) => sortCountdowns(cs.map((x) => (x.id === c.id ? res.countdown : x))));
  };

  /* Toggle archive */
  const handleToggleArchive = async (c: Countdown) => {
    const res = await apiFetch<{ countdown: Countdown }>(`/api/countdowns?id=${c.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ archived: !c.archived }) as unknown as BodyInit,
    });
    setCountdowns((cs) => sortCountdowns(cs.map((x) => (x.id === c.id ? res.countdown : x))));
  };

  const active = countdowns.filter((c) => !c.archived);
  const archived = countdowns.filter((c) => c.archived);

  return (
    <>
      {/* Cinematic overlay */}
      <AnimatePresence>
        {cinematic && <CinematicView countdown={cinematic} onClose={() => setCinematic(null)} />}
      </AnimatePresence>

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Timer className="text-primary h-6 w-6" />
            </h1>
            <div>
              <h1 className="text-xl font-bold">Countdowns</h1>
              <p className="text-muted-foreground text-xs">Track events, exams and more</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setShowForm(true);
              setEditTarget(null);
            }}
            size="sm"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New countdown
          </Button>
        </div>

        {/* Create / Edit form */}
        <AnimatePresence>
          {(showForm || editTarget) && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-card rounded-2xl border border-white/10 p-5"
            >
              <h2 className="mb-4 text-sm font-semibold">
                {editTarget ? 'Edit countdown' : 'New countdown'}
              </h2>
              <CountdownForm
                initial={editTarget ? countdownToForm(editTarget) : DEFAULT_FORM}
                onSubmit={editTarget ? handleUpdate : handleCreate}
                onCancel={() => {
                  setShowForm(false);
                  setEditTarget(null);
                }}
                saving={saving}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active countdowns */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : active.length === 0 && !showForm ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-16 text-center"
          >
            <Timer className="text-muted-foreground/30 h-10 w-10" />
            <p className="text-muted-foreground text-sm">No countdowns yet.</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowForm(true)}
              className="text-primary hover:text-primary"
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Create your first countdown
            </Button>
          </motion.div>
        ) : (
          <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence initial={false}>
              {active.map((c) => (
                <CountdownCard
                  key={c.id}
                  countdown={c}
                  onEdit={() => {
                    setEditTarget(c);
                    setShowForm(false);
                  }}
                  onDelete={() => handleDelete(c.id)}
                  onTogglePin={() => handleTogglePin(c)}
                  onToggleArchive={() => handleToggleArchive(c)}
                  onOpen={() => setCinematic(c)}
                  isMobile={isMobile}
                  onMobileTap={() => setMobileActionCountdown(c)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Archived section */}
        {archived.length > 0 && (
          <div>
            <button
              onClick={() => setShowArchived((s) => !s)}
              className="text-muted-foreground hover:text-foreground mb-3 flex items-center gap-2 text-xs transition-colors"
            >
              <Archive className="h-3.5 w-3.5" />
              Archived ({archived.length})
              <ChevronDown
                className={cn('h-3 w-3 transition-transform', showArchived && 'rotate-180')}
              />
            </button>
            <AnimatePresence>
              {showArchived && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {archived.map((c) => (
                    <CountdownCard
                      key={c.id}
                      countdown={c}
                      onEdit={() => setEditTarget(c)}
                      onDelete={() => handleDelete(c.id)}
                      onTogglePin={() => handleTogglePin(c)}
                      onToggleArchive={() => handleToggleArchive(c)}
                      onOpen={() => setCinematic(c)}
                      isMobile={isMobile}
                      onMobileTap={() => setMobileActionCountdown(c)}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Mobile action sheet */}
      <AnimatePresence>
        {mobileActionCountdown && (
          <CountdownMobileActionSheet
            countdown={mobileActionCountdown}
            onClose={() => setMobileActionCountdown(null)}
            onOpen={() => {
              setCinematic(mobileActionCountdown);
              setMobileActionCountdown(null);
            }}
            onEdit={() => {
              setEditTarget(mobileActionCountdown);
              setShowForm(false);
              setMobileActionCountdown(null);
            }}
            onTogglePin={() => {
              handleTogglePin(mobileActionCountdown);
              setMobileActionCountdown(null);
            }}
            onToggleArchive={() => {
              handleToggleArchive(mobileActionCountdown);
              setMobileActionCountdown(null);
            }}
            onDelete={() => {
              handleDelete(mobileActionCountdown.id);
              setMobileActionCountdown(null);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ---------------------------------------------------------- */
/*  Sort helper                                                 */
/* ---------------------------------------------------------- */

function sortCountdowns(cs: Countdown[]): Countdown[] {
  return [...cs].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return a.targetDate - b.targetDate;
  });
}

/* ---------------------------------------------------------- */
/*  CountdownMobileActionSheet                                  */
/* ---------------------------------------------------------- */

function CountdownMobileActionSheet({
  countdown,
  onClose,
  onOpen,
  onEdit,
  onTogglePin,
  onToggleArchive,
  onDelete,
}: {
  countdown: Countdown;
  onClose: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onTogglePin: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
}) {
  const th = getTheme(countdown.theme);

  const actions: {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    danger?: boolean;
  }[] = [
    { icon: Maximize2, label: 'Cinematic view', onClick: onOpen },
    { icon: Pencil, label: 'Edit', onClick: onEdit },
    {
      icon: countdown.pinned ? PinOff : Pin,
      label: countdown.pinned ? 'Unpin' : 'Pin',
      onClick: onTogglePin,
    },
    {
      icon: countdown.archived ? ArchiveRestore : Archive,
      label: countdown.archived ? 'Restore' : 'Archive',
      onClick: onToggleArchive,
    },
    { icon: Trash2, label: 'Delete', onClick: onDelete, danger: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-end"
      onClick={onClose}
    >
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 320, mass: 0.8 }}
        className="relative w-full overflow-hidden rounded-t-3xl border-t border-white/10"
        style={{ background: 'oklch(0.13 0 0)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-9 rounded-full bg-white/20" />
        </div>

        {/* Countdown preview */}
        <div className="px-4 pt-1 pb-3">
          <div
            className="flex items-center gap-3 rounded-xl border border-white/8 px-4 py-3"
            style={{
              background: 'oklch(1 0 0 / 4%)',
              borderTop: `2px solid ${th.from}`,
            }}
          >
            <span className="shrink-0 text-3xl">{countdown.emoji}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{countdown.title}</p>
              {countdown.description && (
                <p className="text-muted-foreground truncate text-xs">{countdown.description}</p>
              )}
              <p className="mt-0.5 text-[10px]" style={{ color: th.from }}>
                {new Date(countdown.targetDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Action rows */}
        <div
          className="mx-4 mb-8 overflow-hidden rounded-2xl"
          style={{ background: 'oklch(1 0 0 / 4%)', border: '1px solid oklch(1 0 0 / 7%)' }}
        >
          {actions.map(({ icon: Icon, label, onClick, danger }, i) => (
            <motion.button
              key={label}
              whileTap={{ backgroundColor: 'oklch(1 0 0 / 8%)' }}
              onClick={onClick}
              className={cn(
                'flex w-full items-center gap-4 px-5 py-4 text-left text-sm font-medium transition-colors',
                danger ? 'text-destructive' : 'text-foreground',
                i > 0 && 'border-t border-white/7'
              )}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              {label}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
