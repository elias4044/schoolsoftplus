"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Pencil, Pin, PinOff, Archive, ArchiveRestore,
  Timer, Check, X, ChevronDown, Loader2, Maximize2, Minimize2,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/* ---------------------------------------------------------- */
/*  Types (mirror server types)                                 */
/* ---------------------------------------------------------- */

type CountdownCategory = "exam" | "holiday" | "birthday" | "event" | "deadline" | "custom";
type CountdownTheme = "violet" | "rose" | "amber" | "emerald" | "sky" | "slate";

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

/* ---------------------------------------------------------- */
/*  Theme / category metadata                                   */
/* ---------------------------------------------------------- */

const THEMES: { id: CountdownTheme; label: string; from: string; to: string; glow: string }[] = [
  { id: "violet",  label: "Violet",  from: "oklch(0.65 0.22 278)", to: "oklch(0.55 0.25 295)", glow: "oklch(0.65 0.22 278 / 40%)" },
  { id: "rose",    label: "Rose",    from: "oklch(0.68 0.22 10)",  to: "oklch(0.58 0.26 340)", glow: "oklch(0.68 0.22 10 / 40%)" },
  { id: "amber",   label: "Amber",   from: "oklch(0.78 0.17 75)",  to: "oklch(0.68 0.20 55)",  glow: "oklch(0.78 0.17 75 / 40%)" },
  { id: "emerald", label: "Emerald", from: "oklch(0.70 0.18 148)", to: "oklch(0.60 0.22 165)", glow: "oklch(0.70 0.18 148 / 40%)" },
  { id: "sky",     label: "Sky",     from: "oklch(0.72 0.17 220)", to: "oklch(0.62 0.22 240)", glow: "oklch(0.72 0.17 220 / 40%)" },
  { id: "slate",   label: "Slate",   from: "oklch(0.60 0.04 255)", to: "oklch(0.48 0.05 265)", glow: "oklch(0.60 0.04 255 / 40%)" },
];

const CATEGORIES: { id: CountdownCategory; label: string; emoji: string }[] = [
  { id: "exam",     label: "Exam",     emoji: "📝" },
  { id: "holiday",  label: "Holiday",  emoji: "🌴" },
  { id: "birthday", label: "Birthday", emoji: "🎂" },
  { id: "event",    label: "Event",    emoji: "🎉" },
  { id: "deadline", label: "Deadline", emoji: "⚡" },
  { id: "custom",   label: "Custom",   emoji: "⏳" },
];

function getTheme(t: CountdownTheme) {
  return THEMES.find(x => x.id === t) ?? THEMES[0];
}

/* ---------------------------------------------------------- */
/*  Time helpers                                                */
/* ---------------------------------------------------------- */

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
    days:    Math.floor(abs / 86_400_000),
    hours:   Math.floor((abs % 86_400_000) / 3_600_000),
    minutes: Math.floor((abs % 3_600_000)  / 60_000),
    seconds: Math.floor((abs % 60_000)     / 1_000),
  };
}

function pad(n: number) { return String(n).padStart(2, "0"); }

function totalDuration(targetDate: number, createdAt: number) {
  return Math.max(1, targetDate - createdAt);
}

