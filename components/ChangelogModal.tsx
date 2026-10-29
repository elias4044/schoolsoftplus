'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, ExternalLink, GitBranch, Sparkles, Tag, X } from 'lucide-react';
import { createPortal } from 'react-dom';

import { CHANGELOG, type ChangelogEntry, type ChangelogTag } from '@/lib/changelog';
import { cn } from '@/lib/utils';

/* ── Tag pill ───────────────────────────────────────────── */
const TAG_META: Record<ChangelogTag, { label: string; color: string; bg: string }> = {
  feature: { label: 'Feature', color: 'oklch(0.65 0.22 278)', bg: 'oklch(0.65 0.22 278 / 12%)' },
  improvement: {
    label: 'Improvement',
    color: 'oklch(0.72 0.18 148)',
    bg: 'oklch(0.72 0.18 148 / 12%)',
  },
  fix: { label: 'Fix', color: 'oklch(0.78 0.16 55)', bg: 'oklch(0.78 0.16 55  / 12%)' },
  security: { label: 'Security', color: 'oklch(0.72 0.18 310)', bg: 'oklch(0.72 0.18 310 / 12%)' },
  breaking: { label: 'Breaking', color: 'oklch(0.68 0.22 25)', bg: 'oklch(0.68 0.22 25  / 12%)' },
};

function TagPill({ tag, small = false }: { tag: ChangelogTag; small?: boolean }) {
  const m = TAG_META[tag];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap',
        small ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'
      )}
      style={{ color: m.color, background: m.bg }}
    >
      {!small && <Tag className="h-2.5 w-2.5" />}
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

  const dateStr = new Date(entry.date).toLocaleDateString('en-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      className={cn(
        'bg-card overflow-hidden rounded-xl border transition-colors',
        entry.highlight
          ? 'border-primary/30 shadow-[0_0_0_1px_oklch(0.65_0.22_278/18%),0_4px_24px_oklch(0_0_0/0.25)]'
          : 'border-border'
      )}
    >
      {/* Header row */}
      <button
        className="flex w-full items-start gap-4 p-5 text-left transition-colors hover:bg-white/3"
        onClick={() => setOpen((o) => !o)}
      >
        {/* Version badge */}
        <div
          className="mt-0.5 shrink-0 rounded-lg px-2.5 py-1 font-mono text-xs font-bold"
          style={{
            background: entry.highlight
              ? 'linear-gradient(135deg, oklch(0.65 0.22 278 / 20%), oklch(0.55 0.25 295 / 20%))'
              : 'oklch(1 0 0 / 6%)',
            color: entry.highlight ? 'oklch(0.75 0.18 278)' : 'oklch(0.7 0 0)',
          }}
        >
          v{entry.version}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {entry.highlight && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-widest uppercase"
                style={{
                  background:
                    'linear-gradient(135deg, oklch(0.65 0.22 278 / 25%), oklch(0.55 0.25 295 / 25%))',
                  color: 'oklch(0.78 0.18 278)',
                }}
              >
                <Sparkles className="h-2.5 w-2.5" /> Latest
              </span>
            )}
            {entry.tags.map((t) => (
              <TagPill key={t} tag={t} small />
            ))}
          </div>
          <p className="text-foreground text-sm leading-snug font-semibold">{entry.title}</p>
          <p className="text-muted-foreground mt-0.5 text-[11px]">{dateStr}</p>
        </div>

        <div className="text-muted-foreground mt-1 shrink-0">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-border border-t px-5 pt-0 pb-5">
              {/* Summary */}
              <p className="text-muted-foreground mt-4 mb-5 text-sm leading-relaxed">
                {entry.summary}
              </p>

              {/* Sections */}
              <div className="space-y-5">
                {entry.sections.map((section) => (
                  <div key={section.title}>
                    <p className="text-foreground mb-2.5 text-xs font-semibold">{section.title}</p>
                    <ul className="space-y-2">
                      {section.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <div
                            className="mt-1.5 h-1 w-1 shrink-0 rounded-full"
                            style={{
                              background: item.tag ? TAG_META[item.tag].color : 'oklch(0.55 0 0)',
                            }}
                          />
                          <span className="text-muted-foreground flex-1 text-xs leading-relaxed">
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
                  className="text-muted-foreground hover:text-foreground mt-5 inline-flex items-center gap-1.5 text-[11px] transition-colors"
                >
                  <GitBranch className="h-3 w-3" />
                  View on GitHub
                  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
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

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Prevent background scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
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
            className="border-border bg-background fixed inset-x-4 top-[5vh] bottom-[5vh] z-61 mx-auto flex max-w-2xl flex-col overflow-hidden rounded-2xl border shadow-[0_32px_80px_oklch(0_0_0/0.6)]"
          >
            {/* Top accent */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{
                background:
                  'linear-gradient(90deg, transparent, oklch(0.65 0.22 278 / 60%), transparent)',
              }}
            />

            {/* Header */}
            <div className="border-border flex shrink-0 items-center justify-between border-b px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg"
                  style={{
                    background:
                      'linear-gradient(135deg, oklch(0.65 0.22 278 / 25%), oklch(0.55 0.25 295 / 25%))',
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5" style={{ color: 'oklch(0.75 0.18 278)' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold">Changelog</p>
                  <p className="text-muted-foreground text-[10px]">What's new in SchoolSoft+</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/8"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
              {CHANGELOG.map((entry, i) => (
                <EntryCard key={entry.version} entry={entry} defaultOpen={i === 0} />
              ))}

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 pb-1">
                <a
                  href="https://github.com/elias4044/schoolsoftplus/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors"
                >
                  <GitBranch className="h-3.5 w-3.5" />
                  All releases on GitHub
                  <ExternalLink className="h-3 w-3 opacity-60" />
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
  variant?: 'badge' | 'link' | 'ghost';
}

export function ChangelogButton({ className, variant = 'badge' }: ChangelogButtonProps) {
  const [open, setOpen] = useState(false);
  const latest = CHANGELOG.find((e) => e.highlight) ?? CHANGELOG[0];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center gap-1.5 transition-colors',
          variant === 'badge' &&
            'border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 rounded-full border px-3 py-1 text-xs',
          variant === 'link' && 'text-muted-foreground hover:text-foreground text-xs',
          variant === 'ghost' &&
            'text-muted-foreground hover:text-foreground rounded-lg px-3 py-1.5 text-sm hover:bg-white/8',
          className
        )}
      >
        <Sparkles className="text-primary h-3 w-3" />
        <span>
          v{latest.version}
          {' · '}
          {latest.title}
        </span>
      </button>
      <ChangelogModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
