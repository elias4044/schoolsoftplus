"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  useMotionValue,
  useSpring,
  AnimatePresence,
} from "framer-motion";
import Link from "next/link";
import {
  CalendarDays,
  BookOpen,
  StickyNote,
  UtensilsCrossed,
  Newspaper,
  LayoutDashboard,
  ArrowRight,
  ChevronDown,
  Sparkles,
  Zap,
  Shield,
  BarChart2,
  Users,
  Brain,
  Activity,
  Code2,
  Scale,
  GitPullRequest,
  Star,
} from "lucide-react";

/* ─────────────────────────────────────────────
   Cursor glow
──────────────────────────────────────────── */
function CursorGlow() {
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const sx = useSpring(x, { stiffness: 80, damping: 20 });
  const sy = useSpring(y, { stiffness: 80, damping: 20 });

  useEffect(() => {
    const move = (e: MouseEvent) => { x.set(e.clientX); y.set(e.clientY); };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [x, y]);

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-0"
      style={{ background: "transparent" }}
    >
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 500,
          height: 500,
          x: sx,
          y: sy,
          translateX: "-50%",
          translateY: "-50%",
          background:
            "radial-gradient(circle, oklch(0.62 0.16 263 / 8%) 0%, transparent 70%)",
        }}
      />
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Animated grid background
──────────────────────────────────────────── */
function GridBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.04]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      {/* Radial vignette on the grid */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, transparent 40%, oklch(0.10 0 0) 100%)",
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Floating orbs
──────────────────────────────────────────── */
function Orbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <motion.div
        className="absolute rounded-full blur-3xl"
        style={{
          width: 600,
          height: 600,
          top: "-15%",
          left: "60%",
          background: "oklch(0.62 0.16 263 / 12%)",
        }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full blur-3xl"
        style={{
          width: 400,
          height: 400,
          top: "10%",
          left: "-8%",
          background: "oklch(0.55 0.20 295 / 9%)",
        }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Scroll-reveal wrapper
──────────────────────────────────────────── */
function Reveal({
  children,
  delay = 0,
  className = "",
  from = "bottom",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  from?: "bottom" | "left" | "right" | "scale";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });

  const variants = {
    bottom: { hidden: { opacity: 0, y: 40 },        visible: { opacity: 1, y: 0 } },
    left:   { hidden: { opacity: 0, x: -40 },       visible: { opacity: 1, x: 0 } },
    right:  { hidden: { opacity: 0, x: 40 },        visible: { opacity: 1, x: 0 } },
    scale:  { hidden: { opacity: 0, scale: 0.88 },  visible: { opacity: 1, scale: 1 } },
  }[from];

  return (
    <motion.div
      ref={ref}
      variants={variants}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Feature card
──────────────────────────────────────────── */
interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  accent: string;
  delay?: number;
}
function FeatureCard({ icon: Icon, title, description, accent, delay = 0 }: FeatureCardProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <Reveal delay={delay} from="bottom">
      <motion.div
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        animate={{ y: hovered ? -6 : 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="relative rounded-2xl border p-6 overflow-hidden cursor-default"
        style={{
          background: "oklch(0.13 0 0)",
          borderColor: hovered ? `${accent}40` : "oklch(1 0 0 / 7%)",
          transition: "border-color 0.3s",
        }}
      >
        {/* Glow spot */}
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          style={{
            background: `radial-gradient(circle at 30% 30%, ${accent}18 0%, transparent 65%)`,
          }}
        />
        <div
          className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-4"
          style={{ background: `${accent}18`, color: accent }}
        >
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-base font-semibold mb-2 text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </motion.div>
    </Reveal>
  );
}

/* ─────────────────────────────────────────────
   Step card (how it works)
──────────────────────────────────────────── */
function StepCard({
  number,
  title,
  description,
  delay = 0,
}: {
  number: string;
  title: string;
  description: string;
  delay?: number;
}) {
  return (
    <Reveal delay={delay} from="bottom" className="flex gap-5">
      <div className="flex-shrink-0 flex flex-col items-center">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
          style={{
            background: "oklch(0.62 0.16 263 / 15%)",
            color: "oklch(0.75 0.15 263)",
            border: "1px solid oklch(0.62 0.16 263 / 25%)",
          }}
        >
          {number}
        </div>
        {/* connector line — not shown on last item via CSS */}
        <div
          className="w-px flex-1 mt-2 step-line"
          style={{ background: "oklch(1 0 0 / 8%)", minHeight: 32 }}
        />
      </div>
      <div className="pb-8">
        <h3 className="text-base font-semibold mb-1 text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </Reveal>
  );
}

/* ─────────────────────────────────────────────
   Stat pill
──────────────────────────────────────────── */
function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <Reveal from="scale">
      <div
        className="rounded-2xl px-6 py-5 text-center"
        style={{ background: "oklch(0.13 0 0)", border: "1px solid oklch(1 0 0 / 7%)" }}
      >
        <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    </Reveal>
  );
}

/* ─────────────────────────────────────────────
   Animated live counter (for stats teaser)
──────────────────────────────────────────── */
function LiveCounter({ target }: { target: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const val = useMotionValue(0);
  const spring = useSpring(val, { stiffness: 35, damping: 18, mass: 0.8 });
  const [display, setDisplay] = useState("—");

  useEffect(() => {
    if (inView && target > 0) val.set(target);
  }, [inView, target, val]);

  useEffect(() => {
    return spring.on("change", (v) =>
      setDisplay(Math.round(v).toLocaleString())
    );
  }, [spring]);

  return <span ref={ref}>{display}</span>;
}

/* ─────────────────────────────────────────────
   Stats teaser (landing section)
──────────────────────────────────────────── */
function StatsTeaserSection() {
  const [data, setData] = useState<{
    totalLogins: number; uniqueLogins: number; totalAiMessages: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then(r => r.json())
      .then(d => { if (d.success) setData(d); })
      .catch(() => {});
  }, []);

  const items = [
    { icon: Users,    value: data?.uniqueLogins    ?? 0, label: "Unique students" },
    { icon: Activity, value: data?.totalLogins     ?? 0, label: "Total sessions" },
    { icon: Brain,    value: data?.totalAiMessages ?? 0, label: "AI conversations" },
  ];

  return (
    <section className="relative z-10 px-6 py-16 md:py-20 max-w-5xl mx-auto">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none -z-10"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 50%, oklch(0.62 0.16 263 / 5%) 0%, transparent 70%)",
        }}
      />

      <Reveal className="text-center mb-10">
        <p
          className="text-[10px] uppercase tracking-[0.2em] font-bold mb-3"
          style={{ color: "oklch(0.65 0.22 278)" }}
        >
          Live · Anonymous · Always on
        </p>
        <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3">
          Numbers don't lie.
        </h2>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Real usage, happening right now.
        </p>
      </Reveal>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <Reveal key={item.label} delay={i * 0.08} from="scale">
              <motion.div
                whileHover={{ y: -4, borderColor: "oklch(0.62 0.16 263 / 40%)" }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="rounded-2xl p-5 text-center relative overflow-hidden group"
                style={{
                  background: "oklch(0.13 0 0)",
                  border: "1px solid oklch(1 0 0 / 7%)",
                  transition: "border-color 0.3s",
                }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 0%, oklch(0.62 0.16 263 / 10%) 0%, transparent 60%)",
                  }}
                />
                <div
                  className="inline-flex items-center justify-center w-8 h-8 rounded-xl mb-3"
                  style={{
                    background: "oklch(0.62 0.16 263 / 14%)",
                    color: "oklch(0.72 0.16 263)",
                  }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-2xl md:text-3xl font-black tracking-tight text-foreground tabular-nums">
                  <LiveCounter target={item.value} />
                </p>
                <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
              </motion.div>
            </Reveal>
          );
        })}
      </div>

      <Reveal className="text-center">
        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="inline-block">
          <Link
            href="/stats"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold"
            style={{
              background: "oklch(0.62 0.16 263 / 12%)",
              color: "oklch(0.78 0.14 263)",
              border: "1px solid oklch(0.62 0.16 263 / 25%)",
            }}
          >
            <BarChart2 className="w-4 h-4" />
            Explore all stats
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>
      </Reveal>
    </section>
  );
}