function progressPercent(c: Countdown) {
  const elapsed  = Date.now() - c.createdAt;
  const duration = totalDuration(c.targetDate, c.createdAt);
  return Math.min(100, Math.max(0, (elapsed / duration) * 100));
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
      style={{ background: "oklch(0.06 0.01 260)" }}
    >
      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 60% at 50% 50%, ${th.glow}, transparent 70%)`,
        }}
      />

      {/* Floating particles */}
      {particles.map(i => (
        <motion.div
          key={i}
          className="absolute rounded-full opacity-20"
          style={{
            width:  4 + (i % 5) * 4,
            height: 4 + (i % 5) * 4,
            background: th.from,
            left: `${5 + (i * 4.7) % 90}%`,
            top: `${5 + (i * 7.3) % 90}%`,
          }}
          animate={{
            y:       [0, -30 - (i % 4) * 15, 0],
            opacity: [0.1, 0.35, 0.1],
            scale:   [1, 1.4, 1],
          }}
          transition={{
            duration: 4 + (i % 5),
            repeat: Infinity,
            delay: (i * 0.37) % 3,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Pulsing rings */}
      {[1, 2, 3].map(r => (
        <motion.div
          key={r}
          className="absolute rounded-full border pointer-events-none"
          style={{
            width:  200 + r * 180,
            height: 200 + r * 180,
            borderColor: th.from,
            opacity: 0.08,
          }}
          animate={{ scale: [1, 1.06, 1], opacity: [0.08, 0.14, 0.08] }}
          transition={{ duration: 3 + r, repeat: Infinity, ease: "easeInOut", delay: r * 0.6 }}
        />
      ))}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 text-center px-8 max-w-3xl w-full">
        {/* Emoji */}
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="text-7xl select-none"
        >
          {countdown.emoji}
        </motion.div>

        {/* Title */}
        <div>
          <h1
            className="text-4xl sm:text-5xl font-bold tracking-tight"
            style={{
              background: `linear-gradient(135deg, ${th.from}, ${th.to})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {countdown.title}
          </h1>
          {countdown.description && (
            <p className="mt-2 text-muted-foreground text-base">{countdown.description}</p>
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
            {(["days", "hours", "minutes", "seconds"] as const).map(unit => (
              <div key={unit} className="flex flex-col items-center">
                <motion.div
                  key={time[unit]}
                  initial={{ y: -12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  className="text-5xl sm:text-7xl font-bold tabular-nums"
                  style={{
                    background: `linear-gradient(135deg, ${th.from}, ${th.to})`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {pad(time[unit])}
                </motion.div>
                <span className="text-xs uppercase tracking-widest text-muted-foreground mt-2">
                  {unit}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Progress bar */}
        <div className="w-full max-w-md">
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${th.from}, ${th.to})` }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent(countdown)}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {progressPercent(countdown).toFixed(1)}% elapsed
          </p>
        </div>

        {/* Target date label */}
        <p className="text-sm text-muted-foreground">
          {new Date(countdown.targetDate).toLocaleDateString(undefined, {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
          })}
        </p>
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 flex items-center justify-center w-9 h-9 rounded-full bg-white/8 hover:bg-white/15 transition-colors text-muted-foreground hover:text-foreground"
      >
        <Minimize2 className="w-4 h-4" />
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
  title: "",
  description: "",
  targetDate: "",
  category: "custom",
  theme: "violet",
  emoji: "⏳",
  pinned: false,
};

function countdownToForm(c: Countdown): FormState {
  const d = new Date(c.targetDate);
  const pad2 = (n: number) => String(n).padStart(2, "0");
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
    setF(prev => ({ ...prev, [k]: v }));

  const handleCategoryChange = (cat: CountdownCategory) => {
    const found = CATEGORIES.find(c => c.id === cat);
    if (found) set("emoji", found.emoji);
    set("category", cat);
  };

  return (
    <form
      onSubmit={e => { e.preventDefault(); onSubmit(f); }}
      className="space-y-4"
    >
      {/* Title */}
      <div className="space-y-1.5">
        <Label className="text-xs">Title *</Label>
        <Input
          value={f.title}
          onChange={e => set("title", e.target.value)}
          placeholder="Summer break, Final exam…"
          required
          className="bg-white/5 border-white/10 text-sm"
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label className="text-xs">Description</Label>
        <Input
          value={f.description}
          onChange={e => set("description", e.target.value)}
          placeholder="Optional short note"
          className="bg-white/5 border-white/10 text-sm"
        />
      </div>

      {/* Target date */}
      <div className="space-y-1.5">
        <Label className="text-xs">Target date & time *</Label>
        <Input
          type="datetime-local"
          value={f.targetDate}
          onChange={e => set("targetDate", e.target.value)}
          required
          className="bg-white/5 border-white/10 text-sm"
        />
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label className="text-xs">Category</Label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleCategoryChange(c.id)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors",
                f.category === c.id
                  ? "border-primary/60 bg-primary/20 text-primary"
                  : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20"
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
          onChange={e => set("emoji", e.target.value)}
          placeholder="⏳"
          maxLength={4}
          className="bg-white/5 border-white/10 text-sm w-24"
        />
      </div>

      {/* Theme */}
      <div className="space-y-1.5">
        <Label className="text-xs">Color theme</Label>
        <div className="flex gap-2 flex-wrap">
          {THEMES.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => set("theme", t.id)}
              className={cn(
                "w-7 h-7 rounded-full border-2 transition-transform",
                f.theme === t.id ? "border-white scale-125" : "border-transparent scale-100"
              )}
              style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}
              title={t.label}
            />
          ))}
        </div>
      </div>

      {/* Pin toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={f.pinned}
          onChange={e => set("pinned", e.target.checked)}
          className="accent-primary w-3.5 h-3.5"
        />
        <span className="text-xs text-muted-foreground">Pin to top</span>
      </label>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={saving} size="sm" className="flex-1"
          style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 278), oklch(0.55 0.25 295))" }}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          <span className="ml-1.5">Save</span>
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="px-3">
          <X className="w-3.5 h-3.5" />
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
}: {
  countdown: Countdown;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onToggleArchive: () => void;
  onOpen: () => void;
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
        "relative group rounded-2xl border border-white/8 overflow-hidden",
        countdown.archived && "opacity-50"
      )}
      style={{
        background: "oklch(0.12 0.01 260 / 80%)",
        boxShadow: `0 0 0 1px ${th.from}18`,
      }}
    >
      {/* Gradient accent strip */}
      <div
        className="absolute top-0 inset-x-0 h-0.5"
        style={{ background: `linear-gradient(90deg, transparent, ${th.from}, transparent)` }}
      />

      {/* Glow bg */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% -10%, ${th.glow.replace("40%", "15%")}, transparent 70%)`,
        }}
      />

      <div className="relative z-10 p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-3xl shrink-0">{countdown.emoji}</span>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate text-foreground">{countdown.title}</h3>
              {countdown.description && (
                <p className="text-xs text-muted-foreground truncate">{countdown.description}</p>
              )}
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                {new Date(countdown.targetDate).toLocaleDateString(undefined, {
                  month: "short", day: "numeric", year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Action buttons (visible on hover) */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={onOpen} className="p-1.5 rounded-lg hover:bg-white/8 text-muted-foreground hover:text-foreground transition-colors" title="Cinematic view">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-white/8 text-muted-foreground hover:text-foreground transition-colors" title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onTogglePin} className="p-1.5 rounded-lg hover:bg-white/8 text-muted-foreground hover:text-foreground transition-colors" title={countdown.pinned ? "Unpin" : "Pin"}>
              {countdown.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
            </button>
            <button onClick={onToggleArchive} className="p-1.5 rounded-lg hover:bg-white/8 text-muted-foreground hover:text-foreground transition-colors" title={countdown.archived ? "Restore" : "Archive"}>
              {countdown.archived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Timer display */}
        {past ? (
          <div className="text-center py-2">
            <span className="text-2xl">🎉</span>
            <p className="text-xs text-muted-foreground mt-1">Reached!</p>
          </div>
        ) : (
          <div className="flex gap-3 justify-center mb-4">
            {([
              ["days",    time.days],
              ["hrs",     time.hours],
              ["min",     time.minutes],
              ["sec",     time.seconds],
            ] as [string, number][]).map(([label, val]) => (
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
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Progress bar */}
        <div className="h-1 rounded-full bg-white/8 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${th.from}, ${th.to})` }}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent(countdown)}%` }}
            transition={{ duration: 1 }}
          />
        </div>
        <p className="text-[9px] text-muted-foreground/50 mt-1 text-right">
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
  const [countdowns, setCountdowns]     = useState<Countdown[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [editTarget, setEditTarget]     = useState<Countdown | null>(null);
  const [saving, setSaving]             = useState(false);
  const [cinematic, setCinematic]       = useState<Countdown | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  /* Load */
  useEffect(() => {
    apiFetch<{ countdowns: Countdown[] }>("/api/countdowns")
      .then(d => setCountdowns(Array.isArray(d.countdowns) ? d.countdowns : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* Create */
  const handleCreate = async (f: FormState) => {
    setSaving(true);
    try {
      const res = await apiFetch<{ countdown: Countdown }>("/api/countdowns", {
        method: "POST",
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
      setCountdowns(cs => sortCountdowns([res.countdown, ...cs]));
      setShowForm(false);
    } finally { setSaving(false); }
  };

  /* Update */
  const handleUpdate = async (f: FormState) => {
    if (!editTarget) return;
    setSaving(true);
    try {
      const res = await apiFetch<{ countdown: Countdown }>(`/api/countdowns?id=${editTarget.id}`, {
        method: "PATCH",
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
      setCountdowns(cs => sortCountdowns(cs.map(c => c.id === editTarget.id ? res.countdown : c)));
      setEditTarget(null);
    } finally { setSaving(false); }
  };

  /* Delete */
  const handleDelete = async (id: string) => {
    setCountdowns(cs => cs.filter(c => c.id !== id));
    await apiFetch(`/api/countdowns?id=${id}`, { method: "DELETE" }).catch(() => {});
  };

  /* Toggle pin */
  const handleTogglePin = async (c: Countdown) => {
    const res = await apiFetch<{ countdown: Countdown }>(`/api/countdowns?id=${c.id}`, {
      method: "PATCH",
      body: JSON.stringify({ pinned: !c.pinned }) as unknown as BodyInit,
    });
    setCountdowns(cs => sortCountdowns(cs.map(x => x.id === c.id ? res.countdown : x)));
  };

  /* Toggle archive */
  const handleToggleArchive = async (c: Countdown) => {
    const res = await apiFetch<{ countdown: Countdown }>(`/api/countdowns?id=${c.id}`, {
      method: "PATCH",
      body: JSON.stringify({ archived: !c.archived }) as unknown as BodyInit,
    });
    setCountdowns(cs => sortCountdowns(cs.map(x => x.id === c.id ? res.countdown : x)));
  };

  const active   = countdowns.filter(c => !c.archived);
  const archived = countdowns.filter(c => c.archived);

  return (
    <>
      {/* Cinematic overlay */}
      <AnimatePresence>
        {cinematic && (
          <CinematicView countdown={cinematic} onClose={() => setCinematic(null)} />
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
              style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 278 / 30%), oklch(0.55 0.25 295 / 30%))" }}
            >
              <Timer className="w-5 h-5" style={{ color: "oklch(0.72 0.18 278)" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold">Countdowns</h1>
              <p className="text-xs text-muted-foreground">Track events, exams and more</p>
            </div>
          </div>
          <Button
            onClick={() => { setShowForm(true); setEditTarget(null); }}
            size="sm"
            className="shrink-0"
            style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 278), oklch(0.55 0.25 295))" }}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
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
              className="rounded-2xl border border-white/10 p-5"
              style={{ background: "oklch(0.12 0.01 260 / 80%)" }}
            >
              <h2 className="text-sm font-semibold mb-4">
                {editTarget ? "Edit countdown" : "New countdown"}
              </h2>
              <CountdownForm
                initial={editTarget ? countdownToForm(editTarget) : DEFAULT_FORM}
                onSubmit={editTarget ? handleUpdate : handleCreate}
                onCancel={() => { setShowForm(false); setEditTarget(null); }}
                saving={saving}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active countdowns */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-44 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : active.length === 0 && !showForm ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-16 text-center"
          >
            <Timer className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">No countdowns yet.</p>
            <Button
              size="sm" variant="ghost"
              onClick={() => setShowForm(true)}
              className="text-primary hover:text-primary"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Create your first countdown
            </Button>
          </motion.div>
        ) : (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence initial={false}>
              {active.map(c => (
                <CountdownCard
                  key={c.id}
                  countdown={c}
                  onEdit={() => { setEditTarget(c); setShowForm(false); }}
                  onDelete={() => handleDelete(c.id)}
                  onTogglePin={() => handleTogglePin(c)}
                  onToggleArchive={() => handleToggleArchive(c)}
                  onOpen={() => setCinematic(c)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Archived section */}
        {archived.length > 0 && (
          <div>
            <button
              onClick={() => setShowArchived(s => !s)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
            >
              <Archive className="w-3.5 h-3.5" />
              Archived ({archived.length})
              <ChevronDown className={cn("w-3 h-3 transition-transform", showArchived && "rotate-180")} />
            </button>
            <AnimatePresence>
              {showArchived && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {archived.map(c => (
                    <CountdownCard
                      key={c.id}
                      countdown={c}
                      onEdit={() => setEditTarget(c)}
                      onDelete={() => handleDelete(c.id)}
                      onTogglePin={() => handleTogglePin(c)}
                      onToggleArchive={() => handleToggleArchive(c)}
                      onOpen={() => setCinematic(c)}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
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
