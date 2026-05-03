"use client";

import { useRef, useEffect } from "react";
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
  MessageCircle,
  UserCircle,
  Timer,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* ─── Reveal ───────────────────────────────────────────── */
function Reveal({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-6% 0px" });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
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
        style={{ background: "#0d0d0d", border: "1px solid oklch(1 0 0 / 8%)" }}
      >
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${color}20`, color }}
          >
            <Icon className="w-4 h-4" />
          </div>
          <h2 className="text-base font-bold text-white/90">{title}</h2>
        </div>
        <div className="space-y-3 text-sm text-white/45 leading-relaxed">
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
      <span className="mt-[5px] w-1 h-1 rounded-full shrink-0" style={{ background: "oklch(0.65 0.22 278 / 60%)" }} />
      <span>{children}</span>
    </li>
  );
}

/* ─── Callout ──────────────────────────────────────────── */
function Callout({ children, color = "oklch(0.65 0.22 278)" }: { children: React.ReactNode; color?: string }) {
  return (
    <div
      className="rounded-xl px-4 py-3 text-sm"
      style={{ background: `${color}10`, border: `1px solid ${color}25`, color: "oklch(0.80 0 0)" }}
    >
      {children}
    </div>
  );
}

/* ─── Code chip ────────────────────────────────────────── */
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-xs px-1.5 py-0.5 rounded-md font-mono"
      style={{ background: "oklch(1 0 0 / 8%)", color: "oklch(0.72 0.16 263)" }}>
      {children}
    </code>
  );
}

/* ─── Table ────────────────────────────────────────────── */
function DarkTable({ cols, rows }: { cols: string[]; rows: string[][] }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid oklch(1 0 0 / 8%)" }}>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: "oklch(1 0 0 / 5%)" }}>
            {cols.map(c => (
              <th key={c} className="text-left px-4 py-2.5 font-semibold text-white/50">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: "oklch(1 0 0 / 6%)" }}>
          {rows.map((row, i) => (
            <tr key={i}>
              <td className="px-4 py-2.5 font-mono" style={{ color: "oklch(0.72 0.16 263)" }}>{row[0]}</td>
              {row.slice(1).map((cell, j) => (
                <td key={j} className="px-4 py-2.5 text-white/35">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────── */
export default function TermsPage() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ctx = gsap.context(() => {
      gsap.to(".terms-orb-1", {
        yPercent: -30, ease: "none",
        scrollTrigger: { trigger: heroRef.current, start: "top top", end: "bottom top", scrub: true },
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div className="relative min-h-screen bg-[#080808] text-white overflow-x-hidden">

      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/8"
        style={{ background: "oklch(0.05 0 0 / 85%)", backdropFilter: "blur(16px)" }}>
        <Link href="/" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4" style={{ color: "oklch(0.65 0.22 278)" }} />
          <span className="text-sm font-bold text-white/80">Terms & Privacy</span>
        </div>
        <div className="w-16" />
      </header>

      {/* Hero */}
      <section ref={heroRef} className="relative pt-32 pb-16 px-6 text-center overflow-hidden">
        {/* ambient orb */}
        <div className="terms-orb-1 absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, oklch(0.55 0.22 278 / 12%) 0%, transparent 70%)" }} />
        {/* dot grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(oklch(1 0 0 / 3%) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 max-w-2xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur px-4 py-1.5 text-xs text-white/50 mb-8"
          >
            <Shield className="w-3 h-3" />
            Last updated: April 25, 2026
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 leading-[0.95]">
            Terms of Service{" "}
            <span style={{ background: "linear-gradient(135deg, oklch(0.72 0.18 263), oklch(0.65 0.22 310))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              &amp; Privacy.
            </span>
          </h1>
          <p className="text-sm text-white/40 leading-relaxed max-w-lg mx-auto">
            Plain-language. No legalese. Everything you need to know about how SchoolSoft+ works and how your data is handled.
          </p>
        </motion.div>
      </section>

      {/* Jump links */}
      <Reveal className="px-6 max-w-3xl mx-auto mb-8">
        <div className="rounded-2xl p-4 flex flex-wrap gap-2"
          style={{ background: "#0d0d0d", border: "1px solid oklch(1 0 0 / 8%)" }}>
          {[
            { href: "#what-we-are", label: "What we are" },
            { href: "#your-data",   label: "Your data" },
            { href: "#cookies",     label: "Cookies" },
            { href: "#firebase",    label: "Firebase" },
            { href: "#profiles",    label: "Profiles" },
            { href: "#messaging",   label: "Messaging" },
            { href: "#ai",          label: "AI" },
            { href: "#notes",       label: "Notes" },
            { href: "#countdowns",  label: "Countdowns" },
            { href: "#conduct",     label: "Conduct" },
            { href: "#disclaimers", label: "Disclaimers" },
            { href: "#contact",     label: "Contact" },
          ].map(item => (
            <a
              key={item.href}
              href={item.href}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors text-white/35 hover:text-white"
              style={{ background: "oklch(1 0 0 / 4%)" }}
            >
              {item.label}
            </a>
          ))}
        </div>
      </Reveal>

      {/* Sections */}
      <div className="px-6 max-w-3xl mx-auto pb-24 space-y-3">

        <Section id="what-we-are" icon={Sparkles} title="1. What SchoolSoft+ is" color="oklch(0.65 0.22 278)" delay={0}>
          <p>
            SchoolSoft+ is an independent, student-built web app that provides a faster and more enjoyable
            interface for your existing SchoolSoft account. It is{" "}
            <strong className="text-white/80">not affiliated with, endorsed by, or in any way connected to SchoolSoft AB</strong>{" "}
            or Internationella Engelska Skolan.
          </p>
          <p>
            SchoolSoft+ does not replace SchoolSoft — it reads data from it on your behalf, using your own credentials,
            and displays it in a modern dashboard. All official data ultimately comes from SchoolSoft's servers.
          </p>
          <p>
            SchoolSoft+ is <strong className="text-white/80">open source</strong> and released under the{" "}
            <a href="https://github.com/elias4044/schoolsoftplus/blob/main/LICENSE" target="_blank" rel="noopener"
              className="underline underline-offset-2" style={{ color: "oklch(0.72 0.16 263)" }}>MIT License</a>.
            The source code is publicly available at{" "}
            <a href="https://github.com/elias4044/schoolsoftplus" target="_blank" rel="noopener"
              className="underline underline-offset-2" style={{ color: "oklch(0.72 0.16 263)" }}>github.com/elias4044/schoolsoftplus</a>.
            Developer documentation lives at{" "}
            <a href="https://developer.ssp.elias4044.com" target="_blank" rel="noopener"
              className="underline underline-offset-2" style={{ color: "oklch(0.72 0.16 263)" }}>developer.ssp.elias4044.com</a>.
          </p>
          <Callout>By using SchoolSoft+ you agree to these terms. If you don't agree, please don't use the service.</Callout>
        </Section>

        <Section id="your-data" icon={Lock} title="2. Your credentials &amp; data" color="oklch(0.72 0.18 148)" delay={0.04}>
          <p>We take your privacy seriously. Here is exactly what happens when you log in:</p>
          <ul className="space-y-2 ml-1">
            <Bullet>Your username and password are sent <strong className="text-white/80">directly to SchoolSoft's login endpoint</strong> over HTTPS — the same request your browser would make on the official site.</Bullet>
            <Bullet><strong className="text-white/80">Your password is never stored</strong> — not in our database, not in any log, not anywhere. It is used once, forwarded, and discarded.</Bullet>
            <Bullet>On a successful login, SchoolSoft returns session cookies (<Chip>JSESSIONID</Chip>, <Chip>hash</Chip>). We store these as <strong className="text-white/80">httpOnly cookies</strong> so they can never be read by JavaScript.</Bullet>
            <Bullet>Cookies expire after <strong className="text-white/80">7 days</strong>. You can sign out at any time to clear them immediately.</Bullet>
            <Bullet>We store your <strong className="text-white/80">username (lowercase)</strong> in Firebase for note and goal storage — see §4 below.</Bullet>
          </ul>
          <Callout color="oklch(0.72 0.18 148)">We never sell, share, or monetise any of your personal information. Ever.</Callout>
        </Section>

        <Section id="cookies" icon={Cookie} title="3. Cookies &amp; storage" color="oklch(0.75 0.18 40)" delay={0.08}>
          <p>SchoolSoft+ sets only the cookies it needs to function. No tracking, no advertising.</p>
          <DarkTable
            cols={["Cookie", "Purpose", "Expires"]}
            rows={[
              ["ssp_jsessionid", "SchoolSoft session token (httpOnly)", "7 days"],
              ["ssp_hash",       "SchoolSoft auth hash (httpOnly)",     "7 days"],
              ["ssp_usertype",   "User type flag (httpOnly)",           "7 days"],
              ["ssp_school",     "Your school slug",                    "7 days"],
              ["ssp_username",   "Your username (not sensitive)",       "7 days"],
            ]}
          />
          <p>No third-party tracking cookies are set. Local storage is used only for your dashboard widget layout preferences.</p>
        </Section>

        <Section id="firebase" icon={Database} title="4. What we store in Firebase" color="oklch(0.72 0.16 263)" delay={0.12}>
          <p>
            We use <strong className="text-white/80">Google Firebase Firestore</strong> to store data that belongs to you and needs to
            persist across sessions. All writes go through our server-side API; direct client writes are blocked by Firestore security rules except where explicitly noted.
          </p>
          <DarkTable
            cols={["Collection", "What is stored"]}
            rows={[
              ["profiles_v1",       "Display name, bio, location, website, profile picture URL, session snapshot."],
              ["notes_v2",          "Your notes (title, Markdown content, status, optional share token)."],
              ["conversations_v1",  "DM conversation metadata (participants, last message preview, timestamps)."],
              ["messages_v1",       "Individual DM messages (content, sender, timestamps, reactions, reply context)."],
              ["countdowns_v1",     "Your personal countdown timers (title, target date, category, theme)."],
              ["dashboard_layouts", "Your dashboard widget layout and configuration."],
              ["stats/loginStats",  "Anonymous aggregate counters — no link to individual users."],
            ]}
          />
          <p>
            Anonymous aggregate statistics (total logins, feature usage counts, login-hour histograms, active schools, total messages,
            reactions, AI requests) are stored in a separate Firestore document with <strong className="text-white/80">no link back to any individual user</strong>.
          </p>
          <Callout color="oklch(0.72 0.16 263)">
            You can request deletion of all your stored data by emailing us (see §12). We will process it within 7 days.
          </Callout>
        </Section>

        <Section id="profiles" icon={UserCircle} title="5. User profiles" color="oklch(0.72 0.18 190)" delay={0.16}>
          <p>
            SchoolSoft+ maintains a public profile for each user inside the <Chip>profiles_v1</Chip> collection.
            Profiles are created and updated when you visit the Profile page.
          </p>
          <ul className="space-y-2 ml-1">
            <Bullet><strong className="text-white/80">Editable fields</strong>: display name (max 80 chars), bio (max 300 chars), location (max 80 chars), website URL, and profile picture URL.</Bullet>
            <Bullet><strong className="text-white/80">Session snapshot fields</strong> (read-only, refreshed from SchoolSoft on every profile save): first name, last name, email address, school name, and user type.</Bullet>
            <Bullet><strong className="text-white/80">Profile visibility</strong>: any authenticated SchoolSoft+ user can read your profile. Required for user-search and displaying names in conversations.</Bullet>
            <Bullet>Profile picture URLs point to externally hosted images. We do not host images ourselves.</Bullet>
            <Bullet>Your display name is automatically synced to all active conversations when you update it.</Bullet>
          </ul>
          <Callout color="oklch(0.72 0.18 190)">
            Do not put sensitive information (passwords, phone numbers, ID numbers) in your public profile fields.
          </Callout>
        </Section>

        <Section id="messaging" icon={MessageCircle} title="6. Direct messaging" color="oklch(0.75 0.18 40)" delay={0.20}>
          <p>
            SchoolSoft+ includes a real-time direct messaging system. Messages and conversations are stored in Firebase
            Firestore and delivered via live listeners.
          </p>
          <ul className="space-y-2 ml-1">
            <Bullet><strong className="text-white/80">What is stored</strong>: message content, sender username, sender display name, timestamp, edit history flag, soft-delete flag, pin status, emoji reactions, and reply context.</Bullet>
            <Bullet><strong className="text-white/80">Conversations</strong> are strictly one-to-one (DMs). Each stores participant usernames, display name snapshots, and a preview of the last message.</Bullet>
            <Bullet>The client loads up to <strong className="text-white/80">100 most recent messages</strong> per conversation and up to <strong className="text-white/80">50 conversations</strong>.</Bullet>
            <Bullet>Messages are <strong className="text-white/80">soft-deleted</strong> — content is hidden but the record remains. Permanently purging requires a deletion request (see §12).</Bullet>
            <Bullet>Firestore security rules ensure <strong className="text-white/80">only participants</strong> can read a conversation or its messages. All writes go through our server-side API.</Bullet>
          </ul>
          <Callout color="oklch(0.75 0.18 40)">
            Do not send sensitive personal information, passwords, or illegal content. You are responsible for the content of messages you send.
          </Callout>
        </Section>

        <Section id="ai" icon={Brain} title="7. AI assistant" color="oklch(0.75 0.18 310)" delay={0.24}>
          <p>
            SchoolSoft+ includes an AI assistant powered by <strong className="text-white/80">Google Gemini</strong>. When you send a message:
          </p>
          <ul className="space-y-2 ml-1">
            <Bullet>Your message and relevant context (schedule, assignments) are sent to Google's API to generate a response.</Bullet>
            <Bullet>Messages are subject to <a href="https://policies.google.com/privacy" target="_blank" rel="noopener" className="underline underline-offset-2" style={{ color: "oklch(0.72 0.16 263)" }}>Google's privacy policy</a>.</Bullet>
            <Bullet>We do not store your AI conversation history in our database.</Bullet>
            <Bullet>Messages are capped at <strong className="text-white/80">1,000 characters</strong>.</Bullet>
            <Bullet>A rate limit of <strong className="text-white/80">8 messages per minute</strong> per IP address applies to prevent abuse.</Bullet>
          </ul>
          <Callout color="oklch(0.75 0.18 310)">
            Don't share sensitive personal information (passwords, ID numbers, etc.) with the AI assistant.
          </Callout>
        </Section>

        <Section id="notes" icon={StickyNote} title="8. Notes &amp; shared content" color="oklch(0.72 0.18 148)" delay={0.28}>
          <p>
            Notes you create are private by default and stored server-side in Firebase (the client SDK has no direct
            access to the notes collection). Notes support Markdown and can have a status of <em>draft</em>, <em>published</em>, or <em>archived</em>.
          </p>
          <p>
            If you use the share feature, a unique public link is generated via a share token.
            Anyone with that link can view the note — you are responsible for what you share.
          </p>
          <ul className="space-y-2 ml-1">
            <Bullet>Do not share content that is illegal, harmful, or violates SchoolSoft's own acceptable use policy.</Bullet>
            <Bullet>Shared notes can be deleted at any time from your notes list, which immediately revokes the public link.</Bullet>
          </ul>
        </Section>

        <Section id="countdowns" icon={Timer} title="9. Countdowns" color="oklch(0.78 0.16 55)" delay={0.32}>
          <p>
            SchoolSoft+ lets you create personal countdown timers. Countdowns are stored privately in Firebase under
            your username and are never visible to other users.
          </p>
          <ul className="space-y-2 ml-1">
            <Bullet>Each countdown stores: title, optional description, target date, category, colour theme, and emoji.</Bullet>
            <Bullet>Countdowns can be pinned or archived; archived countdowns are kept until you delete them.</Bullet>
            <Bullet>All reads and writes go through the server-side API.</Bullet>
          </ul>
        </Section>

        <Section id="conduct" icon={AlertTriangle} title="10. Acceptable use" color="oklch(0.78 0.16 55)" delay={0.36}>
          <p>You agree not to:</p>
          <ul className="space-y-2 ml-1">
            <Bullet>Attempt to scrape, crawl, or automate requests to SchoolSoft+ or to SchoolSoft through SchoolSoft+.</Bullet>
            <Bullet>Use the service to access another student's data without their consent.</Bullet>
            <Bullet>Attempt to reverse-engineer, decompile, or tamper with the service.</Bullet>
            <Bullet>Use the AI assistant or messaging feature to generate or send harmful, hateful, or illegal content.</Bullet>
            <Bullet>Circumvent rate limits or other technical controls.</Bullet>
            <Bullet>Upload or link to profile pictures or website URLs containing inappropriate or illegal content.</Bullet>
          </ul>
          <p>Violations may result in immediate suspension of access and, where appropriate, reporting to school administration.</p>
        </Section>

        <Section id="disclaimers" icon={Eye} title="11. Disclaimers &amp; liability" color="oklch(0.70 0.18 320)" delay={0.40}>
          <p>
            SchoolSoft+ is provided <strong className="text-white/80">"as is"</strong> with no warranty of uptime, accuracy, or fitness for any particular purpose.
            Because this service depends on SchoolSoft's own API, any changes or outages on their end will affect availability here.
          </p>
          <ul className="space-y-2 ml-1">
            <Bullet>We are not responsible for data shown being out of date or inaccurate — always check the official SchoolSoft portal for critical information.</Bullet>
            <Bullet>We are not liable for any loss arising from use or inability to use SchoolSoft+.</Bullet>
            <Bullet>These terms may be updated at any time. Continued use after an update constitutes acceptance.</Bullet>
          </ul>
        </Section>

        <Section id="contact" icon={Mail} title="12. Contact" color="oklch(0.65 0.22 278)" delay={0.44}>
          <p>Questions, data deletion requests, or bug reports — reach out:</p>
          <ul className="space-y-2 ml-1">
            <Bullet>Email: <a href="mailto:hello@elias4044.com" className="underline underline-offset-2" style={{ color: "oklch(0.72 0.16 263)" }}>hello@elias4044.com</a></Bullet>
          </ul>
          <p>SchoolSoft+ is an independent project, not affiliated with SchoolSoft AB or Internationella Engelska Skolan.</p>
        </Section>

        {/* Footer nav */}
        <Reveal className="pt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-white/25">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <span className="opacity-40">·</span>
          <Link href="/login-help" className="hover:text-white transition-colors">Login help</Link>
          <span className="opacity-40">·</span>
          <Link href="/stats" className="hover:text-white transition-colors">Stats</Link>
          <span className="opacity-40">·</span>
          <Link href="/open-source" className="hover:text-white transition-colors">Open Source</Link>
          <span className="opacity-40">·</span>
          <a href="https://developer.ssp.elias4044.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Developers</a>
          <span className="opacity-40">·</span>
          <span>Not affiliated with SchoolSoft AB</span>
        </Reveal>

      </div>
    </div>
  );
}
