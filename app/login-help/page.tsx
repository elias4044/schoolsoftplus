"use client";

import { useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  HelpCircle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ExternalLink,
  User,
  School,
  KeyRound,
  Mail,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Wifi,
} from "lucide-react";

/* ─── Reveal ───────────────────────────────────────────── */
function Reveal({
  children,
  delay = 0,
  className = "",
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-6% 0px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

/* ─── Accordion ────────────────────────────────────────── */
function Accordion({
  question,
  children,
}: {
  question: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-2xl overflow-hidden transition-colors"
      style={{
        background: open ? "oklch(0.14 0 0)" : "oklch(0.12 0 0)",
        border: "1px solid oklch(1 0 0 / 7%)",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left flex items-center justify-between gap-3 px-5 py-4 text-sm font-medium transition-colors"
        style={{ color: open ? "oklch(0.95 0 0)" : "oklch(0.75 0 0)" }}
      >
        <span>{question}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 shrink-0 opacity-50" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div
              className="px-5 pb-5 pt-4 text-sm leading-relaxed space-y-2"
              style={{ borderTop: "1px solid oklch(1 0 0 / 6%)", color: "oklch(0.6 0 0)" }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Step ─────────────────────────────────────────────── */
function Step({
  n,
  title,
  children,
  color = "oklch(0.62 0.16 263)",
  last = false,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
  color?: string;
  last?: boolean;
}) {
  return (
    <Reveal>
      <div className="flex gap-5">
        <div className="flex flex-col items-center shrink-0">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0"
            style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
          >
            {n}
          </div>
          {!last && (
            <div className="w-px flex-1 mt-2" style={{ background: "oklch(1 0 0 / 7%)", minHeight: 28 }} />
          )}
        </div>
        <div className="pb-8 min-w-0">
          <p className="text-sm font-semibold mb-2" style={{ color: "oklch(0.9 0 0)" }}>{title}</p>
          <div className="text-sm leading-relaxed space-y-3" style={{ color: "oklch(0.6 0 0)" }}>
            {children}
          </div>
        </div>
      </div>
    </Reveal>
  );
}

/* ─── Code pill ────────────────────────────────────────── */
function Code({ children }: { children: React.ReactNode }) {
  return (
    <code
      className="text-xs px-1.5 py-0.5 rounded-md font-mono"
      style={{ background: "oklch(0.62 0.16 263 / 14%)", color: "oklch(0.78 0.14 263)" }}
    >
      {children}
    </code>
  );
}

/* ─── Alert box ────────────────────────────────────────── */
function AlertBox({ type, children }: { type: "info" | "warning" | "success"; children: React.ReactNode }) {
  const styles = {
    info:    { color: "oklch(0.72 0.16 263)", icon: HelpCircle },
    warning: { color: "oklch(0.78 0.16 55)",  icon: AlertTriangle },
    success: { color: "oklch(0.72 0.18 148)", icon: CheckCircle2 },
  }[type];
  const Icon = styles.icon;
  return (
    <div
      className="rounded-xl px-4 py-3 flex items-start gap-3 text-sm"
      style={{ background: `${styles.color}0e`, border: `1px solid ${styles.color}22` }}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: styles.color }} />
      <span className="leading-relaxed" style={{ color: "oklch(0.65 0 0)" }}>{children}</span>
    </div>
  );
}

/* ─── Section label ────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Reveal>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1" style={{ background: "oklch(1 0 0 / 6%)" }} />
        <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "oklch(0.65 0.22 278)" }}>
          {children}
        </span>
        <div className="h-px flex-1" style={{ background: "oklch(1 0 0 / 6%)" }} />
      </div>
    </Reveal>
  );
}

/* ─── Page ─────────────────────────────────────────────── */
export default function LoginHelpPage() {
  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{ background: "oklch(0.09 0 0)", color: "oklch(0.85 0 0)" }}
    >
      {/* ── Nav ── */}
      <div
        className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 h-14"
        style={{
          background: "oklch(0.09 0 0 / 80%)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid oklch(1 0 0 / 5%)",
        }}
      >
        <Link
          href="/login"
          className="flex items-center gap-2 text-sm transition-colors"
          style={{ color: "oklch(0.55 0 0)" }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "oklch(0.85 0 0)")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "oklch(0.55 0 0)")}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: "oklch(0.62 0.16 263 / 14%)", border: "1px solid oklch(0.62 0.16 263 / 22%)" }}
          >
            <HelpCircle className="w-3.5 h-3.5" style={{ color: "oklch(0.72 0.16 263)" }} />
          </div>
          <span className="text-sm font-semibold">Login Help</span>
        </div>
        <div className="w-28" />
      </div>

      {/* ── Hero ── */}
      <section className="relative pt-28 pb-16 px-6 text-center">
        <div
          className="pointer-events-none absolute rounded-full blur-3xl"
          style={{
            width: 560, height: 320, top: 0, left: "50%",
            transform: "translateX(-50%)",
            background: "radial-gradient(ellipse, oklch(0.62 0.16 263 / 9%) 0%, transparent 70%)",
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 max-w-lg mx-auto"
        >
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium mb-7"
            style={{ background: "oklch(0.62 0.16 263 / 10%)", color: "oklch(0.72 0.14 263)", border: "1px solid oklch(0.62 0.16 263 / 20%)" }}
          >
            <Sparkles className="w-3 h-3" />
            Can&apos;t log in? You&apos;re in the right place.
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 leading-none">
            Login{" "}
            <span style={{ background: "linear-gradient(135deg, oklch(0.75 0.18 263), oklch(0.65 0.22 310))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              help.
            </span>
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "oklch(0.55 0 0)" }}>
            Follow the steps below and you&apos;ll be signed in within minutes.
          </p>
        </motion.div>
      </section>

      <div className="px-6 max-w-2xl mx-auto pb-24 space-y-12">

        {/* ── Quick checklist ── */}
        <Reveal>
          <div
            className="rounded-2xl p-6 space-y-5"
            style={{ background: "oklch(0.12 0 0)", border: "1px solid oklch(1 0 0 / 7%)" }}
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4" style={{ color: "oklch(0.72 0.18 148)" }} />
              <p className="text-sm font-semibold">Quick checklist</p>
              <span className="text-xs ml-auto" style={{ color: "oklch(0.45 0 0)" }}>Fixes 90% of issues</span>
            </div>
            <div className="space-y-3">
              {[
                { ok: true,  text: "Username is firstname.lastname — e.g. donald.trump" },
                { ok: true,  text: "School is selected correctly" },
                { ok: true,  text: "Caps Lock is off" },
                { ok: null,  text: "Can you log in on the official SchoolSoft site?" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  {item.ok === true  && <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "oklch(0.72 0.18 148)" }} />}
                  {item.ok === false && <XCircle      className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "oklch(0.58 0.19 24)" }} />}
                  {item.ok === null  && <HelpCircle   className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "oklch(0.72 0.16 263)" }} />}
                  <span style={{ color: "oklch(0.6 0 0)" }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* ── Step-by-step ── */}
        <div>
          <SectionLabel>Step-by-step guide</SectionLabel>
          <Step n={1} title="Verify you can sign in on the official SchoolSoft site" color="oklch(0.72 0.18 148)">
            <p>
              Open{" "}
              <a href="https://sms.schoolsoft.se/engelska/jsp/Login.jsp" target="_blank" rel="noopener"
                className="inline-flex items-center gap-1 underline" style={{ color: "oklch(0.72 0.16 263)" }}>
                sms.schoolsoft.se <ExternalLink className="w-3 h-3" />
              </a>{" "}
              and try logging in there first.{" "}
              <strong style={{ color: "oklch(0.8 0 0)" }}>Don&apos;t use external / social login.</strong>
            </p>
            <p>If it works on the official site, your credentials are correct — jump to step 3.</p>
            <p>If it doesn&apos;t work there either, your password needs resetting — jump to step 4.</p>
          </Step>

          <Step n={2} title="Check your username and school" color="oklch(0.65 0.22 278)">
            <div className="space-y-3">
              <div className="rounded-xl p-4 space-y-2" style={{ background: "oklch(1 0 0 / 2.5%)", border: "1px solid oklch(1 0 0 / 6%)" }}>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "oklch(0.5 0 0)" }}>
                  <User className="w-3.5 h-3.5" /> Username format
                </div>
                <p>Your username is <Code>firstname.lastname</Code>.</p>
                <p>Examples: <Code>donald.trump</Code> · <Code>anna.svensson</Code></p>
                <p className="text-xs" style={{ color: "oklch(0.45 0 0)" }}>Hyphenated names keep the hyphen: <Code>anna-lisa.svensson</Code></p>
              </div>
              <div className="rounded-xl p-4 space-y-2" style={{ background: "oklch(1 0 0 / 2.5%)", border: "1px solid oklch(1 0 0 / 6%)" }}>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "oklch(0.5 0 0)" }}>
                  <School className="w-3.5 h-3.5" /> Selecting your school
                </div>
                <p>Use the school picker on the login page. Search for your school by name — over 3,000 schools are listed.</p>
              </div>
            </div>
          </Step>

          <Step n={3} title="Works on SchoolSoft but not on SchoolSoft+?" color="oklch(0.75 0.18 40)">
            <p>This is rare but can happen. Try the following:</p>
            <ul className="space-y-2">
              {["Clear cookies for this site and try again.", "Try an incognito / private window.", "Make sure the selected school is the correct one."].map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-2 w-1 h-1 rounded-full shrink-0" style={{ background: "oklch(0.75 0.18 40)" }} />
                  {s}
                </li>
              ))}
            </ul>
            <AlertBox type="info">If it still doesn&apos;t work, contact us below — we want to fix it.</AlertBox>
          </Step>

          <Step n={4} title="Reset your password" color="oklch(0.72 0.18 190)" last>
            <div className="flex items-center gap-2 mb-3">
              <KeyRound className="w-4 h-4 shrink-0" style={{ color: "oklch(0.72 0.18 190)" }} />
              <span className="text-sm font-medium" style={{ color: "oklch(0.8 0 0)" }}>Do this on the official SchoolSoft site.</span>
            </div>
            <ol className="space-y-3">
              {[
                <>Go to the <a href="https://sms.schoolsoft.se/engelska/jsp/Login.jsp" target="_blank" rel="noopener" className="underline" style={{ color: "oklch(0.72 0.16 263)" }}>official login page</a> and click <strong style={{ color: "oklch(0.8 0 0)" }}>&ldquo;Need help logging in?&rdquo;</strong></>,
                <>Enter your username and school email address.</>,
                <>You&apos;ll receive an email with a temporary password.</>,
                <>Sign in with the temporary password, then go to <strong style={{ color: "oklch(0.8 0 0)" }}>Profile → Settings → Change password</strong> and set a new one.</>,
                <>Your new password now works on both sites.</>,
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                    style={{ background: "oklch(0.72 0.18 190 / 15%)", color: "oklch(0.72 0.18 190)" }}>
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </Step>
        </div>

        {/* ── FAQ ── */}
        <div>
          <SectionLabel>FAQ</SectionLabel>
          <div className="space-y-2">
            <Accordion question="Is my password safe when I log in through SchoolSoft+?">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "oklch(0.72 0.18 148)" }} />
                <p>Yes. Your password is sent directly to SchoolSoft&apos;s own login server over HTTPS — exactly as it would be on the official site. SchoolSoft+ never stores or logs your password.</p>
              </div>
            </Accordion>
            <Accordion question="I changed my password on SchoolSoft but now SchoolSoft+ won't log in.">
              <p>Your old session is invalid. Sign out of SchoolSoft+ (or clear its cookies), then sign in again with your new password.</p>
            </Accordion>
            <Accordion question="I keep getting 'Login failed. Check your credentials.'">
              <p>SchoolSoft rejected the login. Double-check:</p>
              <ul className="mt-2 space-y-1 ml-3">
                <li>· Username is exactly <Code>firstname.lastname</Code> (no spaces, no capitals)</li>
                <li>· The correct school is selected</li>
                <li>· Your password is correct — verify on the official site first</li>
              </ul>
            </Accordion>
            <Accordion question="My name has a special character (å, ä, ö, etc.). How do I write it?">
              <p>Use the exact same characters as in your SchoolSoft username. Copy it directly from the official site to be sure.</p>
            </Accordion>
            <Accordion question="I'm stuck in a loading screen after logging in.">
              <p>Clear cookies and site data for this domain, then try again. If the problem persists, try a different browser or incognito mode and let us know.</p>
            </Accordion>
            <Accordion question="Does SchoolSoft+ work offline?">
              <div className="flex items-start gap-3">
                <Wifi className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "oklch(0.72 0.16 263)" }} />
                <p>No — it fetches live data from SchoolSoft on every page load. You need an internet connection to use it.</p>
              </div>
            </Accordion>
            <Accordion question="Is this an official app?">
              <p>No. SchoolSoft+ is an independent project built by a student. It is not affiliated with SchoolSoft AB or any school.</p>
            </Accordion>
          </div>
        </div>

        {/* ── Contact card ── */}
        <Reveal>
          <div
            className="rounded-2xl p-7 relative overflow-hidden"
            style={{ background: "oklch(0.12 0 0)", border: "1px solid oklch(0.62 0.16 263 / 20%)" }}
          >
            <div
              className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full blur-2xl"
              style={{ background: "oklch(0.62 0.16 263 / 10%)" }}
            />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "oklch(0.62 0.16 263 / 12%)", color: "oklch(0.72 0.16 263)" }}>
                <Mail className="w-4 h-4" />
              </div>
              <p className="text-sm font-bold" style={{ color: "oklch(0.9 0 0)" }}>Still stuck? Get in touch.</p>
            </div>
            <p className="text-sm mb-5 leading-relaxed" style={{ color: "oklch(0.55 0 0)" }}>
              If none of the above solved it, reach out directly. Please include what error message you&apos;re seeing and what you&apos;ve already tried.
            </p>
            <a
              href="mailto:hello@elias4044.com"
              className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl transition-opacity hover:opacity-80"
              style={{ background: "oklch(0.62 0.16 263 / 14%)", color: "oklch(0.78 0.14 263)", border: "1px solid oklch(0.62 0.16 263 / 25%)" }}
            >
              <Mail className="w-3.5 h-3.5" />
              hello@elias4044.com
            </a>
          </div>
        </Reveal>

        {/* ── Footer links ── */}
        <Reveal className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs" style={{ color: "oklch(0.45 0 0)" } as React.CSSProperties}>
          <Link href="/" className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Home
          </Link>
          <span className="opacity-30">·</span>
          <Link href="/login" className="hover:text-foreground transition-colors flex items-center gap-1">
            Back to login <ArrowRight className="w-3 h-3" />
          </Link>
          <span className="opacity-30">·</span>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms &amp; Privacy</Link>
        </Reveal>
      </div>
    </div>
  );
}
