"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useScroll,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import Link from "next/link";
import {
  Sparkles,
  ArrowLeft,
  Users,
  MousePointerClick,
  Brain,
  StickyNote,
  CalendarDays,
  ClipboardList,
  UtensilsCrossed,
  Newspaper,
  Globe,
  Clock,
  TrendingUp,
  Activity,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────── */
interface StatsPayload {
  totalLogins: number;
  failedLogins: number;
  uniqueLogins: number;
  totalApiCalls: number;
  totalAiMessages: number;
  totalNotesCreated: number;
  totalScheduleViews: number;
  totalAssignmentFetches: number;
  totalLunchFetches: number;
  totalNewsFetches: number;
  loginHours: Record<string, number>;
  loginDays: Record<string, number>;
  aiHours: Record<string, number>;
  schools: Record<string, number>;
  peakDates: Record<string, number>;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ─── Cursor glow ────────────────────────────────────────── */
function CursorGlow() {
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const sx = useSpring(x, { stiffness: 80, damping: 20 });
  const sy = useSpring(y, { stiffness: 80, damping: 20 });
  useEffect(() => {
    const fn = (e: MouseEvent) => { x.set(e.clientX); y.set(e.clientY); };
    window.addEventListener("mousemove", fn);
    return () => window.removeEventListener("mousemove", fn);
  }, [x, y]);
  return (
    <motion.div className="pointer-events-none fixed inset-0 z-0">
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 500, height: 500,
          x: sx, y: sy,
          translateX: "-50%", translateY: "-50%",
          background: "radial-gradient(circle, oklch(0.62 0.16 263 / 7%) 0%, transparent 70%)",
        }}
      />
    </motion.div>
  );
}

/* ─── Animated counter ───────────────────────────────────── */
function Counter({ target, suffix = "", decimals = 0 }: { target: number; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const val = useMotionValue(0);
  const spring = useSpring(val, { stiffness: 40, damping: 18, mass: 0.8 });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (inView) val.set(target);
  }, [inView, target, val]);

  useEffect(() => {
    return spring.on("change", (v) => {
      setDisplay(v.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ","));
    });
  }, [spring, decimals]);

  return <span ref={ref}>{display}{suffix}</span>;
}

/* ─── Scroll reveal ──────────────────────────────────────── */
function Reveal({ children, delay = 0, className = "", from = "bottom" }: {
  children: React.ReactNode; delay?: number; className?: string;
  from?: "bottom" | "left" | "right" | "scale";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-8% 0px" });
  const variants = {
    bottom: { hidden: { opacity: 0, y: 48 }, visible: { opacity: 1, y: 0 } },
    left:   { hidden: { opacity: 0, x: -40 }, visible: { opacity: 1, x: 0 } },
    right:  { hidden: { opacity: 0, x: 40 }, visible: { opacity: 1, x: 0 } },
    scale:  { hidden: { opacity: 0, scale: 0.88 }, visible: { opacity: 1, scale: 1 } },
  }[from];
  return (
    <motion.div ref={ref} variants={variants} initial="hidden"
      animate={inView ? "visible" : "hidden"}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}>
      {children}
    </motion.div>
  );
}

/* ─── Bar chart (custom, no lib) ─────────────────────────── */
function BarChart({
  data, labels, color, height = 80,
}: {
  data: number[]; labels: string[]; color: string; height?: number;
}) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <Reveal delay={i * 0.02} from="bottom">
            <motion.div
              className="w-full rounded-t-sm"
              style={{
                height: Math.max(2, (v / max) * (height - 20)),
                background: v === max
                  ? color
                  : `oklch(from ${color} l c h / 35%)`,
                minHeight: 2,
              }}
            />
          </Reveal>
          {labels[i] !== undefined && (
            <span className="text-[9px] text-muted-foreground select-none">{labels[i]}</span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Headline stat card ─────────────────────────────────── */
function HeroStat({
  icon: Icon, value, suffix, label, color, delay = 0, sublabel,
}: {
  icon: React.ElementType; value: number; suffix?: string;
  label: string; color: string; delay?: number; sublabel?: string;
}) {
  return (
    <Reveal delay={delay} from="scale">
      <div
        className="relative rounded-3xl p-6 overflow-hidden group"
        style={{ background: "oklch(0.13 0 0)", border: `1px solid ${color}22` }}
      >
        {/* ambient glow */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-3xl"
          style={{ background: `radial-gradient(circle at 30% 30%, ${color}12 0%, transparent 60%)` }}
        />
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: `${color}18`, color }}
          >
            <Icon className="w-5 h-5" />
          </div>
          <TrendingUp className="w-3.5 h-3.5 opacity-20" />
        </div>
        <p className="text-3xl md:text-4xl font-black tracking-tight text-foreground tabular-nums">
          <Counter target={value} suffix={suffix} />
        </p>
        <p className="text-sm font-medium text-foreground/80 mt-1">{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>}
      </div>
    </Reveal>
  );
}

/* ─── Section label ──────────────────────────────────────── */
function SectionLabel({ children, color = "oklch(0.65 0.22 278)" }: { children: string; color?: string }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.2em] font-bold mb-2" style={{ color }}>
      {children}
    </p>
  );
}

