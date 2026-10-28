'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SiGithub } from '@icons-pack/react-simple-icons';
import {
  AnimatePresence,
  easeOut,
  motion,
  useInView,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Activity,
  ArrowRight,
  BookOpen,
  Brain,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronRight,
  Cloud,
  Code2,
  ExternalLink,
  FileText,
  GitPullRequest,
  HelpCircle,
  MessageSquare,
  Newspaper,
  Package,
  Palette,
  Scale,
  Shield,
  Sparkles,
  Star,
  StickyNote,
  Users,
  UtensilsCrossed,
  Zap,
} from 'lucide-react';

import MessagingShowcase from '@/components/MessagingShowcase';

import { Button } from './ui/button';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

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
  const inView = useInView(ref, { once: true, margin: '-8% 0px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* --- Live counter --- */
function LiveCounter({ label }: { label: string }) {
  const [value, setValue] = useState<number | null>(null);
  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) return;
        const map: Record<string, number> = {
          logins: d.totalLogins ?? 0,
          schedule: d.totalScheduleViews ?? 0,
          lunch: d.totalLunchFetches ?? 0,
          messages: d.totalMessagesSent ?? 0,
        };
        setValue(map[label] ?? 0);
      })
      .catch(() => {});
  }, [label]);

  const [display, setDisplay] = useState('0');
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

