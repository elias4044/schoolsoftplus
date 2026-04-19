"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView, useSpring, useMotionValue, animate } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Code2,
  Star,
  GitFork,
  GitBranch,
  Heart,
  Zap,
  BookOpen,
  GitPullRequest,
  Bug,
  Lightbulb,
  Scale,
  ExternalLink,
  Terminal,
  Package,
  Lock,
  Layers,
  Sparkles,
  Users,
  MessageSquare,
  ChevronRight,
} from "lucide-react";

/* ─── Reveal ───────────────────────────────────────────── */
function Reveal({
  children, delay = 0, className = "",
}: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-6% 0px" });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}>
      {children}
    </motion.div>
  );
}

/* ─── Animated counter ─────────────────────────────────── */
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration: 1.4,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return controls.stop;
  }, [inView, to]);

  return <span ref={ref}>{display.toLocaleString()}{suffix}</span>;
}

/* ─── Tech pill ────────────────────────────────────────── */
function TechPill({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors"
      style={{ background: `${color}12`, border: `1px solid ${color}28`, color }}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {label}
    </div>
  );
}

/* ─── Contribution card ────────────────────────────────── */
function ContribCard({
  icon: Icon, title, desc, href, color, cta, delay = 0,
}: {
  icon: React.ElementType; title: string; desc: string;
  href: string; color: string; cta: string; delay?: number;
}) {
  return (
    <Reveal delay={delay}>
      <a
        href={href} target="_blank" rel="noopener noreferrer"
        className="group block rounded-3xl p-6 h-full transition-all duration-300"
        style={{
          background: "oklch(0.13 0 0)",
          border: "1px solid oklch(1 0 0 / 7%)",
        }}
      >
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: `${color}18`, color }}
        >
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="font-bold text-foreground mb-1.5">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">{desc}</p>
        <div
          className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
          style={{ color }}
        >
          {cta}
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </a>
    </Reveal>
  );
}

