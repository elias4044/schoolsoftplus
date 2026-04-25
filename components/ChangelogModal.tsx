"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ExternalLink,
  Sparkles,
  Tag,
  GitBranch,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { CHANGELOG, type ChangelogEntry, type ChangelogTag } from "@/lib/changelog";
import { cn } from "@/lib/utils";

/* ── Tag pill ───────────────────────────────────────────── */
const TAG_META: Record<ChangelogTag, { label: string; color: string; bg: string }> = {
  feature:     { label: "Feature",     color: "oklch(0.65 0.22 278)", bg: "oklch(0.65 0.22 278 / 12%)" },
  improvement: { label: "Improvement", color: "oklch(0.72 0.18 148)", bg: "oklch(0.72 0.18 148 / 12%)" },
  fix:         { label: "Fix",         color: "oklch(0.78 0.16 55)",  bg: "oklch(0.78 0.16 55  / 12%)" },
  security:    { label: "Security",    color: "oklch(0.72 0.18 310)", bg: "oklch(0.72 0.18 310 / 12%)" },
  breaking:    { label: "Breaking",    color: "oklch(0.68 0.22 25)",  bg: "oklch(0.68 0.22 25  / 12%)" },
};

function TagPill({ tag, small = false }: { tag: ChangelogTag; small?: boolean }) {
  const m = TAG_META[tag];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap",
        small ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-0.5"
      )}
      style={{ color: m.color, background: m.bg }}
    >
      {!small && <Tag className="w-2.5 h-2.5" />}
      {m.label}
    </span>
  );
}

/* ── Single entry card ──────────────────────────────────── */
function EntryCard({
  entry,
  defaultOpen = false,
}: {
  entry: ChangelogEntry;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const dateStr = new Date(entry.date).toLocaleDateString("en-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className={cn(
        "rounded-xl border bg-card overflow-hidden transition-colors",
        entry.highlight
          ? "border-primary/30 shadow-[0_0_0_1px_oklch(0.65_0.22_278/18%),0_4px_24px_oklch(0_0_0/0.25)]"
          : "border-border"
      )}
    >
      {/* Header row */}
      <button
        className="w-full flex items-start gap-4 p-5 text-left hover:bg-white/3 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        {/* Version badge */}
        <div
          className="shrink-0 mt-0.5 rounded-lg px-2.5 py-1 text-xs font-bold font-mono"
          style={{
            background: entry.highlight
              ? "linear-gradient(135deg, oklch(0.65 0.22 278 / 20%), oklch(0.55 0.25 295 / 20%))"
              : "oklch(1 0 0 / 6%)",
            color: entry.highlight ? "oklch(0.75 0.18 278)" : "oklch(0.7 0 0)",
          }}
        >
          v{entry.version}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {entry.highlight && (
              <span
                className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-widest rounded-full px-2 py-0.5"
                style={{
                  background: "linear-gradient(135deg, oklch(0.65 0.22 278 / 25%), oklch(0.55 0.25 295 / 25%))",
                  color: "oklch(0.78 0.18 278)",
                }}
              >
                <Sparkles className="w-2.5 h-2.5" /> Latest
              </span>
            )}
            {entry.tags.map((t) => (
              <TagPill key={t} tag={t} small />
            ))}
          </div>
          <p className="font-semibold text-sm text-foreground leading-snug">{entry.title}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{dateStr}</p>
        </div>

        <div className="shrink-0 text-muted-foreground mt-1">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-0 border-t border-border">
              {/* Summary */}
              <p className="text-sm text-muted-foreground leading-relaxed mt-4 mb-5">
                {entry.summary}
              </p>

              {/* Sections */}
              <div className="space-y-5">
                {entry.sections.map((section) => (
                  <div key={section.title}>
                    <p className="text-xs font-semibold text-foreground mb-2.5">{section.title}</p>
                    <ul className="space-y-2">
                      {section.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <div
                            className="w-1 h-1 rounded-full shrink-0 mt-1.5"
                            style={{
                              background: item.tag
                                ? TAG_META[item.tag].color
                                : "oklch(0.55 0 0)",
                            }}
                          />
                          <span className="text-xs text-muted-foreground leading-relaxed flex-1">
                            {item.text}
                          </span>
                          {item.tag && <TagPill tag={item.tag} small />}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* GitHub link */}
              {entry.githubUrl && (
                <a
                  href={entry.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <GitBranch className="w-3 h-3" />
                  View on GitHub
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Modal / overlay ────────────────────────────────────── */
interface ChangelogModalProps {
  open: boolean;
  onClose: () => void;
}

export function ChangelogModal({ open, onClose }: ChangelogModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent background scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="changelog-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="changelog-panel"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-4 top-[5vh] bottom-[5vh] z-61 max-w-2xl mx-auto flex flex-col rounded-2xl border border-border bg-background shadow-[0_32px_80px_oklch(0_0_0/0.6)] overflow-hidden"
          >
            {/* Top accent */}
            <div
              className="absolute top-0 inset-x-0 h-px pointer-events-none"
              style={{ background: "linear-gradient(90deg, transparent, oklch(0.65 0.22 278 / 60%), transparent)" }}
            />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 278 / 25%), oklch(0.55 0.25 295 / 25%))" }}
                >
                  <Sparkles className="w-3.5 h-3.5" style={{ color: "oklch(0.75 0.18 278)" }} />
                </div>
                <div>
                  <p className="font-semibold text-sm">Changelog</p>
                  <p className="text-[10px] text-muted-foreground">What's new in SchoolSoft+</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/8 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
              {CHANGELOG.map((entry, i) => (
                <EntryCard key={entry.version} entry={entry} defaultOpen={i === 0} />
              ))}

              {/* Footer */}
              <div className="pt-2 pb-1 flex items-center justify-between">
                <a
                  href="https://github.com/elias4044/schoolsoftplus/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  All releases on GitHub
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ── Trigger button (for landing page / sidebar / etc.) ─── */
interface ChangelogButtonProps {
  className?: string;
  variant?: "badge" | "link" | "ghost";
}

export function ChangelogButton({ className, variant = "badge" }: ChangelogButtonProps) {
  const [open, setOpen] = useState(false);
  const latest = CHANGELOG.find((e) => e.highlight) ?? CHANGELOG[0];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 transition-colors",
          variant === "badge" &&
            "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/20",
          variant === "link" &&
            "text-xs text-muted-foreground hover:text-foreground",
          variant === "ghost" &&
            "rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-white/8",
          className
        )}
      >
        <Sparkles className="w-3 h-3 text-primary" />
        <span>
          v{latest.version}
          {" · "}
          {latest.title}
        </span>
      </button>
      <ChangelogModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
