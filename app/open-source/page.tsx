'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowLeft,
  BookOpen,
  Bug,
  Code2,
  ExternalLink,
  GitFork,
  GitPullRequest,
  Heart,
  Lightbulb,
  Scale,
  Star,
} from 'lucide-react';

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

/*  Reveal  */
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
      initial={{ opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/*  Step  */
function Step({
  n,
  title,
  code,
  children,
}: {
  n: number;
  title: string;
  code?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold"
          style={{
            borderColor: 'oklch(0.65 0.22 278 / 40%)',
            color: 'oklch(0.75 0.22 278)',
            background: 'oklch(0.65 0.22 278 / 10%)',
          }}
        >
          {n}
        </div>
        <div
          className="w-px flex-1"
          style={{ background: 'rgba(255,255,255,0.07)', minHeight: 16 }}
        />
      </div>
      <div className="pb-6">
        <p className="mb-1 text-sm font-medium text-white/80">{title}</p>
        <p className="mb-2 text-xs leading-relaxed text-white/40">{children}</p>
        {code && (
          <div className="overflow-x-auto rounded-lg border border-white/8 bg-white/4 px-3.5 py-2.5 font-mono text-xs text-white/50">
            {code}
          </div>
        )}
      </div>
    </div>
  );
}

const TECH = [
  { label: 'Next.js 15', color: 'oklch(0.85 0 0)' },
  { label: 'TypeScript', color: 'oklch(0.62 0.16 231)' },
  { label: 'Tailwind CSS v4', color: 'oklch(0.72 0.16 200)' },
  { label: 'Framer Motion', color: 'oklch(0.75 0.18 310)' },
  { label: 'Firebase Admin', color: 'oklch(0.75 0.18 40)' },
  { label: 'Google Gemini AI', color: 'oklch(0.78 0.16 55)' },
  { label: 'shadcn/ui', color: 'oklch(0.65 0.22 278)' },
];

const CONTRIB = [
  {
    icon: Bug,
    title: 'Report a bug',
    desc: 'Found something broken? Open an issue with steps to reproduce.',
    href: 'https://github.com/elias4044/schoolsoftplus/issues/new?template=bug_report.md',
    cta: 'Open issue',
    color: 'oklch(0.72 0.18 20)',
  },
  {
    icon: Lightbulb,
    title: 'Suggest a feature',
    desc: "Have an idea? Open a feature request and explain what you'd like to see.",
    href: 'https://github.com/elias4044/schoolsoftplus/issues/new?template=feature_request.md',
    cta: 'Request feature',
    color: 'oklch(0.78 0.16 55)',
  },
  {
    icon: GitPullRequest,
    title: 'Submit a pull request',
    desc: 'Fork, make your changes, and open a PR. Follow the CONTRIBUTING guide.',
    href: 'https://github.com/elias4044/schoolsoftplus/pulls',
    cta: 'Open PR',
    color: 'oklch(0.72 0.18 148)',
  },
  {
    icon: BookOpen,
    title: 'Improve the docs',
    desc: 'Spotted something missing or unclear in the README or inline comments?',
    href: 'https://github.com/elias4044/schoolsoftplus',
    cta: 'Edit docs',
    color: 'oklch(0.72 0.16 263)',
  },
  {
    icon: Star,
    title: 'Star the repo',
    desc: 'The quickest way to show support and help others discover the project.',
    href: 'https://github.com/elias4044/schoolsoftplus',
    cta: 'Star on GitHub',
    color: 'oklch(0.78 0.16 55)',
  },
  {
    icon: GitFork,
    title: 'Fork and adapt',
    desc: 'Need something different for your school? Fork it. MIT licensed — no restrictions.',
    href: 'https://github.com/elias4044/schoolsoftplus/fork',
    cta: 'Fork repo',
    color: 'oklch(0.75 0.18 310)',
  },
  {
    icon: BookOpen,
    title: 'Developer docs',
    desc: 'SchoolSoft+ Developer has documentation for the SchoolSoft and SchoolSoft+ APIs, plus integration guides.',
    href: 'https://developer.ssp.elias4044.com',
    cta: 'Open developer portal',
    color: 'oklch(0.72 0.16 263)',
  },
];

/*  Page  */
export default function OpenSourcePage() {
  const [stars, setStars] = useState<number | null>(null);
  const [forks, setForks] = useState<number | null>(null);

  useEffect(() => {
    fetch('https://api.github.com/repos/elias4044/schoolsoftplus')
      .then((r) => r.json())
      .then((d) => {
        setStars(d.stargazers_count ?? 0);
        setForks(d.forks_count ?? 0);
      })
      .catch(() => {
        setStars(0);
        setForks(0);
      });
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to('.os-orb-1', {
        yPercent: -28,
        ease: 'none',
        scrollTrigger: { trigger: 'body', start: 'top top', end: 'bottom bottom', scrub: 1.4 },
      });
      gsap.to('.os-orb-2', {
        yPercent: 22,
        ease: 'none',
        scrollTrigger: { trigger: 'body', start: 'top top', end: 'bottom bottom', scrub: 2 },
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden text-white" style={{ background: '#080808' }}>
      {/* Nav */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: 'rgba(8,8,8,0.88)',
          backdropFilter: 'blur(18px)',
          borderColor: 'rgba(255,255,255,0.07)',
        }}
      >
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.9)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <span className="text-sm font-medium text-white/70">Open source</span>
          <a
            href="https://github.com/elias4044/schoolsoftplus"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
            style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
            }}
          >
            GitHub →
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6">
        {/* Hero */}
        <div
          className="relative overflow-hidden border-b py-14"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          {/* dot grid */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <p
              className="mb-4 text-xs font-semibold tracking-widest uppercase"
              style={{ color: 'oklch(0.65 0.22 278)' }}
            >
              MIT Licensed
            </p>
            <h1 className="mb-3 text-3xl font-semibold tracking-tight text-white">
              SchoolSoft+ is open source.
            </h1>
            <p
              className="mb-7 max-w-lg text-sm leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.45)' }}
            >
              The full source code is on GitHub. Read it, run it locally, report bugs, suggest
              features, or submit pull requests.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="https://developer.ssp.elias4044.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-colors"
                style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = '#fff';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.22)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
                }}
              >
                <BookOpen className="h-3.5 w-3.5" /> Developer docs
              </a>
              <a
                href="https://github.com/elias4044/schoolsoftplus"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-colors"
                style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = '#fff';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.22)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
                }}
              >
                <Code2 className="h-3.5 w-3.5" /> elias4044/schoolsoftplus
              </a>
              {stars !== null && (
                <div
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs"
                  style={{ borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)' }}
                >
                  <Star className="h-3 w-3" /> {stars} stars
                </div>
              )}
              {forks !== null && (
                <div
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs"
                  style={{ borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)' }}
                >
                  <GitFork className="h-3 w-3" /> {forks} forks
                </div>
              )}
              <div
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs"
                style={{ borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)' }}
              >
                <Scale className="h-3 w-3" /> MIT
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tech stack */}
        <section
          className="relative overflow-hidden border-b py-10"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <Reveal className="mb-5">
            <h2
              className="mb-1 text-[11px] font-semibold tracking-widest uppercase"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              Tech stack
            </h2>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Built with modern, typed tooling.
            </p>
          </Reveal>
          <Reveal delay={0.05}>
            <div className="flex flex-wrap gap-2">
              {TECH.map((t) => (
                <div
                  key={t.label}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium"
                  style={{
                    borderColor: `${t.color}28`,
                    color: t.color,
                    background: `${t.color}0c`,
                  }}
                >
                  {t.label}
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* Contribute */}
        <section
          className="relative overflow-hidden border-b py-10"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <Reveal className="mb-6">
            <h2
              className="mb-1 text-[11px] font-semibold tracking-widest uppercase"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              How to contribute
            </h2>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Every contribution helps — no matter how small.
            </p>
          </Reveal>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CONTRIB.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.04}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block h-full rounded-2xl border p-5 transition-colors"
                  style={{ background: '#0d0d0d', borderColor: 'rgba(255,255,255,0.08)' }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')
                  }
                >
                  <div
                    className="mb-3 flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ background: `${item.color}18`, color: item.color }}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="mb-1.5 text-sm font-semibold text-white">{item.title}</h3>
                  <p
                    className="mb-3 text-xs leading-relaxed"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                  >
                    {item.desc}
                  </p>
                  <span className="text-xs font-medium" style={{ color: item.color }}>
                    {item.cta} →
                  </span>
                </a>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Run locally */}
        <section className="border-b py-10" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <Reveal className="mb-6">
            <h2
              className="mb-1 text-[11px] font-semibold tracking-widest uppercase"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              Run it locally
            </h2>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
              From zero to running dev server in a couple of minutes.
            </p>
          </Reveal>
          <Reveal delay={0.04}>
            <div
              className="rounded-2xl border p-6"
              style={{ background: '#0d0d0d', borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <Step
                n={1}
                title="Clone the repository"
                code="git clone https://github.com/elias4044/schoolsoftplus.git && cd schoolsoftplus"
              >
                Grab the source code from GitHub.
              </Step>
              <Step n={2} title="Install dependencies" code="npm install">
                Uses npm. Node.js 20+ recommended.
              </Step>
              <Step n={3} title="Set up environment variables" code="cp .env.example .env.local">
                Fill in your Firebase credentials and other secrets as described in{' '}
                <code
                  className="rounded px-1 py-0.5 font-mono text-[11px]"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)' }}
                >
                  .env.example
                </code>
                .
              </Step>
              <Step n={4} title="Start the dev server" code="npm run dev">
                The app will be available at{' '}
                <code
                  className="rounded px-1 py-0.5 font-mono text-[11px]"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)' }}
                >
                  http://localhost:3000
                </code>
                .
              </Step>
              <Step n={5} title="You're in">
                Log in with your SchoolSoft credentials. Hot-reload is enabled.
              </Step>
            </div>
          </Reveal>
        </section>

        {/* Developer portal */}
        <section
          className="relative overflow-hidden border-b py-10"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <Reveal>
            <div
              className="flex flex-col items-start justify-between gap-5 rounded-2xl border p-6 sm:flex-row sm:items-center"
              style={{ background: '#0d0d0d', borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-md"
                    style={{
                      background: 'oklch(0.65 0.22 278 / 15%)',
                      color: 'oklch(0.75 0.22 278)',
                    }}
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-sm font-semibold text-white">SchoolSoft+ Developer</p>
                </div>
                <p
                  className="max-w-md text-xs leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  Documentation for the SchoolSoft and SchoolSoft+ APIs, integration guides, and
                  reference material. Source code for the developer portal is available at{' '}
                  <a
                    href="https://github.com/elias4044/ssp-developer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 transition-colors"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
                  >
                    elias4044/ssp-developer
                  </a>{' '}
                  on GitHub.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <a
                  href="https://developer.ssp.elias4044.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white"
                >
                  <BookOpen className="h-3.5 w-3.5" /> Open docs
                </a>
                <a
                  href="https://github.com/elias4044/ssp-developer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium transition-colors"
                  style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = '#fff';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
                  }}
                >
                  <Code2 className="h-3.5 w-3.5" /> GitHub
                </a>
              </div>
            </div>
          </Reveal>
        </section>

        {/* License + CoC */}
        <section className="border-b py-10" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Reveal>
              <div
                className="h-full rounded-2xl border p-5"
                style={{ background: '#0d0d0d', borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <div
                  className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{
                    background: 'oklch(0.65 0.22 278 / 12%)',
                    color: 'oklch(0.75 0.22 278)',
                  }}
                >
                  <Scale className="h-4 w-4" />
                </div>
                <h3 className="mb-2 text-sm font-semibold text-white">MIT License</h3>
                <p
                  className="mb-3 text-xs leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  Free to use, copy, modify, and distribute — even commercially — as long as the
                  original copyright notice is included. This project is not affiliated with
                  SchoolSoft AB.
                </p>
                <a
                  href="https://github.com/elias4044/schoolsoftplus/blob/main/LICENSE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs transition-colors"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
                >
                  Read full license <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </Reveal>
            <Reveal delay={0.06}>
              <div
                className="h-full rounded-2xl border p-5"
                style={{ background: '#0d0d0d', borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <div
                  className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{
                    background: 'oklch(0.72 0.18 148 / 12%)',
                    color: 'oklch(0.72 0.18 148)',
                  }}
                >
                  <Heart className="h-4 w-4" />
                </div>
                <h3 className="mb-2 text-sm font-semibold text-white">Code of Conduct</h3>
                <p
                  className="mb-3 text-xs leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  We follow the Contributor Covenant. Be respectful, constructive, and kind. This is
                  a student project — a welcoming environment matters.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="https://github.com/elias4044/schoolsoftplus/blob/main/CODE_OF_CONDUCT.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs transition-colors"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
                  >
                    Code of Conduct <ExternalLink className="h-3 w-3" />
                  </a>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>
                    ·
                  </span>
                  <a
                    href="https://github.com/elias4044/schoolsoftplus/blob/main/CONTRIBUTING.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs transition-colors"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
                  >
                    Contributing guide <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden py-16 text-center">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 60% 80% at 50% 100%, oklch(0.65 0.22 278 / 10%) 0%, transparent 70%)',
            }}
          />
          <Reveal>
            <h2 className="mb-2 text-xl font-semibold text-white">Ready to contribute?</h2>
            <p
              className="mx-auto mb-8 max-w-xs text-sm leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              Every star, issue, and pull request makes SchoolSoft+ better for every student who
              uses it.
            </p>
            <a
              href="https://github.com/elias4044/schoolsoftplus"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white"
            >
              <Code2 className="h-4 w-4" /> View on GitHub
            </a>
          </Reveal>
        </section>
      </main>

      <footer className="border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="mx-auto flex max-w-4xl flex-col flex-wrap items-center justify-between gap-4 px-6 py-6 sm:flex-row">
          <Link href="/" className="text-sm font-semibold text-white">
            SchoolSoft+
          </Link>
          <div
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            <Link href="/" className="transition-colors hover:text-white/80">
              Home
            </Link>
            <Link href="/terms" className="transition-colors hover:text-white/80">
              Terms &amp; Privacy
            </Link>
            <Link href="/stats" className="transition-colors hover:text-white/80">
              Stats
            </Link>
            <Link href="/login-help" className="transition-colors hover:text-white/80">
              Login help
            </Link>
            <a
              href="https://developer.ssp.elias4044.com"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-white/80"
            >
              Developers
            </a>
            <a
              href="https://github.com/elias4044/schoolsoftplus"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-white/80"
            >
              GitHub
            </a>
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Not affiliated with SchoolSoft AB. MIT Licensed.
          </p>
        </div>
      </footer>
    </div>
  );
}