/* ─── Main page ──────────────────────────────────────────── */
export default function StatsPage() {
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    fetch("/api/stats")
      .then(r => r.json())
      .then((d) => { if (d.success) setStats(d); })
      .finally(() => setLoading(false));
  }, []);

  /* helpers */
  const hours24 = Array.from({ length: 24 }, (_, i) => stats?.loginHours?.[i] ?? 0);
  const aiHours24 = Array.from({ length: 24 }, (_, i) => stats?.aiHours?.[i] ?? 0);
  const days7 = Array.from({ length: 7 }, (_, i) => stats?.loginDays?.[i] ?? 0);
  const topSchools = Object.entries(stats?.schools ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const topSchoolMax = Math.max(...topSchools.map(s => s[1]), 1);
  const topDates = Object.entries(stats?.peakDates ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const peakHour = hours24.indexOf(Math.max(...hours24));
  const peakDay = days7.indexOf(Math.max(...days7));
  const totalFeatureUsage = (stats?.totalScheduleViews ?? 0) +
    (stats?.totalAssignmentFetches ?? 0) +
    (stats?.totalLunchFetches ?? 0) +
    (stats?.totalNewsFetches ?? 0);

  return (
    <div className="relative min-h-screen bg-[oklch(0.10_0_0)] overflow-x-hidden">
      <CursorGlow />

      {/* Fixed nav */}
      <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ background: "oklch(0.10 0 0 / 80%)", backdropFilter: "blur(16px)", borderBottom: "1px solid oklch(1 0 0 / 6%)" }}>
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Live Stats</span>
        </div>
        <div className="w-16" />
      </div>

      {/* ── Hero ── */}
      <section ref={heroRef} className="relative min-h-[60vh] flex flex-col items-center justify-center text-center px-6 pt-20 overflow-hidden">
        {/* Grid */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <svg className="absolute inset-0 w-full h-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid2" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid2)" />
          </svg>
        </div>
        {/* Orbs */}
        <motion.div className="absolute rounded-full blur-3xl pointer-events-none"
          style={{ width: 700, height: 700, top: "-20%", left: "55%", background: "oklch(0.62 0.16 263 / 10%)" }}
          animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute rounded-full blur-3xl pointer-events-none"
          style={{ width: 450, height: 450, top: "10%", left: "-10%", background: "oklch(0.55 0.20 295 / 8%)" }}
          animate={{ scale: [1, 1.07, 1] }} transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 3 }} />

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium mb-8"
            style={{ background: "oklch(0.62 0.16 263 / 12%)", color: "oklch(0.75 0.14 263)", border: "1px solid oklch(0.62 0.16 263 / 22%)" }}
          >
            <Sparkles className="w-3 h-3" />
            Anonymous · Real-time · Updated live
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-7xl font-black tracking-tight leading-[1.07] mb-5"
          >
            By the{" "}
            <span style={{ background: "linear-gradient(135deg, oklch(0.72 0.18 263), oklch(0.65 0.22 310))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              numbers.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.35 }}
            className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed"
          >
            Everything happening on SchoolSoft+ right now — logins, AI messages, notes, feature usage, and more.
            All anonymous, none creepy.
          </motion.p>
        </motion.div>
      </section>

      {/* ── Headline numbers ── */}
      <section className="relative z-10 px-6 py-12 max-w-6xl mx-auto">
        <Reveal className="mb-8">
          <SectionLabel color="oklch(0.65 0.22 278)">Headline numbers</SectionLabel>
        </Reveal>

        <AnimatePresence>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-3xl p-6 animate-pulse" style={{ background: "oklch(0.13 0 0)", height: 140 }} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <HeroStat icon={Users}           value={stats?.uniqueLogins ?? 0}          label="Unique users"        color="oklch(0.65 0.22 278)" delay={0}    sublabel="All time" />
              <HeroStat icon={MousePointerClick} value={stats?.totalLogins ?? 0}          label="Total logins"        color="oklch(0.72 0.18 148)" delay={0.05} sublabel="Successful sessions" />
              <HeroStat icon={Brain}            value={stats?.totalAiMessages ?? 0}       label="AI messages"         color="oklch(0.75 0.18 310)" delay={0.10} sublabel="Questions answered" />
              <HeroStat icon={MousePointerClick} value={stats?.totalApiCalls ?? 0}        label="API calls"           color="oklch(0.72 0.16 263)" delay={0.15} sublabel="Server requests" />
              <HeroStat icon={StickyNote}       value={stats?.totalNotesCreated ?? 0}     label="Notes written"       color="oklch(0.72 0.18 190)" delay={0.20} />
              <HeroStat icon={CalendarDays}     value={stats?.totalScheduleViews ?? 0}    label="Schedule views"      color="oklch(0.72 0.18 148)" delay={0.25} />
              <HeroStat icon={ClipboardList}    value={stats?.totalAssignmentFetches ?? 0} label="Assignment lookups"  color="oklch(0.75 0.18 40)"  delay={0.30} />
              <HeroStat icon={UtensilsCrossed}  value={stats?.totalLunchFetches ?? 0}     label="Lunch menu views"    color="oklch(0.78 0.16 55)"  delay={0.35} sublabel="People care about food" />
            </div>
          )}
        </AnimatePresence>
      </section>

      {/* ── Activity by hour ── */}
      <section className="relative z-10 px-6 py-8 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-4">

          {/* Login hours */}
          <Reveal from="left">
            <div className="rounded-3xl p-6" style={{ background: "oklch(0.13 0 0)", border: "1px solid oklch(1 0 0 / 7%)" }}>
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4" style={{ color: "oklch(0.65 0.22 278)" }} />
                <SectionLabel color="oklch(0.65 0.22 278)">Login activity by hour (UTC)</SectionLabel>
              </div>
              <p className="text-xs text-muted-foreground mb-5">
                {loading ? "—" : `Peak at ${peakHour}:00 UTC`}
              </p>
              <BarChart
                data={hours24}
                labels={Array.from({ length: 24 }, (_, i) => i % 4 === 0 ? `${i}h` : "")}
                color="oklch(0.65 0.22 278)"
                height={100}
              />
            </div>
          </Reveal>

          {/* AI hours */}
          <Reveal from="right">
            <div className="rounded-3xl p-6" style={{ background: "oklch(0.13 0 0)", border: "1px solid oklch(1 0 0 / 7%)" }}>
              <div className="flex items-center gap-2 mb-1">
                <Brain className="w-4 h-4" style={{ color: "oklch(0.75 0.18 310)" }} />
                <SectionLabel color="oklch(0.75 0.18 310)">AI usage by hour (UTC)</SectionLabel>
              </div>
              <p className="text-xs text-muted-foreground mb-5">
                {loading ? "—" : `${stats?.totalAiMessages ?? 0} total messages`}
              </p>
              <BarChart
                data={aiHours24}
                labels={Array.from({ length: 24 }, (_, i) => i % 4 === 0 ? `${i}h` : "")}
                color="oklch(0.75 0.18 310)"
                height={100}
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Day of week + feature split ── */}
      <section className="relative z-10 px-6 py-4 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-4">

          {/* Day of week */}
          <Reveal from="bottom">
            <div className="rounded-3xl p-6" style={{ background: "oklch(0.13 0 0)", border: "1px solid oklch(1 0 0 / 7%)" }}>
              <SectionLabel color="oklch(0.72 0.18 148)">Busiest day of week</SectionLabel>
              <p className="text-xs text-muted-foreground mb-5">
                {loading ? "—" : `Students most active on ${DAY_LABELS[peakDay]}s`}
              </p>
              <BarChart data={days7} labels={DAY_LABELS} color="oklch(0.72 0.18 148)" height={100} />
            </div>
          </Reveal>

          {/* Feature usage breakdown */}
          <Reveal from="bottom" delay={0.08} className="md:col-span-2">
            <div className="rounded-3xl p-6 h-full" style={{ background: "oklch(0.13 0 0)", border: "1px solid oklch(1 0 0 / 7%)" }}>
              <SectionLabel color="oklch(0.75 0.18 40)">Feature usage breakdown</SectionLabel>
              <p className="text-xs text-muted-foreground mb-6">Relative share of total feature calls</p>
              <div className="space-y-3.5">
                {[
                  { label: "Schedule",    value: stats?.totalScheduleViews    ?? 0, icon: CalendarDays,  color: "oklch(0.72 0.18 148)" },
                  { label: "Assignments", value: stats?.totalAssignmentFetches ?? 0, icon: ClipboardList, color: "oklch(0.75 0.18 40)" },
                  { label: "Lunch menu",  value: stats?.totalLunchFetches      ?? 0, icon: UtensilsCrossed, color: "oklch(0.78 0.16 55)" },
                  { label: "News",        value: stats?.totalNewsFetches       ?? 0, icon: Newspaper,     color: "oklch(0.70 0.18 320)" },
                ].map((item, i) => {
                  const pct = totalFeatureUsage > 0 ? (item.value / totalFeatureUsage) * 100 : 0;
                  const Icon = item.icon;
                  return (
                    <Reveal key={item.label} delay={i * 0.07} from="left">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `${item.color}18`, color: item.color }}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-medium text-foreground/80">{item.label}</span>
                            <span className="text-muted-foreground tabular-nums">{item.value.toLocaleString()} <span className="opacity-50">({pct.toFixed(1)}%)</span></span>
                          </div>
                          <div className="h-1.5 rounded-full" style={{ background: "oklch(1 0 0 / 5%)" }}>
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: item.color }}
                              initial={{ width: 0 }}
                              whileInView={{ width: `${pct}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 1.1, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                            />
                          </div>
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Schools + Peak dates ── */}
      <section className="relative z-10 px-6 py-4 pb-16 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-4">

          {/* Schools */}
          <Reveal from="left">
            <div className="rounded-3xl p-6" style={{ background: "oklch(0.13 0 0)", border: "1px solid oklch(1 0 0 / 7%)" }}>
              <div className="flex items-center gap-2 mb-1">
                <Globe className="w-4 h-4" style={{ color: "oklch(0.72 0.16 263)" }} />
                <SectionLabel color="oklch(0.72 0.16 263)">Active schools</SectionLabel>
              </div>
              <p className="text-xs text-muted-foreground mb-5">{topSchools.length} school{topSchools.length !== 1 ? "s" : ""} using SchoolSoft+</p>
              {topSchools.length === 0 ? (
                <p className="text-xs text-muted-foreground">No data yet.</p>
              ) : (
                <div className="space-y-3">
                  {topSchools.map(([school, count], i) => (
                    <Reveal key={school} delay={i * 0.05} from="left">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold"
                          style={{ background: "oklch(0.62 0.16 263 / 15%)", color: "oklch(0.72 0.16 263)" }}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-mono font-medium text-foreground/80 truncate">{school}</span>
                            <span className="text-muted-foreground tabular-nums shrink-0 ml-2">{count.toLocaleString()}</span>
                          </div>
                          <div className="h-1 rounded-full" style={{ background: "oklch(1 0 0 / 5%)" }}>
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: "linear-gradient(90deg, oklch(0.62 0.16 263), oklch(0.55 0.20 295))" }}
                              initial={{ width: 0 }}
                              whileInView={{ width: `${(count / topSchoolMax) * 100}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 1.0, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                            />
                          </div>
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </div>
              )}
            </div>
          </Reveal>

          {/* Peak dates */}
          <Reveal from="right">
            <div className="rounded-3xl p-6" style={{ background: "oklch(0.13 0 0)", border: "1px solid oklch(1 0 0 / 7%)" }}>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4" style={{ color: "oklch(0.75 0.18 40)" }} />
                <SectionLabel color="oklch(0.75 0.18 40)">Busiest days ever</SectionLabel>
              </div>
              <p className="text-xs text-muted-foreground mb-5">Top 5 login days by date</p>
              {topDates.length === 0 ? (
                <p className="text-xs text-muted-foreground">No data yet.</p>
              ) : (
                <div className="space-y-4">
                  {topDates.map(([date, count], i) => (
                    <Reveal key={date} delay={i * 0.07} from="right">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0"
                            style={{
                              background: i === 0 ? "oklch(0.75 0.18 40 / 25%)" : "oklch(1 0 0 / 5%)",
                              color: i === 0 ? "oklch(0.80 0.18 40)" : "oklch(0.55 0 0)",
                            }}
                          >
                            #{i + 1}
                          </div>
                          <span className="text-sm font-mono text-foreground/80 truncate">{date}</span>
                        </div>
                        <span
                          className="text-sm font-bold tabular-nums shrink-0"
                          style={{ color: i === 0 ? "oklch(0.80 0.18 40)" : "oklch(0.65 0 0)" }}
                        >
                          <Counter target={count} /> logins
                        </span>
                      </div>
                    </Reveal>
                  ))}
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t px-6 py-8 text-center" style={{ borderColor: "oklch(1 0 0 / 6%)" }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">SchoolSoft+</span>
        </div>
        <p className="text-xs text-muted-foreground">All data is fully anonymous. No personal information is ever stored or displayed.</p>
      </footer>
    </div>
  );
}
