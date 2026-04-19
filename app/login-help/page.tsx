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
  RefreshCcw,
  Mail,
  AlertTriangle,
  Sparkles,
  ArrowRight,
} from "lucide-react";

/* ─── Reveal ───────────────────────────────────────────── */
function Reveal({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
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

/* ─── Accordion ────────────────────────────────────────── */
function Accordion({ question, children }: { question: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "oklch(0.13 0 0)", border: "1px solid oklch(1 0 0 / 7%)" }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left flex items-center justify-between gap-3 px-5 py-4 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors"
      >
        <span>{question}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
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
            <div className="px-5 pb-5 pt-0 text-sm text-muted-foreground leading-relaxed space-y-2"
              style={{ borderTop: "1px solid oklch(1 0 0 / 6%)" }}>
              <div className="pt-4">{children}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Step ─────────────────────────────────────────────── */
function Step({ n, title, children, color = "oklch(0.62 0.16 263)" }: {
  n: number; title: string; children: React.ReactNode; color?: string;
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
          <div className="w-px flex-1 mt-2" style={{ background: "oklch(1 0 0 / 7%)", minHeight: 24 }} />
        </div>
        <div className="pb-7 min-w-0">
          <p className="text-sm font-semibold text-foreground mb-1.5">{title}</p>
          <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
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
      <span className="text-muted-foreground leading-relaxed">{children}</span>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────── */
export default function LoginHelpPage() {
  return (
    <div className="relative min-h-screen bg-[oklch(0.10_0_0)] overflow-x-hidden">
      {/* Nav */}
      <div
        className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ background: "oklch(0.10 0 0 / 85%)", backdropFilter: "blur(16px)", borderBottom: "1px solid oklch(1 0 0 / 6%)" }}
      >
        <Link href="/login" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Login Help</span>
        </div>
        <div className="w-24" />
      </div>

      {/* Hero */}
      <section className="relative pt-28 pb-10 px-6 text-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hgrid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hgrid)" />
          </svg>
        </div>
        <motion.div className="pointer-events-none absolute rounded-full blur-3xl"
          style={{ width: 500, height: 500, top: "-20%", left: "55%", background: "oklch(0.62 0.16 263 / 8%)" }}
          animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />

        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 max-w-xl mx-auto"
        >
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium mb-6"
            style={{ background: "oklch(0.62 0.16 263 / 12%)", color: "oklch(0.75 0.14 263)", border: "1px solid oklch(0.62 0.16 263 / 22%)" }}
          >
            <Sparkles className="w-3 h-3" />
            Can't log in? You're in the right place.
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Login{" "}
            <span style={{ background: "linear-gradient(135deg, oklch(0.72 0.18 263), oklch(0.65 0.22 310))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              troubleshooting.
            </span>
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Follow the steps below and you'll be in within minutes.
          </p>
        </motion.div>
      </section>

      <div className="px-6 max-w-2xl mx-auto pb-20 space-y-10">

        {/* ── Quick checklist ── */}
        <Reveal>
          <div className="rounded-3xl p-6 md:p-8 space-y-4"
            style={{ background: "oklch(0.13 0 0)", border: "1px solid oklch(1 0 0 / 7%)" }}>
            <p className="text-xs uppercase tracking-widest font-bold" style={{ color: "oklch(0.65 0.22 278)" }}>
              Quick checklist
            </p>
            <p className="text-sm text-muted-foreground">Run through these first — they fix 90% of issues.</p>
            <div className="space-y-3">
              {[
                { ok: true,  text: "Username is firstname.lastname — e.g. donald.trump" },
                { ok: true,  text: "School slug is correct — e.g. engelska" },
                { ok: true,  text: "Caps Lock is off" },
                { ok: null,  text: "Can you log in on the official SchoolSoft site?" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  {item.ok === true  && <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "oklch(0.72 0.18 148)" }} />}
                  {item.ok === false && <XCircle      className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "oklch(0.58 0.19 24)" }} />}
                  {item.ok === null  && <HelpCircle   className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "oklch(0.72 0.16 263)" }} />}
                  <span className="text-muted-foreground">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* ── Step-by-step ── */}
        <Reveal>
          <p className="text-xs uppercase tracking-widest font-bold mb-6" style={{ color: "oklch(0.65 0.22 278)" }}>
            Step-by-step guide
          </p>
        </Reveal>

        <Step n={1} title="Verify you can sign in on the official SchoolSoft site" color="oklch(0.72 0.18 148)">
          <p>
            Open{" "}
            <a
              href="https://sms.schoolsoft.se/engelska/jsp/Login.jsp"
              target="_blank"
              rel="noopener"
              className="underline inline-flex items-center gap-1"
              style={{ color: "oklch(0.72 0.16 263)" }}
            >
              sms.schoolsoft.se <ExternalLink className="w-3 h-3" />
            </a>{" "}
            and try logging in there first. <strong>Dont use external login!</strong>
          </p>
          <p>If it works on the official site, your credentials are correct — jump to step 3.</p>
          <p>If it doesn't work on the official site either, your password needs resetting — jump to step 2.</p>
        </Step>

        <Step n={2} title="Check your username and school slug" color="oklch(0.65 0.22 278)">
          <div className="space-y-4">
            <div className="rounded-xl p-4 space-y-2" style={{ background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 8%)" }}>
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground/60 uppercase tracking-wide">
                <User className="w-3.5 h-3.5" /> Username format
              </div>
              <p className="text-sm text-muted-foreground">
                Your username is your name in the format <Code>firstname.lastname</Code>.
              </p>
              <p className="text-sm text-muted-foreground">
                Examples: <Code>donald.trump</Code> · <Code>anna.svensson</Code>
              </p>
              <p className="text-xs text-muted-foreground opacity-60">
                Hyphenated names use a hyphen: <Code>anna-lisa.svensson</Code>
              </p>
            </div>

            <div className="rounded-xl p-4 space-y-2" style={{ background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 8%)" }}>
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground/60 uppercase tracking-wide">
                <School className="w-3.5 h-3.5" /> School slug
              </div>
              <p className="text-sm text-muted-foreground">
                The school slug is the short name in the SchoolSoft URL. For IES schools this is usually the city name.
              </p>
              <p className="text-sm text-muted-foreground">
                Examples: <Code>engelska</Code> · <Code>drottningblanka</Code> · <Code>lbs</Code>
              </p>
              <p className="text-sm text-muted-foreground">
                You can find your school's slug in the official URL:{" "}
                <Code>sms.schoolsoft.se/<strong>engelska</strong>/jsp/Login.jsp</Code>
              </p>
            </div>
          </div>
        </Step>

        <Step n={3} title="Works on SchoolSoft but not on SchoolSoft+?" color="oklch(0.75 0.18 40)">
          <p>
            This is rare but can happen. Try the following:
          </p>
          <ul className="space-y-2 ml-1">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: "oklch(0.75 0.18 40)" }} />
              <span>Clear cookies for this site and try again.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: "oklch(0.75 0.18 40)" }} />
              <span>Try an incognito / private window.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: "oklch(0.75 0.18 40)" }} />
              <span>Make sure the school slug in SchoolSoft+ matches the one in the official URL exactly.</span>
            </li>
          </ul>
          <AlertBox type="info">
            If it still doesn't work, please contact us (see below) — we want to fix it.
          </AlertBox>
        </Step>

        <Step n={4} title="Reset your password" color="oklch(0.72 0.18 190)">
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="w-4 h-4 shrink-0" style={{ color: "oklch(0.72 0.18 190)" }} />
            <span className="text-sm font-medium text-foreground">Do this on the official SchoolSoft site.</span>
          </div>
          <ol className="space-y-3">
            {[
              <>Go to the <a href="https://sms.schoolsoft.se/engelska/jsp/Login.jsp" target="_blank" rel="noopener" className="underline" style={{ color: "oklch(0.72 0.16 263)" }}>official login page</a> and click <strong className="text-foreground">"Need help logging in?"</strong></>,
              <>Enter your username (<Code>firstname.lastname</Code>) and your school email address.</>,
              <>You'll receive an email with a temporary password. Use that to sign in.</>,
              <>Once in, go to <strong className="text-foreground">Profile → Settings → Change password</strong>, enter the temporary password once and your new password twice, then save.</>,
              <>Your new password now works on both the official site and SchoolSoft+.</>,
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                  style={{ background: "oklch(0.72 0.18 190 / 18%)", color: "oklch(0.72 0.18 190)" }}
                >
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </Step>

        {/* ── FAQ ── */}
        <Reveal>
          <p className="text-xs uppercase tracking-widest font-bold mb-4" style={{ color: "oklch(0.65 0.22 278)" }}>
            Frequently asked questions
          </p>
          <div className="space-y-2">
            <Accordion question="Is my password safe when I log in through SchoolSoft+?">
              <p>Yes. Your password is sent directly to SchoolSoft's own login server over HTTPS — exactly as it would be if you used the official site. SchoolSoft+ never stores or logs your password. Once SchoolSoft returns session cookies, your password is discarded.</p>
            </Accordion>
            <Accordion question="I changed my password on SchoolSoft but now SchoolSoft+ won't log in.">
              <p>Your old session cookies are no longer valid. Sign out of SchoolSoft+ (or clear its cookies), then sign in again with your new password.</p>
            </Accordion>
            <Accordion question="I keep getting 'Login failed. Check your credentials.'">
              <p>This means SchoolSoft rejected the login. Double-check:</p>
              <ul className="mt-2 space-y-1 ml-3">
                <li>· Username is exactly <Code>firstname.lastname</Code> (no spaces, no capitals)</li>
                <li>· School slug is correct</li>
                <li>· Your password is correct — verify on the official SchoolSoft site first</li>
              </ul>
            </Accordion>
            <Accordion question="My name has a special character (å, ä, ö, etc.). How do I write it?">
              <p>Use the exact same characters as in your SchoolSoft username. Swedish names typically use <Code>å</Code>, <Code>ä</Code>, <Code>ö</Code> as-is. You can copy your username directly from the official SchoolSoft site to make sure.</p>
            </Accordion>
            <Accordion question="I'm stuck in a loading screen after logging in.">
              <p>Try clearing cookies and site data for this domain, then log in again. If the problem persists, try a different browser or incognito mode and let us know.</p>
            </Accordion>
            <Accordion question="Is this an official app?">
              <p>No. SchoolSoft+ is an independent project built by a student. It is not affiliated with SchoolSoft AB or any school. It uses your existing SchoolSoft account — no separate registration required.</p>
            </Accordion>
          </div>
        </Reveal>

        {/* ── Contact card ── */}
        <Reveal>
          <div
            className="rounded-3xl p-7 relative overflow-hidden"
            style={{ background: "oklch(0.13 0 0)", border: "1px solid oklch(0.62 0.16 263 / 25%)" }}
          >
            <div
              className="absolute top-0 right-0 w-40 h-40 rounded-bl-full pointer-events-none"
              style={{ background: "oklch(0.62 0.16 263 / 6%)" }}
            />
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "oklch(0.62 0.16 263 / 14%)", color: "oklch(0.72 0.16 263)" }}
              >
                <Mail className="w-4 h-4" />
              </div>
              <p className="text-sm font-bold text-foreground">Still stuck? Get in touch.</p>
            </div>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              If none of the above solved it, contact me directly. Please include what error message you're seeing and
              what you've already tried.
            </p>
            <a
              href="mailto:hello@elias4044.com"
              className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
              style={{
                background: "oklch(0.62 0.16 263 / 15%)",
                color: "oklch(0.78 0.14 263)",
                border: "1px solid oklch(0.62 0.16 263 / 25%)",
              }}
            >
              <Mail className="w-3.5 h-3.5" />
              hello@elias4044.com
            </a>
          </div>
        </Reveal>

        {/* Nav links */}
        <Reveal className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
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
