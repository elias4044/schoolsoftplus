'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import {
  Activity,
  ArrowLeft,
  Brain,
  CalendarDays,
  ClipboardList,
  Clock,
  Globe,
  MessageSquare,
  MessagesSquare,
  MousePointerClick,
  Smile,
  StickyNote,
  TrendingUp,
  Users,
  UtensilsCrossed,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────── */
interface StatsPayload {
  totalLogins: number;
  failedLogins: number;
  uniqueLogins: number;
  totalApiCalls: number;
  // Messaging
  totalMessagesSent: number;
  totalConversations: number;
  totalReactions: number;
  messageHours: Record<string, number>;
  // Feature
  totalAiMessages: number;
  totalNotesCreated: number;
  totalScheduleViews: number;
  totalAssignmentFetches: number;
  totalLunchFetches: number;
  totalNewsFetches: number;
  // Histograms
  loginHours: Record<string, number>;
  loginDays: Record<string, number>;
  aiHours: Record<string, number>;
  schools: Record<string, number>;
  peakDates: Record<string, number>;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ─── Reveal ─────────────────────────────────────────────── */
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
  const inView = useInView(ref, { once: true, margin: '-4% 0px' });
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

/* ─── Counter ────────────────────────────────────────────── */
function Counter({ target }: { target: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState('0');

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
function BarChart({
  data,
  labels,
  color,
  height = 80,
}: {
  data: number[];
  labels: string[];
  color: string;
  height?: number;
}) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-0.5" style={{ height }}>
      {data.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
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
            <span className="text-muted-foreground text-[9px] leading-none select-none">
              {labels[i]}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Stat card ──────────────────────────────────────────── */
function StatCard({
  icon: Icon,
  value,
  label,
  sublabel,
  color,
}: {
  icon: React.ElementType;
  value: number;
  label: string;
  sublabel?: string;
  color: string;
}) {
  return (
    <div className="border-border bg-card rounded-xl border p-5">
      <div
        className="mb-3 flex h-7 w-7 items-center justify-center rounded-lg"
        style={{ background: `${color}18`, color }}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="text-foreground text-2xl font-bold tracking-tight tabular-nums">
        <Counter target={value} />
      </p>
      <p className="text-foreground/70 mt-0.5 text-xs font-medium">{label}</p>
      {sublabel && <p className="text-muted-foreground mt-0.5 text-[11px]">{sublabel}</p>}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────── */
export default function StatsPage() {
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStats(d);
      })
      .finally(() => setLoading(false));
  }, []);

  const hours24 = Array.from({ length: 24 }, (_, i) => stats?.loginHours?.[i] ?? 0);
  const msgHours24 = Array.from({ length: 24 }, (_, i) => stats?.messageHours?.[i] ?? 0);
  const aiHours24 = Array.from({ length: 24 }, (_, i) => stats?.aiHours?.[i] ?? 0);
  const days7 = Array.from({ length: 7 }, (_, i) => stats?.loginDays?.[i] ?? 0);
  const topSchools = Object.entries(stats?.schools ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const topSchoolMax = Math.max(...topSchools.map((s) => s[1]), 1);
  const topDates = Object.entries(stats?.peakDates ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const peakHour = hours24.indexOf(Math.max(...hours24));
  const peakDay = days7.indexOf(Math.max(...days7));
  const peakMsgHour = msgHours24.indexOf(Math.max(...msgHours24));
  const totalFeature =
    (stats?.totalScheduleViews ?? 0) +
    (stats?.totalAssignmentFetches ?? 0) +
    (stats?.totalLunchFetches ?? 0) +
    (stats?.totalNewsFetches ?? 0);

  // Messaging cards first, then community, then AI, then features
  const statCards = [
    {
      icon: MessageSquare,
      value: stats?.totalMessagesSent ?? 0,
      label: 'Messages sent',
      sublabel: 'Across all conversations',
      color: 'oklch(0.65 0.22 278)',
    },
    {
      icon: MessagesSquare,
      value: stats?.totalConversations ?? 0,
      label: 'Conversations started',
      sublabel: 'DM threads created',
      color: 'oklch(0.72 0.18 263)',
    },
    {
      icon: Smile,
      value: stats?.totalReactions ?? 0,
      label: 'Reactions added',
      sublabel: 'Emoji reactions on messages',
      color: 'oklch(0.78 0.18 310)',
    },
    {
      icon: Users,
      value: stats?.uniqueLogins ?? 0,
      label: 'Unique users',
      sublabel: 'All time',
      color: 'oklch(0.72 0.18 148)',
    },
    {
      icon: MousePointerClick,
      value: stats?.totalLogins ?? 0,
      label: 'Total logins',
      sublabel: 'Successful sessions',
      color: 'oklch(0.75 0.18 40)',
    },
    {
      icon: Brain,
      value: stats?.totalAiMessages ?? 0,
      label: 'AI messages',
      sublabel: 'Questions answered',
      color: 'oklch(0.75 0.18 310)',
    },
    {
      icon: StickyNote,
      value: stats?.totalNotesCreated ?? 0,
      label: 'Notes created',
      color: 'oklch(0.72 0.18 190)',
    },
    {
      icon: Activity,
      value: stats?.totalApiCalls ?? 0,
      label: 'API calls',
      sublabel: 'Server requests',
      color: 'oklch(0.70 0.16 263)',
    },
  ];

  const Skeleton = () => (
    <div className="border-border bg-card animate-pulse rounded-xl border p-5">
      <div className="bg-muted mb-3 h-7 w-7 rounded-lg" />
      <div className="bg-muted mb-1.5 h-6 w-20 rounded" />
      <div className="bg-muted h-3 w-28 rounded" />
    </div>
  );

  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* Nav */}
      <header className="border-border bg-background/90 sticky top-0 z-50 border-b backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-2 text-sm font-medium">
            <div className="bg-primary h-1.5 w-1.5 animate-pulse rounded-full" />
            Live stats
          </div>
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        {/* Page header */}
        <div className="border-border border-b py-12">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-muted-foreground mb-3 text-[11px] tracking-widest uppercase">
              SchoolSoft+ · Live
            </p>
            <h1 className="mb-3 text-3xl font-bold tracking-tight">
              What's happening
              <br />
              right now.
            </h1>
            <p className="text-muted-foreground max-w-md text-sm">
              Anonymous usage data updated in real-time. No personal information is collected or
              stored — ever.
            </p>
          </motion.div>

          {/* Quick headline numbers */}
          {!loading && stats && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              {[
                {
                  value: stats.totalMessagesSent ?? 0,
                  label: 'messages sent',
                  color: 'oklch(0.65 0.22 278)',
                },
                {
                  value: stats.totalConversations ?? 0,
                  label: 'conversations',
                  color: 'oklch(0.72 0.18 263)',
                },
                { value: stats.uniqueLogins, label: 'students', color: 'oklch(0.72 0.18 148)' },
                {
                  value: stats.totalAiMessages,
                  label: 'AI messages',
                  color: 'oklch(0.75 0.18 310)',
                },
              ].map(({ value, label, color }) => (
                <div
                  key={label}
                  className="border-border bg-card flex items-baseline gap-1.5 rounded-full border px-4 py-1.5"
                >
                  <span className="text-sm font-bold tabular-nums" style={{ color }}>
                    {value.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground text-xs">{label}</span>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Overview */}
        <section className="border-border border-b py-10">
          <Reveal className="mb-5">
            <h2 className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
              Overview
            </h2>
          </Reveal>
          {loading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {statCards.map((s, i) => (
                <Reveal key={s.label} delay={i * 0.04}>
                  <StatCard {...s} />
                </Reveal>
              ))}
            </div>
          )}
        </section>

        {/* Messaging */}
        <section className="border-border border-b py-10">
          <Reveal className="mb-5">
            <h2 className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
              Messaging
            </h2>
          </Reveal>
          {loading ? (
            <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              {[
                {
                  icon: MessageSquare,
                  value: stats?.totalMessagesSent ?? 0,
                  label: 'Messages sent',
                  sublabel: 'Total across all DMs',
                  color: 'oklch(0.65 0.22 278)',
                },
                {
                  icon: MessagesSquare,
                  value: stats?.totalConversations ?? 0,
                  label: 'Conversations',
                  sublabel: 'DM threads created',
                  color: 'oklch(0.72 0.18 263)',
                },
                {
                  icon: Smile,
                  value: stats?.totalReactions ?? 0,
                  label: 'Reactions',
                  sublabel: 'Emoji reactions added',
                  color: 'oklch(0.78 0.18 310)',
                },
              ].map((s, i) => (
                <Reveal key={s.label} delay={i * 0.06}>
                  <StatCard {...s} />
                </Reveal>
              ))}
            </div>
          )}
          <Reveal delay={0.1}>
            <div className="border-border bg-card rounded-xl border p-5">
              <div className="mb-1 flex items-start justify-between">
                <div>
                  <p className="text-foreground text-sm font-medium">Messages by hour</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    UTC{loading ? '' : ` · peak at ${peakMsgHour}:00`}
                  </p>
                </div>
                <MessageSquare className="text-muted-foreground h-4 w-4 shrink-0" />
              </div>
              <div className="mt-5">
                <BarChart
                  data={msgHours24}
                  labels={Array.from({ length: 24 }, (_, i) => (i % 6 === 0 ? `${i}h` : ''))}
                  color="oklch(0.65 0.22 278)"
                  height={96}
                />
              </div>
            </div>
          </Reveal>
        </section>

        {/* Activity patterns */}
        <section className="border-border border-b py-10">
          <Reveal className="mb-6">
            <h2 className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
              Activity patterns
            </h2>
          </Reveal>

          <div className="mb-3 grid gap-3 md:grid-cols-2">
            <Reveal>
              <div className="border-border bg-card rounded-xl border p-5">
                <div className="mb-1 flex items-start justify-between">
                  <div>
                    <p className="text-foreground text-sm font-medium">Logins by hour</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      UTC{loading ? '' : ` · peak at ${peakHour}:00`}
                    </p>
                  </div>
                  <Clock className="text-muted-foreground h-4 w-4 shrink-0" />
                </div>
                <div className="mt-5">
                  <BarChart
                    data={hours24}
                    labels={Array.from({ length: 24 }, (_, i) => (i % 6 === 0 ? `${i}h` : ''))}
                    color="oklch(0.65 0.22 278)"
                    height={96}
                  />
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.06}>
              <div className="border-border bg-card rounded-xl border p-5">
                <div className="mb-1 flex items-start justify-between">
                  <div>
                    <p className="text-foreground text-sm font-medium">AI usage by hour</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      UTC
                      {loading ? '' : ` · ${(stats?.totalAiMessages ?? 0).toLocaleString()} total`}
                    </p>
                  </div>
                  <Brain className="text-muted-foreground h-4 w-4 shrink-0" />
                </div>
                <div className="mt-5">
                  <BarChart
                    data={aiHours24}
                    labels={Array.from({ length: 24 }, (_, i) => (i % 6 === 0 ? `${i}h` : ''))}
                    color="oklch(0.75 0.18 310)"
                    height={96}
                  />
                </div>
              </div>
            </Reveal>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Reveal>
              <div className="border-border bg-card rounded-xl border p-5">
                <p className="text-foreground mb-0.5 text-sm font-medium">Day of week</p>
                <p className="text-muted-foreground mb-5 text-xs">
                  {loading ? '—' : `Most active: ${DAY_LABELS[peakDay]}`}
                </p>
                <BarChart
                  data={days7}
                  labels={DAY_LABELS}
                  color="oklch(0.72 0.18 148)"
                  height={96}
                />
              </div>
            </Reveal>

            <Reveal delay={0.06} className="md:col-span-2">
              <div className="border-border bg-card h-full rounded-xl border p-5">
                <p className="text-foreground mb-0.5 text-sm font-medium">Feature usage</p>
                <p className="text-muted-foreground mb-5 text-xs">Share of total feature calls</p>
                <div className="space-y-3.5">
                  {[
                    {
                      label: 'Schedule',
                      value: stats?.totalScheduleViews ?? 0,
                      color: 'oklch(0.72 0.18 148)',
                    },
                    {
                      label: 'Assignments',
                      value: stats?.totalAssignmentFetches ?? 0,
                      color: 'oklch(0.75 0.18 40)',
                    },
                    {
                      label: 'Lunch menu',
                      value: stats?.totalLunchFetches ?? 0,
                      color: 'oklch(0.78 0.16 55)',
                    },
                    {
                      label: 'News',
                      value: stats?.totalNewsFetches ?? 0,
                      color: 'oklch(0.70 0.18 320)',
                    },
                  ].map((item) => {
                    const pct = totalFeature > 0 ? (item.value / totalFeature) * 100 : 0;
                    return (
                      <div key={item.label} className="flex items-center gap-3">
                        <span className="text-muted-foreground w-20 shrink-0 text-xs">
                          {item.label}
                        </span>
                        <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: item.color }}
                          />
                        </div>
                        <span className="text-muted-foreground w-10 shrink-0 text-right text-xs tabular-nums">
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
            <h2 className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
              Breakdown
            </h2>
          </Reveal>

          <div className="grid gap-3 md:grid-cols-2">
            {/* Schools */}
            <Reveal>
              <div className="border-border bg-card rounded-xl border p-5">
                <div className="mb-1 flex items-start justify-between">
                  <div>
                    <p className="text-foreground text-sm font-medium">Active schools</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {topSchools.length} school{topSchools.length !== 1 ? 's' : ''} using
                      SchoolSoft+
                    </p>
                  </div>
                  <Globe className="text-muted-foreground h-4 w-4 shrink-0" />
                </div>
                {topSchools.length === 0 ? (
                  <p className="text-muted-foreground mt-4 text-xs">No data yet.</p>
                ) : (
                  <div className="mt-4 space-y-2.5">
                    {topSchools.map(([school, count]) => {
                      const pct = (count / topSchoolMax) * 100;
                      return (
                        <div key={school} className="flex items-center gap-3">
                          <span className="text-foreground/80 min-w-0 flex-1 truncate text-xs">
                            {school}
                          </span>
                          <div className="bg-muted h-1.5 w-20 shrink-0 overflow-hidden rounded-full">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, background: 'oklch(0.62 0.16 263)' }}
                            />
                          </div>
                          <span className="text-muted-foreground w-8 shrink-0 text-right text-xs tabular-nums">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Reveal>

            {/* Peak dates */}
            <Reveal delay={0.06}>
              <div className="border-border bg-card rounded-xl border p-5">
                <div className="mb-1 flex items-start justify-between">
                  <div>
                    <p className="text-foreground text-sm font-medium">Busiest days</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">Top 5 login days by date</p>
                  </div>
                  <TrendingUp className="text-muted-foreground h-4 w-4 shrink-0" />
                </div>
                {topDates.length === 0 ? (
                  <p className="text-muted-foreground mt-4 text-xs">No data yet.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {topDates.map(([date, count], i) => (
                      <div key={date} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                            style={{
                              background: 'oklch(0.75 0.18 40 / 15%)',
                              color: 'oklch(0.75 0.18 40)',
                            }}
                          >
                            {i + 1}
                          </span>
                          <span className="text-foreground text-sm font-medium">{date}</span>
                        </div>
                        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
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

      <footer className="border-border border-t">
        <div className="mx-auto flex max-w-5xl flex-col flex-wrap items-center justify-between gap-3 px-6 py-6 sm:flex-row">
          <Link href="/" className="text-foreground text-sm font-medium">
            SchoolSoft+
          </Link>
          <p className="text-muted-foreground text-center text-xs">
            All data is fully anonymous. No personal information is stored or displayed.
          </p>
        </div>
      </footer>
    </div>
  );
}
