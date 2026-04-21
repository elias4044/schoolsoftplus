"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  MousePointerClick,
  Brain,
  StickyNote,
  CalendarDays,
  ClipboardList,
  UtensilsCrossed,
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

/* ─── Reveal ─────────────────────────────────────────────── */
function Reveal({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
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

/* ─── Counter ────────────────────────────────────────────── */
function Counter({ target }: { target: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    let startTime: number | null = null;
    const step = (now: number) => {
      if (!startTime) startTime = now;
      const t = Math.min((now - startTime) / 1000, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(ease * target).toLocaleString());
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target]);

  return <span ref={ref}>{display}</span>;
}

/* ─── Bar chart ──────────────────────────────────────────── */
function BarChart({ data, labels, color, height = 80 }: {
  data: number[]; labels: string[]; color: string; height?: number;
}) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-0.5" style={{ height }}>
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-sm"
            style={{
              height: Math.max(2, (v / max) * (height - 18)),
              background: color,
              opacity: v === max ? 1 : 0.28,
              minHeight: 2,
            }}
          />
          {labels[i] !== undefined && (
            <span className="text-[9px] text-muted-foreground select-none leading-none">{labels[i]}</span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Stat card ──────────────────────────────────────────── */
function StatCard({ icon: Icon, value, label, sublabel, color }: {
  icon: React.ElementType; value: number; label: string; sublabel?: string; color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center mb-3"
        style={{ background: `${color}18`, color }}
      >
        <Icon className="w-3.5 h-3.5" />
      </div>
      <p className="text-2xl font-bold tabular-nums text-foreground tracking-tight">
        <Counter target={value} />
      </p>
      <p className="text-xs font-medium text-foreground/70 mt-0.5">{label}</p>
      {sublabel && <p className="text-[11px] text-muted-foreground mt-0.5">{sublabel}</p>}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────── */
export default function StatsPage() {
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d); })
      .finally(() => setLoading(false));
  }, []);

  const hours24 = Array.from({ length: 24 }, (_, i) => stats?.loginHours?.[i] ?? 0);
  const aiHours24 = Array.from({ length: 24 }, (_, i) => stats?.aiHours?.[i] ?? 0);
  const days7 = Array.from({ length: 7 }, (_, i) => stats?.loginDays?.[i] ?? 0);
  const topSchools = Object.entries(stats?.schools ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const topSchoolMax = Math.max(...topSchools.map(s => s[1]), 1);
  const topDates = Object.entries(stats?.peakDates ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const peakHour = hours24.indexOf(Math.max(...hours24));
  const peakDay = days7.indexOf(Math.max(...days7));
  const totalFeature =
    (stats?.totalScheduleViews ?? 0) +
    (stats?.totalAssignmentFetches ?? 0) +
    (stats?.totalLunchFetches ?? 0) +
    (stats?.totalNewsFetches ?? 0);

  const statCards = [
    { icon: Users,             value: stats?.uniqueLogins ?? 0,            label: "Unique users",        sublabel: "All time",            color: "oklch(0.65 0.22 278)" },
    { icon: MousePointerClick, value: stats?.totalLogins ?? 0,             label: "Total logins",        sublabel: "Successful sessions", color: "oklch(0.72 0.18 148)" },
    { icon: Brain,             value: stats?.totalAiMessages ?? 0,         label: "AI messages",         sublabel: "Questions answered",  color: "oklch(0.75 0.18 310)" },
    { icon: Activity,          value: stats?.totalApiCalls ?? 0,           label: "API calls",           sublabel: "Server requests",     color: "oklch(0.72 0.16 263)" },
    { icon: StickyNote,        value: stats?.totalNotesCreated ?? 0,       label: "Notes created",       color: "oklch(0.72 0.18 190)" },
    { icon: CalendarDays,      value: stats?.totalScheduleViews ?? 0,      label: "Schedule views",      color: "oklch(0.72 0.18 148)" },
    { icon: ClipboardList,     value: stats?.totalAssignmentFetches ?? 0,  label: "Assignment lookups",  color: "oklch(0.75 0.18 40)" },
    { icon: UtensilsCrossed,   value: stats?.totalLunchFetches ?? 0,       label: "Lunch menu views",    color: "oklch(0.78 0.16 55)" },
  ];

  const Skeleton = () => (
    <div className="rounded-xl border border-border bg-card p-5 animate-pulse">
      <div className="w-7 h-7 rounded-lg bg-muted mb-3" />
      <div className="h-6 w-20 bg-muted rounded mb-1.5" />
      <div className="h-3 w-28 bg-muted rounded" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <span className="text-sm font-medium">Usage</span>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6">

        {/* Page header */}
        <div className="py-10 border-b border-border">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-2xl font-semibold tracking-tight mb-2">Usage statistics</h1>
            <p className="text-sm text-muted-foreground">
              Anonymous usage data — no personal information is collected or stored.
            </p>
          </motion.div>
        </div>

        {/* Overview */}
        <section className="py-10 border-b border-border">
          <Reveal className="mb-5">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Overview</h2>
          </Reveal>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {statCards.map((s, i) => (
                <Reveal key={s.label} delay={i * 0.04}>
                  <StatCard {...s} />
                </Reveal>
              ))}
            </div>
          )}
        </section>

        {/* Activity patterns */}
        <section className="py-10 border-b border-border">
          <Reveal className="mb-6">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Activity patterns</h2>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-3 mb-3">
            <Reveal>
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="text-sm font-medium text-foreground">Logins by hour</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      UTC{loading ? "" : ` · peak at ${peakHour}:00`}
                    </p>
                  </div>
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
                <div className="mt-5">
                  <BarChart
                    data={hours24}
                    labels={Array.from({ length: 24 }, (_, i) => i % 6 === 0 ? `${i}h` : "")}
                    color="oklch(0.65 0.22 278)"
                    height={96}
                  />
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.06}>
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="text-sm font-medium text-foreground">AI usage by hour</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      UTC{loading ? "" : ` · ${(stats?.totalAiMessages ?? 0).toLocaleString()} messages total`}
                    </p>
                  </div>
                  <Brain className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
                <div className="mt-5">
                  <BarChart
                    data={aiHours24}
                    labels={Array.from({ length: 24 }, (_, i) => i % 6 === 0 ? `${i}h` : "")}
                    color="oklch(0.75 0.18 310)"
                    height={96}
                  />
                </div>
              </div>
            </Reveal>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <Reveal>
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-sm font-medium text-foreground mb-0.5">Day of week</p>
                <p className="text-xs text-muted-foreground mb-5">
                  {loading ? "—" : `Most active: ${DAY_LABELS[peakDay]}`}
                </p>
                <BarChart data={days7} labels={DAY_LABELS} color="oklch(0.72 0.18 148)" height={96} />
              </div>
            </Reveal>

            <Reveal delay={0.06} className="md:col-span-2">
              <div className="rounded-xl border border-border bg-card p-5 h-full">
                <p className="text-sm font-medium text-foreground mb-0.5">Feature usage</p>
                <p className="text-xs text-muted-foreground mb-5">Share of total feature calls</p>
                <div className="space-y-3.5">
                  {[
                    { label: "Schedule",    value: stats?.totalScheduleViews    ?? 0, color: "oklch(0.72 0.18 148)" },
                    { label: "Assignments", value: stats?.totalAssignmentFetches ?? 0, color: "oklch(0.75 0.18 40)" },
                    { label: "Lunch menu",  value: stats?.totalLunchFetches      ?? 0, color: "oklch(0.78 0.16 55)" },
                    { label: "News",        value: stats?.totalNewsFetches       ?? 0, color: "oklch(0.70 0.18 320)" },
                  ].map(item => {
                    const pct = totalFeature > 0 ? (item.value / totalFeature) * 100 : 0;
                    return (
                      <div key={item.label} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-20 shrink-0">{item.label}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: item.color }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right tabular-nums shrink-0">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Breakdown */}
        <section className="py-10 pb-16">
          <Reveal className="mb-6">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Breakdown</h2>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-3">
            {/* Schools */}
            <Reveal>
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="text-sm font-medium text-foreground">Active schools</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {topSchools.length} school{topSchools.length !== 1 ? "s" : ""} using SchoolSoft+
                    </p>
                  </div>
                  <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
                {topSchools.length === 0 ? (
                  <p className="text-xs text-muted-foreground mt-4">No data yet.</p>
                ) : (
                  <div className="mt-4 space-y-2.5">
                    {topSchools.map(([school, count]) => {
                      const pct = (count / topSchoolMax) * 100;
                      return (
                        <div key={school} className="flex items-center gap-3">
                          <span className="text-xs text-foreground/80 truncate flex-1 min-w-0">{school}</span>
                          <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden shrink-0">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, background: "oklch(0.62 0.16 263)" }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right tabular-nums shrink-0">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Reveal>

            {/* Peak dates */}
            <Reveal delay={0.06}>
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="text-sm font-medium text-foreground">Busiest days</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Top 5 login days by date</p>
                  </div>
                  <TrendingUp className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
                {topDates.length === 0 ? (
                  <p className="text-xs text-muted-foreground mt-4">No data yet.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {topDates.map(([date, count], i) => (
                      <div key={date} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: "oklch(0.75 0.18 40 / 15%)", color: "oklch(0.75 0.18 40)" }}
                          >
                            {i + 1}
                          </span>
                          <span className="text-sm font-medium text-foreground">{date}</span>
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                          {count.toLocaleString()} logins
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Reveal>
          </div>
        </section>

      </main>

      <footer className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 flex-wrap">
          <Link href="/" className="text-sm font-medium text-foreground">SchoolSoft+</Link>
          <p className="text-xs text-muted-foreground text-center">
            All data is fully anonymous. No personal information is stored or displayed.
          </p>
        </div>
      </footer>
    </div>
  );
}
