"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import {
  CalendarDays,
  BookOpen,
  StickyNote,
  UtensilsCrossed,
  Newspaper,
  LayoutDashboard,
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
  Brain,
  Code2,
  Scale,
  GitPullRequest,
  Star,
  ChevronRight,
  Activity,
} from "lucide-react";

/* ─── Reveal ─────────────────────────────────────────────── */
function Reveal({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-8% 0px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 14 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Live counter ───────────────────────────────────────── */
function LiveCounter({ label, suffix = "" }: { label: string; suffix?: string }) {
  const [value, setValue] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) return;
        const map: Record<string, number> = {
          logins: d.uniqueLogins ?? 0,
          messages: d.totalAiMessages ?? 0,
          notes: d.totalNotesCreated ?? 0,
        };
        setValue(map[label] ?? 0);
      })
      .catch(() => {});
  }, [label]);
  if (value === null) return <span className="opacity-40">—</span>;
  return <>{value.toLocaleString()}{suffix}</>;
}

/* ─── Main component ─────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">SchoolSoft+</span>
          </div>
          <nav className="hidden sm:flex items-center gap-5 text-sm text-muted-foreground">
            <Link href="/stats" className="hover:text-foreground transition-colors">Stats</Link>
            <Link href="/open-source" className="hover:text-foreground transition-colors">Open source</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </nav>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Sign in <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-20 md:py-28">
          <Reveal>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
              Free · Open source · No tracking
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] max-w-2xl mb-5">
              Your school day,<br />organised properly.
            </h1>
          </Reveal>
          <Reveal delay={0.14}>
            <p className="text-base text-muted-foreground max-w-xl leading-relaxed mb-8">
              SchoolSoft+ pulls your schedule, assignments, lunch menu, and news from SchoolSoft into one clean interface —
              with an AI assistant that actually knows your timetable.
            </p>
          </Reveal>
          <Reveal delay={0.20}>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Get started <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="https://github.com/elias4044/schoolsoftplus"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
              >
                <Star className="w-3.5 h-3.5" /> GitHub
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="grid grid-cols-3 divide-x divide-border">
            {[
              { key: "logins",   label: "Students using it" },
              { key: "messages", label: "AI questions answered" },
              { key: "notes",    label: "Notes written" },
            ].map((s, i) => (
              <Reveal key={s.key} delay={i * 0.07} className="px-6 first:pl-0 last:pr-0">
                <p className="text-2xl font-bold tabular-nums">
                  <LiveCounter label={s.key} />
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.25}>
            <Link href="/stats" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-4 transition-colors">
              See full stats <ChevronRight className="w-3 h-3" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <Reveal className="mb-8">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">What it does</p>
            <h2 className="text-2xl font-bold tracking-tight">Everything in one place.</h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { icon: CalendarDays, title: "Schedule",    desc: "Your full timetable pulled directly from SchoolSoft. Day view, week view, always up to date.", color: "oklch(0.72 0.18 148)" },
              { icon: BookOpen,     title: "Assignments", desc: "See what's due this week and next. Never miss a deadline because the school portal buried it.", color: "oklch(0.75 0.18 40)" },
              { icon: UtensilsCrossed, title: "Lunch menu", desc: "Today's and the whole week's menu. Rendered cleanly, not in a PDF you have to zoom into.", color: "oklch(0.78 0.16 55)" },
              { icon: Newspaper,    title: "News",        desc: "School announcements in a readable feed. No login walls, no slow loading.", color: "oklch(0.70 0.18 320)" },
              { icon: StickyNote,   title: "Notes",       desc: "Quick private notes tied to your account. Write during class, access anywhere.", color: "oklch(0.72 0.18 190)" },
              { icon: Brain,        title: "AI assistant", desc: "Ask about your schedule, assignments, or anything school-related. It has your context.", color: "oklch(0.65 0.22 278)" },
            ].map(({ icon: Icon, title, desc, color }, i) => (
              <Reveal key={title} delay={i * 0.05}>
                <div className="rounded-xl border border-border bg-card p-5 h-full">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                    style={{ background: `oklch(from ${color} l c h / 15%)`, color }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="font-medium text-sm mb-1">{title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dashboard ── */}
      <section className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <Reveal>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Dashboard</p>
              <h2 className="text-2xl font-bold tracking-tight mb-3">Build your own view.</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                The dashboard is a grid of widgets you choose. Add what you need, remove what you don't.
                Layout is saved per account. No config files, no setup steps.
              </p>
              <div className="space-y-2">
                {["Schedule widget", "Homework list", "Lunch preview", "News feed", "Countdown timers", "Notes pad", "Weather", "Goals"].map((w, i) => (
                  <Reveal key={w} delay={i * 0.04}>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-1 h-1 rounded-full bg-primary" />
                      {w}
                    </div>
                  </Reveal>
                ))}
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="rounded-xl border border-border bg-background p-4 space-y-2">
                {[
                  { icon: CalendarDays, label: "Schedule", color: "oklch(0.72 0.18 148)" },
                  { icon: BookOpen,     label: "Homework",  color: "oklch(0.75 0.18 40)"  },
                  { icon: UtensilsCrossed, label: "Lunch",  color: "oklch(0.78 0.16 55)"  },
                  { icon: Activity,     label: "Stats",     color: "oklch(0.65 0.22 278)" },
                ].map(({ icon: Icon, label, color }) => (
                  <div key={label} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
                    <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: `oklch(from ${color} l c h / 15%)`, color }}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm font-medium">{label}</span>
                    <div className="ml-auto flex gap-1">
                      <div className="w-12 h-1.5 rounded-full bg-border" />
                      <div className="w-8 h-1.5 rounded-full bg-border opacity-50" />
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <Reveal className="mb-8">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Setup</p>
            <h2 className="text-2xl font-bold tracking-tight">Three steps, then you're in.</h2>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { n: "1", title: "Sign in with SchoolSoft",   desc: "Use your existing SchoolSoft credentials. We don't store your password — it's passed directly to SchoolSoft's own login." },
              { n: "2", title: "Pick your school",          desc: "Search for your school name. Works with any school running SchoolSoft in Sweden." },
              { n: "3", title: "Start using it",            desc: "Your schedule, assignments, lunch, and news load immediately. Set up your dashboard however you like." },
            ].map(({ n, title, desc }, i) => (
              <Reveal key={n} delay={i * 0.08}>
                <div className="flex gap-4">
                  <div className="shrink-0 w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center text-sm font-bold text-muted-foreground">
                    {n}
                  </div>
                  <div>
                    <p className="font-medium text-sm mb-1">{title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <Reveal className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">What we don't do.</h2>
            <p className="text-sm text-muted-foreground mt-1">Simple things that matter.</p>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: Shield, color: "oklch(0.72 0.18 148)", title: "No analytics on you",  desc: "We collect anonymous aggregate counts (total logins, total AI messages). Nothing tied to a person." },
              { icon: Zap,    color: "oklch(0.75 0.18 40)",  title: "No password storage",  desc: "Your SchoolSoft credentials are used once at login. We hold a session token, not your password." },
              { icon: Scale,  color: "oklch(0.65 0.22 278)", title: "No ads, no upsells",   desc: "This is a free open-source project. There's no premium tier, no advertising, no data selling." },
            ].map(({ icon: Icon, color, title, desc }, i) => (
              <Reveal key={title} delay={i * 0.07}>
                <div className="rounded-xl border border-border bg-background p-5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: `oklch(from ${color} l c h / 15%)`, color }}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="font-medium text-sm mb-1">{title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Open source teaser ── */}
      <section className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <Reveal>
            <div className="rounded-xl border border-border bg-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Code2 className="w-4 h-4 text-primary" />
                  <p className="font-medium text-sm">Fully open source</p>
                </div>
                <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
                  All the code is on GitHub under the MIT licence. Read it, fork it, report a bug, or submit a pull request.
                  We welcome contributions of any size.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/open-source"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <GitPullRequest className="w-3.5 h-3.5" /> Contribute
                </Link>
                <a
                  href="https://github.com/elias4044/schoolsoftplus"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Star className="w-3.5 h-3.5" /> Star
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight mb-3">Ready to try it?</h2>
            <p className="text-sm text-muted-foreground mb-7 max-w-sm mx-auto">
              Free for any Swedish school using SchoolSoft. Takes about 30 seconds to set up.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Sign in with SchoolSoft <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">SchoolSoft+</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <Link href="/terms"       className="hover:text-foreground transition-colors">Terms &amp; Privacy</Link>
            <Link href="/login-help"  className="hover:text-foreground transition-colors">Login help</Link>
            <Link href="/stats"       className="hover:text-foreground transition-colors">Stats</Link>
            <Link href="/open-source" className="hover:text-foreground transition-colors">Open source</Link>
            <a href="https://github.com/elias4044/schoolsoftplus" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
          </div>
          <p className="text-xs text-muted-foreground opacity-60">Not affiliated with SchoolSoft AB.</p>
        </div>
      </footer>

    </div>
  );
}
