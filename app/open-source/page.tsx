"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Code2,
  Star,
  GitFork,
  Heart,
  BookOpen,
  GitPullRequest,
  Bug,
  Lightbulb,
  Scale,
  ExternalLink,
} from "lucide-react";

/* ─── Reveal ───────────────────────────────────────────── */
function Reveal({
  children, delay = 0, className = "",
}: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-4% 0px" });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 14 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}>
      {children}
    </motion.div>
  );
}

/* ─── Step ─────────────────────────────────────────────── */
function Step({ n, title, code, children }: { n: number; title: string; code?: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 border"
          style={{ borderColor: "oklch(0.62 0.16 263 / 40%)", color: "oklch(0.72 0.16 263)", background: "oklch(0.62 0.16 263 / 10%)" }}
        >
          {n}
        </div>
        <div className="w-px flex-1" style={{ background: "var(--border)", minHeight: 16 }} />
      </div>
      <div className="pb-6">
        <p className="text-sm font-medium text-foreground mb-1">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed mb-2">{children}</p>
        {code && (
          <div className="rounded-lg px-3.5 py-2.5 font-mono text-xs overflow-x-auto border border-border bg-muted/50 text-muted-foreground">
            {code}
          </div>
        )}
      </div>
    </div>
  );
}

const TECH = [
  { label: "Next.js 15",      color: "oklch(0.85 0 0)" },
  { label: "TypeScript",       color: "oklch(0.62 0.16 231)" },
  { label: "Tailwind CSS v4",  color: "oklch(0.72 0.16 200)" },
  { label: "Framer Motion",    color: "oklch(0.75 0.18 310)" },
  { label: "Firebase Admin",   color: "oklch(0.75 0.18 40)" },
  { label: "httpOnly Cookies", color: "oklch(0.72 0.18 148)" },
  { label: "Google Gemini AI", color: "oklch(0.78 0.16 55)" },
  { label: "shadcn/ui",        color: "oklch(0.65 0.22 278)" },
];

const CONTRIB = [
  {
    icon: Bug, title: "Report a bug",
    desc: "Found something broken? Open an issue with steps to reproduce.",
    href: "https://github.com/elias4044/schoolsoftplus/issues/new?template=bug_report.md",
    cta: "Open issue", color: "oklch(0.72 0.18 20)",
  },
  {
    icon: Lightbulb, title: "Suggest a feature",
    desc: "Have an idea? Open a feature request and explain what you'd like to see.",
    href: "https://github.com/elias4044/schoolsoftplus/issues/new?template=feature_request.md",
    cta: "Request feature", color: "oklch(0.78 0.16 55)",
  },
  {
    icon: GitPullRequest, title: "Submit a pull request",
    desc: "Fork, make your changes, and open a PR. Follow the CONTRIBUTING guide.",
    href: "https://github.com/elias4044/schoolsoftplus/pulls",
    cta: "Open PR", color: "oklch(0.72 0.18 148)",
  },
  {
    icon: BookOpen, title: "Improve the docs",
    desc: "Spotted something missing or unclear in the README or inline comments?",
    href: "https://github.com/elias4044/schoolsoftplus",
    cta: "Edit docs", color: "oklch(0.72 0.16 263)",
  },
  {
    icon: Star, title: "Star the repo",
    desc: "The quickest way to show support and help others discover the project.",
    href: "https://github.com/elias4044/schoolsoftplus",
    cta: "Star on GitHub", color: "oklch(0.78 0.16 55)",
  },
  {
    icon: GitFork, title: "Fork and adapt",
    desc: "Need something different for your school? Fork it. MIT licensed — no restrictions.",
    href: "https://github.com/elias4044/schoolsoftplus/fork",
    cta: "Fork repo", color: "oklch(0.75 0.18 310)",
  },
];