/* --- Nav dropdown --- */
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
  align = 'left',
}: {
  label: string;
  items: NavItem[];
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('mousedown', onOutside);
      document.addEventListener('keydown', onEsc);
    }
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm transition-colors ${
          open ? 'bg-white/6 text-white' : 'text-white/45 hover:bg-white/4 hover:text-white'
        }`}
      >
        {label}
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }}>
          <ChevronDown className="h-3 w-3" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className={`absolute top-full mt-1.5 ${
              align === 'right' ? 'right-0' : 'left-0'
            } z-50 min-w-65 rounded-2xl border border-white/10 bg-[#111]/95 shadow-[0_24px_60px_oklch(0_0_0/0.6)] backdrop-blur-xl`}
          >
            <div className="p-1.5">
              {items.map((item, idx) => {
                const Icon = item.icon;
                const iconBg = item.iconColor
                  ? item.iconColor.slice(0, -1) + ' / 15%)'
                  : 'oklch(0.65 0.22 278 / 15%)';
                const inner = (
                  <>
                    {item.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.logo}
                        alt=""
                        className="h-7 w-7 shrink-0 rounded-lg bg-white/5 object-contain p-0.5"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : Icon ? (
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: iconBg, color: item.iconColor }}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-white/75 transition-colors group-hover:text-white">
                          {item.label}
                        </span>
                        {item.badge && (
                          <span
                            className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                            style={{
                              background: 'oklch(0.65 0.22 278 / 20%)',
                              color: 'oklch(0.78 0.22 278)',
                            }}
                          >
                            {item.badge}
                          </span>
                        )}
                        {item.external && (
                          <ExternalLink className="ml-auto h-3 w-3 shrink-0 text-white/20 transition-colors group-hover:text-white/40" />
                        )}
                      </div>
                      {item.desc && (
                        <p className="mt-0.5 text-[11px] leading-snug text-white/35">{item.desc}</p>
                      )}
                    </div>
                  </>
                );
                const cls =
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/6 transition-colors group w-full text-left';
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

/* --- Feature grid --- */

const FEATURES = [
  {
    icon: CalendarDays,
    color: 'oklch(0.76 0.13 165)',
    title: 'Your schedule, sorted.',
    body: 'Your timetable, without the SchoolSoft clutter. See whats next, or plan the entire week.',
    size: 'md:col-span-2 md:row-span-2',
    style: 'schedule',
  },
  {
    icon: BookOpen,
    color: 'oklch(0.78 0.12 75)',
    title: 'Assignments',
    body: "Deadlines in one place. Know what's due next.",
    size: 'md:col-span-1 md:row-span-1',
    style: 'default',
  },
  {
    icon: UtensilsCrossed,
    color: 'oklch(0.76 0.12 145)',
    title: 'Lunch menu',
    body: "Today's lunch, simple & instant.",
    size: 'md:col-span-1 md:row-span-1',
    style: 'default',
  },
  {
    icon: Newspaper,
    color: 'oklch(0.76 0.12 230)',
    title: 'School news',
    body: 'Announcements that are actually easy to read.',
    size: 'md:col-span-1 md:row-span-1',
    style: 'default',
  },
  {
    icon: MessageSquare,
    color: 'oklch(0.76 0.12 285)',
    title: 'Talk to classmates',
    body: 'Direct messages, replies, reactions, and unread notifications.',
    size: 'md:col-span-2 md:row-span-1',
    style: 'messages',
  },
  {
    icon: StickyNote,
    color: 'oklch(0.76 0.12 55)',
    title: 'Notes',
    body: 'Little reminders and private notes, ready whenever you need them.',
    size: 'md:col-span-1 md:row-span-1',
    style: 'default',
  },
  {
    icon: Brain,
    color: 'oklch(0.76 0.12 200)',
    title: 'Your AI assistant',
    body: 'Ask about school, your schedule, or upcoming assignments. Less searching, more doing.',
    size: 'md:col-span-2 md:row-span-1',
    style: 'assistant',
  },
  {
    icon: ChartNoAxesCombined,
    color: 'oklch(0.76 0.12 165)',
    title: 'Grade statistics',
    body: 'Keep track of your grades and see how they change over time.',
    size: 'md:col-span-1 md:row-span-2',
    style: 'grades',
  },
  {
    icon: Palette,
    color: 'oklch(0.76 0.12 285)',
    title: 'Make it yours',
    body: 'Choose a theme and accent color that feels right to you.',
    size: 'md:col-span-2 md:row-span-1',
    style: 'themes',
  },
];

function FeatureScroller() {
  const trackRef = useRef<HTMLDivElement>(null);
  const inView = useInView(trackRef, {
    once: true,
    margin: '-8% 0px',
  });

  return (
    <div className="relative mx-auto max-w-5xl">
      <div
        ref={trackRef}
        className="grid auto-rows-auto grid-cols-1 gap-3 p-4 md:auto-rows-60 md:grid-cols-3"
      >
        {FEATURES.map(({ icon: Icon, color, title, body, size, style }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{
              duration: 0.4,
              delay: i * 0.045,
              ease: easeOut,
            }}
            className={[
              'group relative flex min-h-60 flex-col overflow-hidden',
              'rounded-2xl border border-white/8',
              'bg-card p-5 md:p-6',
              'transition-colors duration-200 hover:border-white/16',
              size,
            ].join(' ')}
          >
            <div
              className="pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full opacity-[0.07] blur-3xl transition-opacity duration-300 group-hover:opacity-[0.13]"
              style={{ backgroundColor: color }}
            />

            <div className="relative flex items-center justify-between">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: `color-mix(in oklch, ${color} 12%, transparent)`,
                  color,
                }}
              >
                <Icon className="h-[18px] w-[18px]" />
              </div>

              {style === 'schedule' && <span className="text-xs text-white/35">YOUR WEEK</span>}

              {style === 'grades' && <span className="text-xs text-white/35">OVERVIEW</span>}
            </div>

            <div className="relative mt-auto pt-8">
              <h3 className="text-base font-semibold tracking-tight text-white/90">{title}</h3>
              <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-white/45">{body}</p>

              {style === 'schedule' && (
                <div className="mt-5 space-y-2">
                  {[
                    ['08:30', 'Mathematics'],
                    ['10:15', 'English'],
                    ['13:00', 'Technology'],
                  ].map(([time, subject]) => (
                    <div
                      key={time}
                      className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-2"
                    >
                      <span className="w-12 text-xs text-white/35 tabular-nums">{time}</span>
                      <span className="text-sm text-white/65">{subject}</span>
                    </div>
                  ))}
                </div>
              )}

              {style === 'grades' && (
                <div className="mt-5 flex h-24 items-end gap-2">
                  {[35, 52, 43, 68, 58, 82, 73, 92].map((height, index) => (
                    <div
                      key={index}
                      className="flex-1 rounded-t-sm"
                      style={{
                        height: `${height}%`,
                        backgroundColor: color,
                        opacity: 0.25 + index * 0.085,
                      }}
                    />
                  ))}
                </div>
              )}

              {style === 'themes' && (
                <div className="mt-4 flex gap-2">
                  {[
                    'oklch(0.68 0.16 250)',
                    'oklch(0.7 0.15 150)',
                    'oklch(0.68 0.16 320)',
                    'oklch(0.76 0.13 75)',
                    'oklch(0.7 0.02 260)',
                  ].map((accent) => (
                    <div
                      key={accent}
                      className="h-6 w-6 rounded-full border border-white/10"
                      style={{ backgroundColor: accent }}
                    />
                  ))}
                  <span className="ml-1 self-center text-xs text-white/35">
                    Your colors, your choice.
                  </span>
                </div>
              )}

              {style === 'messages' && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-xs text-white/55">
                    Sounds good!
                  </span>
                  <span className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-xs text-white/55">
                    👍 2
                  </span>
                </div>
              )}

              {style === 'assistant' && (
                <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5 text-sm text-white/35">
                  What do I have due this week?
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Footer() {
  const linkStyle = 'text-xs text-muted-foreground transition-colors hover:text-foreground';

  return (
    <footer className="border-border/80 bg-background/90 border-t py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="SchoolSoft+ Logo"
                width={20}
                height={20}
                className="h-5 w-5 object-contain"
              />
              <span className="text-foreground text-sm font-bold tracking-tight">SchoolSoft+</span>
            </div>
            <p className="text-muted-foreground mt-2.5 max-w-sm text-xs leading-relaxed">
              A modern, fast, and community-driven client for SchoolSoft. Built by Elias.
            </p>
            <p className="text-muted-foreground/60 mt-3 text-[11px]">
              Not affiliated with or endorsed by SchoolSoft AB.
            </p>
          </div>

          <div>
            <p className="text-foreground font-mono text-xs font-semibold uppercase">Product</p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/login" className={linkStyle}>
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/stats" className={linkStyle}>
                  Live Stats
                </Link>
              </li>
              <li>
                <Link href="/changelog" className={linkStyle}>
                  Changelog (v1.5)
                </Link>
              </li>
              <li>
                <Link href="/open-source" className={linkStyle}>
                  Open Source
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-foreground font-mono text-xs font-semibold uppercase">Developers</p>
            <ul className="mt-3 space-y-2">
              <li>
                <a
                  href={'https://developer.ssp.elias4044.com'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkStyle}
                >
                  Developer Portal
                </a>
              </li>
              <li>
                <a
                  href="https://www.npmjs.com/package/@elias4044/ssp-node"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkStyle}
                >
                  npm: schoolsoftplus
                </a>
              </li>
              <li>
                <a
                  href={'https://github.com/elias4044/schoolsoftplus'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkStyle}
                >
                  GitHub Repository
                </a>
              </li>
              <li>
                <a
                  href={`https://github.com/elias4044/schoolsoftplus/issues`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkStyle}
                >
                  Issue Tracker
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-foreground font-mono text-xs font-semibold uppercase">
              Legal &amp; Help
            </p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/terms" className={linkStyle}>
                  Terms &amp; Privacy
                </Link>
              </li>
              <li>
                <Link href="/login-help" className={linkStyle}>
                  Login Help
                </Link>
              </li>
              <li>
                <a
                  href="https://elias4044.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkStyle}
                >
                  Author (Elias)
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-border/80 text-muted-foreground mt-12 flex flex-col items-center justify-between gap-4 border-t pt-6 text-xs sm:flex-row">
          <p>© {new Date().getFullYear()} SchoolSoft+. MIT Licensed.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* --- Main component --- */
export default function LandingPage() {
  const Router = useRouter();

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ctx = gsap.context(() => {
      gsap.to('.lp-orb-1', {
        yPercent: -35,
        ease: 'none',
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });
      gsap.to('.lp-orb-2', {
        yPercent: -18,
        ease: 'none',
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });
      gsap.fromTo(
        '.lp-word',
        { opacity: 0, y: 42, rotateX: -30 },
        {
          opacity: 1,
          y: 0,
          rotateX: 0,
          stagger: 0.07,
          duration: 0.85,
          ease: 'power4.out',
          delay: 0.15,
        }
      );
    });
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        Router.push('/login');
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="overflow-hidden bg-[#080808] text-white">
      {/* -- Header -- */}
      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#080808]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-6">
          {/* Brand */}
          <Link href="/" className="mr-1 flex shrink-0 items-center gap-2">
            <Image
              src="/logo.png"
              alt="SchoolSoft+ Logo"
              className="h-6 w-6"
              width={24}
              height={24}
            />
            <span className="text-sm font-semibold text-white/90">SchoolSoft+</span>
          </Link>

          {/* Nav dropdowns */}
          <nav className="hidden flex-1 items-center gap-0.5 md:flex">
            <NavDropdown
              label="Products"
              items={[
                {
                  label: 'SchoolSoft+',
                  desc: 'The student dashboard app',
                  href: '/',
                  logo: '/logo.png',
                },
                {
                  label: 'SchoolSoft+ Developer',
                  desc: 'API docs, references & tools',
                  href: 'https://developer.ssp.elias4044.com',
                  logo: 'https://raw.githubusercontent.com/elias4044/ssp-developer/refs/heads/master/public/logo.png',
                  external: true,
                },
                {
                  label: 'SchoolSoft+ Node',
                  desc: 'npm package for the SchoolSoft API',
                  href: 'https://developer.ssp.elias4044.com/docs/ssp-node',
                  logo: 'https://raw.githubusercontent.com/elias4044/ssp-node/refs/heads/main/public/logo.png',
                  external: true,
                },
              ]}
            />
            <NavDropdown
              label="Resources"
              items={[
                {
                  label: 'Changelog',
                  desc: "What's new in SchoolSoft+",
                  href: '/changelog',
                  icon: Zap,
                  iconColor: 'oklch(0.72 0.18 148)',
                  badge: 'v1.5.0',
                },
                {
                  label: 'Stats',
                  desc: 'Live usage statistics',
                  href: '/stats',
                  icon: Activity,
                  iconColor: 'oklch(0.65 0.22 278)',
                },
                {
                  label: 'Open source',
                  desc: 'MIT licensed — read the code',
                  href: '/open-source',
                  icon: Code2,
                  iconColor: 'oklch(0.75 0.18 40)',
                },
                {
                  label: 'Login help',
                  desc: 'Trouble signing in?',
                  href: '/login-help',
                  icon: HelpCircle,
                  iconColor: 'oklch(0.70 0.18 320)',
                },
                {
                  label: 'Terms & Privacy',
                  desc: 'How we handle your data',
                  href: '/terms',
                  icon: FileText,
                  iconColor: 'oklch(0.60 0.12 260)',
                },
              ]}
            />
            <NavDropdown
              label="Developers"
              items={[
                {
                  label: 'Developer portal',
                  desc: 'API docs & integration guides',
                  href: 'https://developer.ssp.elias4044.com',
                  icon: Code2,
                  iconColor: 'oklch(0.65 0.22 278)',
                  external: true,
                },
                {
                  label: 'GitHub',
                  desc: 'Source code, issues & pull requests',
                  href: 'https://github.com/elias4044/schoolsoftplus',
                  icon: GitPullRequest,
                  iconColor: 'oklch(0.75 0.10 220)',
                  external: true,
                },
                {
                  label: 'npm — schoolsoftplus',
                  desc: 'Node.js package for the SchoolSoft API',
                  href: 'https://developer.ssp.elias4044.com/docs/ssp-node',
                  icon: Package,
                  iconColor: 'oklch(0.72 0.16 35)',
                  external: true,
                },
              ]}
            />
          </nav>

          {/* CTA */}
          <Link
            href="/login"
            className="bg-primary hover:bg-primary/70 inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-sm font-bold text-white transition-colors"
          >
            Sign in <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* -- Hero -- */}
      <section
        ref={heroRef}
        className="bg-background relative flex min-h-screen flex-col items-center justify-center overflow-hidden"
      >
        {/* ambient orbs */}
        <div
          className="lp-orb-1 pointer-events-none absolute -top-32 -right-32 h-175 w-175 rounded-full"
          style={{
            background: 'radial-gradient(circle, oklch(0.55 0.25 263 / 16%) 0%, transparent 70%)',
          }}
        />
        <div
          className="lp-orb-2 pointer-events-none absolute bottom-0 -left-40 h-125 w-125 rounded-full"
          style={{
            background: 'radial-gradient(circle, oklch(0.55 0.22 148 / 10%) 0%, transparent 70%)',
          }}
        />
        {/* dot grid */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(oklch(1 0 0 / 3%) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 mx-auto w-full max-w-5xl px-6"
        >
          <div>
            <div className="mb-5 perspective-midrange">
              <h1 className="leadqing-[0.95] text-5xl font-black tracking-tighter md:text-6xl">
                {'SchoolSoft, done right.'.split(/\s+/).map((word, i) => (
                  <span key={i} className="lp-word mr-[0.2em] inline-block opacity-0 last:mr-0">
                    {word}
                  </span>
                ))}
              </h1>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.75 }}
              className="mb-8 max-w-xl text-sm leading-relaxed text-white/40 md:text-base"
            >
              SchoolSoft+ pulls your schedule, assignments, lunch menu, and news from SchoolSoft
              into one clean interface — completely free, no ads, open source.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.95 }}
              className="flex flex-wrap items-center gap-3"
            >
              <Link href="/login">
                <Button className="cursor-pointer">
                  Sign in <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a
                href="https://github.com/elias4044/schoolsoftplus"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium text-white/50 transition-colors hover:border-white/20 hover:text-white"
              >
                <SiGithub className="h-3.5 w-3.5" /> GitHub
              </a>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* -- Stats strip -- */}
      <section className="bg-background relative overflow-hidden border-t border-white/5 px-6 py-16">
        <div className="relative z-10 mx-auto max-w-5xl">
          <Reveal className="mb-6">
            <p className="text-[10px] tracking-widest text-white/25">BY THE NUMBERS</p>
          </Reveal>
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                key: 'messages',
                label: 'Messages sent between students',
                Icon: MessageSquare,
                color: 'oklch(0.65 0.22 278)',
              },
              {
                key: 'logins',
                label: 'Times students have logged in',
                Icon: Users,
                color: 'oklch(0.72 0.18 148)',
              },
              {
                key: 'schedule',
                label: 'Schedule views loaded',
                Icon: CalendarDays,
                color: 'oklch(0.75 0.18 40)',
              },
            ].map((s, i) => (
              <Reveal key={s.key} delay={i * 0.07}>
                <div className="relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-white/8 bg-white/3 p-5">
                  <div
                    className="pointer-events-none absolute -top-6 -right-6 h-20 w-20 rounded-full blur-2xl"
                    style={{ background: `${s.color}18` }}
                  />
                  <s.Icon className="h-4 w-4" style={{ color: s.color }} />
                  <p
                    className="text-2xl font-black tracking-tight tabular-nums md:text-3xl"
                    style={{ color: s.color }}
                  >
                    <LiveCounter label={s.key} />
                  </p>
                  <p className="text-[11px] leading-snug text-white/30">{s.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.3}>
            <Link
              href="/stats"
              className="mt-4 inline-flex items-center gap-1 text-xs text-white/30 transition-colors hover:text-white"
            >
              See all stats <ChevronRight className="h-3 w-3" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* -- Messaging Showcase --
      <MessagingShowcase /> */}

      {/* -- Features -- */}
      <div className="bg-background border-t border-white/5">
        <div className="mx-auto max-w-5xl px-6 pt-16 pb-4">
          <Reveal>
            <p className="mb-2 text-[10px] tracking-widest text-white/30 uppercase">What it does</p>
            <h2 className="text-2xl font-black tracking-tight">Everything in one place.</h2>
          </Reveal>
        </div>
        <FeatureScroller />
      </div>

      {/* -- Dashboard -- */}
      <section className="bg-background relative overflow-hidden border-t border-white/5 px-6 py-20">
        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="grid items-start gap-12 md:grid-cols-2">
            <Reveal>
              <p className="mb-2 text-[10px] tracking-widest text-white/30 uppercase">Dashboard</p>
              <h2 className="mb-4 text-3xl font-black tracking-tight md:text-4xl">
                Build your own view.
              </h2>
              <div className="space-y-2.5">
                {[
                  'Schedule widget',
                  'Homework list',
                  'Lunch preview',
                  'News feed',
                  'Countdown timers',
                  'Notes pad',
                  'Weather',
                  'and even more...',
                ].map((w, i) => (
                  <Reveal key={w} delay={i * 0.04}>
                    <div className="flex items-center gap-2.5 text-sm text-white/60">
                      <div
                        className="h-1 w-1 rounded-full"
                        style={{ background: 'oklch(0.65 0.22 278)' }}
                      />
                      {w}
                    </div>
                  </Reveal>
                ))}
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="border-b-card bg-card space-y-2 rounded-2xl border p-4">
                {[
                  { icon: CalendarDays, label: 'Schedule', color: 'oklch(0.72 0.18 148)' },
                  { icon: BookOpen, label: 'Assignments', color: 'oklch(0.75 0.18 40)' },
                  { icon: UtensilsCrossed, label: 'Lunch', color: 'oklch(0.78 0.16 55)' },
                  { icon: Cloud, label: 'Weather', color: 'oklch(0.65 0.22 278)' },
                ].map(({ icon: Icon, label, color }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 px-4 py-3"
                  >
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-lg"
                      style={{ background: `${color}20`, color }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm font-medium text-white/80">{label}</span>
                    <div className="ml-auto flex gap-1">
                      <div className="h-1.5 w-12 rounded-full bg-white/10" />
                      <div className="h-1.5 w-8 rounded-full bg-white/5" />
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* -- Open source + Developer portal -- */}
      <section className="bg-background relative overflow-hidden border-t border-white/5 px-6 py-20">
        <div className="relative z-10 mx-auto max-w-5xl">
          <Reveal>
            <div className="border-b-card bg-card flex flex-col items-start justify-between gap-5 rounded-2xl border p-6 sm:flex-row sm:items-center">
              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <Code2 className="h-4 w-4" style={{ color: 'oklch(0.65 0.22 278)' }} />
                  <p className="text-sm font-bold text-white/90">Fully open source</p>
                </div>
                <p className="max-w-md text-xs leading-relaxed text-white/35">
                  All the code is on GitHub under the MIT licence. Read it, fork it, report a bug,
                  or submit a pull request. Developer documentation and API references live at{' '}
                  <a
                    href="https://developer.ssp.elias4044.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/60 underline underline-offset-2 transition-colors hover:text-white"
                  >
                    developer.ssp.elias4044.com
                  </a>
                  .
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Link
                  href="/open-source"
                  className="bg-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white"
                >
                  <GitPullRequest className="h-3.5 w-3.5" /> Contribute
                </Link>
                <a
                  href="https://developer.ssp.elias4044.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white/50 transition-colors hover:border-white/20 hover:text-white"
                >
                  <BookOpen className="h-3.5 w-3.5" /> Docs
                </a>
                <a
                  href="https://github.com/elias4044/schoolsoftplus"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white/50 transition-colors hover:border-white/20 hover:text-white"
                >
                  <Star className="h-3.5 w-3.5" /> Star
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
