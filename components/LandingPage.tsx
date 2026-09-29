"use client";

import { useRef, useState, useEffect } from "react";
import {
  motion,
  AnimatePresence,
  useSpring,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import Link from "next/link";
import {
  CalendarDays,
  BookOpen,
  StickyNote,
  UtensilsCrossed,
  Newspaper,
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
  ChevronDown,
  Activity,
  Users,
  MessageSquare,
  ExternalLink,
  HelpCircle,
  FileText,
  Package,
} from "lucide-react";
import MessagingShowcase from "@/components/MessagingShowcase";
import Image from "next/image";

/* --- Reveal ----------------------------------------------- */
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 }}
      whileInView={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-6% 0px" }}
      transition={{
        duration: 0.35,
        delay,
        ease: [0.23, 1, 0.32, 1], // Emil Kowalski custom ease-out
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* --- Live counter ----------------------------------------- */
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
      const t = Math.min((now - start) / 1200, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(ease * value).toLocaleString());
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);

  if (value === null) return <span className="opacity-20">-</span>;
  return <>{display}</>;
}

/* --- Nav dropdown ----------------------------------------- */
type NavItem = {
  label: string;
  desc?: string;
  href: string;
  icon?: React.ElementType;
  iconColor?: string;
  external?: boolean;
  logo?: string;
  badge?: string;
};

function NavDropdown({
  label,
  items,
  align = "left",
}: {
  label: string;
  items: NavItem[];
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onOutside);
      document.addEventListener("keydown", onEsc);
    }
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg transition-all active:scale-[0.97] ${
          open ? "text-white bg-white/10" : "text-white/60 hover:text-white hover:bg-white/5"
        }`}
      >
        {label}
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}>
          <ChevronDown className="w-3 h-3" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -3, scale: 0.96 }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            style={{ transformOrigin: align === "right" ? "top right" : "top left" }}
            className={`absolute top-full mt-1.5 ${
              align === "right" ? "right-0" : "left-0"
            } min-w-65 rounded-2xl border border-white/10 bg-[#111]/95 backdrop-blur-xl shadow-[0_20px_50px_oklch(0_0_0/0.7)] z-50`}
          >
            <div className="p-1.5">
              {items.map((item, idx) => {
                const Icon = item.icon;
                const iconBg = item.iconColor
                  ? item.iconColor.slice(0, -1) + " / 15%)"
                  : "oklch(0.65 0.22 278 / 15%)";
                const inner = (
                  <>
                    {item.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.logo}
                        alt=""
                        className="w-7 h-7 rounded-lg shrink-0 object-contain bg-white/5 p-0.5"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : Icon ? (
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: iconBg, color: item.iconColor }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-white/75 group-hover:text-white transition-colors">
                          {item.label}
                        </span>
                        {item.badge && (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                            style={{ background: "oklch(0.65 0.22 278 / 20%)", color: "oklch(0.78 0.22 278)" }}
                          >
                            {item.badge}
                          </span>
                        )}
                        {item.external && (
                          <ExternalLink className="w-3 h-3 text-white/20 group-hover:text-white/40 transition-colors ml-auto shrink-0" />
                        )}
                      </div>
                      {item.desc && (
                        <p className="text-[11px] text-white/35 mt-0.5 leading-snug">{item.desc}</p>
                      )}
                    </div>
                  </>
                );
                const cls =
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/6 transition-colors group w-full text-left";
                return item.external ? (
                  <a
                    key={idx}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cls}
                    onClick={() => setOpen(false)}
                  >
                    {inner}
                  </a>
                ) : (
                  <Link key={idx} href={item.href} className={cls} onClick={() => setOpen(false)}>
                    {inner}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* --- Hero 3-D mockup -------------------------------------- */
const LESSONS = [
  { time: "08:15", subject: "Mathematics", room: "Rm 302", color: "oklch(0.72 0.18 263)" },
  { time: "10:00", subject: "English",     room: "Rm 105", color: "oklch(0.72 0.18 148)" },
  { time: "11:45", subject: "Physics",     room: "Lab 3",  color: "oklch(0.75 0.18 310)" },
];

function HeroMockup() {
  const shouldReduceMotion = useReducedMotion();
  const rotX = useSpring(shouldReduceMotion ? 0 : 8, { stiffness: 120, damping: 20 });
  const rotY = useSpring(shouldReduceMotion ? 0 : -8, { stiffness: 120, damping: 20 });

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (shouldReduceMotion) return;
    const r = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    rotX.set(8 - ny * 14);
    rotY.set(-8 + nx * 14);
  }
  function onLeave() {
    if (shouldReduceMotion) return;
    rotX.set(8);
    rotY.set(-8);
  }

  return (
    <motion.div
      className="cursor-default select-none"
      style={{ perspective: "1000px" }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
    >
      <motion.div
        style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d" }}
        className="rounded-3xl border border-white/10 bg-[#0d0d0d] overflow-hidden w-72 shadow-[0_30px_70px_oklch(0_0_0/0.6)]"
      >
        {/* window chrome */}
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/8 bg-white/3">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          <span className="ml-auto text-[10px] text-white/30 font-medium">Wednesday - Today</span>
        </div>

        {/* day label */}
        <div className="px-4 pt-3 pb-1.5 flex items-center justify-between">
          <span className="text-xs font-semibold text-white/80">Schedule</span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-white/35 font-medium">Live</span>
          </div>
        </div>

        {/* lesson rows */}
        <div className="px-3 pb-3 space-y-1.5">
          {LESSONS.map((l, i) => (
            <motion.div
              key={l.subject}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.3 + i * 0.06, ease: [0.23, 1, 0.32, 1] }}
              className="flex items-center gap-3 rounded-xl bg-white/4 border border-white/8 px-3 py-2.5 hover:bg-white/6 transition-colors"
            >
              <div className="w-1 h-8 rounded-full shrink-0" style={{ background: l.color }} />
              <div className="min-w-0">
                <p className="text-xs font-medium leading-none mb-1 truncate text-white/90">{l.subject}</p>
                <p className="text-[10px] text-white/40">{l.time} - {l.room}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* footer bar */}
        <div className="border-t border-white/8 px-4 py-2.5 bg-white/2 flex items-center justify-between">
          <span className="text-[10px] text-white/35">2 assignments due</span>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: i === 0 ? "var(--primary)" : "oklch(1 0 0 / 15%)" }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* --- Feature Grid ----------------------------------------- */
const FEATURES = [
  {
    icon: CalendarDays,
    color: "oklch(0.72 0.18 148)",
    title: "Schedule",
    body: "Your full timetable pulled directly from SchoolSoft. Day view, week view, always up to date with live classroom locations.",
    bentoClass: "md:col-span-2",
  },
  {
    icon: BookOpen,
    color: "oklch(0.75 0.18 40)",
    title: "Assignments",
    body: "See what's due this week and next. Never miss a deadline because the school portal buried it.",
    bentoClass: "md:col-span-1",
  },
  {
    icon: UtensilsCrossed,
    color: "oklch(0.78 0.16 55)",
    title: "Lunch menu",
    body: "Today's and the whole week's menu. Rendered cleanly, not in a PDF you have to zoom into.",
    bentoClass: "md:col-span-1",
  },
  {
    icon: Newspaper,
    color: "oklch(0.70 0.18 320)",
    title: "News",
    body: "School announcements in a readable feed. No login walls, no slow loading.",
    bentoClass: "md:col-span-1",
  },
  {
    icon: MessageSquare,
    color: "oklch(0.65 0.22 278)",
    title: "Direct messages",
    body: "Real-time DMs with classmates. Emoji reactions, reply threads, and unread notifications.",
    bentoClass: "md:col-span-1",
  },
  {
    icon: StickyNote,
    color: "oklch(0.72 0.18 190)",
    title: "Notes",
    body: "Quick private notes tied to your account. Write during class, access anywhere.",
    bentoClass: "md:col-span-1",
  },
  {
    icon: Brain,
    color: "oklch(0.65 0.22 278)",
    title: "AI assistant",
    body: "Ask about your schedule, assignments, or anything school-related. It has your context and answers instantly.",
    bentoClass: "md:col-span-2",
  },
];

function FeatureGrid() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="max-w-5xl mx-auto px-6 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map(({ icon: Icon, color, title, body, bentoClass }, i) => (
          <motion.div
            key={title}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            whileInView={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-6% 0px" }}
            transition={{ duration: 0.35, delay: i * 0.04, ease: [0.23, 1, 0.32, 1] }}
            className={`rounded-2xl border border-white/8 bg-[#0d0d0d] p-6 flex flex-col justify-between gap-4 hover:border-white/18 hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 ease-out shadow-sm ${bentoClass}`}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18`, color }}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-base font-bold tracking-tight text-white mb-1.5">{title}</p>
              <p className="text-xs text-white/50 leading-relaxed">{body}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* --- Main component --------------------------------------- */
export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // Page-wide smooth scroll progress
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // Hero section scroll interpolation (spring-smoothed, hardware accelerated)
  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const smoothHeroProgress = useSpring(heroScrollProgress, {
    stiffness: 85,
    damping: 24,
    restDelta: 0.001,
  });
  const heroY = useTransform(smoothHeroProgress, [0, 1], ["0px", shouldReduceMotion ? "0px" : "-44px"]);
  const heroScale = useTransform(smoothHeroProgress, [0, 1], [1, shouldReduceMotion ? 1 : 0.98]);
  const heroOpacity = useTransform(smoothHeroProgress, [0, 0.9], [1, 0.2]);

  const headlineWords = "Your school day, organised properly.".split(" ");

  return (
    <div className="bg-[#080808] text-white overflow-hidden relative">
      {/* Top scroll progress indicator */}
      <motion.div
        style={{ scaleX, transformOrigin: "left" }}
        className="fixed top-0 left-0 right-0 h-0.5 bg-primary z-60 pointer-events-none"
      />

      {/* -- Header -- */}
      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#080808]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-2">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2 shrink-0 mr-1 active:scale-[0.97] transition-transform">
            <Image src="/logo.png" alt="SchoolSoft+ Logo" className="w-6 h-6" width={24} height={24} />
            <span className="font-semibold text-sm text-white/90">SchoolSoft+</span>
          </Link>

          {/* Nav dropdowns */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1">
            <NavDropdown
              label="Products"
              items={[
                {
                  label: "SchoolSoft+",
                  desc: "The student dashboard app",
                  href: "/",
                  logo: "/logo.png",
                },
                {
                  label: "SchoolSoft+ Developer",
                  desc: "API docs, references & tools",
                  href: "https://developer.ssp.elias4044.com",
                  logo: "https://raw.githubusercontent.com/elias4044/ssp-developer/refs/heads/master/public/logo.png",
                  external: true,
                },
                {
                  label: "SchoolSoft+ Node",
                  desc: "npm package for the SchoolSoft API",
                  href: "https://developer.ssp.elias4044.com/docs/ssp-node",
                  logo: "https://raw.githubusercontent.com/elias4044/ssp-node/refs/heads/main/public/logo.png",
                  external: true,
                },
              ]}
            />
            <NavDropdown
              label="Resources"
              items={[
                {
                  label: "Changelog",
                  desc: "What's new in SchoolSoft+",
                  href: "/changelog",
                  icon: Zap,
                  iconColor: "oklch(0.72 0.18 148)",
                  badge: "v1.5.0",
                },
                {
                  label: "Stats",
                  desc: "Live usage statistics",
                  href: "/stats",
                  icon: Activity,
                  iconColor: "oklch(0.65 0.22 278)",
                },
                {
                  label: "Open source",
                  desc: "MIT licensed — read the code",
                  href: "/open-source",
                  icon: Code2,
                  iconColor: "oklch(0.75 0.18 40)",
                },
                {
                  label: "Login help",
                  desc: "Trouble signing in?",
                  href: "/login-help",
                  icon: HelpCircle,
                  iconColor: "oklch(0.70 0.18 320)",
                },
                {
                  label: "Terms & Privacy",
                  desc: "How we handle your data",
                  href: "/terms",
                  icon: FileText,
                  iconColor: "oklch(0.60 0.12 260)",
                },
              ]}
            />
            <NavDropdown
              label="Developers"
              items={[
                {
                  label: "Developer portal",
                  desc: "API docs & integration guides",
                  href: "https://developer.ssp.elias4044.com",
                  icon: Code2,
                  iconColor: "oklch(0.65 0.22 278)",
                  external: true,
                },
                {
                  label: "GitHub",
                  desc: "Source code, issues & pull requests",
                  href: "https://github.com/elias4044/schoolsoftplus",
                  icon: GitPullRequest,
                  iconColor: "oklch(0.75 0.10 220)",
                  external: true,
                },
                {
                  label: "npm — schoolsoftplus",
                  desc: "Node.js package for the SchoolSoft API",
                  href: "https://developer.ssp.elias4044.com/docs/ssp-node",
                  icon: Package,
                  iconColor: "oklch(0.72 0.16 35)",
                  external: true,
                },
              ]}
            />
          </nav>

          {/* CTA */}
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 active:scale-[0.97] transition-all shadow-sm"
          >
            Sign in <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* -- Hero -- */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden border-b border-white/5">
        <motion.div
          style={{ y: heroY, scale: heroScale, opacity: heroOpacity }}
          className="relative z-10 w-full max-w-5xl mx-auto px-6 will-change-transform"
        >
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center min-h-screen md:py-0 py-24">

            {/* Left: copy */}
            <div>


              <div className="mb-5">
                <motion.h1
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: { staggerChildren: 0.04, delayChildren: 0.1 },
                    },
                  }}
                  initial="hidden"
                  animate="visible"
                  className="text-5xl md:text-6xl font-black tracking-tighter leading-[0.95]"
                >
                  {headlineWords.map((word, i) => (
                    <motion.span
                      key={i}
                      variants={{
                        hidden: { opacity: 0, y: 14 },
                        visible: {
                          opacity: 1,
                          y: 0,
                          transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] },
                        },
                      }}
                      className="inline-block mr-[0.2em] last:mr-0"
                    >
                      {word}
                    </motion.span>
                  ))}
                </motion.h1>
              </div>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="text-sm md:text-base text-white/50 max-w-xl leading-relaxed mb-8"
              >
                SchoolSoft+ pulls your schedule, assignments, lunch menu, and news from SchoolSoft into one clean interface -
                with an AI assistant that knows your timetable and real-time direct messaging to stay connected with classmates.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.55, ease: [0.23, 1, 0.32, 1] }}
                className="flex flex-wrap items-center gap-3"
              >
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 active:scale-[0.97] transition-all shadow-sm"
                >
                  Get started <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="https://github.com/elias4044/schoolsoftplus"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-5 py-2.5 text-sm font-medium text-white/60 hover:text-white hover:border-white/20 active:scale-[0.97] transition-all"
                >
                  <Star className="w-3.5 h-3.5" /> GitHub
                </a>
              </motion.div>
            </div>

            {/* Right: 3D mockup */}
            <div className="hidden md:flex justify-center items-center">
              <HeroMockup />
            </div>

          </div>
        </motion.div>

        {/* Minimalist scroll cue */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 select-none pointer-events-none"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        >
          <div className="w-5 h-9 rounded-full border border-white/15 flex items-start justify-center p-1.5">
            <motion.div
              animate={{ y: [0, 8, 0], opacity: [0.8, 0.2, 0.8] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="w-1 h-1.5 rounded-full bg-primary"
            />
          </div>
        </motion.div>
      </section>

      {/* -- Stats strip -- */}
      <section className="relative border-t border-white/5 py-16 px-6 overflow-hidden">
        <div className="max-w-5xl mx-auto relative z-10">
          <Reveal className="mb-6">
            <p className="text-[10px] uppercase tracking-widest text-white/30 font-medium">By the numbers</p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { key: "messages", label: "Messages sent between students", Icon: MessageSquare, color: "oklch(0.65 0.22 278)" },
              { key: "logins",   label: "Times students have logged in",  Icon: Users,         color: "oklch(0.72 0.18 148)" },
              { key: "schedule", label: "Schedule views loaded",          Icon: CalendarDays,  color: "oklch(0.75 0.18 40)"  },
            ].map((s, i) => (
              <Reveal key={s.key} delay={i * 0.05}>
                <div className="rounded-2xl border border-white/8 bg-[#0d0d0d] p-5 flex flex-col gap-2 relative overflow-hidden hover:border-white/15 active:scale-[0.99] transition-all">
                  <s.Icon className="w-4 h-4" style={{ color: s.color }} />
                  <p className="text-2xl md:text-3xl font-black tabular-nums tracking-tight" style={{ color: s.color }}>
                    <LiveCounter label={s.key} />
                  </p>
                  <p className="text-[11px] text-white/40 leading-snug">{s.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.2}>
            <Link href="/stats" className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white mt-4 active:scale-[0.97] transition-all">
              See all stats <ChevronRight className="w-3 h-3" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* -- Messaging Showcase -- */}
      <MessagingShowcase />

      {/* -- Features -- */}
      <div className="border-t border-white/5">
        <div className="max-w-5xl mx-auto px-6 pt-16 pb-4">
          <Reveal>
            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2 font-medium">What it does</p>
            <h2 className="text-2xl font-black tracking-tight">Everything in one place.</h2>
          </Reveal>
        </div>
        <FeatureGrid />
      </div>

      {/* -- Dashboard -- */}
      <section className="relative border-t border-white/5 py-20 px-6 overflow-hidden">
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <Reveal>
              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2 font-medium">Dashboard</p>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">Build your own view.</h2>
              <p className="text-sm text-white/50 leading-relaxed mb-6">
                The dashboard is a grid of widgets you choose. Add what you need, remove what you don&apos;t.
                Layout is saved per account. No config files, no setup steps.
              </p>
              <div className="space-y-2.5">
                {["Schedule widget", "Homework list", "Lunch preview", "News feed", "Countdown timers", "Notes pad", "Weather", "Goals"].map((w, i) => (
                  <Reveal key={w} delay={i * 0.03}>
                    <div className="flex items-center gap-2.5 text-sm text-white/50">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {w}
                    </div>
                  </Reveal>
                ))}
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="rounded-2xl border border-white/8 bg-[#0d0d0d] p-4 space-y-2 shadow-sm">
                {[
                  { icon: CalendarDays,    label: "Schedule", color: "oklch(0.72 0.18 148)" },
                  { icon: BookOpen,        label: "Homework",  color: "oklch(0.75 0.18 40)"  },
                  { icon: UtensilsCrossed, label: "Lunch",    color: "oklch(0.78 0.16 55)"   },
                  { icon: Activity,        label: "Stats",    color: "oklch(0.65 0.22 278)"  },
                ].map(({ icon: Icon, label, color }) => (
                  <div key={label} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 px-4 py-3 hover:bg-white/5 active:scale-[0.99] transition-all">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18`, color }}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm font-medium text-white/80">{label}</span>
                    <div className="ml-auto flex gap-1">
                      <div className="w-12 h-1.5 rounded-full bg-white/10" />
                      <div className="w-8 h-1.5 rounded-full bg-white/5" />
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* -- How it works -- */}
      <section className="relative border-t border-white/5 py-20 px-6 overflow-hidden">
        <div className="max-w-5xl mx-auto relative z-10">
          <Reveal className="mb-10">
            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2 font-medium">Setup</p>
            <h2 className="text-3xl font-black tracking-tight">Three steps, then you&apos;re in.</h2>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { n: "1", title: "Sign in with SchoolSoft",   desc: "Use your existing SchoolSoft credentials. We don't store your password - it's passed directly to SchoolSoft's own login." },
              { n: "2", title: "Pick your school",          desc: "Search for your school name. Works with any school running SchoolSoft in Sweden." },
              { n: "3", title: "Start using it",            desc: "Your schedule, assignments, lunch, and news load immediately. Set up your dashboard however you like." },
            ].map(({ n, title, desc }, i) => (
              <Reveal key={n} delay={i * 0.06}>
                <div className="flex gap-4">
                  <div className="shrink-0 w-8 h-8 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-sm font-black text-white/50">
                    {n}
                  </div>
                  <div>
                    <p className="font-bold text-sm mb-1.5 text-white/80">{title}</p>
                    <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* -- Values -- */}
      <section className="relative border-t border-white/5 py-20 px-6 overflow-hidden">
        <div className="max-w-5xl mx-auto relative z-10">
          <Reveal className="mb-8">
            <h2 className="text-3xl font-black tracking-tight">What we don&apos;t do.</h2>
            <p className="text-sm text-white/40 mt-1">Simple things that matter.</p>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: Shield, color: "oklch(0.72 0.18 148)", title: "No analytics on you",  desc: "We collect anonymous aggregate counts (total logins, total AI messages). Nothing tied to a person." },
              { icon: Zap,    color: "oklch(0.75 0.18 40)",  title: "No password storage",  desc: "Your SchoolSoft credentials are used once at login. We hold a session token, not your password." },
              { icon: Scale,  color: "oklch(0.65 0.22 278)", title: "No ads, no upsells",   desc: "This is a free open-source project. There's no premium tier, no advertising, no data selling." },
            ].map(({ icon: Icon, color, title, desc }, i) => (
              <Reveal key={title} delay={i * 0.05}>
                <div className="rounded-2xl border border-white/8 bg-[#0d0d0d] p-6 hover:border-white/15 active:scale-[0.99] transition-all">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-4 shrink-0" style={{ background: `${color}18`, color }}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="font-bold text-sm mb-1.5 text-white/85">{title}</p>
                  <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* -- Open source + Developer portal -- */}
      <section className="relative border-t border-white/5 py-20 px-6 overflow-hidden">
        <div className="max-w-5xl mx-auto relative z-10">
          <Reveal>
            <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Code2 className="w-4 h-4 text-primary" />
                  <p className="font-bold text-sm text-white/90">Fully open source</p>
                </div>
                <p className="text-xs text-white/40 max-w-md leading-relaxed">
                  All the code is on GitHub under the MIT licence. Read it, fork it, report a bug, or submit a pull request.
                  Developer documentation and API references live at{" "}
                  <a href="https://developer.ssp.elias4044.com" target="_blank" rel="noopener noreferrer"
                    className="text-white/70 underline underline-offset-2 hover:text-white transition-colors">
                    developer.ssp.elias4044.com
                  </a>.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <Link
                  href="/open-source"
                  className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 active:scale-[0.97] transition-all shadow-sm"
                >
                  <GitPullRequest className="w-3.5 h-3.5" /> Contribute
                </Link>
                <a
                  href="https://developer.ssp.elias4044.com"
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/4 px-4 py-2 text-sm font-medium text-white/60 hover:text-white hover:border-white/20 active:scale-[0.97] transition-all"
                >
                  <BookOpen className="w-3.5 h-3.5" /> Docs
                </a>
                <a
                  href="https://github.com/elias4044/schoolsoftplus"
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/4 px-4 py-2 text-sm font-medium text-white/60 hover:text-white hover:border-white/20 active:scale-[0.97] transition-all"
                >
                  <Star className="w-3.5 h-3.5" /> Star
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* -- CTA -- */}
      <section className="relative border-t border-white/5 py-28 px-6 text-center overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
          className="relative z-10 max-w-xl mx-auto"
        >
          <p className="text-xs uppercase tracking-widest text-white/30 mb-4 font-medium">Ready?</p>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 leading-tight">
            30 seconds<br />to get started.
          </h2>
          <p className="text-sm text-white/40 leading-relaxed mb-8 max-w-sm mx-auto">
            Free for any Swedish school using SchoolSoft. Sign in, pick your school, and your schedule, AI, and classmates are all in one place.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-2xl px-8 py-3.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 active:scale-[0.97] transition-all shadow-sm"
          >
            Sign in with SchoolSoft <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </section>

      {/* -- Footer -- */}
      <footer className="border-t border-white/8">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-white/80">SchoolSoft+</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/50">
            <Link href="/terms"       className="hover:text-white transition-colors">Terms &amp; Privacy</Link>
            <Link href="/login-help"  className="hover:text-white transition-colors">Login help</Link>
            <Link href="/stats"       className="hover:text-white transition-colors">Stats</Link>
            <Link href="/changelog"   className="hover:text-white transition-colors">Changelog</Link>
            <Link href="/open-source" className="hover:text-white transition-colors">Open source</Link>
            <a href="https://developer.ssp.elias4044.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Developers</a>
            <a href="https://github.com/elias4044/schoolsoftplus" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
          </div>
          <p className="text-xs text-white/40">Not affiliated with SchoolSoft AB.</p>
        </div>
      </footer>

    </div>
  );
}