/* ─── Page ─────────────────────────────────────────────── */
export default function OpenSourcePage() {
  const [stars, setStars] = useState<number | null>(null);
  const [forks, setForks] = useState<number | null>(null);

  useEffect(() => {
    fetch("https://api.github.com/repos/elias4044/schoolsoftplus")
      .then(r => r.json())
      .then(d => { setStars(d.stargazers_count ?? 0); setForks(d.forks_count ?? 0); })
      .catch(() => { setStars(0); setForks(0); });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <span className="text-sm font-medium">Open source</span>
          <a
            href="https://github.com/elias4044/schoolsoftplus"
            target="_blank" rel="noopener noreferrer"
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            GitHub →
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6">

        {/* Page header */}
        <div className="py-10 border-b border-border">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">MIT Licensed</p>
            <h1 className="text-2xl font-semibold tracking-tight mb-3">SchoolSoft+ is open source.</h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mb-6">
              The full source code is on GitHub. Read it, run it locally, report bugs, suggest features, or submit pull requests.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href="https://github.com/elias4044/schoolsoftplus"
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <Code2 className="w-3.5 h-3.5" /> elias4044/schoolsoftplus
              </a>
              {stars !== null && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground border border-border">
                  <Star className="w-3 h-3" /> {stars} stars
                </div>
              )}
              {forks !== null && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground border border-border">
                  <GitFork className="w-3 h-3" /> {forks} forks
                </div>
              )}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground border border-border">
                <Scale className="w-3 h-3" /> MIT
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tech stack */}
        <section className="py-10 border-b border-border">
          <Reveal className="mb-5">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-1">Tech stack</h2>
            <p className="text-sm text-muted-foreground">Built with modern, typed tooling.</p>
          </Reveal>
          <Reveal delay={0.05}>
            <div className="flex flex-wrap gap-2">
              {TECH.map(t => (
                <div
                  key={t.label}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                  style={{ borderColor: `${t.color}30`, color: t.color, background: `${t.color}0e` }}
                >
                  {t.label}
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* Contribute */}
        <section className="py-10 border-b border-border">
          <Reveal className="mb-6">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-1">How to contribute</h2>
            <p className="text-sm text-muted-foreground">Every contribution helps — no matter how small.</p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CONTRIB.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.04}>
                <a
                  href={item.href} target="_blank" rel="noopener noreferrer"
                  className="group block rounded-xl border border-border bg-card p-5 h-full hover:border-muted-foreground/30 transition-colors"
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center mb-3"
                    style={{ background: `${item.color}18`, color: item.color }}
                  >
                    <item.icon className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1.5">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">{item.desc}</p>
                  <span className="text-xs font-medium" style={{ color: item.color }}>{item.cta} →</span>
                </a>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Run locally */}
        <section className="py-10 border-b border-border">
          <Reveal className="mb-6">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-1">Run it locally</h2>
            <p className="text-sm text-muted-foreground">From zero to running dev server in a couple of minutes.</p>
          </Reveal>
          <Reveal delay={0.04}>
            <div className="rounded-xl border border-border bg-card p-6">
              <Step n={1} title="Clone the repository" code="git clone https://github.com/elias4044/schoolsoftplus.git && cd schoolsoftplus">
                Grab the source code from GitHub.
              </Step>
              <Step n={2} title="Install dependencies" code="npm install">
                Uses npm. Node.js 20+ recommended.
              </Step>
              <Step n={3} title="Set up environment variables" code="cp .env.example .env.local">
                Fill in your Firebase credentials and other secrets as described in{" "}
                <code className="font-mono text-[11px] px-1 py-0.5 rounded bg-muted">.env.example</code>.
              </Step>
              <Step n={4} title="Start the dev server" code="npm run dev">
                The app will be available at{" "}
                <code className="font-mono text-[11px] px-1 py-0.5 rounded bg-muted">http://localhost:3000</code>.
              </Step>
              <Step n={5} title="You're in">
                Log in with your SchoolSoft credentials. Hot-reload is enabled.
              </Step>
            </div>
          </Reveal>
        </section>

        {/* License + CoC */}
        <section className="py-10 border-b border-border">
          <div className="grid sm:grid-cols-2 gap-3">
            <Reveal>
              <div className="rounded-xl border border-border bg-card p-5 h-full">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: "oklch(0.62 0.16 263 / 16%)", color: "oklch(0.72 0.16 263)" }}
                >
                  <Scale className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold mb-2">MIT License</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  Free to use, copy, modify, and distribute — even commercially — as long as the original copyright notice is included.
                  This project is not affiliated with SchoolSoft AB.
                </p>
                <a
                  href="https://github.com/elias4044/schoolsoftplus/blob/main/LICENSE"
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Read full license <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </Reveal>
            <Reveal delay={0.06}>
              <div className="rounded-xl border border-border bg-card p-5 h-full">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: "oklch(0.72 0.18 148 / 16%)", color: "oklch(0.72 0.18 148)" }}
                >
                  <Heart className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold mb-2">Code of Conduct</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  We follow the Contributor Covenant. Be respectful, constructive, and kind.
                  This is a student project — a welcoming environment matters.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <a
                    href="https://github.com/elias4044/schoolsoftplus/blob/main/CODE_OF_CONDUCT.md"
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Code of Conduct <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="text-muted-foreground opacity-40 text-xs">·</span>
                  <a
                    href="https://github.com/elias4044/schoolsoftplus/blob/main/CONTRIBUTING.md"
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Contributing guide <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 text-center">
          <Reveal>
            <h2 className="text-lg font-semibold mb-2">Ready to contribute?</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto leading-relaxed">
              Every star, issue, and pull request makes SchoolSoft+ better for every student who uses it.
            </p>
            <a
              href="https://github.com/elias4044/schoolsoftplus"
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Code2 className="w-4 h-4" /> View on GitHub
            </a>
          </Reveal>
        </section>

      </main>

      <footer className="border-t border-border">
        <div className="max-w-4xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 flex-wrap">
          <Link href="/" className="text-sm font-medium text-foreground">SchoolSoft+</Link>
          <div className="flex items-center flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms &amp; Privacy</Link>
            <Link href="/stats" className="hover:text-foreground transition-colors">Stats</Link>
            <Link href="/login-help" className="hover:text-foreground transition-colors">Login help</Link>
            <a href="https://github.com/elias4044/schoolsoftplus" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
          </div>
          <p className="text-xs text-muted-foreground opacity-50">Not affiliated with SchoolSoft AB. MIT Licensed.</p>
        </div>
      </footer>
    </div>
  );
}
