"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
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
  Users,
  MessageSquare,
  Heart,
  Bell,
  Reply,
} from "lucide-react";
import { ChangelogButton } from "@/components/ChangelogModal";

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
function LiveCounter({ label }: { label: string }) {
  const [value, setValue] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) return;
        const map: Record<string, number> = {
          logins:   d.totalLogins ?? 0,
          schedule: d.totalScheduleViews ?? 0,
          lunch:    d.totalLunchFetches ?? 0,
          messages: d.totalMessagesSent ?? 0,
        };
        setValue(map[label] ?? 0);
      })
      .catch(() => {});
  }, [label]);

  const [display, setDisplay] = useState("0");
  useEffect(() => {
    if (value === null) return;
    let start: number | null = null;
    const step = (now: number) => {
      if (!start) start = now;
      const t = Math.min((now - start) / 900, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(ease * value).toLocaleString());
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);

  if (value === null) return <span className="opacity-30">—</span>;
  return <>{display}</>;
}

/* ─── Hero 3-D mockup ────────────────────────────────────── */
const LESSONS = [
  { time: "08:15", subject: "Mathematics", room: "Rm 302", color: "oklch(0.72 0.18 263)" },
  { time: "10:00", subject: "English",     room: "Rm 105", color: "oklch(0.72 0.18 148)" },
  { time: "11:45", subject: "Physics",     room: "Lab 3",  color: "oklch(0.75 0.18 310)" },
];

function HeroMockup() {
  const rotX = useSpring(10, { stiffness: 110, damping: 22 });
  const rotY = useSpring(-10, { stiffness: 110, damping: 22 });

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    rotX.set(10 - ny * 18);
    rotY.set(-10 + nx * 18);
  }
  function onLeave() { rotX.set(10); rotY.set(-10); }

  return (
    <motion.div
      className="cursor-default"
      style={{ perspective: "1100px" }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.75, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d" }}
        className="rounded-2xl border border-border bg-card overflow-hidden w-72 shadow-[0_32px_80px_oklch(0_0_0/0.5)]"
      >
        {/* window chrome */}
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-background/60">
          <div className="w-2.5 h-2.5 rounded-full bg-border" />
          <div className="w-2.5 h-2.5 rounded-full bg-border" />
          <div className="w-2.5 h-2.5 rounded-full bg-border" />
          <span className="ml-auto text-[10px] text-muted-foreground font-medium">Wednesday · Today</span>
        </div>

        {/* day label */}
        <div className="px-4 pt-3 pb-1.5 flex items-center justify-between">
          <span className="text-xs font-semibold">Schedule</span>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] text-muted-foreground">Live</span>
          </div>
        </div>

        {/* lesson rows */}
        <div className="px-3 pb-3 space-y-1.5">
          {LESSONS.map((l, i) => (
            <motion.div
              key={l.subject}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.4 + i * 0.08 }}
              className="flex items-center gap-3 rounded-lg bg-background/50 border border-border px-3 py-2.5"
            >
              <div className="w-1 h-8 rounded-full shrink-0" style={{ background: l.color }} />
              <div className="min-w-0">
                <p className="text-xs font-medium leading-none mb-1 truncate">{l.subject}</p>
                <p className="text-[10px] text-muted-foreground">{l.time} · {l.room}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* footer bar */}
        <div className="border-t border-border px-4 py-2.5 bg-background/40 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">2 assignments due</span>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i === 0 ? "oklch(0.62 0.16 263)" : "oklch(1 0 0 / 12%)" }} />
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
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
            <ChangelogButton variant="badge" />
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
      <section className="border-b border-border overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">

            {/* Left: copy */}
            <div>
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
                  with an AI assistant that knows your timetable and real-time direct messaging to stay connected with classmates.
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

            {/* Right: 3D mockup */}
            <div className="hidden md:flex justify-center items-center">
              <HeroMockup />
            </div>

          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <Reveal className="mb-5">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">By the numbers</p>
          </Reveal>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: "messages", label: "Messages sent between students", icon: <MessageSquare className="w-4 h-4" />, accent: "oklch(0.65 0.22 278)" },
              { key: "logins",   label: "Times students have logged in",  icon: <Users className="w-4 h-4" />,          accent: "oklch(0.72 0.18 148)" },
              { key: "schedule", label: "Schedule views loaded",          icon: <CalendarDays className="w-4 h-4" />,   accent: "oklch(0.75 0.18 40)"  },
            ].map((s, i) => (
              <Reveal key={s.key} delay={i * 0.07}>
                <div
                  className="rounded-xl border border-border bg-background p-5 flex flex-col gap-2 relative overflow-hidden"
                >
                  {/* faint tinted corner */}
                  <div
                    className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl pointer-events-none"
                    style={{ background: `${s.accent}18` }}
                  />
                  <span className="text-xl leading-none">{s.icon}</span>
                  <p className="text-2xl md:text-3xl font-bold tabular-nums tracking-tight" style={{ color: s.accent }}>
                    <LiveCounter label={s.key} />
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-snug">{s.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.3}>
            <Link href="/stats" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-4 transition-colors">
              See all stats <ChevronRight className="w-3 h-3" />
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
              { icon: MessageSquare, title: "Direct messages", desc: "Real-time DMs with classmates. Emoji reactions, reply threads, and unread notifications.", color: "oklch(0.65 0.22 278)" },
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

      {/* ── Social network ── */}
      <section className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-2 gap-12 items-center">

            {/* Left: copy */}
            <div>
              <Reveal>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Built-in social</p>
                <h2 className="text-2xl font-bold tracking-tight mb-3">
                  Connect with your<br />classmates.
                </h2>
              </Reveal>
              <Reveal delay={0.08}>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  SchoolSoft+ has a built-in messaging network. Every student gets a profile and can DM anyone else at their school — no extra sign-up, no third-party app.
                </p>
              </Reveal>
              <div className="space-y-3">
                {[
                  { icon: MessageSquare, color: "oklch(0.65 0.22 278)", title: "Real-time DMs",         desc: "Messages arrive instantly — no polling, no refresh." },
                  { icon: Heart,         color: "oklch(0.72 0.18 310)", title: "Emoji reactions",       desc: "React to any message with one tap. Reactions sync live." },
                  { icon: Reply,         color: "oklch(0.72 0.18 190)", title: "Reply threads",         desc: "Quote any message to keep conversations clear." },
                  { icon: Bell,          color: "oklch(0.75 0.18 40)",  title: "Push notifications",   desc: "Browser notifications when someone messages you." },
                ].map(({ icon: Icon, color, title, desc }, i) => (
                  <Reveal key={title} delay={0.1 + i * 0.06}>
                    <div className="flex items-start gap-3">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: `oklch(from ${color} l c h / 15%)`, color }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-none mb-1">{title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>

            {/* Right: mock conversation */}
            <Reveal delay={0.15}>
              <div
                className="rounded-2xl border border-border bg-background overflow-hidden shadow-[0_24px_64px_oklch(0_0_0/0.4)]"
                style={{ perspective: "800px" }}
              >
                {/* chrome */}
                <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-background/60">
                  <div className="w-2.5 h-2.5 rounded-full bg-border" />
                  <div className="w-2.5 h-2.5 rounded-full bg-border" />
                  <div className="w-2.5 h-2.5 rounded-full bg-border" />
                  <span className="ml-auto text-[10px] text-muted-foreground font-medium">Messages · Live</span>
                </div>

                {/* messages */}
                <div className="px-4 py-4 space-y-3">
                  {[
                    { from: "alex_k",  text: "Did you finish the physics assignment?", mine: false, delay: 0.3 },
                    { from: "you",     text: "Almost! Stuck on question 4 😅",          mine: true,  delay: 0.45 },
                    { from: "alex_k",  text: "Same lol. Want to go over it after lunch?", mine: false, delay: 0.6 },
                    { from: "you",     text: "Yes definitely 👍",                          mine: true,  delay: 0.75 },
                  ].map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.35, delay: m.delay }}
                      className={`flex ${m.mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                          m.mine
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-card border border-border text-foreground rounded-bl-sm"
                        }`}
                      >
                        {!m.mine && <p className="text-[10px] font-semibold mb-0.5 opacity-70">{m.from}</p>}
                        {m.text}
                      </div>
                    </motion.div>
                  ))}
                  {/* reaction row */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.9, type: "spring", stiffness: 300 }}
                    className="flex justify-end"
                  >
                    <div className="flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs">
                      <span>👍</span><span className="text-muted-foreground text-[10px]">1</span>
                    </div>
                  </motion.div>
                </div>

                {/* compose */}
                <div className="border-t border-border px-4 py-3 flex items-center gap-2">
                  <div className="flex-1 rounded-full bg-card border border-border px-3 py-1.5 text-[10px] text-muted-foreground">
                    Message alex_k…
                  </div>
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "oklch(0.65 0.22 278)" }}
                  >
                    <ArrowRight className="w-3 h-3 text-white" />
                  </div>
                </div>
              </div>
            </Reveal>

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
              Free for any Swedish school using SchoolSoft. Takes about 30 seconds to set up — then your schedule, AI, and classmates are all in one place.
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
            <Link href="/changelog"   className="hover:text-foreground transition-colors">Changelog</Link>
            <Link href="/open-source" className="hover:text-foreground transition-colors">Open source</Link>
            <a href="https://github.com/elias4044/schoolsoftplus" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
          </div>
          <p className="text-xs text-muted-foreground opacity-60">Not affiliated with SchoolSoft AB.</p>
        </div>
      </footer>

    </div>
  );
}
