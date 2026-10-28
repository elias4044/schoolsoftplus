'use client';

/* ── Reveal wrapper ─────────────────────────────────────── */ import {
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  GitBranch,
  Sparkles,
  Tag,
} from 'lucide-react';

import { CHANGELOG, type ChangelogEntry, type ChangelogTag } from '@/lib/changelog';
import { cn } from '@/lib/utils';

function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-5% 0px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

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
        small ? 'px-1.5 py-0.5 text-[9px]' : 'px-2.5 py-0.5 text-[11px]'
      )}
      style={{ color: m.color, background: m.bg }}
    >
      {!small && <Tag className="h-2.5 w-2.5" />}
      {m.label}
    </span>
  );
}

/* ── Entry card ─────────────────────────────────────────── */
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
        'bg-card overflow-hidden rounded-2xl border',
        entry.highlight
          ? 'border-primary/30 shadow-[0_0_0_1px_oklch(0.65_0.22_278/15%),0_8px_40px_oklch(0_0_0/0.3)]'
          : 'border-border'
      )}
    >
      {/* Highlight glow line */}
      {entry.highlight && (
        <div
          className="h-px w-full"
          style={{
            background:
              'linear-gradient(90deg, transparent, oklch(0.65 0.22 278 / 60%), transparent)',
          }}
        />
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-5 px-7 py-6 text-left transition-colors hover:bg-white/3"
      >
        {/* Version chip */}
        <div
          className="mt-1 shrink-0 rounded-xl px-3 py-1.5 font-mono text-xs font-bold tracking-tight"
          style={{
            background: entry.highlight
              ? 'linear-gradient(135deg, oklch(0.65 0.22 278 / 20%), oklch(0.55 0.25 295 / 20%))'
              : 'oklch(1 0 0 / 6%)',
            color: entry.highlight ? 'oklch(0.78 0.18 278)' : 'oklch(0.65 0 0)',
          }}
        >
          v{entry.version}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {entry.highlight && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-widest uppercase"
                style={{
                  background:
                    'linear-gradient(135deg, oklch(0.65 0.22 278 / 22%), oklch(0.55 0.25 295 / 22%))',
                  color: 'oklch(0.78 0.18 278)',
                }}
              >
                <Sparkles className="h-2.5 w-2.5" /> Latest
              </span>
            )}
            {entry.tags.map((t) => (
              <TagPill key={t} tag={t} />
            ))}
          </div>
          <p className="text-foreground text-base leading-snug font-semibold">{entry.title}</p>
          <p className="text-muted-foreground mt-1 text-xs">{dateStr}</p>
          {!open && (
            <p className="text-muted-foreground mt-2 line-clamp-2 text-sm leading-relaxed">
              {entry.summary}
            </p>
          )}
        </div>

        <div className="text-muted-foreground mt-2 shrink-0">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="border-border border-t px-7 pt-0 pb-7">
          <p className="text-muted-foreground mt-5 mb-6 text-sm leading-relaxed">{entry.summary}</p>

          <div className="space-y-6">
            {entry.sections.map((section) => (
              <div key={section.title}>
                <p className="text-foreground mb-3 text-sm font-semibold">{section.title}</p>
                <ul className="space-y-2.5">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{
                          background: item.tag ? TAG_META[item.tag].color : 'oklch(0.5 0 0)',
                        }}
                      />
                      <span className="text-muted-foreground flex-1 text-sm leading-relaxed">
                        {item.text}
                      </span>
                      {item.tag && <TagPill tag={item.tag} small />}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {entry.githubUrl && (
            <a
              href={entry.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground mt-6 inline-flex items-center gap-1.5 text-xs transition-colors"
            >
              <GitBranch className="h-3.5 w-3.5" />
              View release on GitHub
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────── */
export default function ChangelogPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* Header */}
      <header className="border-border bg-background/90 sticky top-0 z-50 border-b backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              <Sparkles className="text-primary h-4 w-4" />
              <span className="text-sm font-semibold">SchoolSoft+</span>
            </div>
          </div>
          <a
            href="https://github.com/elias4044/schoolsoftplus/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors"
          >
            <GitBranch className="h-3.5 w-3.5" />
            GitHub releases
            <ExternalLink className="h-3 w-3 opacity-50" />
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="border-border border-b">
        <div className="mx-auto max-w-3xl px-6 py-14">
          <Reveal>
            <p className="text-muted-foreground mb-3 text-xs tracking-widest uppercase">
              Release notes
            </p>
            <h1 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">What&rsquo;s new</h1>
            <p className="text-muted-foreground max-w-lg text-sm leading-relaxed">
              Every change, improvement, and fix to SchoolSoft+. The latest version is always at the
              top.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Entries */}
      <section className="mx-auto max-w-3xl space-y-4 px-6 py-10">
        {CHANGELOG.map((entry, i) => (
          <Reveal key={entry.version} delay={i * 0.04}>
            <EntryCard entry={entry} defaultOpen={i === 0} />
          </Reveal>
        ))}

        {/* GitHub CTA */}
        <Reveal delay={0.2}>
          <div className="border-border bg-card mt-2 flex items-center justify-between gap-4 rounded-xl border p-5">
            <div>
              <p className="mb-0.5 text-sm font-medium">Want to see what&rsquo;s coming?</p>
              <p className="text-muted-foreground text-xs">
                Check open issues and pull requests on GitHub.
              </p>
            </div>
            <a
              href="https://github.com/elias4044/schoolsoftplus/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary text-primary-foreground inline-flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
            >
              <GitBranch className="h-3.5 w-3.5" />
              GitHub
            </a>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-border mt-10 border-t">
        <div className="mx-auto flex max-w-3xl flex-col items-start justify-between gap-4 px-6 py-8 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary h-4 w-4" />
            <span className="text-sm font-semibold">SchoolSoft+</span>
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <Link href="/stats" className="hover:text-foreground transition-colors">
              Stats
            </Link>
            <Link href="/open-source" className="hover:text-foreground transition-colors">
              Open source
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <a
              href="https://github.com/elias4044/schoolsoftplus"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
