"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers, Plus, Search, X, Trash2, Loader2,
  Sparkles, BookOpen, Download, Upload, RotateCcw,
  Check, BookMarked, Lightbulb, Brain, SlidersHorizontal,
  ArrowLeft, GraduationCap, FileText, FlaskConical,
  Calculator, Globe, Music, Code2, Star, Zap, Trophy,
  Compass, Atom, Microscope, PenLine, Hash, Share2,
  type LucideIcon,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ShareConversationPicker, { type ShareCardRef } from "@/components/ShareConversationPicker";

/* ============================================================
   TYPES
   ============================================================ */

type DeckColor = "violet" | "rose" | "amber" | "emerald" | "sky" | "slate";

interface FlashDeck {
  id: string;
  title: string;
  description: string;
  color: DeckColor;
  emoji: string;
  subjectId: number | null;
  subjectName: string | null;
  tags: string[];
  cardCount: number;
  createdAt: number;
  updatedAt: number;
}

interface FlashCard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  hint: string;
  tags: string[];
  repetitions: number;
  easeFactor: number;
  interval: number;
  nextReview: number;
  lastReview: number | null;
  createdAt: number;
  updatedAt: number;
}

/* ============================================================
   THEME / COLOR METADATA
   ============================================================ */

const COLORS: Record<DeckColor, { from: string; to: string; glow: string; badge: string }> = {
  violet:  { from: "oklch(0.65 0.22 278)",  to: "oklch(0.55 0.25 295)",  glow: "oklch(0.65 0.22 278 / 35%)", badge: "oklch(0.65 0.22 278 / 18%)" },
  rose:    { from: "oklch(0.68 0.22 10)",   to: "oklch(0.58 0.26 340)",  glow: "oklch(0.68 0.22 10 / 35%)",  badge: "oklch(0.68 0.22 10 / 18%)" },
  amber:   { from: "oklch(0.78 0.17 75)",   to: "oklch(0.68 0.20 55)",   glow: "oklch(0.78 0.17 75 / 35%)",  badge: "oklch(0.78 0.17 75 / 18%)" },
  emerald: { from: "oklch(0.70 0.18 148)",  to: "oklch(0.60 0.22 165)",  glow: "oklch(0.70 0.18 148 / 35%)", badge: "oklch(0.70 0.18 148 / 18%)" },
  sky:     { from: "oklch(0.72 0.17 220)",  to: "oklch(0.62 0.22 240)",  glow: "oklch(0.72 0.17 220 / 35%)", badge: "oklch(0.72 0.17 220 / 18%)" },
  slate:   { from: "oklch(0.60 0.04 255)",  to: "oklch(0.48 0.05 265)",  glow: "oklch(0.60 0.04 255 / 35%)", badge: "oklch(0.60 0.04 255 / 18%)" },
};

const COLOR_OPTIONS: { id: DeckColor; label: string }[] = [
  { id: "violet",  label: "Violet" },
  { id: "rose",    label: "Rose" },
  { id: "amber",   label: "Amber" },
  { id: "emerald", label: "Emerald" },
  { id: "sky",     label: "Sky" },
  { id: "slate",   label: "Slate" },
];

type DeckIconName =
  | "book" | "brain" | "flask" | "calculator" | "globe"
  | "music" | "code"  | "star"  | "zap"         | "trophy"
  | "compass" | "atom" | "microscope" | "layers" | "pen" | "hash";

const DECK_ICON_MAP: Record<DeckIconName, LucideIcon> = {
  book:       BookOpen,
  brain:      Brain,
  flask:      FlaskConical,
  calculator: Calculator,
  globe:      Globe,
  music:      Music,
  code:       Code2,
  star:       Star,
  zap:        Zap,
  trophy:     Trophy,
  compass:    Compass,
  atom:       Atom,
  microscope: Microscope,
  layers:     Layers,
  pen:        PenLine,
  hash:       Hash,
};

const DECK_ICON_OPTIONS = Object.keys(DECK_ICON_MAP) as DeckIconName[];
const DEFAULT_DECK_ICON: DeckIconName = "book";

function getDeckIcon(name: string): LucideIcon {
  return DECK_ICON_MAP[name as DeckIconName] ?? BookOpen;
}

/* ============================================================
   SM-2 SPACED REPETITION
   ============================================================ */

type StudyRating = 0 | 1 | 3 | 5; // again / hard / good / easy

function computeSm2(card: FlashCard, rating: StudyRating): Partial<FlashCard> {
  let { repetitions, easeFactor, interval } = card;
  const now = Date.now();

  if (rating < 3) {
    // Failed — reset
    repetitions = 0;
    interval = 1;
  } else {
    // Passed
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions += 1;
    easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
  }

  const nextReview = now + interval * 24 * 60 * 60 * 1000;
  return { repetitions, easeFactor, interval, nextReview, lastReview: now };
}

/* ============================================================
   STUDY MODE
   ============================================================ */

interface StudyModeProps {
  deck: FlashDeck;
  cards: FlashCard[];
  onClose: () => void;
  onCardReviewed: (updated: FlashCard) => void;
}