/* ─────────────────────────────────────────────
   Main landing page
──────────────────────────────────────────── */
export default function LandingPage() {
  const heroRef  = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY    = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const features = [
    {
      icon: LayoutDashboard,
      title: "Customisable Dashboard",
      description: "Drag, resize, and arrange widgets exactly the way you want. Your dashboard remembers your preferences across devices.",
      accent: "oklch(0.65 0.22 278)",
    },
    {
      icon: CalendarDays,
      title: "Live Schedule",
      description: "See today's lessons at a glance. Real-time data from SchoolSoft, beautifully laid out with countdown timers.",
      accent: "oklch(0.72 0.18 148)",
    },
    {
      icon: BookOpen,
      title: "Assignments Tracker",
      description: "All your upcoming assignments in one place, with due-date warnings and submission status so nothing slips through.",
      accent: "oklch(0.75 0.18 40)",
    },
    {
      icon: StickyNote,
      title: "Rich Markdown Notes",
      description: "Write, format, and share notes with a built-in Markdown editor. Auto-save, live preview, and shareable links.",
      accent: "oklch(0.72 0.18 190)",
    },
    {
      icon: UtensilsCrossed,
      title: "Lunch Menu",
      description: "Never wonder what's for lunch again. The full weekly menu, fetched fresh every day and shown right on your dashboard.",
      accent: "oklch(0.75 0.15 50)",
    },
    {
      icon: Newspaper,
      title: "School News Feed",
      description: "Stay up to date with announcements and news from your school, curated and displayed in a readable card format.",
      accent: "oklch(0.70 0.18 320)",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[oklch(0.10_0_0)]">
      <CursorGlow />

      {/* ─── Sticky nav ─── */}
      <motion.nav
        className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-12 py-4"
        animate={{
          background: scrolled ? "oklch(0.10 0 0 / 85%)" : "transparent",
          backdropFilter: scrolled ? "blur(16px)" : "blur(0px)",
          borderBottom: scrolled ? "1px solid oklch(1 0 0 / 7%)" : "1px solid transparent",
        }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="font-bold text-foreground tracking-tight">SchoolSoft+</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
          >
            Sign in
          </Link>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/login"
              className="text-sm font-medium px-4 py-2 rounded-xl transition-colors"
              style={{
                background: "oklch(0.62 0.16 263 / 20%)",
                color: "oklch(0.80 0.14 263)",
                border: "1px solid oklch(0.62 0.16 263 / 30%)",
              }}
            >
              Get started
            </Link>
          </motion.div>
        </div>
      </motion.nav>

      {/* ─── Hero ─── */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden"
      >
        <GridBackground />
        <Orbs />

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 max-w-4xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium mb-8"
            style={{
              background: "oklch(0.62 0.16 263 / 12%)",
              color: "oklch(0.75 0.14 263)",
              border: "1px solid oklch(0.62 0.16 263 / 22%)",
            }}
          >
            <Zap className="w-3 h-3" />
            SchoolSoft — reimagined
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-7xl font-black tracking-tight leading-[1.07] mb-6"
          >
            Your school life,{" "}
            <span
              className="inline-block"
              style={{
                background: "linear-gradient(135deg, oklch(0.72 0.18 263), oklch(0.65 0.22 310))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              actually beautiful.
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            SchoolSoft+ replaces the clunky official portal with a fast, modern dashboard — schedule, assignments, notes, lunch menu and more, all in one place.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-semibold text-sm shadow-lg transition-shadow hover:shadow-primary/25"
                style={{
                  background: "linear-gradient(135deg, oklch(0.62 0.16 263), oklch(0.55 0.20 295))",
                  color: "white",
                  boxShadow: "0 0 32px oklch(0.62 0.16 263 / 25%)",
                }}
              >
                Open dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
            <motion.a
              href="#features"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-medium text-sm text-muted-foreground hover:text-foreground transition-colors"
              style={{ background: "oklch(1 0 0 / 5%)", border: "1px solid oklch(1 0 0 / 8%)" }}
            >
              Explore features
            </motion.a>
          </motion.div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Stats bar ─── */}
      <section className="relative z-10 px-6 py-12 md:py-16 max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: "6+", label: "Dashboard widgets" },
            { value: "< 1s", label: "Average load time" },
            { value: "100%", label: "Free to use" },
            { value: "∞", label: "Notes & sharing" },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08} from="scale">
              <div
                className="rounded-2xl px-6 py-5 text-center"
                style={{ background: "oklch(0.13 0 0)", border: "1px solid oklch(1 0 0 / 7%)" }}
              >
                <p className="text-3xl font-bold tracking-tight text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── Stats teaser ─── */}
      <StatsTeaserSection />

      {/* ─── Features ─── */}
      <section id="features" className="relative z-10 px-6 py-16 md:py-24 max-w-5xl mx-auto">
        <Reveal className="text-center mb-14">
          <p
            className="text-xs uppercase tracking-widest font-semibold mb-3"
            style={{ color: "oklch(0.65 0.22 278)" }}
          >
            Everything you need
          </p>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
            One dashboard to rule them all.
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-base leading-relaxed">
            We pulled every useful piece of information from SchoolSoft and made it fast, searchable, and beautiful.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <FeatureCard key={f.title} {...f} delay={i * 0.07} />
          ))}
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="relative z-10 px-6 py-16 md:py-24">
        {/* Background accent */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 50%, oklch(0.62 0.16 263 / 4%) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <Reveal>
              <p
                className="text-xs uppercase tracking-widest font-semibold mb-3"
                style={{ color: "oklch(0.72 0.18 148)" }}
              >
                How it works
              </p>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-6">
                Up and running in&nbsp;seconds.
              </h2>
            </Reveal>

            <div>
              {[
                {
                  n: "1",
                  title: "Sign in with your SchoolSoft credentials",
                  description: "We use your existing school login — no new account needed. Your data stays between you and SchoolSoft.",
                },
                {
                  n: "2",
                  title: "Your dashboard loads instantly",
                  description: "Everything is pre-fetched and cached. Schedule, assignments, lunch — all there before you can blink.",
                },
                {
                  n: "3",
                  title: "Make it yours",
                  description: "Drag and resize widgets, write notes, share them, and customise every detail. Your layout is saved to the cloud.",
                },
              ].map((step, i) => (
                <StepCard key={step.n} number={step.n} title={step.title} description={step.description} delay={i * 0.1} />
              ))}
            </div>
          </div>

          {/* Visual card stack */}
          <Reveal from="right" className="hidden md:block">
            <div className="relative h-72">
              {[
                { top: "0%",  left: "0%",  label: "Schedule",   icon: CalendarDays, color: "oklch(0.72 0.18 148)" },
                { top: "20%", left: "10%", label: "Assignments", icon: BookOpen,     color: "oklch(0.75 0.18 40)" },
                { top: "40%", left: "20%", label: "Notes",       icon: StickyNote,   color: "oklch(0.72 0.18 190)" },
              ].map((card, i) => (
                <motion.div
                  key={card.label}
                  className="absolute rounded-2xl px-5 py-4 flex items-center gap-3 w-52"
                  style={{
                    top: card.top,
                    left: card.left,
                    background: "oklch(0.13 0 0)",
                    border: "1px solid oklch(1 0 0 / 8%)",
                    boxShadow: "0 8px 32px oklch(0 0 0 / 40%)",
                  }}
                  animate={{ y: [0, -6, 0] }}
                  transition={{
                    duration: 4 + i * 1.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.8,
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${card.color}18`, color: card.color }}
                  >
                    <card.icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{card.label}</span>
                </motion.div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── Why us ─── */}
      <section className="relative z-10 px-6 py-16 md:py-20 max-w-5xl mx-auto">
        <Reveal className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
            Built for students, by a student.
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
            No bloat, no ads, no dark patterns. Just the features you actually use, fast and clean.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              icon: Zap,
              title: "Blazing fast",
              description: "Smart caching and optimistic UI make every interaction feel instant.",
              color: "oklch(0.80 0.18 80)",
            },
            {
              icon: Shield,
              title: "Your data is yours",
              description: "We never store your SchoolSoft password. Sessions are short-lived and secure.",
              color: "oklch(0.72 0.18 148)",
            },
            {
              icon: BarChart2,
              title: "Always improving",
              description: "Actively developed. New widgets and features are added regularly based on real student feedback.",
              color: "oklch(0.65 0.22 278)",
            },
          ].map((item, i) => (
            <Reveal key={item.title} delay={i * 0.1} from="bottom">
              <div
                className="rounded-2xl p-6 h-full"
                style={{ background: "oklch(0.13 0 0)", border: "1px solid oklch(1 0 0 / 7%)" }}
              >
                <div
                  className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-4"
                  style={{ background: `${item.color}18`, color: item.color }}
                >
                  <item.icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold mb-2">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="relative z-10 px-6 py-20 md:py-28">
        <div className="relative max-w-2xl mx-auto text-center">
          {/* Glow behind CTA */}
          <div
            className="absolute inset-0 -z-10 rounded-3xl blur-3xl"
            style={{ background: "oklch(0.62 0.16 263 / 10%)" }}
          />
          <Reveal from="scale">
            <div
              className="rounded-3xl px-8 py-14 relative overflow-hidden"
              style={{
                background: "oklch(0.13 0 0)",
                border: "1px solid oklch(0.62 0.16 263 / 20%)",
              }}
            >
              {/* Corner accent */}
              <div
                className="absolute top-0 right-0 w-48 h-48 rounded-bl-full pointer-events-none"
                style={{ background: "oklch(0.62 0.16 263 / 8%)" }}
              />

              <Sparkles
                className="w-8 h-8 mx-auto mb-4"
                style={{ color: "oklch(0.72 0.16 263)" }}
              />
              <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
                Ready to upgrade your school day?
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                It&apos;s free, it&apos;s fast, and it only takes your usual SchoolSoft login.
              </p>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="inline-block"
              >
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-base text-white"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.62 0.16 263), oklch(0.55 0.20 295))",
                    boxShadow: "0 0 40px oklch(0.62 0.16 263 / 30%)",
                  }}
                >
                  Get started for free <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── Open Source teaser ─── */}
      <section className="relative z-10 px-6 py-14 max-w-4xl mx-auto">
        <Reveal>
          <div
            className="rounded-3xl p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-6 relative overflow-hidden"
            style={{ background: "oklch(0.13 0 0)", border: "1px solid oklch(0.62 0.16 263 / 18%)" }}
          >
            <motion.div className="pointer-events-none absolute rounded-full blur-3xl"
              style={{ width: 380, height: 380, top: "50%", left: "70%", transform: "translate(-50%,-50%)", background: "oklch(0.62 0.16 263 / 6%)" }}
              animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} />
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "oklch(0.62 0.16 263 / 16%)", color: "oklch(0.72 0.16 263)" }}
            >
              <Code2 className="w-7 h-7" />
            </div>
            <div className="flex-1 relative z-10">
              <div className="flex items-center gap-2 mb-1.5">
                <Scale className="w-3.5 h-3.5" style={{ color: "oklch(0.72 0.18 148)" }} />
                <span className="text-xs font-semibold" style={{ color: "oklch(0.72 0.18 148)" }}>MIT Licensed · Open Source</span>
              </div>
              <h2 className="text-xl font-black text-foreground mb-2">SchoolSoft+ is built in the open.</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-md">
                Read the code, report a bug, suggest a feature, or submit a pull request. Every contribution makes it better for every student.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <Link
                  href="/open-source"
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all hover:scale-[1.03]"
                  style={{ background: "oklch(0.62 0.16 263)", color: "white" }}
                >
                  <GitPullRequest className="w-3.5 h-3.5" /> Contribute
                </Link>
                <a
                  href="https://github.com/elias4044/schoolsoftplus"
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all hover:scale-[1.03]"
                  style={{ background: "oklch(1 0 0 / 6%)", color: "oklch(0.80 0 0)", border: "1px solid oklch(1 0 0 / 10%)" }}
                >
                  <Star className="w-3.5 h-3.5" /> Star on GitHub
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ─── Footer ─── */}
      <footer
        className="relative z-10 border-t px-6 py-8 text-center"
        style={{ borderColor: "oklch(1 0 0 / 6%)" }}
      >
        <div className="flex items-center justify-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">SchoolSoft+</span>
        </div>
        <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-2">
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms &amp; Privacy</Link>
          <span className="opacity-30">·</span>
          <Link href="/login-help" className="hover:text-foreground transition-colors">Login help</Link>
          <span className="opacity-30">·</span>
          <Link href="/stats" className="hover:text-foreground transition-colors">Stats</Link>
          <span className="opacity-30">·</span>
          <Link href="/open-source" className="hover:text-foreground transition-colors">Open Source</Link>
          <span className="opacity-30">·</span>
          <a href="https://github.com/elias4044/schoolsoftplus" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
        </div>
        <p className="text-xs text-muted-foreground opacity-50">
          Not affiliated with SchoolSoft AB. Built independently as a better student experience.
        </p>
      </footer>
    </div>
  );
}
