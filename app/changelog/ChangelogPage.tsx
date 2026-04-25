"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Sparkles,
  ArrowLeft,
  GitBranch,
  ExternalLink,
  Tag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { CHANGELOG, type ChangelogEntry, type ChangelogTag } from "@/lib/changelog";
import { cn } from "@/lib/utils";

/* ── Reveal wrapper ─────────────────────────────────────── */
import { useRef } from "react";
import { useInView } from "framer-motion";

function Reveal({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-5% 0px" });
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
        small ? "text-[9px] px-1.5 py-0.5" : "text-[11px] px-2.5 py-0.5"
      )}
      style={{ color: m.color, background: m.bg }}
    >
      {!small && <Tag className="w-2.5 h-2.5" />}
      {m.label}
    </span>
  );
}

/* ── Entry card ─────────────────────────────────────────── */
function EntryCard({ entry, defaultOpen = false }: { entry: ChangelogEntry; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  const dateStr = new Date(entry.date).toLocaleDateString("en-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card overflow-hidden",
        entry.highlight
          ? "border-primary/30 shadow-[0_0_0_1px_oklch(0.65_0.22_278/15%),0_8px_40px_oklch(0_0_0/0.3)]"
          : "border-border"
      )}
    >
      {/* Highlight glow line */}
      {entry.highlight && (
        <div
          className="h-px w-full"
          style={{ background: "linear-gradient(90deg, transparent, oklch(0.65 0.22 278 / 60%), transparent)" }}
        />
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start gap-5 px-7 py-6 text-left hover:bg-white/3 transition-colors"
      >
        {/* Version chip */}
        <div
          className="shrink-0 mt-1 rounded-xl px-3 py-1.5 text-xs font-bold font-mono tracking-tight"
          style={{
            background: entry.highlight
              ? "linear-gradient(135deg, oklch(0.65 0.22 278 / 20%), oklch(0.55 0.25 295 / 20%))"
              : "oklch(1 0 0 / 6%)",
            color: entry.highlight ? "oklch(0.78 0.18 278)" : "oklch(0.65 0 0)",
          }}
        >
          v{entry.version}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {entry.highlight && (
              <span
                className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-widest rounded-full px-2 py-0.5"
                style={{
                  background: "linear-gradient(135deg, oklch(0.65 0.22 278 / 22%), oklch(0.55 0.25 295 / 22%))",
                  color: "oklch(0.78 0.18 278)",
                }}
              >
                <Sparkles className="w-2.5 h-2.5" /> Latest
              </span>
            )}
            {entry.tags.map((t) => (
              <TagPill key={t} tag={t} />
            ))}
          </div>
          <p className="text-base font-semibold leading-snug text-foreground">{entry.title}</p>
          <p className="text-xs text-muted-foreground mt-1">{dateStr}</p>
          {!open && (
            <p className="text-sm text-muted-foreground leading-relaxed mt-2 line-clamp-2">
              {entry.summary}
            </p>
          )}
        </div>

        <div className="shrink-0 text-muted-foreground mt-2">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="px-7 pb-7 pt-0 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed mt-5 mb-6">{entry.summary}</p>

          <div className="space-y-6">
            {entry.sections.map((section) => (
              <div key={section.title}>
                <p className="text-sm font-semibold text-foreground mb-3">{section.title}</p>
                <ul className="space-y-2.5">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div
                        className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
                        style={{ background: item.tag ? TAG_META[item.tag].color : "oklch(0.5 0 0)" }}
                      />
                      <span className="text-sm text-muted-foreground leading-relaxed flex-1">{item.text}</span>
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
              className="inline-flex items-center gap-1.5 mt-6 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <GitBranch className="w-3.5 h-3.5" />
              View release on GitHub
              <ExternalLink className="w-3 h-3 opacity-60" />
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
    <div className="min-h-screen bg-background text-foreground">

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/8 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">SchoolSoft+</span>
            </div>
          </div>
          <a
            href="https://github.com/elias4044/schoolsoftplus/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <GitBranch className="w-3.5 h-3.5" />
            GitHub releases
            <ExternalLink className="w-3 h-3 opacity-50" />
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-14">
          <Reveal>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Release notes</p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">What&rsquo;s new</h1>
            <p className="text-sm text-muted-foreground max-w-lg leading-relaxed">
              Every change, improvement, and fix to SchoolSoft+. The latest version is always at the top.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Entries */}
      <section className="max-w-3xl mx-auto px-6 py-10 space-y-4">
        {CHANGELOG.map((entry, i) => (
          <Reveal key={entry.version} delay={i * 0.04}>
            <EntryCard entry={entry} defaultOpen={i === 0} />
          </Reveal>
        ))}

        {/* GitHub CTA */}
        <Reveal delay={0.2}>
          <div className="rounded-xl border border-border bg-card p-5 flex items-center justify-between gap-4 mt-2">
            <div>
              <p className="text-sm font-medium mb-0.5">Want to see what&rsquo;s coming?</p>
              <p className="text-xs text-muted-foreground">
                Check open issues and pull requests on GitHub.
              </p>
            </div>
            <a
              href="https://github.com/elias4044/schoolsoftplus/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <GitBranch className="w-3.5 h-3.5" />
              GitHub
            </a>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-10">
        <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">SchoolSoft+</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <Link href="/"            className="hover:text-foreground transition-colors">Home</Link>
            <Link href="/stats"       className="hover:text-foreground transition-colors">Stats</Link>
            <Link href="/open-source" className="hover:text-foreground transition-colors">Open source</Link>
            <Link href="/terms"       className="hover:text-foreground transition-colors">Terms</Link>
            <a href="https://github.com/elias4044/schoolsoftplus" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
