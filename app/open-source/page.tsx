"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
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

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

/* ─── Reveal ───────────────────────────────────────────── */
function Reveal({
  children, delay = 0, className = "",
}: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-4% 0px" });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
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
          style={{ borderColor: "oklch(0.65 0.22 278 / 40%)", color: "oklch(0.75 0.22 278)", background: "oklch(0.65 0.22 278 / 10%)" }}
        >
          {n}
        </div>
        <div className="w-px flex-1" style={{ background: "rgba(255,255,255,0.07)", minHeight: 16 }} />
      </div>
      <div className="pb-6">
        <p className="text-sm font-medium text-white/80 mb-1">{title}</p>
        <p className="text-xs text-white/40 leading-relaxed mb-2">{children}</p>
        {code && (
          <div className="rounded-lg px-3.5 py-2.5 font-mono text-xs overflow-x-auto border border-white/8 bg-white/4 text-white/50">
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
  {
    icon: BookOpen, title: "Developer docs",
    desc: "SchoolSoft+ Developer has documentation for the SchoolSoft and SchoolSoft+ APIs, plus integration guides.",
    href: "https://developer.ssp.elias4044.com",
    cta: "Open developer portal", color: "oklch(0.72 0.16 263)",
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

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(".os-orb-1", {
        yPercent: -28, ease: "none",
        scrollTrigger: { trigger: "body", start: "top top", end: "bottom bottom", scrub: 1.4 },
      });
      gsap.to(".os-orb-2", {
        yPercent: 22, ease: "none",
        scrollTrigger: { trigger: "body", start: "top top", end: "bottom bottom", scrub: 2 },
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: "#080808" }}>

      {/* Fixed ambient orbs */}
      <div className="os-orb-1 fixed top-[-180px] left-[-120px] w-[520px] h-[520px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, oklch(0.65 0.22 278 / 12%) 0%, transparent 70%)" }} />
      <div className="os-orb-2 fixed bottom-[-200px] right-[-100px] w-[480px] h-[480px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, oklch(0.55 0.25 295 / 8%) 0%, transparent 70%)" }} />

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b" style={{ background: "rgba(8,8,8,0.88)", backdropFilter: "blur(18px)", borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm transition-colors" style={{ color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.9)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <span className="text-sm font-medium text-white/70">Open source</span>
          <a
            href="https://github.com/elias4044/schoolsoftplus"
            target="_blank" rel="noopener noreferrer"
            className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors"
            style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"; }}
          >
            GitHub →
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6">

        {/* Hero */}
        <div className="py-14 border-b relative overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          {/* dot grid */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
          {/* ambient accent */}
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, oklch(0.65 0.22 278 / 10%) 0%, transparent 70%)" }} />
          <motion.div className="relative" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "oklch(0.65 0.22 278)" }}>MIT Licensed</p>
            <h1 className="text-3xl font-semibold tracking-tight mb-3 text-white">SchoolSoft+ is open source.</h1>
            <p className="text-sm leading-relaxed max-w-lg mb-7" style={{ color: "rgba(255,255,255,0.45)" }}>
              The full source code is on GitHub. Read it, run it locally, report bugs, suggest features, or submit pull requests.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href="https://developer.ssp.elias4044.com"
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-colors"
                style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.22)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"; }}
              >
                <BookOpen className="w-3.5 h-3.5" /> Developer docs
              </a>
              <a
                href="https://github.com/elias4044/schoolsoftplus"
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-colors"
                style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.22)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"; }}
              >
                <Code2 className="w-3.5 h-3.5" /> elias4044/schoolsoftplus
              </a>
              {stars !== null && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border"
                  style={{ borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }}>
                  <Star className="w-3 h-3" /> {stars} stars
                </div>
              )}
              {forks !== null && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border"
                  style={{ borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }}>
                  <GitFork className="w-3 h-3" /> {forks} forks
                </div>
              )}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border"
                style={{ borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }}>
                <Scale className="w-3 h-3" /> MIT
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tech stack */}
        <section className="py-10 border-b relative overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 60% 50% at 80% 50%, oklch(0.55 0.25 295 / 6%) 0%, transparent 70%)" }} />
          <Reveal className="mb-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>Tech stack</h2>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>Built with modern, typed tooling.</p>
          </Reveal>
          <Reveal delay={0.05}>
            <div className="flex flex-wrap gap-2">
              {TECH.map(t => (
                <div
                  key={t.label}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                  style={{ borderColor: `${t.color}28`, color: t.color, background: `${t.color}0c` }}
                >
                  {t.label}
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* Contribute */}
        <section className="py-10 border-b relative overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 50% 60% at 10% 40%, oklch(0.65 0.22 278 / 5%) 0%, transparent 70%)" }} />
          <Reveal className="mb-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>How to contribute</h2>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>Every contribution helps — no matter how small.</p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CONTRIB.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.04}>
                <a
                  href={item.href} target="_blank" rel="noopener noreferrer"
                  className="group block rounded-2xl border p-5 h-full transition-colors"
                  style={{ background: "#0d0d0d", borderColor: "rgba(255,255,255,0.08)" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.16)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center mb-3"
                    style={{ background: `${item.color}18`, color: item.color }}
                  >
                    <item.icon className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1.5">{item.title}</h3>
                  <p className="text-xs leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>{item.desc}</p>
                  <span className="text-xs font-medium" style={{ color: item.color }}>{item.cta} →</span>
                </a>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Run locally */}
        <section className="py-10 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <Reveal className="mb-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>Run it locally</h2>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>From zero to running dev server in a couple of minutes.</p>
          </Reveal>
          <Reveal delay={0.04}>
            <div className="rounded-2xl border p-6" style={{ background: "#0d0d0d", borderColor: "rgba(255,255,255,0.08)" }}>
              <Step n={1} title="Clone the repository" code="git clone https://github.com/elias4044/schoolsoftplus.git && cd schoolsoftplus">
                Grab the source code from GitHub.
              </Step>
              <Step n={2} title="Install dependencies" code="npm install">
                Uses npm. Node.js 20+ recommended.
              </Step>
              <Step n={3} title="Set up environment variables" code="cp .env.example .env.local">
                Fill in your Firebase credentials and other secrets as described in{" "}
                <code className="font-mono text-[11px] px-1 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.55)" }}>.env.example</code>.
              </Step>
              <Step n={4} title="Start the dev server" code="npm run dev">
                The app will be available at{" "}
                <code className="font-mono text-[11px] px-1 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.55)" }}>http://localhost:3000</code>.
              </Step>
              <Step n={5} title="You're in">
                Log in with your SchoolSoft credentials. Hot-reload is enabled.
              </Step>
            </div>
          </Reveal>
        </section>

        {/* Developer portal */}
        <section className="py-10 border-b relative overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 55% 70% at 100% 50%, oklch(0.65 0.22 278 / 7%) 0%, transparent 70%)" }} />
          <Reveal>
            <div className="rounded-2xl border p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
              style={{ background: "#0d0d0d", borderColor: "rgba(255,255,255,0.08)" }}>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ background: "oklch(0.65 0.22 278 / 15%)", color: "oklch(0.75 0.22 278)" }}>
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <p className="font-semibold text-sm text-white">SchoolSoft+ Developer</p>
                </div>
                <p className="text-xs leading-relaxed max-w-md" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Documentation for the SchoolSoft and SchoolSoft+ APIs, integration guides, and reference material.
                  Source code for the developer portal is available at{" "}
                  <a
                    href="https://github.com/elias4044/ssp-developer"
                    target="_blank" rel="noopener noreferrer"
                    className="underline underline-offset-2 transition-colors"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
                  >
                    elias4044/ssp-developer
                  </a>{" "}on GitHub.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <a
                  href="https://developer.ssp.elias4044.com"
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 278), oklch(0.55 0.25 295))" }}
                >
                  <BookOpen className="w-3.5 h-3.5" /> Open docs
                </a>
                <a
                  href="https://github.com/elias4044/ssp-developer"
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-colors"
                  style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"; }}
                >
                  <Code2 className="w-3.5 h-3.5" /> GitHub
                </a>
              </div>
            </div>
          </Reveal>
        </section>

        {/* License + CoC */}
        <section className="py-10 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Reveal>
              <div className="rounded-2xl border p-5 h-full" style={{ background: "#0d0d0d", borderColor: "rgba(255,255,255,0.08)" }}>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: "oklch(0.65 0.22 278 / 12%)", color: "oklch(0.75 0.22 278)" }}
                >
                  <Scale className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">MIT License</h3>
                <p className="text-xs leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Free to use, copy, modify, and distribute — even commercially — as long as the original copyright notice is included.
                  This project is not affiliated with SchoolSoft AB.
                </p>
                <a
                  href="https://github.com/elias4044/schoolsoftplus/blob/main/LICENSE"
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs transition-colors"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
                >
                  Read full license <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </Reveal>
            <Reveal delay={0.06}>
              <div className="rounded-2xl border p-5 h-full" style={{ background: "#0d0d0d", borderColor: "rgba(255,255,255,0.08)" }}>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: "oklch(0.72 0.18 148 / 12%)", color: "oklch(0.72 0.18 148)" }}
                >
                  <Heart className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">Code of Conduct</h3>
                <p className="text-xs leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>
                  We follow the Contributor Covenant. Be respectful, constructive, and kind.
                  This is a student project — a welcoming environment matters.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <a
                    href="https://github.com/elias4044/schoolsoftplus/blob/main/CODE_OF_CONDUCT.md"
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs transition-colors"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
                  >
                    Code of Conduct <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
                  <a
                    href="https://github.com/elias4044/schoolsoftplus/blob/main/CONTRIBUTING.md"
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs transition-colors"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
                  >
                    Contributing guide <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 60% 80% at 50% 100%, oklch(0.65 0.22 278 / 10%) 0%, transparent 70%)" }} />
          <Reveal>
            <h2 className="text-xl font-semibold text-white mb-2">Ready to contribute?</h2>
            <p className="text-sm leading-relaxed mb-8 max-w-xs mx-auto" style={{ color: "rgba(255,255,255,0.4)" }}>
              Every star, issue, and pull request makes SchoolSoft+ better for every student who uses it.
            </p>
            <a
              href="https://github.com/elias4044/schoolsoftplus"
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 278), oklch(0.55 0.25 295))" }}
            >
              <Code2 className="w-4 h-4" /> View on GitHub
            </a>
          </Reveal>
        </section>

      </main>

      <footer className="border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="max-w-4xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 flex-wrap">
          <Link href="/" className="text-sm font-semibold text-white">SchoolSoft+</Link>
          <div className="flex items-center flex-wrap justify-center gap-x-4 gap-y-1 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
            <Link href="/" className="hover:text-white/80 transition-colors">Home</Link>
            <Link href="/terms" className="hover:text-white/80 transition-colors">Terms &amp; Privacy</Link>
            <Link href="/stats" className="hover:text-white/80 transition-colors">Stats</Link>
            <Link href="/login-help" className="hover:text-white/80 transition-colors">Login help</Link>
            <a href="https://developer.ssp.elias4044.com" target="_blank" rel="noopener noreferrer" className="hover:text-white/80 transition-colors">Developers</a>
            <a href="https://github.com/elias4044/schoolsoftplus" target="_blank" rel="noopener noreferrer" className="hover:text-white/80 transition-colors">GitHub</a>
          </div>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>Not affiliated with SchoolSoft AB. MIT Licensed.</p>
        </div>
      </footer>
    </div>
  );
}