function StudyMode({ deck, cards, onClose, onCardReviewed }: StudyModeProps) {
  const theme = COLORS[deck.color];
  const dueCards = cards.filter(c => c.nextReview <= Date.now());
  const studyList = dueCards.length > 0 ? dueCards : [...cards];
  // Shuffle
  const [queue] = useState<FlashCard[]>(() => [...studyList].sort(() => Math.random() - 0.5));

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [results, setResults] = useState<{ again: number; hard: number; good: number; easy: number }>({
    again: 0, hard: 0, good: 0, easy: 0,
  });

  const card = queue[index] ?? null;
  const progress = queue.length > 0 ? (index / queue.length) * 100 : 100;

  async function rate(rating: StudyRating) {
    if (!card || submitting) return;
    setSubmitting(true);
    const patch = computeSm2(card, rating);
    try {
      const res = await apiFetch<{ card: FlashCard }>(
        `/api/flashcards/${deck.id}/cards/${card.id}`,
        { method: "PATCH", body: JSON.stringify(patch) as unknown as BodyInit }
      );
      onCardReviewed(res.card);
    } catch { /* non-critical */ }

    const label: keyof typeof results = rating === 0 ? "again" : rating === 1 ? "hard" : rating === 3 ? "good" : "easy";
    setResults(r => ({ ...r, [label]: r[label] + 1 }));

    if (index + 1 >= queue.length) {
      setCompleted(true);
    } else {
      setIndex(i => i + 1);
      setFlipped(false);
    }
    setSubmitting(false);
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "oklch(0.08 0.02 260 / 96%)", backdropFilter: "blur(12px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-6 h-14">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit study</span>
        </button>
        <span className="text-sm font-semibold flex items-center gap-1.5" style={{ color: theme.from }}>
          {(() => { const I = getDeckIcon(deck.emoji); return <I className="w-4 h-4" />; })()}
          {deck.title}
        </span>
        <span className="text-sm text-muted-foreground">
          {Math.min(index + 1, queue.length)} / {queue.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="absolute top-14 inset-x-0 h-1" style={{ background: "oklch(1 0 0 / 8%)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${theme.from}, ${theme.to})` }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <div className="w-full max-w-2xl px-6">
        <AnimatePresence mode="wait">
          {completed ? (
            <motion.div
              key="done"
              className="flex flex-col items-center gap-6 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
              >
                {(() => { const I = getDeckIcon(deck.emoji); return <I className="w-9 h-9 text-white" />; })()}
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">Session complete!</h2>
                <p className="text-muted-foreground text-sm">You reviewed {queue.length} cards.</p>
              </div>
              <div className="grid grid-cols-4 gap-3 w-full">
                {[
                  { label: "Again", val: results.again, color: "oklch(0.65 0.22 25)" },
                  { label: "Hard",  val: results.hard,  color: "oklch(0.72 0.17 75)" },
                  { label: "Good",  val: results.good,  color: "oklch(0.70 0.18 148)" },
                  { label: "Easy",  val: results.easy,  color: "oklch(0.65 0.22 220)" },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "oklch(1 0 0 / 6%)" }}>
                    <div className="text-2xl font-bold" style={{ color: s.color }}>{s.val}</div>
                    <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
              <Button onClick={onClose} className="mt-2 btn-primary px-8">Done</Button>
            </motion.div>
          ) : card ? (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center gap-6"
            >
              {/* Card */}
              <div
                className="w-full cursor-pointer select-none"
                style={{ perspective: "1200px" }}
                onClick={() => setFlipped(f => !f)}
              >
                <motion.div
                  style={{ transformStyle: "preserve-3d", minHeight: "260px", position: "relative" }}
                  animate={{ rotateY: flipped ? 180 : 0 }}
                  transition={{ duration: 0.45, type: "spring", stiffness: 280, damping: 26 }}
                >
                  {/* Front */}
                  <div
                    className="absolute inset-0 rounded-2xl p-8 flex flex-col items-center justify-center text-center"
                    style={{
                      backfaceVisibility: "hidden",
                      background: "oklch(0.14 0.03 260)",
                      border: `1px solid ${theme.from}30`,
                      boxShadow: `0 8px 40px ${theme.glow}`,
                    }}
                  >
                    <div className="text-xs font-medium uppercase tracking-widest mb-4" style={{ color: theme.from }}>
                      Question
                    </div>
                    <p className="text-lg font-medium leading-relaxed text-foreground">{card.front}</p>
                    {!flipped && (
                      <p className="text-xs text-muted-foreground mt-6">Click to reveal answer</p>
                    )}
                  </div>
                  {/* Back */}
                  <div
                    className="absolute inset-0 rounded-2xl p-8 flex flex-col items-center justify-center text-center"
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                      background: "oklch(0.14 0.03 260)",
                      border: `1px solid ${theme.from}30`,
                      boxShadow: `0 8px 40px ${theme.glow}`,
                    }}
                  >
                    <div className="text-xs font-medium uppercase tracking-widest mb-4" style={{ color: theme.from }}>
                      Answer
                    </div>
                    <p className="text-lg font-medium leading-relaxed text-foreground">{card.back}</p>
                    {card.hint && (
                      <div className="mt-4 flex items-start gap-2 text-left rounded-lg px-3 py-2 max-w-sm" style={{ background: "oklch(1 0 0 / 5%)" }}>
                        <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "oklch(0.78 0.17 75)" }} />
                        <p className="text-xs text-muted-foreground">{card.hint}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Rating buttons — only shown after flip */}
              <AnimatePresence>
                {flipped && (
                  <motion.div
                    className="w-full grid grid-cols-4 gap-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {[
                      { rating: 0 as StudyRating,  label: "Again", sub: "< 1d",  color: "oklch(0.65 0.22 25)",  bg: "oklch(0.65 0.22 25 / 12%)" },
                      { rating: 1 as StudyRating,  label: "Hard",  sub: "~1d",   color: "oklch(0.72 0.17 75)",  bg: "oklch(0.72 0.17 75 / 12%)" },
                      { rating: 3 as StudyRating,  label: "Good",  sub: "few d", color: "oklch(0.70 0.18 148)", bg: "oklch(0.70 0.18 148 / 12%)" },
                      { rating: 5 as StudyRating,  label: "Easy",  sub: "long",  color: "oklch(0.65 0.22 220)", bg: "oklch(0.65 0.22 220 / 12%)" },
                    ].map(r => (
                      <button
                        key={r.label}
                        disabled={submitting}
                        onClick={() => rate(r.rating)}
                        className="rounded-xl py-3 flex flex-col items-center gap-1 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                        style={{ background: r.bg, border: `1px solid ${r.color}30` }}
                      >
                        <span className="text-sm font-semibold" style={{ color: r.color }}>{r.label}</span>
                        <span className="text-[10px] text-muted-foreground">{r.sub}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {!flipped && (
                <p className="text-xs text-muted-foreground">
                  Space to flip &bull; rate after seeing the answer
                </p>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ============================================================
   DECK FORM MODAL
   ============================================================ */

interface DeckFormProps {
  initial?: Partial<FlashDeck> | null;
  subjects: { activityId: number; subject: string }[];
  onSave: (deck: FlashDeck) => void;
  onClose: () => void;
}

function DeckFormModal({ initial, subjects, onSave, onClose }: DeckFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [color, setColor] = useState<DeckColor>(initial?.color ?? "violet");
  const [iconName, setIconName] = useState<DeckIconName>(
    (initial?.emoji && initial.emoji in DECK_ICON_MAP) ? (initial.emoji as DeckIconName) : DEFAULT_DECK_ICON
  );
  const [subjectId, setSubjectId] = useState<number | null>(initial?.subjectId ?? null);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(initial?.id);

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags(ts => [...ts, t]);
    setTagInput("");
  }

  async function save() {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: desc.trim(),
        color,
        emoji: iconName,
        subjectId,
        subjectName: subjectId ? (subjects.find(s => s.activityId === subjectId)?.subject ?? null) : null,
        tags,
      };
      const res = isEdit
        ? await apiFetch<{ deck: FlashDeck }>(`/api/flashcards/${initial!.id}`, { method: "PATCH", body: JSON.stringify(payload) as unknown as BodyInit })
        : await apiFetch<{ deck: FlashDeck }>("/api/flashcards", { method: "POST", body: JSON.stringify(payload) as unknown as BodyInit });
      onSave(res.deck);
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: "oklch(0 0 0 / 60%)", backdropFilter: "blur(8px)" }}>
      <motion.div
        className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-4"
        style={{ background: "var(--card)", border: "1px solid oklch(1 0 0 / 10%)" }}
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{isEdit ? "Edit deck" : "New deck"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Icon picker */}
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">Icon</Label>
          <div className="flex flex-wrap gap-1.5">
            {DECK_ICON_OPTIONS.map(name => {
              const Icon = DECK_ICON_MAP[name];
              const active = iconName === name;
              return (
                <button
                  key={name}
                  onClick={() => setIconName(name)}
                  title={name}
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                    active ? "ring-2 ring-primary scale-110" : "hover:scale-110"
                  )}
                  style={{ background: active ? COLORS[color].badge : "oklch(1 0 0 / 6%)" }}
                >
                  <Icon
                    className="w-4 h-4"
                    style={{ color: active ? COLORS[color].from : undefined }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Color picker */}
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">Color</Label>
          <div className="flex gap-2">
            {COLOR_OPTIONS.map(c => (
              <button
                key={c.id}
                onClick={() => setColor(c.id)}
                className={cn("w-7 h-7 rounded-full transition-all", color === c.id ? "ring-2 ring-offset-1 ring-white/40 scale-110" : "hover:scale-105")}
                style={{ background: `linear-gradient(135deg, ${COLORS[c.id].from}, ${COLORS[c.id].to})` }}
                title={c.label}
              />
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="deck-title" className="text-xs text-muted-foreground">Title *</Label>
          <Input
            id="deck-title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Biology Chapter 3"
            maxLength={120}
            autoFocus
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="deck-desc" className="text-xs text-muted-foreground">Description</Label>
          <textarea
            id="deck-desc"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="Optional notes about this deck..."
            maxLength={500}
            rows={2}
            className="w-full rounded-md text-sm px-3 py-2 resize-none outline-none transition-colors focus:ring-1 focus:ring-primary"
            style={{ background: "var(--input)", border: "1px solid oklch(1 0 0 / 15%)" }}
          />
        </div>

        {/* Subject link */}
        {subjects.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Linked subject (optional)</Label>
            <Select
              value={subjectId?.toString() ?? "none"}
              onValueChange={v => setSubjectId(v === "none" ? null : Number(v))}
            >
              <SelectTrigger className="w-full text-sm">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {subjects.map(s => (
                  <SelectItem key={s.activityId} value={s.activityId.toString()}>{s.subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Tags</Label>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              placeholder="Add a tag..."
              className="flex-1"
              maxLength={40}
            />
            <Button variant="outline" size="sm" onClick={addTag}>Add</Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {tags.map(t => (
                <span key={t} className="flex items-center gap-1 text-xs rounded-full px-2 py-0.5" style={{ background: "oklch(1 0 0 / 8%)" }}>
                  {t}
                  <button onClick={() => setTags(ts => ts.filter(x => x !== t))} className="text-muted-foreground hover:text-foreground">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            disabled={!title.trim() || saving}
            onClick={save}
            className="flex-1 btn-primary"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? "Save changes" : "Create deck"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

/* ============================================================
   CARD FORM MODAL
   ============================================================ */

interface CardFormProps {
  deckId: string;
  deckColor: DeckColor;
  initial?: FlashCard | null;
  onSave: (card: FlashCard) => void;
  onClose: () => void;
}

function CardFormModal({ deckId, deckColor, initial, onSave, onClose }: CardFormProps) {
  const theme = COLORS[deckColor];
  const [front, setFront] = useState(initial?.front ?? "");
  const [back, setBack] = useState(initial?.back ?? "");
  const [hint, setHint] = useState(initial?.hint ?? "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial?.id);

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags(ts => [...ts, t]);
    setTagInput("");
  }

  async function save() {
    if ((!front.trim() && !back.trim()) || saving) return;
    setSaving(true);
    try {
      const payload = { front: front.trim(), back: back.trim(), hint: hint.trim(), tags };
      const res = isEdit
        ? await apiFetch<{ card: FlashCard }>(`/api/flashcards/${deckId}/cards/${initial!.id}`, { method: "PATCH", body: JSON.stringify(payload) as unknown as BodyInit })
        : await apiFetch<{ card: FlashCard }>(`/api/flashcards/${deckId}/cards`, { method: "POST", body: JSON.stringify(payload) as unknown as BodyInit });
      onSave(res.card);
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: "oklch(0 0 0 / 60%)", backdropFilter: "blur(8px)" }}>
      <motion.div
        className="w-full max-w-lg rounded-2xl p-6 flex flex-col gap-4"
        style={{ background: "var(--card)", border: `1px solid ${theme.from}25` }}
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{isEdit ? "Edit card" : "New card"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs" style={{ color: theme.from }}>Front (question)</Label>
            <textarea
              value={front}
              onChange={e => setFront(e.target.value)}
              placeholder="What is...?"
              rows={5}
              maxLength={2000}
              autoFocus
              className="w-full rounded-xl text-sm px-3 py-2.5 resize-none outline-none focus:ring-1"
              style={{ background: "oklch(1 0 0 / 5%)", border: `1px solid ${theme.from}20` }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs" style={{ color: theme.from }}>Back (answer)</Label>
            <textarea
              value={back}
              onChange={e => setBack(e.target.value)}
              placeholder="The answer is..."
              rows={5}
              maxLength={2000}
              className="w-full rounded-xl text-sm px-3 py-2.5 resize-none outline-none focus:ring-1"
              style={{ background: "oklch(1 0 0 / 5%)", border: `1px solid ${theme.from}20` } as React.CSSProperties}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Memory hint (optional)</Label>
          <Input
            value={hint}
            onChange={e => setHint(e.target.value)}
            placeholder="A short clue to help remember the answer..."
            maxLength={500}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Tags</Label>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              placeholder="Tag..."
              maxLength={40}
              className="flex-1"
            />
            <Button variant="outline" size="sm" onClick={addTag}>Add</Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {tags.map(t => (
                <span key={t} className="flex items-center gap-1 text-xs rounded-full px-2 py-0.5" style={{ background: "oklch(1 0 0 / 8%)" }}>
                  {t}
                  <button onClick={() => setTags(ts => ts.filter(x => x !== t))}>
                    <X className="w-2.5 h-2.5 text-muted-foreground hover:text-foreground" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            disabled={(!front.trim() && !back.trim()) || saving}
            onClick={save}
            className="flex-1 btn-primary"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? "Save" : "Add card"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

/* ============================================================
   AI GENERATE PANEL
   ============================================================ */

interface AiGeneratePanelProps {
  deck: FlashDeck;
  notes: { id: string; title: string; content: string }[];
  onClose: () => void;
  onGenerated: (cards: FlashCard[]) => void;
}

function AiGeneratePanel({ deck, notes, onClose, onGenerated }: AiGeneratePanelProps) {
  const theme = COLORS[deck.color];
  type Source = "text" | "note";
  const [source, setSource] = useState<Source>("text");
  const [text, setText] = useState("");
  const [selectedNote, setSelectedNote] = useState(notes[0]?.id ?? "");
  const [count, setCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<{ front: string; back: string; hint: string; tags: string[] }[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setError("");
    let sourceText = "";
    if (source === "text") {
      sourceText = text.trim();
    } else {
      const note = notes.find(n => n.id === selectedNote);
      sourceText = note ? `${note.title}\n\n${note.content}` : "";
    }
    if (!sourceText || sourceText.length < 20) {
      setError("Please provide at least 20 characters of content.");
      return;
    }
    setGenerating(true);
    try {
      const res = await apiFetch<{ cards: typeof preview }>("/api/ai/flashcards", {
        method: "POST",
        body: JSON.stringify({ text: sourceText, count }) as unknown as BodyInit,
      });
      setPreview(res.cards ?? []);
    } catch (e) {
      setError((e as Error).message ?? "Generation failed.");
    } finally { setGenerating(false); }
  }

  async function importCards() {
    if (!preview || importing) return;
    setImporting(true);
    try {
      const res = await apiFetch<{ cards: FlashCard[] }>(`/api/flashcards/${deck.id}/cards`, {
        method: "POST",
        body: JSON.stringify({ cards: preview }) as unknown as BodyInit,
      });
      onGenerated(res.cards);
    } finally { setImporting(false); }
  }

  function removePreviewCard(i: number) {
    setPreview(p => p ? p.filter((_, idx) => idx !== i) : p);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "oklch(0 0 0 / 60%)", backdropFilter: "blur(8px)" }}>
      <motion.div
        className="w-full max-w-2xl rounded-t-2xl sm:rounded-2xl flex flex-col"
        style={{
          background: "var(--card)",
          border: `1px solid ${theme.from}20`,
          maxHeight: "90vh",
        }}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: theme.from }} />
            <span className="font-semibold text-sm">AI Generate Cards</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {!preview ? (
            <>
              {/* Source toggle */}
              <div className="flex gap-2">
                {(["text", "note"] as Source[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setSource(s)}
                    className={cn(
                      "flex-1 rounded-lg py-2 text-sm font-medium transition-all",
                      source === s ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                    style={{
                      background: source === s ? `${theme.from}18` : "oklch(1 0 0 / 4%)",
                      border: `1px solid ${source === s ? theme.from + "40" : "oklch(1 0 0 / 8%)"}`,
                    }}
                  >
                    {s === "text" ? (
                      <span className="flex items-center justify-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Paste text</span>
                    ) : (
                      <span className="flex items-center justify-center gap-1.5"><BookMarked className="w-3.5 h-3.5" /> From note</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Source input */}
              {source === "text" ? (
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Paste your notes, textbook excerpt, assignment text, or any study material here..."
                  rows={8}
                  maxLength={20000}
                  className="w-full rounded-xl text-sm px-3 py-2.5 resize-none outline-none"
                  style={{ background: "oklch(1 0 0 / 5%)", border: "1px solid oklch(1 0 0 / 12%)" }}
                />
              ) : notes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No notes found.</p>
              ) : (
                <Select value={selectedNote} onValueChange={setSelectedNote}>
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue placeholder="Select a note" />
                  </SelectTrigger>
                  <SelectContent>
                    {notes.map(n => (
                      <SelectItem key={n.id} value={n.id}>{n.title || "Untitled"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Count slider */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs text-muted-foreground">Number of cards: <strong className="text-foreground">{count}</strong></Label>
                <input
                  type="range" min={3} max={30} value={count}
                  onChange={e => setCount(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>3</span><span>30</span>
                </div>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <Button
                onClick={generate}
                disabled={generating || (source === "text" && text.trim().length < 20) || (source === "note" && !selectedNote)}
                className="btn-primary w-full gap-2"
              >
                {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate {count} cards</>}
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{preview.length} cards generated — review and remove any you don&apos;t want.</p>
                <button onClick={() => setPreview(null)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> Regenerate
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {preview.map((c, i) => (
                  <div key={i} className="flex gap-3 rounded-xl p-3" style={{ background: "oklch(1 0 0 / 4%)", border: "1px solid oklch(1 0 0 / 8%)" }}>
                    <div className="flex-1 grid grid-cols-2 gap-2 min-w-0">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Front</p>
                        <p className="text-xs">{c.front}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Back</p>
                        <p className="text-xs">{c.back}</p>
                      </div>
                    </div>
                    <button onClick={() => removePreviewCard(i)} className="shrink-0 text-muted-foreground hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              {preview.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">All cards removed. Regenerate to try again.</p>
              )}
              <div className="flex gap-2 pt-2 shrink-0">
                <Button variant="outline" onClick={() => setPreview(null)} className="flex-1">Back</Button>
                <Button
                  disabled={preview.length === 0 || importing}
                  onClick={importCards}
                  className="flex-1 btn-primary gap-2"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Add {preview.length} cards
                </Button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ============================================================
   DECK STATS BAR
   ============================================================ */

function DeckStatsBar({ cards }: { cards: FlashCard[] }) {
  const now = Date.now();
  const due = cards.filter(c => c.nextReview <= now).length;
  const mastered = cards.filter(c => c.repetitions >= 3 && c.interval >= 7).length;
  const learning = cards.length - mastered;

  return (
    <div className="grid grid-cols-3 gap-2">
      {[
        { label: "Due now",  val: due,      color: "oklch(0.72 0.17 75)" },
        { label: "Learning", val: learning,  color: "oklch(0.65 0.22 278)" },
        { label: "Mastered", val: mastered,  color: "oklch(0.70 0.18 148)" },
      ].map(s => (
        <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "oklch(1 0 0 / 4%)", border: "1px solid oklch(1 0 0 / 8%)" }}>
          <div className="text-xl font-bold" style={{ color: s.color }}>{s.val}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   CARD GRID ITEM
   ============================================================ */

function CardItem({
  card, deckColor, onEdit, onDelete,
}: {
  card: FlashCard;
  deckColor: DeckColor;
  onEdit: (c: FlashCard) => void;
  onDelete: (id: string) => void;
}) {
  const theme = COLORS[deckColor];
  const [deleting, setDeleting] = useState(false);
  const isDue = card.nextReview <= Date.now();

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try { await onDelete(card.id); } finally { setDeleting(false); }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative rounded-xl p-3.5 flex flex-col gap-2 cursor-pointer"
      style={{ background: "oklch(1 0 0 / 4%)", border: `1px solid ${isDue ? theme.from + "30" : "oklch(1 0 0 / 8%)"}` }}
      onClick={() => onEdit(card)}
    >
      {isDue && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ background: theme.from }} title="Due for review" />
      )}
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Front</p>
        <p className="text-sm line-clamp-2">{card.front || <span className="italic text-muted-foreground">empty</span>}</p>
      </div>
      <div className="h-px" style={{ background: "oklch(1 0 0 / 8%)" }} />
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Back</p>
        <p className="text-sm line-clamp-2 text-muted-foreground">{card.back || <span className="italic">empty</span>}</p>
      </div>
      {card.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {card.tags.slice(0, 3).map(t => (
            <span key={t} className="text-[10px] rounded-full px-1.5 py-0.5" style={{ background: theme.badge, color: theme.from }}>
              {t}
            </span>
          ))}
        </div>
      )}
      {/* Actions */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <button
          onClick={e => { e.stopPropagation(); handleDelete(); }}
          disabled={deleting}
          className="flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-red-400 transition-colors"
          style={{ background: "var(--card)" }}
        >
          {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
        </button>
      </div>
    </motion.div>
  );
}

/* ============================================================
   DECK LIST PANEL
   ============================================================ */

function DeckListPanel({
  decks,
  selectedId,
  onSelect,
  onNew,
  search,
  onSearch,
}: {
  decks: FlashDeck[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  search: string;
  onSearch: (v: string) => void;
}) {
  const filtered = decks.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.tags.some(t => t.includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-3 shrink-0">
        <Layers className="w-4 h-4 text-primary shrink-0" />
        <span className="font-semibold text-sm flex-1">Flashcards</span>
        <button
          onClick={onNew}
          className="flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
          title="New deck"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="px-2 pb-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search decks..."
            className="w-full bg-transparent rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none border focus:border-primary/50 transition-colors"
            style={{ borderColor: "oklch(1 0 0 / 12%)" }}
          />
          {search && (
            <button onClick={() => onSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-xs">
            {decks.length === 0 ? "No decks yet. Create one!" : "No decks match your search."}
          </div>
        )}
        {filtered.map(deck => {
          const theme = COLORS[deck.color];
          const isActive = deck.id === selectedId;
          return (
            <motion.button
              key={deck.id}
              layout
              onClick={() => onSelect(deck.id)}
              className={cn(
                "w-full text-left rounded-lg px-2.5 py-2.5 transition-all flex items-center gap-2.5",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
              style={isActive ? { background: `${theme.from}15`, border: `1px solid ${theme.from}25` } : { border: "1px solid transparent" }}
            >
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
              >
                {(() => { const I = getDeckIcon(deck.emoji); return <I className="w-3.5 h-3.5 text-white" />; })()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{deck.title}</p>
                <p className="text-[10px] text-muted-foreground">{deck.cardCount} card{deck.cardCount !== 1 ? "s" : ""}</p>
              </div>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: theme.from }} />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   MAIN PAGE
   ============================================================ */

export default function FlashcardsPage() {
  const [decks, setDecks] = useState<FlashDeck[]>([]);
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [loadingCards, setLoadingCards] = useState(false);
  const [search, setSearch] = useState("");
  const [cardSearch, setCardSearch] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  // Modals
  const [deckForm, setDeckForm] = useState<{ open: boolean; initial?: FlashDeck | null }>({ open: false });
  const [cardForm, setCardForm] = useState<{ open: boolean; initial?: FlashCard | null }>({ open: false });
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [studyMode, setStudyMode] = useState(false);
  const [shareDeck, setShareDeck] = useState<FlashDeck | null>(null);

  // External data
  const [subjects, setSubjects] = useState<{ activityId: number; subject: string }[]>([]);
  const [notes, setNotes] = useState<{ id: string; title: string; content: string }[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeDeck = decks.find(d => d.id === selectedDeckId) ?? null;

  // Load decks on mount
  useEffect(() => {
    apiFetch<{ decks: FlashDeck[] }>("/api/flashcards")
      .then(d => {
        const ds = Array.isArray(d.decks) ? d.decks : [];
        setDecks(ds);
        if (ds.length > 0) setSelectedDeckId(ds[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingDecks(false));

    // Load subjects and notes for AI + deck linking (non-critical)
    apiFetch<{ success: boolean; subjects?: { activityId: number; subject: string }[] }>("/api/subjects")
      .then(r => { if (Array.isArray(r.subjects)) setSubjects(r.subjects); })
      .catch(() => {});
    apiFetch<{ notes: { id: string; title: string; content: string }[] }>("/api/notes")
      .then(r => { if (Array.isArray(r.notes)) setNotes(r.notes); })
      .catch(() => {});
  }, []);

  // Load cards when deck changes
  useEffect(() => {
    if (!selectedDeckId) { setCards([]); return; }
    setLoadingCards(true);
    apiFetch<{ deck: FlashDeck; cards: FlashCard[] }>(`/api/flashcards/${selectedDeckId}`)
      .then(r => {
        setCards(Array.isArray(r.cards) ? r.cards : []);
        // Sync updated deck metadata (e.g. cardCount)
        if (r.deck) setDecks(ds => ds.map(d => d.id === r.deck.id ? r.deck : d));
      })
      .catch(() => setCards([]))
      .finally(() => setLoadingCards(false));
  }, [selectedDeckId]);

  const selectDeck = useCallback((id: string) => {
    setSelectedDeckId(id);
    setCardSearch("");
    setMobileView("detail");
  }, []);

  // --- Deck CRUD ---
  function handleDeckSaved(deck: FlashDeck) {
    setDecks(ds => {
      const existing = ds.find(d => d.id === deck.id);
      return existing ? ds.map(d => d.id === deck.id ? deck : d) : [deck, ...ds];
    });
    setSelectedDeckId(deck.id);
    setDeckForm({ open: false });
    setMobileView("detail");
  }

  async function handleDeckDelete(id: string) {
    await apiFetch(`/api/flashcards/${id}`, { method: "DELETE" });
    const remaining = decks.filter(d => d.id !== id);
    setDecks(remaining);
    setSelectedDeckId(remaining[0]?.id ?? null);
    setCards([]);
    setMobileView("list");
  }

  // --- Card CRUD ---
  function handleCardSaved(card: FlashCard) {
    setCards(cs => {
      const existing = cs.find(c => c.id === card.id);
      return existing ? cs.map(c => c.id === card.id ? card : c) : [...cs, card];
    });
    setDecks(ds => ds.map(d => d.id === card.deckId
      ? { ...d, cardCount: cards.some(c => c.id === card.id) ? d.cardCount : d.cardCount + 1 }
      : d
    ));
    setCardForm({ open: false });
  }

  async function handleCardDelete(cardId: string) {
    if (!activeDeck) return;
    await apiFetch(`/api/flashcards/${activeDeck.id}/cards/${cardId}`, { method: "DELETE" });
    setCards(cs => cs.filter(c => c.id !== cardId));
    setDecks(ds => ds.map(d => d.id === activeDeck.id ? { ...d, cardCount: Math.max(0, d.cardCount - 1) } : d));
  }

  function handleCardReviewed(updated: FlashCard) {
    setCards(cs => cs.map(c => c.id === updated.id ? updated : c));
  }

  // --- AI ---
  function handleAiGenerated(newCards: FlashCard[]) {
    setCards(cs => [...cs, ...newCards]);
    if (activeDeck) {
      setDecks(ds => ds.map(d => d.id === activeDeck.id ? { ...d, cardCount: d.cardCount + newCards.length } : d));
    }
    setShowAiPanel(false);
  }

  // --- Export ---
  function exportDeck() {
    if (!activeDeck) return;
    const data = JSON.stringify({ deck: activeDeck, cards }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeDeck.title.replace(/[^a-z0-9]/gi, "_")}_flashcards.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- Import ---
  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeDeck) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      let importCards: { front: string; back: string; hint?: string; tags?: string[] }[] = [];

      if (Array.isArray(data)) {
        // Plain array of cards
        importCards = data;
      } else if (Array.isArray(data.cards)) {
        // SSP export format
        importCards = data.cards;
      } else if (typeof data === "object") {
        // Anki-like: try to extract
        importCards = [];
      }

      if (importCards.length === 0) return;
      const res = await apiFetch<{ cards: FlashCard[] }>(`/api/flashcards/${activeDeck.id}/cards`, {
        method: "POST",
        body: JSON.stringify({ cards: importCards }) as unknown as BodyInit,
      });
      setCards(cs => [...cs, ...res.cards]);
      setDecks(ds => ds.map(d => d.id === activeDeck.id ? { ...d, cardCount: d.cardCount + res.cards.length } : d));
    } catch { /* invalid file */ } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // --- Filtered cards ---
  const filteredCards = cards.filter(c =>
    c.front.toLowerCase().includes(cardSearch.toLowerCase()) ||
    c.back.toLowerCase().includes(cardSearch.toLowerCase()) ||
    c.tags.some(t => t.includes(cardSearch.toLowerCase()))
  );

  const dueCount = cards.filter(c => c.nextReview <= Date.now()).length;

  /* ---- RENDER ---- */

  if (loadingDecks) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full overflow-hidden">
        {/* ===== Deck list panel ===== */}
        <div
          className={cn(
            "flex flex-col border-r shrink-0",
            "w-full md:w-64",
            mobileView === "detail" ? "hidden md:flex" : "flex",
          )}
          style={{ borderColor: "oklch(1 0 0 / 8%)" }}
        >
          <DeckListPanel
            decks={decks}
            selectedId={selectedDeckId}
            onSelect={selectDeck}
            onNew={() => setDeckForm({ open: true, initial: null })}
            search={search}
            onSearch={setSearch}
          />
        </div>

        {/* ===== Deck detail panel ===== */}
        <div
          className={cn(
            "flex flex-col flex-1 min-w-0",
            mobileView === "list" ? "hidden md:flex" : "flex",
          )}
        >
          {!activeDeck ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "oklch(1 0 0 / 5%)" }}
              >
                <Layers className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <h3 className="font-semibold text-sm">No deck selected</h3>
              <p className="text-xs text-muted-foreground max-w-xs">
                Pick a deck from the list, or create a new one to start studying.
              </p>
              <Button
                onClick={() => setDeckForm({ open: true, initial: null })}
                className="btn-primary mt-2 gap-2"
                size="sm"
              >
                <Plus className="w-3.5 h-3.5" /> New deck
              </Button>
            </div>
          ) : (
            <>
              {/* Deck header */}
              <div
                className="flex items-center gap-3 px-4 py-3 border-b shrink-0"
                style={{ borderColor: "oklch(1 0 0 / 8%)" }}
              >
                {/* Mobile back button */}
                <button
                  className="md:hidden text-muted-foreground hover:text-foreground transition-colors mr-1"
                  onClick={() => setMobileView("list")}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `linear-gradient(135deg, ${COLORS[activeDeck.color].from}, ${COLORS[activeDeck.color].to})` }}
                >
                  {(() => { const I = getDeckIcon(activeDeck.emoji); return <I className="w-5 h-5 text-white" />; })()}
                </div>

                <div className="min-w-0 flex-1">
                  <h1 className="font-semibold text-sm truncate">{activeDeck.title}</h1>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    <span className="text-xs text-muted-foreground">{activeDeck.cardCount} card{activeDeck.cardCount !== 1 ? "s" : ""}</span>
                    {dueCount > 0 && (
                      <span className="text-[10px] rounded-full px-2 py-0.5 font-medium" style={{ background: `${COLORS[activeDeck.color].from}20`, color: COLORS[activeDeck.color].from }}>
                        {dueCount} due
                      </span>
                    )}
                    {activeDeck.subjectName && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <GraduationCap className="w-3 h-3" /> {activeDeck.subjectName}
                      </span>
                    )}
                    {activeDeck.tags.map(t => (
                      <span key={t} className="text-[10px] rounded-full px-1.5 py-0.5" style={{ background: COLORS[activeDeck.color].badge, color: COLORS[activeDeck.color].from }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Header actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setDeckForm({ open: true, initial: activeDeck })}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    title="Edit deck"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShareDeck(activeDeck)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    title="Share deck"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeckDelete(activeDeck.id)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-accent transition-colors"
                    title="Delete deck"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Action toolbar */}
              <div
                className="flex items-center gap-1.5 px-4 py-2.5 border-b shrink-0 overflow-x-auto"
                style={{ borderColor: "oklch(1 0 0 / 8%)" }}
              >
                <Button
                  onClick={() => activeDeck.cardCount > 0 && setStudyMode(true)}
                  disabled={activeDeck.cardCount === 0}
                  size="sm"
                  className="btn-primary gap-1.5 shrink-0"
                >
                  <Brain className="w-3.5 h-3.5" />
                  Study{dueCount > 0 ? ` (${dueCount})` : ""}
                </Button>
                <Button
                  onClick={() => setCardForm({ open: true, initial: null })}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Add card
                </Button>
                <Button
                  onClick={() => setShowAiPanel(true)}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" /> AI generate
                </Button>
                <div className="flex-1" />
                <Button onClick={exportDeck} variant="outline" size="sm" className="gap-1.5 shrink-0" title="Export as JSON">
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 shrink-0"
                  title="Import JSON"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Import</span>
                </Button>
                <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
                {/* Stats */}
                {cards.length > 0 && <DeckStatsBar cards={cards} />}

                {/* Description */}
                {activeDeck.description && (
                  <p className="text-sm text-muted-foreground">{activeDeck.description}</p>
                )}

                {/* Card search */}
                {cards.length > 4 && (
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      value={cardSearch}
                      onChange={e => setCardSearch(e.target.value)}
                      placeholder="Search cards..."
                      className="w-full bg-transparent rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none border focus:border-primary/50 transition-colors"
                      style={{ borderColor: "oklch(1 0 0 / 12%)" }}
                    />
                    {cardSearch && (
                      <button onClick={() => setCardSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {/* Cards grid */}
                {loadingCards ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : filteredCards.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                    <BookOpen className="w-8 h-8 text-muted-foreground/40" />
                    <div>
                      <p className="text-sm font-medium">
                        {cards.length === 0 ? "No cards yet" : "No cards match your search"}
                      </p>
                      {cards.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Add cards manually or use AI to generate them.
                        </p>
                      )}
                    </div>
                    {cards.length === 0 && (
                      <div className="flex gap-2 mt-2">
                        <Button onClick={() => setCardForm({ open: true, initial: null })} size="sm" variant="outline" className="gap-1.5">
                          <Plus className="w-3.5 h-3.5" /> Add card
                        </Button>
                        <Button onClick={() => setShowAiPanel(true)} size="sm" className="btn-primary gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" /> AI generate
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5"
                    layout
                  >
                    <AnimatePresence>
                      {filteredCards.map(card => (
                        <CardItem
                          key={card.id}
                          card={card}
                          deckColor={activeDeck.color}
                          onEdit={c => setCardForm({ open: true, initial: c })}
                          onDelete={handleCardDelete}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ===== Modals ===== */}
      <AnimatePresence>
        {deckForm.open && (
          <DeckFormModal
            key="deck-form"
            initial={deckForm.initial}
            subjects={subjects}
            onSave={handleDeckSaved}
            onClose={() => setDeckForm({ open: false })}
          />
        )}
        {cardForm.open && activeDeck && (
          <CardFormModal
            key="card-form"
            deckId={activeDeck.id}
            deckColor={activeDeck.color}
            initial={cardForm.initial}
            onSave={handleCardSaved}
            onClose={() => setCardForm({ open: false })}
          />
        )}
        {showAiPanel && activeDeck && (
          <AiGeneratePanel
            key="ai-panel"
            deck={activeDeck}
            notes={notes}
            onClose={() => setShowAiPanel(false)}
            onGenerated={handleAiGenerated}
          />
        )}
        {studyMode && activeDeck && (
          <StudyMode
            key="study-mode"
            deck={activeDeck}
            cards={cards}
            onClose={() => setStudyMode(false)}
            onCardReviewed={handleCardReviewed}
          />
        )}
        {shareDeck && (
          <ShareConversationPicker
            card={{
              type:           "flashdeck",
              deckId:         shareDeck.id,
              deckTitle:      shareDeck.title,
              deckCardCount:  shareDeck.cardCount,
              deckColor:      shareDeck.color,
              deckDescription: shareDeck.description,
            } satisfies ShareCardRef}
            onClose={() => setShareDeck(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