/* ─── Step ─────────────────────────────────────────────── */
function Step({ n, title, code, children }: { n: number; title: string; code?: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: "oklch(0.62 0.16 263 / 18%)", color: "oklch(0.72 0.16 263)" }}
        >
          {n}
        </div>
        <div className="w-px flex-1" style={{ background: "oklch(1 0 0 / 8%)" }} />
      </div>
      <div className="pb-6">
        <p className="font-semibold text-foreground mb-1.5">{title}</p>
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">{children}</p>
        {code && (
          <div
            className="rounded-xl px-4 py-3 font-mono text-xs overflow-x-auto"
            style={{ background: "oklch(0.08 0 0)", border: "1px solid oklch(1 0 0 / 8%)", color: "oklch(0.75 0.14 263)" }}
          >
            {code}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────── */
export default function OpenSourcePage() {
  const [stars, setStars] = useState<number | null>(null);
  const [forks, setForks] = useState<number | null>(null);

  useEffect(() => {
    fetch("https://api.github.com/repos/elias4044/schoolsoftplus")
      .then(r => r.json())
      .then(d => {
        setStars(d.stargazers_count ?? 0);
        setForks(d.forks_count ?? 0);
      })
      .catch(() => {
        setStars(1);
        setForks(0);
      });
  }, []);

  const TECH = [
    { icon: Layers,   label: "Next.js 15",      color: "oklch(0.85 0 0)" },
    { icon: Code2,    label: "TypeScript",        color: "oklch(0.62 0.16 231)" },
    { icon: Zap,      label: "Tailwind CSS v4",   color: "oklch(0.72 0.16 200)" },
    { icon: Sparkles, label: "Framer Motion",     color: "oklch(0.75 0.18 310)" },
    { icon: Package,  label: "Firebase Admin",    color: "oklch(0.75 0.18 40)" },
    { icon: Lock,     label: "httpOnly Cookies",  color: "oklch(0.72 0.18 148)" },
    { icon: Lightbulb,label: "Google Gemini AI",  color: "oklch(0.78 0.16 55)" },
    { icon: Layers,   label: "shadcn/ui",         color: "oklch(0.65 0.22 278)" },
  ];

  return (
    <div className="relative min-h-screen bg-[oklch(0.10_0_0)] overflow-x-hidden">

      {/* Nav */}
      <div
        className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ background: "oklch(0.10 0 0 / 88%)", backdropFilter: "blur(16px)", borderBottom: "1px solid oklch(1 0 0 / 6%)" }}
      >
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Open Source</span>
        </div>
        <a
          href="https://github.com/elias4044/schoolsoftplus"
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
          style={{ background: "oklch(0.62 0.16 263 / 14%)", color: "oklch(0.72 0.16 263)", border: "1px solid oklch(0.62 0.16 263 / 24%)" }}
        >
          <Code2 className="w-3.5 h-3.5" />
          GitHub
        </a>
      </div>

      {/* ── Hero ── */}
      <section className="relative pt-28 pb-16 px-6 overflow-hidden">
        {/* Background grid */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="osgrid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#osgrid)" />
          </svg>
        </div>
        {/* Orbs */}
        <motion.div className="pointer-events-none absolute rounded-full blur-3xl"
          style={{ width: 520, height: 520, top: "-15%", left: "55%", background: "oklch(0.62 0.16 263 / 7%)" }}
          animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="pointer-events-none absolute rounded-full blur-3xl"
          style={{ width: 360, height: 360, top: "30%", left: "-10%", background: "oklch(0.75 0.18 310 / 5%)" }}
          animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }} />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium mb-6"
              style={{ background: "oklch(0.62 0.16 263 / 12%)", color: "oklch(0.75 0.14 263)", border: "1px solid oklch(0.62 0.16 263 / 22%)" }}
            >
              <Scale className="w-3 h-3" /> MIT Licensed · Open Source
            </div>

            <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-5">
              Built in the{" "}
              <span style={{ background: "linear-gradient(135deg, oklch(0.72 0.18 263), oklch(0.65 0.22 310))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                open.
              </span>
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-xl mx-auto mb-10">
              SchoolSoft+ is free, open source, and built by students — for students.
              Read the code, report a bug, suggest a feature, or submit a PR.
            </p>

            {/* GitHub stat chips */}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <a
                href="https://github.com/elias4044/schoolsoftplus"
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-2xl px-5 py-2.5 font-semibold text-sm transition-all duration-200 hover:scale-[1.03]"
                style={{ background: "oklch(0.18 0 0)", border: "1px solid oklch(1 0 0 / 12%)", color: "oklch(0.85 0 0)" }}
              >
                <Code2 className="w-4 h-4" />
                elias4044/schoolsoftplus
              </a>
              <div
                className="flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-semibold"
                style={{ background: "oklch(0.78 0.16 55 / 12%)", color: "oklch(0.78 0.16 55)", border: "1px solid oklch(0.78 0.16 55 / 22%)" }}
              >
                <Star className="w-3.5 h-3.5" />
                {stars !== null ? stars : "–"}
              </div>
              <div
                className="flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-semibold"
                style={{ background: "oklch(0.72 0.18 148 / 12%)", color: "oklch(0.72 0.18 148)", border: "1px solid oklch(0.72 0.18 148 / 22%)" }}
              >
                <GitFork className="w-3.5 h-3.5" />
                {forks !== null ? forks : "–"}
              </div>
              <div
                className="flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-semibold"
                style={{ background: "oklch(0.62 0.16 263 / 12%)", color: "oklch(0.72 0.16 263)", border: "1px solid oklch(0.62 0.16 263 / 22%)" }}
              >
                <Scale className="w-3.5 h-3.5" />
                MIT
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Tech stack ── */}
      <section className="px-6 max-w-4xl mx-auto mb-16">
        <Reveal className="mb-5">
          <h2 className="text-xl font-bold text-foreground">Tech stack</h2>
          <p className="text-sm text-muted-foreground mt-1">The remake is built with modern, typed, production-quality tooling.</p>
        </Reveal>
        <Reveal delay={0.05}>
          <div className="flex flex-wrap gap-2">
            {TECH.map(t => <TechPill key={t.label} {...t} />)}
          </div>
        </Reveal>
      </section>

      {/* ── Contribute cards ── */}
      <section className="px-6 max-w-4xl mx-auto mb-16">
        <Reveal className="mb-6">
          <h2 className="text-xl font-bold text-foreground">How to contribute</h2>
          <p className="text-sm text-muted-foreground mt-1">Every contribution counts — no matter how small.</p>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ContribCard
            icon={Bug} title="Report a bug"
            desc="Found something broken? Open an issue with steps to reproduce and we'll look into it."
            href="https://github.com/elias4044/schoolsoftplus/issues/new?template=bug_report.md"
            color="oklch(0.72 0.18 20)" cta="Open issue" delay={0}
          />
          <ContribCard
            icon={Lightbulb} title="Request a feature"
            desc="Have an idea that would make the app better? We'd love to hear it."
            href="https://github.com/elias4044/schoolsoftplus/issues/new?template=feature_request.md"
            color="oklch(0.78 0.16 55)" cta="Suggest feature" delay={0.05}
          />
          <ContribCard
            icon={GitPullRequest} title="Submit a PR"
            desc="Built something great? Fork the repo, make your changes, and open a pull request."
            href="https://github.com/elias4044/schoolsoftplus/pulls"
            color="oklch(0.72 0.18 148)" cta="Open PR" delay={0.1}
          />
          <ContribCard
            icon={BookOpen} title="Improve docs"
            desc="Spotted something missing or unclear in the README or comments? Docs PRs are always welcome."
            href="https://github.com/elias4044/schoolsoftplus"
            color="oklch(0.72 0.16 263)" cta="Edit docs" delay={0.15}
          />
          <ContribCard
            icon={Star} title="Star the repo"
            desc="The simplest way to show support and help others discover the project."
            href="https://github.com/elias4044/schoolsoftplus"
            color="oklch(0.78 0.16 55)" cta="Star on GitHub" delay={0.2}
          />
          <ContribCard
            icon={GitFork} title="Fork & adapt"
            desc="Use the code as a base for your own school's needs. MIT licensed — go wild."
            href="https://github.com/elias4044/schoolsoftplus/fork"
            color="oklch(0.75 0.18 310)" cta="Fork repo" delay={0.25}
          />
        </div>
      </section>

      {/* ── Getting started ── */}
      <section className="px-6 max-w-4xl mx-auto mb-16">
        <Reveal className="mb-6">
          <h2 className="text-xl font-bold text-foreground">Get it running locally</h2>
          <p className="text-sm text-muted-foreground mt-1">From zero to running dev server in under two minutes.</p>
        </Reveal>
        <Reveal delay={0.04}>
          <div
            className="rounded-3xl p-7 md:p-8"
            style={{ background: "oklch(0.13 0 0)", border: "1px solid oklch(1 0 0 / 7%)" }}
          >
            <Step n={1} title="Clone the repository"
              code="git clone https://github.com/elias4044/schoolsoftplus.git && cd schoolsoftplus"
            >
              Grab the source code from GitHub.
            </Step>
            <Step n={2} title="Install dependencies" code="npm install">
              Uses npm. Node.js 20+ recommended.
            </Step>
            <Step n={3} title="Configure environment variables" code="cp .env.example .env.local">
              Fill in your Firebase credentials and other secrets as described in <code className="text-xs px-1 py-0.5 rounded" style={{ background: "oklch(1 0 0 / 8%)" }}>.env.example</code>.
            </Step>
            <Step n={4} title="Start the dev server" code="npm run dev">
              The app will be available at <code className="text-xs px-1 py-0.5 rounded" style={{ background: "oklch(1 0 0 / 8%)" }}>http://localhost:3000</code>.
            </Step>
            <Step n={5} title="You're in!" >
              Log in with your SchoolSoft credentials. Hot-reload is enabled — edit a file and see changes instantly.
            </Step>
          </div>
        </Reveal>
      </section>

      {/* ── License ── */}
      <section className="px-6 max-w-4xl mx-auto mb-16">
        <Reveal>
          <div
            className="rounded-3xl p-7 md:p-8 flex flex-col sm:flex-row items-start gap-5"
            style={{ background: "oklch(0.13 0 0)", border: "1px solid oklch(1 0 0 / 7%)" }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "oklch(0.62 0.16 263 / 16%)", color: "oklch(0.72 0.16 263)" }}
            >
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-lg mb-2">MIT License</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                SchoolSoft+ is released under the <strong className="text-foreground">MIT License</strong> — one of the most permissive open-source licenses.
                You&apos;re free to use, copy, modify, merge, publish, distribute, sublicense, and even sell copies,
                as long as the original copyright notice is included.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                This project is <strong className="text-foreground">not affiliated with SchoolSoft AB</strong>. The name "SchoolSoft" belongs to SchoolSoft AB.
                This app is an independent wrapper that uses SchoolSoft's public login flow.
              </p>
              <a
                href="https://github.com/elias4044/schoolsoftplus/blob/main/LICENSE"
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
                style={{ color: "oklch(0.72 0.16 263)" }}
              >
                Read the full license <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Code of conduct highlight ── */}
      <section className="px-6 max-w-4xl mx-auto mb-20">
        <Reveal>
          <div
            className="rounded-3xl p-7 md:p-8 flex flex-col sm:flex-row items-start gap-5"
            style={{ background: "oklch(0.13 0 0)", border: "1px solid oklch(1 0 0 / 7%)" }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "oklch(0.72 0.18 148 / 16%)", color: "oklch(0.72 0.18 148)" }}
            >
              <Heart className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-foreground text-lg mb-2">Community &amp; Code of Conduct</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                We follow the <strong className="text-foreground">Contributor Covenant</strong> code of conduct.
                Be respectful, constructive, and kind. This is a project built by a student, for students — a welcoming and helpful environment is everything.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://github.com/elias4044/schoolsoftplus/blob/main/CODE_OF_CONDUCT.md"
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
                  style={{ color: "oklch(0.72 0.18 148)" }}
                >
                  Code of Conduct <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <span className="text-muted-foreground opacity-40 text-sm">·</span>
                <a
                  href="https://github.com/elias4044/schoolsoftplus/blob/main/CONTRIBUTING.md"
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
                  style={{ color: "oklch(0.72 0.18 148)" }}
                >
                  Contributing Guide <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 max-w-2xl mx-auto mb-24 text-center">
        <Reveal>
          <div
            className="rounded-3xl px-8 py-12 relative overflow-hidden"
            style={{ background: "oklch(0.13 0 0)", border: "1px solid oklch(0.62 0.16 263 / 20%)" }}
          >
            <motion.div className="pointer-events-none absolute rounded-full blur-3xl"
              style={{ width: 400, height: 400, top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "oklch(0.62 0.16 263 / 8%)" }}
              animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
            <div className="relative z-10">
              <Code2 className="w-10 h-10 mx-auto mb-4" style={{ color: "oklch(0.72 0.16 263)" }} />
              <h2 className="text-2xl font-black mb-3">Ready to contribute?</h2>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                Every star, issue, and pull request makes SchoolSoft+ better for every student who uses it.
              </p>
              <a
                href="https://github.com/elias4044/schoolsoftplus"
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl px-6 py-3 font-bold text-sm transition-all duration-200 hover:scale-[1.03] hover:brightness-110"
                style={{ background: "oklch(0.62 0.16 263)", color: "white" }}
              >
                <Code2 className="w-4 h-4" />
                View on GitHub
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer
        className="relative z-10 border-t px-6 py-8 text-center"
        style={{ borderColor: "oklch(1 0 0 / 6%)" }}
      >
        <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <span className="opacity-30">·</span>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms &amp; Privacy</Link>
          <span className="opacity-30">·</span>
          <Link href="/stats" className="hover:text-foreground transition-colors">Stats</Link>
          <span className="opacity-30">·</span>
          <Link href="/login-help" className="hover:text-foreground transition-colors">Login help</Link>
          <span className="opacity-30">·</span>
          <a
            href="https://github.com/elias4044/schoolsoftplus"
            target="_blank" rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </div>
        <p className="text-xs text-muted-foreground opacity-40 mt-2">
          Not affiliated with SchoolSoft AB. MIT Licensed.
        </p>
      </footer>
    </div>
  );
}
