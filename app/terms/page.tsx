"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Shield,
  Lock,
  Eye,
  Database,
  Cookie,
  Brain,
  StickyNote,
  AlertTriangle,
  Scale,
  Mail,
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

/* ─── Section ──────────────────────────────────────────── */
function Section({
  id, icon: Icon, title, color, children, delay = 0,
}: {
  id: string; icon: React.ElementType; title: string;
  color: string; children: React.ReactNode; delay?: number;
}) {
  return (
    <Reveal delay={delay}>
      <div
        id={id}
        className="rounded-3xl p-7 md:p-8"
        style={{ background: "oklch(0.13 0 0)", border: "1px solid oklch(1 0 0 / 7%)" }}
      >
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${color}18`, color }}
          >
            <Icon className="w-4.5 h-4.5" />
          </div>
          <h2 className="text-base font-bold text-foreground">{title}</h2>
        </div>
        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          {children}
        </div>
      </div>
    </Reveal>
  );
}

/* ─── Bullet ───────────────────────────────────────────── */
function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-1.25 w-1 h-1 rounded-full shrink-0" style={{ background: "oklch(0.62 0.16 263 / 60%)" }} />
      <span>{children}</span>
    </li>
  );
}

/* ─── Callout ──────────────────────────────────────────── */
function Callout({ children, color = "oklch(0.62 0.16 263)" }: { children: React.ReactNode; color?: string }) {
  return (
    <div
      className="rounded-xl px-4 py-3 text-sm"
      style={{ background: `${color}0f`, border: `1px solid ${color}22`, color: "oklch(0.80 0 0)" }}
    >
      {children}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────── */
export default function TermsPage() {
  return (
    <div className="relative min-h-screen bg-[oklch(0.10_0_0)] overflow-x-hidden">
      {/* Nav */}
      <div
        className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ background: "oklch(0.10 0 0 / 85%)", backdropFilter: "blur(16px)", borderBottom: "1px solid oklch(1 0 0 / 6%)" }}
      >
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Terms & Privacy</span>
        </div>
        <div className="w-16" />
      </div>

      {/* Hero */}
      <section className="relative pt-28 pb-12 px-6 text-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="tgrid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#tgrid)" />
          </svg>
        </div>
        <motion.div className="pointer-events-none absolute rounded-full blur-3xl"
          style={{ width: 500, height: 500, top: "-20%", left: "60%", background: "oklch(0.62 0.16 263 / 8%)" }}
          animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />

        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 max-w-2xl mx-auto"
        >
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium mb-6"
            style={{ background: "oklch(0.62 0.16 263 / 12%)", color: "oklch(0.75 0.14 263)", border: "1px solid oklch(0.62 0.16 263 / 22%)" }}
          >
            <Shield className="w-3 h-3" />
            Last updated: April 19, 2026
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Terms of Service{" "}
            <span style={{ background: "linear-gradient(135deg, oklch(0.72 0.18 263), oklch(0.65 0.22 310))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              &amp; Privacy.
            </span>
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed max-w-lg mx-auto">
            Plain-language. No legalese. Everything you need to know about how SchoolSoft+ works and how your data is handled.
          </p>
        </motion.div>
      </section>

      {/* Jump links */}
      <Reveal className="px-6 max-w-3xl mx-auto mb-10">
        <div
          className="rounded-2xl p-4 flex flex-wrap gap-2"
          style={{ background: "oklch(0.13 0 0)", border: "1px solid oklch(1 0 0 / 7%)" }}
        >
          {[
            { href: "#what-we-are", label: "What we are" },
            { href: "#your-data",   label: "Your data" },
            { href: "#cookies",     label: "Cookies" },
            { href: "#firebase",    label: "Firebase" },
            { href: "#ai",          label: "AI" },
            { href: "#conduct",     label: "Conduct" },
            { href: "#disclaimers", label: "Disclaimers" },
            { href: "#contact",     label: "Contact" },
          ].map(item => (
            <a
              key={item.href}
              href={item.href}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
              style={{ background: "oklch(1 0 0 / 4%)" }}
            >
              {item.label}
            </a>
          ))}
        </div>
      </Reveal>

      {/* Sections */}
      <div className="px-6 max-w-3xl mx-auto pb-20 space-y-4">

        <Section id="what-we-are" icon={Sparkles} title="1. What SchoolSoft+ is" color="oklch(0.65 0.22 278)" delay={0}>
          <p>
            SchoolSoft+ is an independent, student-built web app that provides a faster and more enjoyable
            interface for your existing SchoolSoft account. It is <strong className="text-foreground">not affiliated with,
            endorsed by, or in any way connected to SchoolSoft AB</strong> or Internationella Engelska Skolan.
          </p>
          <p>
            SchoolSoft+ does not replace SchoolSoft — it reads data from it on your behalf, using your own credentials,
            and displays it in a modern dashboard. All official data ultimately comes from SchoolSoft's servers.
          </p>
          <p>
            SchoolSoft+ is <strong className="text-foreground">open source</strong> and released under the{" "}
            <a href="https://github.com/elias4044/schoolsoftplus/blob/main/LICENSE" target="_blank" rel="noopener"
              className="underline" style={{ color: "oklch(0.72 0.16 263)" }}>MIT License</a>.
            The source code is publicly available at{" "}
            <a href="https://github.com/elias4044/schoolsoftplus" target="_blank" rel="noopener"
              className="underline" style={{ color: "oklch(0.72 0.16 263)" }}>github.com/elias4044/schoolsoftplus</a>.
            You are free to inspect, fork, and contribute to the codebase.
          </p>
          <Callout>By using SchoolSoft+ you agree to these terms. If you don't agree, please don't use the service.</Callout>
        </Section>

        <Section id="your-data" icon={Lock} title="2. Your credentials &amp; data" color="oklch(0.72 0.18 148)" delay={0.04}>
          <p>
            We take your privacy seriously. Here is exactly what happens when you log in:
          </p>
          <ul className="space-y-2 ml-1">
            <Bullet>Your username and password are sent <strong className="text-foreground">directly to SchoolSoft's login endpoint</strong> over HTTPS — the same request your browser would make on the official site.</Bullet>
            <Bullet><strong className="text-foreground">Your password is never stored</strong> — not in our database, not in any log, not anywhere. It is used once, forwarded, and discarded.</Bullet>
            <Bullet>On a successful login, SchoolSoft returns session cookies (<code className="text-xs px-1 py-0.5 rounded" style={{ background: "oklch(1 0 0 / 8%)" }}>JSESSIONID</code>, <code className="text-xs px-1 py-0.5 rounded" style={{ background: "oklch(1 0 0 / 8%)" }}>hash</code>). We store these in your browser as <strong className="text-foreground">httpOnly cookies</strong> so they can never be read by JavaScript.</Bullet>
            <Bullet>Cookies expire after <strong className="text-foreground">7 days</strong>. You can sign out at any time to clear them immediately.</Bullet>
            <Bullet>We store your <strong className="text-foreground">username (lowercase)</strong> in Firebase for note and goal storage — see §4 below.</Bullet>
          </ul>
          <Callout color="oklch(0.72 0.18 148)">
            We never sell, share, or monetise any of your personal information. Ever.
          </Callout>
        </Section>

        <Section id="cookies" icon={Cookie} title="3. Cookies &amp; storage" color="oklch(0.75 0.18 40)" delay={0.08}>
          <p>SchoolSoft+ sets only the cookies it needs to function. No tracking, no advertising.</p>
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid oklch(1 0 0 / 8%)" }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "oklch(1 0 0 / 5%)" }}>
                  <th className="text-left px-4 py-2.5 font-semibold text-foreground/70">Cookie</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-foreground/70">Purpose</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-foreground/70">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "oklch(1 0 0 / 6%)" }}>
                {[
                  ["ssp_jsessionid", "SchoolSoft session token (httpOnly)", "7 days"],
                  ["ssp_hash",       "SchoolSoft auth hash (httpOnly)",     "7 days"],
                  ["ssp_usertype",   "User type flag (httpOnly)",           "7 days"],
                  ["ssp_school",     "Your school slug",                    "7 days"],
                  ["ssp_username",   "Your username (not sensitive)",       "7 days"],
                ].map(([name, purpose, exp]) => (
                  <tr key={name}>
                    <td className="px-4 py-2.5 font-mono" style={{ color: "oklch(0.72 0.16 263)" }}>{name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{purpose}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{exp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>No third-party tracking cookies are set. Local storage is used only for your dashboard widget layout preferences.</p>
        </Section>

        <Section id="firebase" icon={Database} title="4. What we store in Firebase" color="oklch(0.72 0.16 263)" delay={0.12}>
          <p>
            We use <strong className="text-foreground">Google Firebase Firestore</strong> to store data that belongs to you and needs to
            persist across sessions. The following data is stored per user:
          </p>
          <ul className="space-y-2 ml-1">
            <Bullet><strong className="text-foreground">Username</strong> (lowercase) — used as your unique identifier.</Bullet>
            <Bullet><strong className="text-foreground">Notes</strong> — any notes you create inside SchoolSoft+.</Bullet>
            <Bullet><strong className="text-foreground">Dashboard widget layout</strong> — stored locally in your browser, not in Firebase.</Bullet>
            <Bullet><strong className="text-foreground">First login / last login timestamps</strong> and a login count — used for anonymous aggregate stats only.</Bullet>
          </ul>
          <p>
            Anonymous, aggregate usage statistics (total logins, feature usage counts, active schools) are stored in
            a separate Firestore document with no link back to any individual user.
          </p>
          <Callout color="oklch(0.72 0.16 263)">
            You can request deletion of all your stored data by emailing us (see §8). We will process it within 7 days.
          </Callout>
        </Section>

        <Section id="ai" icon={Brain} title="5. AI assistant" color="oklch(0.75 0.18 310)" delay={0.16}>
          <p>
            SchoolSoft+ includes an AI assistant powered by <strong className="text-foreground">Google Gemini</strong> (via the Google GenAI API).
            When you send a message:
          </p>
          <ul className="space-y-2 ml-1">
            <Bullet>Your message and relevant context (schedule, assignments) are sent to Google's API to generate a response.</Bullet>
            <Bullet>Messages are subject to <a href="https://policies.google.com/privacy" target="_blank" rel="noopener" className="underline" style={{ color: "oklch(0.72 0.16 263)" }}>Google's privacy policy</a>.</Bullet>
            <Bullet>We do not store your AI conversation history in our database.</Bullet>
            <Bullet>A rate limit of <strong className="text-foreground">8 messages per minute</strong> applies to prevent abuse.</Bullet>
          </ul>
          <Callout color="oklch(0.75 0.18 310)">
            Don't share sensitive personal information (passwords, ID numbers, etc.) with the AI assistant.
          </Callout>
        </Section>

        <Section id="notes" icon={StickyNote} title="6. Notes &amp; shared content" color="oklch(0.72 0.18 190)" delay={0.20}>
          <p>
            Notes you create are private by default. If you use the share feature, a public link is generated.
            Anyone with that link can view the note. You are responsible for what you share.
          </p>
          <ul className="space-y-2 ml-1">
            <Bullet>Do not share content that is illegal, harmful, or violates SchoolSoft's own acceptable use policy.</Bullet>
            <Bullet>Shared notes can be deleted at any time from your notes list, which immediately revokes the public link.</Bullet>
          </ul>
        </Section>

        <Section id="conduct" icon={AlertTriangle} title="7. Acceptable use" color="oklch(0.78 0.16 55)" delay={0.24}>
          <p>You agree not to:</p>
          <ul className="space-y-2 ml-1">
            <Bullet>Attempt to scrape, crawl, or automate requests to SchoolSoft+ or to SchoolSoft through SchoolSoft+.</Bullet>
            <Bullet>Use the service to access another student's data without their consent.</Bullet>
            <Bullet>Attempt to reverse-engineer, decompile, or tamper with the service.</Bullet>
            <Bullet>Use the AI assistant to generate harmful, hateful, or illegal content.</Bullet>
            <Bullet>Circumvent rate limits or other technical controls.</Bullet>
          </ul>
          <p>
            Violations may result in immediate suspension of access and, where appropriate, reporting to school administration.
          </p>
        </Section>

        <Section id="disclaimers" icon={Eye} title="8. Disclaimers &amp; liability" color="oklch(0.70 0.18 320)" delay={0.28}>
          <p>
            SchoolSoft+ is provided <strong className="text-foreground">"as is"</strong> with no warranty of uptime, accuracy, or fitness for any particular purpose.
            Because this service depends on SchoolSoft's own API, any changes or outages on their end will affect availability here.
          </p>
          <ul className="space-y-2 ml-1">
            <Bullet>We are not responsible for data shown being out of date or inaccurate — always check the official SchoolSoft portal for critical information.</Bullet>
            <Bullet>We are not liable for any loss arising from use or inability to use SchoolSoft+.</Bullet>
            <Bullet>These terms may be updated at any time. Continued use after an update constitutes acceptance.</Bullet>
          </ul>
        </Section>

        <Section id="contact" icon={Mail} title="9. Contact" color="oklch(0.65 0.22 278)" delay={0.32}>
          <p>Questions, data deletion requests, or bug reports — reach out:</p>
          <ul className="space-y-2 ml-1">
            <Bullet>Email: <a href="mailto:hello@elias4044.com" className="underline" style={{ color: "oklch(0.72 0.16 263)" }}>hello@elias4044.com</a></Bullet>
          </ul>
          <p>SchoolSoft+ is an independent project, not affiliated with SchoolSoft AB or Internationella Engelska Skolan.</p>
        </Section>

        {/* Footer nav */}
        <Reveal className="pt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <span className="opacity-30">·</span>
          <Link href="/login-help" className="hover:text-foreground transition-colors">Login help</Link>
          <span className="opacity-30">·</span>
          <Link href="/stats" className="hover:text-foreground transition-colors">Stats</Link>
          <span className="opacity-30">·</span>
          <Link href="/open-source" className="hover:text-foreground transition-colors">Open Source</Link>
          <span className="opacity-30">·</span>
          <span>Not affiliated with SchoolSoft AB</span>
        </Reveal>
      </div>
    </div>
  );
}
