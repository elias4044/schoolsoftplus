"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView, useScroll, useTransform, useSpring, AnimatePresence } from "framer-motion";
import {
  Lock, ShieldCheck, MessageSquare, Users, Zap, Eye, EyeOff,
  ArrowRight, Key, Server, Wifi, CheckCircle2, ImageIcon, Smile,
  Reply, Pin, Hash, AtSign, Bell, Phone, Mic, MicOff, PhoneOff, FlaskConical,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* ─── helpers ─────────────────────────────────────────────── */
function useGsapRef<T extends HTMLElement>() {
  return useRef<T>(null);
}

/* ─── Animated conversation ───────────────────────────────── */
const MESSAGES = [
  { id: 1, from: "Sofia",    mine: false, text: "did you see the physics results 👀",           delay: 0 },
  { id: 2, from: "you",      mine: true,  text: "yeah… not great lol",                          delay: 0.6 },
  { id: 3, from: "Sofia",    mine: false, text: "same 💀 wanna study together after school?",   delay: 1.2 },
  { id: 4, from: "you",      mine: true,  text: "yes definitely — library @ 15:30?",            delay: 1.8 },
  { id: 5, from: "Sofia",    mine: false, text: "perfect 🙌",                                   delay: 2.4 },
];

const REACTIONS = [
  { emoji: "👍", count: 3, delay: 3.0 },
  { emoji: "❤️", count: 1, delay: 3.2 },
];

function LiveChat({ active }: { active: boolean }) {
  const [visible, setVisible] = useState<number[]>([]);
  const [reactionsVisible, setReactionsVisible] = useState(false);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (!active) { setVisible([]); setReactionsVisible(false); setTyping(false); return; }
    const timers: ReturnType<typeof setTimeout>[] = [];
    MESSAGES.forEach((m, i) => {
      // show typing indicator before each received message
      if (!m.mine && i > 0) {
        timers.push(setTimeout(() => setTyping(true), m.delay * 1000 - 400));
      }
      timers.push(setTimeout(() => {
        setTyping(false);
        setVisible(v => [...v, m.id]);
      }, m.delay * 1000 + 300));
    });
    timers.push(setTimeout(() => setReactionsVisible(true), 3200));
    return () => timers.forEach(clearTimeout);
  }, [active]);

  return (
    <div className="flex flex-col gap-2 px-4 py-4 min-h-70">
      {MESSAGES.map(m => (
        visible.includes(m.id) ? (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 10, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={`flex ${m.mine ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-[11px] leading-relaxed ${
              m.mine
                ? "text-white rounded-br-sm"
                : "bg-white/8 border border-white/10 text-white/90 rounded-bl-sm"
            }`}
              style={m.mine ? { background: "linear-gradient(135deg, oklch(0.65 0.22 278), oklch(0.55 0.25 295))" } : undefined}
            >
              {!m.mine && <p className="text-[9px] font-semibold mb-0.5 text-purple-300/70">{m.from}</p>}
              {m.text}
            </div>
          </motion.div>
        ) : null
      ))}

      {/* Typing indicator */}
      <AnimatePresence>
        {typing && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="flex justify-start"
          >
            <div className="bg-white/8 border border-white/10 rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex gap-1 items-center">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-white/40"
                  animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reactions on last message */}
      <AnimatePresence>
        {reactionsVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
            className="flex justify-end gap-1 -mt-1 pr-1"
          >
            {REACTIONS.map(r => (
              <div key={r.emoji} className="flex items-center gap-0.5 rounded-full border border-white/15 bg-white/8 px-2 py-0.5 text-[10px]">
                <span>{r.emoji}</span>
                <span className="text-white/50">{r.count}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── E2EE visualiser ─────────────────────────────────────── */
const E2EE_STEPS = [
  { icon: Key,          label: "Your device generates a key",    desc: "AES-GCM 256-bit — happens locally, never leaves your browser" },
  { icon: Lock,         label: "Message is encrypted client-side", desc: "Ciphertext only — not even our servers can read it" },
  { icon: Server,       label: "Encrypted blob stored + relayed", desc: "We store gibberish. Breach us, get nothing." },
  { icon: ShieldCheck,  label: "Recipient decrypts locally",      desc: "Only someone with the group password can read it" },
];

function E2EEFlow() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const [active, setActive] = useState(-1);

  useEffect(() => {
    if (!inView) return;
    const timers = E2EE_STEPS.map((_, i) =>
      setTimeout(() => setActive(i), 300 + i * 500)
    );
    return () => timers.forEach(clearTimeout);
  }, [inView]);

  return (
    <div ref={ref} className="relative flex flex-col gap-0">
      {E2EE_STEPS.map((step, i) => {
        const Icon = step.icon;
        const done = active >= i;
        return (
          <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
            {/* vertical line */}
            {i < E2EE_STEPS.length - 1 && (
              <div className="absolute left-3.75 top-8 bottom-0 w-px">
                <motion.div
                  className="absolute inset-0 origin-top"
                  style={{ background: "oklch(0.65 0.22 278 / 40%)" }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: active > i ? 1 : 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                />
                <div className="absolute inset-0 bg-white/10" />
              </div>
            )}
            {/* icon dot */}
            <motion.div
              className="w-8 h-8 rounded-full border flex items-center justify-center shrink-0 z-10"
              initial={{ borderColor: "oklch(1 0 0 / 10%)", backgroundColor: "transparent" }}
              animate={{
                borderColor: done ? "oklch(0.65 0.22 278)" : "oklch(1 0 0 / 10%)",
                backgroundColor: done ? "oklch(0.65 0.22 278 / 20%)" : "transparent",
              }}
              transition={{ duration: 0.35 }}
            >
              <motion.div
                initial={{ opacity: 0.2, scale: 0.7 }}
                animate={{ opacity: done ? 1 : 0.2, scale: done ? 1 : 0.7 }}
                transition={{ duration: 0.3 }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: done ? "oklch(0.65 0.22 278)" : "oklch(1 0 0 / 30%)" }} />
              </motion.div>
            </motion.div>
            {/* text */}
            <motion.div
              className="flex flex-col justify-center"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: done ? 1 : 0.2, x: done ? 0 : -8 }}
              transition={{ duration: 0.35 }}
            >
              <p className="text-xs font-semibold leading-snug" style={{ color: done ? "white" : "oklch(1 0 0 / 30%)" }}>
                {step.label}
              </p>
              <p className="text-[10px] text-white/40 mt-0.5 leading-snug">{step.desc}</p>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Feature pill ────────────────────────────────────────── */
function Pill({ icon: Icon, label, color, delay = 0 }: { icon: React.ElementType; label: string; color: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-5% 0px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12, scale: 0.92 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur px-3.5 py-1.5 text-[11px] font-medium text-white/80"
    >
      <div className="w-4 h-4 flex items-center justify-center" style={{ color }}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      {label}
    </motion.div>
  );
}

/* ─── Encrypted message preview ──────────────────────────── */
function EncryptedPreview() {
  const [revealed, setRevealed] = useState(false);
  const raw = "U2FsdGVkX1+9kX2mRhQZ4wAbc...=";
  const plain = "yeah… not great lol";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 space-y-3 cursor-pointer select-none"
      onClick={() => setRevealed(v => !v)}
    >
      <div className="flex items-center gap-2 text-[10px] text-white/40 font-mono">
        <span className="w-2 h-2 rounded-full bg-green-400/60 inline-block" />
        stored in database
      </div>
      <div className="relative overflow-hidden rounded-lg bg-black/30 border border-white/8 px-3 py-2 min-h-10">
        <AnimatePresence mode="wait">
          {revealed ? (
            <motion.p
              key="plain"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-xs text-green-300 font-medium"
            >
              {plain}
            </motion.p>
          ) : (
            <motion.p
              key="cipher"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-[10px] text-white/25 font-mono break-all leading-relaxed"
            >
              {raw}
              <span className="inline-block w-48 h-2 bg-white/10 rounded ml-1 align-middle" />
              <span className="inline-block w-32 h-2 bg-white/10 rounded ml-1 align-middle" />
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-white/30">
        {revealed
          ? <><Eye className="w-3 h-3 text-green-400/60" /><span className="text-green-400/60">Decrypted with your key</span></>
          : <><EyeOff className="w-3 h-3" /><span>Click to simulate decryption</span></>
        }
      </div>
    </div>
  );
}

/* ─── Group chat mock ─────────────────────────────────────── */
function GroupChatMock() {
  const members = ["Alex", "Sofia", "Marcus", "Emma", "You"];
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: "oklch(0.65 0.22 278 / 30%)", color: "oklch(0.75 0.22 278)" }}>
          <Hash className="w-3.5 h-3.5" />
        </div>
        <div>
          <p className="text-xs font-semibold text-white/90">Physics Study Group</p>
          <p className="text-[9px] text-white/35">{members.length} members · end-to-end encrypted</p>
        </div>
        <Lock className="w-3 h-3 text-purple-400/60 ml-auto" />
      </div>
      <div className="flex -space-x-2 px-4 py-3 border-b border-white/8">
        {members.map((m, i) => (
          <div
            key={m}
            className="w-6 h-6 rounded-full border border-[#0f0f0f] flex items-center justify-center text-[8px] font-bold"
            style={{ background: `oklch(${0.55 + i * 0.05} 0.18 ${240 + i * 30})` }}
            title={m}
          >
            {m[0]}
          </div>
        ))}
        <div className="w-6 h-6 rounded-full border border-[#0f0f0f] bg-white/10 flex items-center justify-center text-[8px] text-white/50">+1</div>
      </div>
      <div className="px-4 py-3 space-y-2">
        {[
          { from: "Marcus", text: "I'll bring my notes on chapter 12", mine: false },
          { from: "Emma",   text: "same for 13 and 14 👍",              mine: false },
          { from: "You",    text: "perfect, see you all at 15:30",      mine: true  },
        ].map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: m.mine ? 10 : -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={`flex ${m.mine ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[80%] rounded-xl px-3 py-1.5 text-[10px] ${
              m.mine ? "text-white rounded-br-sm" : "bg-white/8 border border-white/8 text-white/80 rounded-bl-sm"
            }`}
              style={m.mine ? { background: "oklch(0.55 0.22 278 / 80%)" } : undefined}
            >
              {!m.mine && <p className="text-[8px] text-purple-300/50 font-semibold mb-0.5">{m.from}</p>}
              {m.text}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── GSAP horizontal scroll section ─────────────────────── */
function FeatureScroller() {
  const trackRef = useRef<HTMLDivElement>(null);
  const inView = useInView(trackRef, { once: true, margin: "-10% 0px" });

  const FEATURES = [
    {
      icon: MessageSquare,
      color: "oklch(0.65 0.22 278)",
      title: "Real-time, always",
      body: "No polling. No refresh button. Messages arrive via Firestore's realtime socket the instant they're sent. If both of you are online you'll feel it.",
    },
    {
      icon: Lock,
      color: "oklch(0.72 0.18 148)",
      title: "End-to-end encrypted groups",
      body: "When you create an encrypted group the password never leaves your browser. We derive an AES-GCM-256 key via PBKDF2 (310 000 iterations) and every message is encrypted before it hits the network.",
    },
    {
      icon: Users,
      color: "oklch(0.75 0.18 40)",
      title: "Quick to get started",
      body: "Pick a display name — that's the only required step. After that you can DM anyone at your school who's set up their profile. No phone numbers, no extra accounts.",
    },
    {
      icon: ImageIcon,
      color: "oklch(0.70 0.18 310)",
      title: "Images & GIFs",
      body: "Attach images straight from your device, paste from clipboard, or pick a GIF. Images host on ImgBB, render inline. No awkward links, no downloading.",
    },
    {
      icon: Reply,
      color: "oklch(0.72 0.18 190)",
      title: "Threads that make sense",
      body: "Quote any message to reply directly. Conversations stay readable even with 20 people in a group. Reactions, edits, pins — the stuff that actually matters.",
    },
    {
      icon: ShieldCheck,
      color: "oklch(0.68 0.20 150)",
      title: "Zero server-side reading",
      body: "In encrypted mode our database literally stores ciphertext. We can't read it. Law enforcement can't subpoena it. Even if someone cloned the database they'd get noise.",
    },
  ];

  return (
    <div className="relative">
      {/* scrollable track */}
      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto pb-6 px-[8vw]"
        style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
      >
        {FEATURES.map(({ icon: Icon, color, title, body }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="w-75 md:w-85 shrink-0 rounded-3xl border border-white/10 bg-[#0a0a0a] p-7 flex flex-col gap-4"
            style={{ scrollSnapAlign: "start" }}
          >
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: `${color}20`, color }}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-base font-bold tracking-tight text-white mb-2">{title}</p>
              <p className="text-sm text-white/45 leading-relaxed">{body}</p>
            </div>
          </motion.div>
        ))}
        {/* trailing spacer */}
        <div className="w-[4vw] shrink-0" />
      </div>

      {/* fade edges */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-6 w-16"
        style={{ background: "linear-gradient(to right, #080808, transparent)" }} />
      <div className="pointer-events-none absolute right-0 top-0 bottom-6 w-24"
        style={{ background: "linear-gradient(to left, #080808, transparent)" }} />

      {/* scroll hint dots */}
      <div className="flex justify-center gap-1.5 mt-2 pb-2">
        {[0,1,2].map(i => (
          <motion.div
            key={i}
            className="w-1 h-1 rounded-full bg-white/20"
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.25 }}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Stats counter ───────────────────────────────────────── */
function BigStat({ value, label, suffix = "" }: { value: number | null; label: string; suffix?: string }) {
  const [display, setDisplay] = useState("0");
  useEffect(() => {
    if (!value) return;
    let start: number | null = null;
    const animate = (now: number) => {
      if (!start) start = now;
      const t = Math.min((now - start) / 1400, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      setDisplay(Math.round(ease * value).toLocaleString());
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-4xl md:text-5xl font-black tracking-tighter tabular-nums" style={{ color: "oklch(0.75 0.22 278)" }}>
        {value ? display : <span className="opacity-20">—</span>}{suffix}
      </p>
      <p className="text-xs text-white/35 text-center leading-snug max-w-30">{label}</p>
    </div>
  );
}

/* ─── Main export ─────────────────────────────────────────── */
export default function MessagingShowcase() {
  const heroRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const chatInView = useInView(chatRef, { once: true, margin: "-20% 0px" });

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  const [msgCount, setMsgCount] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/stats").then(r => r.json()).then(d => {
      if (d.success) setMsgCount(d.totalMessagesSent ?? null);
    }).catch(() => {});
  }, []);

  /* GSAP parallax orbs */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ctx = gsap.context(() => {
      gsap.to(".orb-1", {
        yPercent: -40, ease: "none",
        scrollTrigger: { trigger: heroRef.current, start: "top top", end: "bottom top", scrub: true },
      });
      gsap.to(".orb-2", {
        yPercent: -20, ease: "none",
        scrollTrigger: { trigger: heroRef.current, start: "top top", end: "bottom top", scrub: true },
      });

      /* stagger in the headline words */
      gsap.fromTo(".hero-word", { opacity: 0, y: 40, rotateX: -30 }, {
        opacity: 1, y: 0, rotateX: 0,
        stagger: 0.06,
        duration: 0.9,
        ease: "power4.out",
        delay: 0.1,
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div className="bg-[#080808] text-white overflow-hidden">

      {/* ══════════════════════════════════════
          HERO — full viewport
      ══════════════════════════════════════ */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* ambient orbs */}
        <div className="orb-1 absolute -top-32 -left-32 w-150 h-150 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, oklch(0.55 0.25 278 / 18%) 0%, transparent 70%)" }} />
        <div className="orb-2 absolute -bottom-20 -right-20 w-125 h-125 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, oklch(0.60 0.20 310 / 12%) 0%, transparent 70%)" }} />
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(oklch(1 0 0 / 3%) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

        <motion.div style={{ y, opacity }} className="relative z-10 flex flex-col items-center text-center px-6 max-w-4xl mx-auto">
          {/* eyebrow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="inline-flex items-center gap-2 rounded-full border border-purple-500/25 bg-purple-500/10 px-4 py-1.5 text-xs text-purple-300/80 mb-8 backdrop-blur"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            Built into SchoolSoft+ · No extra app
          </motion.div>

          {/* headline — each word animated by GSAP */}
          <div className="perspective-midrange mb-6">
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.95]">
              {"Talk to your\nclassmates.".split(/\s+/).map((word, i) => (
                <span key={i} className="hero-word inline-block mr-[0.22em] last:mr-0 opacity-0">{word}</span>
              ))}
            </h2>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="text-base md:text-lg text-white/45 max-w-xl leading-relaxed mb-10"
          >
            Real-time DMs, group chats with end-to-end encryption, reactions, images, GIFs.
            No phone number. No third-party app. Set up a display name once — then message anyone at your school.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="flex flex-wrap justify-center gap-2 mb-12"
          >
            {[
              [MessageSquare, "Real-time",   "oklch(0.65 0.22 278)"],
              [Lock,          "E2E encrypted","oklch(0.72 0.18 148)"],
              [ImageIcon,     "Images & GIFs","oklch(0.70 0.18 310)"],
              [Smile,         "Reactions",    "oklch(0.75 0.18 40)" ],
              [Bell,          "Notifications","oklch(0.72 0.18 190)"],
              [AtSign,        "Everyone included","oklch(0.68 0.20 60)"],
            ].map(([icon, label, color], i) => (
              <Pill key={label as string} icon={icon as React.ElementType} label={label as string} color={color as string} delay={1.0 + i * 0.06} />
            ))}
          </motion.div>

          {/* stat */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="flex flex-col items-center gap-1"
          >
            <BigStat value={msgCount} label="messages sent between students" />
          </motion.div>
        </motion.div>

        {/* scroll cue */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="w-px h-10 rounded-full"
            style={{ background: "linear-gradient(to bottom, oklch(0.65 0.22 278 / 60%), transparent)" }}
          />
        </motion.div>
      </section>

      {/* ══════════════════════════════════════
          LIVE CHAT DEMO
      ══════════════════════════════════════ */}
      <section className="relative border-t border-white/5 py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 50% at 80% 50%, oklch(0.55 0.22 278 / 8%), transparent)" }} />

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-15% 0px" }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-3">Direct messages</p>
              <h3 className="text-3xl md:text-4xl font-black tracking-tight leading-tight mb-4">
                Feels instant.<br />
                <span style={{ color: "oklch(0.70 0.22 278)" }}>Because it is.</span>
              </h3>
              <p className="text-sm text-white/40 leading-relaxed mb-6">
                We use Firestore's realtime subscriptions. The moment someone sends a message, it's on your screen.
                No "refresh to see new messages". No 3-second delay. Just instant.
              </p>
              <p className="text-sm text-white/40 leading-relaxed">
                Any student at your school can sign up. All it takes is setting a display name once — after that, DM anyone by username. You'll see when they were last online, unread counts, and get browser notifications when someone messages you while you're away.
              </p>
            </motion.div>
          </div>

          {/* Chat window */}
          <motion.div
            ref={chatRef}
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-15% 0px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-3xl border border-white/10 bg-[#0d0d0d] overflow-hidden shadow-[0_40px_100px_oklch(0_0_0/0.6)]"
          >
            {/* chrome */}
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/8 bg-white/3">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "oklch(0.60 0.22 20)" }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "oklch(0.72 0.18 70)" }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "oklch(0.65 0.22 145)" }} />
              <div className="ml-3 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-purple-500/30 flex items-center justify-center text-[9px] font-bold text-purple-300">S</div>
                <span className="text-[11px] font-medium text-white/60">Sofia</span>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              </div>
              <div className="ml-auto flex items-center gap-1 text-[9px] text-white/20">
                <Wifi className="w-3 h-3" /> live
              </div>
            </div>
            <LiveChat active={chatInView} />
            {/* compose mock */}
            <div className="border-t border-white/8 px-4 py-3 flex items-center gap-2">
              <div className="flex-1 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-[10px] text-white/20">
                Message Sofia…
              </div>
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 278), oklch(0.55 0.25 295))" }}>
                <ArrowRight className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          E2EE DEEP DIVE
      ══════════════════════════════════════ */}
      <section className="relative border-t border-white/5 py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 50% 60% at 20% 50%, oklch(0.50 0.22 148 / 8%), transparent)" }} />

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-start">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-15% 0px" }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-3">End-to-end encryption</p>
              <h3 className="text-3xl md:text-4xl font-black tracking-tight leading-tight mb-5">
                We genuinely<br />
                <span style={{ color: "oklch(0.70 0.18 148)" }}>can't read it.</span>
              </h3>
              <p className="text-sm text-white/40 leading-relaxed mb-4">
                Not "we promise we don't look". Technically cannot. When you create an encrypted group and set a password,
                your browser derives an AES-GCM 256-bit key using PBKDF2 with 310,000 iterations — way above NIST recommendations.
              </p>
              <p className="text-sm text-white/40 leading-relaxed mb-4">
                Every message is encrypted <span className="text-white/70 font-medium">before it leaves your device</span>. What hits our server is ciphertext.
                What's stored in our database is ciphertext. If we got hacked tomorrow, the attacker would get a pile of base64 garbage.
              </p>
              <p className="text-sm text-white/40 leading-relaxed mb-8">
                The password never touches the server. We don't store a hash of it. There's no "forgot password" — if you lose it, the group's history is gone. That's the point.
              </p>
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3">
                <ShieldCheck className="w-4 h-4 text-amber-400/70 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300/60 leading-relaxed">
                  Images sent in encrypted groups are hosted on ImgBB and are <span className="text-amber-300/90">not</span> encrypted — only text messages are. This is noted in the UI.
                </p>
              </div>
            </motion.div>
          </div>

          <div className="flex flex-col gap-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-15% 0px" }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <E2EEFlow />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <p className="text-[10px] uppercase tracking-widest text-white/25 mb-3">What an attacker sees in the database</p>
              <EncryptedPreview />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          GROUP CHAT SECTION
      ══════════════════════════════════════ */}
      <section className="relative border-t border-white/5 py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 50% at 60% 60%, oklch(0.55 0.18 310 / 8%), transparent)" }} />

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-15% 0px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="order-2 md:order-1"
          >
            <GroupChatMock />
          </motion.div>

          <div className="order-1 md:order-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-15% 0px" }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-3">Group chats</p>
              <h3 className="text-3xl md:text-4xl font-black tracking-tight leading-tight mb-5">
                Coordinate.<br />
                <span style={{ color: "oklch(0.70 0.18 310)" }}>Actually.</span>
              </h3>
              <p className="text-sm text-white/40 leading-relaxed mb-6">
                Create a group for your study session, add the people who matter, lock it down with E2EE if you want.
                No one outside the group can see the name list or message history.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Hash,    color: "oklch(0.65 0.22 278)", t: "Named groups",       d: "Give the group a name and description. Works for study groups, friend groups, project teams — whatever." },
                  { icon: Lock,    color: "oklch(0.72 0.18 148)", t: "Optional E2EE",      d: "Toggle encryption at creation time. Set a shared password. From that point forward, messages are unreadable without it." },
                  { icon: Pin,     color: "oklch(0.75 0.18 40)",  t: "Pin important stuff", d: "Pin messages so they don't get buried. See all pinned messages in the side panel at any time." },
                  { icon: CheckCircle2, color: "oklch(0.72 0.18 190)", t: "Admin controls", d: "Transfer admin, remove members, change description. You're in charge of groups you create." },
                ].map(({ icon: Icon, color, t, d }, i) => (
                  <motion.div
                    key={t}
                    initial={{ opacity: 0, x: 16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-5% 0px" }}
                    transition={{ duration: 0.45, delay: i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `${color}20`, color }}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white/80 mb-0.5">{t}</p>
                      <p className="text-[11px] text-white/35 leading-relaxed">{d}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          VOICE CALLS (EARLY BETA)
      ══════════════════════════════════════ */}
      <section className="relative border-t border-white/5 py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 55% 60% at 30% 50%, oklch(0.55 0.18 190 / 9%), transparent)" }} />

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          {/* Call UI mock */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-15% 0px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            {/* Phone card */}
            <div className="rounded-3xl border border-white/10 bg-[#0d0d0d] overflow-hidden shadow-[0_40px_80px_oklch(0_0_0/0.5)] max-w-75 mx-auto">
              {/* header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8 bg-white/3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: "oklch(0.55 0.18 190 / 30%)", color: "oklch(0.72 0.18 190)" }}>
                  A
                </div>
                <div>
                  <p className="text-xs font-semibold text-white/90">Alex</p>
                  <p className="text-[10px] text-white/35">Voice call</p>
                </div>
              </div>

              {/* animated waveform */}
              <div className="flex flex-col items-center justify-center gap-5 py-10">
                <div className="relative">
                  {/* pulse rings */}
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      className="absolute rounded-full border"
                      style={{
                        inset: -(i + 1) * 14,
                        borderColor: "oklch(0.55 0.18 190 / 20%)",
                      }}
                      animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.1, 0.4] }}
                      transition={{ duration: 2, delay: i * 0.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                  ))}
                  <div className="w-16 h-16 rounded-full flex items-center justify-center relative z-10"
                    style={{ background: "oklch(0.55 0.18 190 / 20%)", border: "1.5px solid oklch(0.55 0.18 190 / 40%)" }}>
                    <Phone className="w-6 h-6" style={{ color: "oklch(0.72 0.18 190)" }} />
                  </div>
                </div>

                {/* sound bars */}
                <div className="flex items-end gap-1 h-8">
                  {[3, 5, 8, 6, 4, 7, 5, 3, 6, 4].map((h, i) => (
                    <motion.div
                      key={i}
                      className="w-1 rounded-full"
                      style={{ background: "oklch(0.65 0.18 190)", height: h * 3 }}
                      animate={{ scaleY: [1, 0.3 + Math.random() * 0.7, 1] }}
                      transition={{ duration: 0.5 + Math.random() * 0.4, repeat: Infinity, delay: i * 0.07, ease: "easeInOut" }}
                    />
                  ))}
                </div>

                <p className="text-[11px] text-white/30 font-mono">0:23</p>
              </div>

              {/* controls */}
              <div className="flex items-center justify-center gap-5 px-5 py-5 border-t border-white/8">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/8 border border-white/10">
                  <MicOff className="w-4 h-4 text-white/50" />
                </div>
                <div className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: "oklch(0.55 0.22 20 / 90%)" }}>
                  <PhoneOff className="w-5 h-5 text-white" />
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/8 border border-white/10">
                  <Mic className="w-4 h-4 text-white/50" />
                </div>
              </div>
            </div>

            {/* Incoming call card floating above */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="absolute -top-6 -right-4 rounded-2xl border border-white/10 bg-[#0d0d0d]/95 backdrop-blur px-4 py-3 shadow-2xl flex items-center gap-3 w-52"
            >
              <motion.div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "oklch(0.55 0.22 145 / 25%)", border: "1px solid oklch(0.55 0.22 145 / 40%)" }}
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                <Phone className="w-3.5 h-3.5" style={{ color: "oklch(0.72 0.22 145)" }} />
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-white/80 truncate">Incoming call</p>
                <p className="text-[9px] text-white/35">Sofia</p>
              </div>
              <div className="flex gap-1">
                <div className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: "oklch(0.55 0.22 145 / 30%)" }}>
                  <Phone className="w-3 h-3" style={{ color: "oklch(0.72 0.22 145)" }} />
                </div>
                <div className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: "oklch(0.55 0.22 20 / 30%)" }}>
                  <PhoneOff className="w-3 h-3" style={{ color: "oklch(0.72 0.22 20)" }} />
                </div>
              </div>
            </motion.div>
          </motion.div>

          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-15% 0px" }}
              transition={{ duration: 0.6 }}
            >
              {/* Beta badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] text-amber-300/80 mb-4"
              >
                <FlaskConical className="w-3 h-3" />
                Early Beta — expect rough edges
              </motion.div>

              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-3">Voice calls</p>
              <h3 className="text-3xl md:text-4xl font-black tracking-tight leading-tight mb-5">
                Talk, don&apos;t type.<br />
                <span style={{ color: "oklch(0.72 0.18 190)" }}>Right here.</span>
              </h3>
              <p className="text-sm text-white/40 leading-relaxed mb-6">
                1-to-1 voice calls are built directly into SchoolSoft+. No Zoom link, no Discord, no
                switching apps. Click the phone icon in any DM and ring the person directly — they get
                an incoming call notification wherever they are in the app.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Phone,       color: "oklch(0.72 0.18 190)", t: "In-app calling",       d: "Works on any page — the call panel floats globally so you can keep browsing while on a call." },
                  { icon: Mic,         color: "oklch(0.65 0.22 278)", t: "Mute anytime",         d: "Toggle your mic with one tap. The other person sees your mute state in real time." },
                  { icon: Zap,         color: "oklch(0.75 0.18 60)",  t: "WebRTC, peer-to-peer", d: "Audio travels directly between browsers — no server relay. Low latency, no recording." },
                  { icon: Bell,        color: "oklch(0.72 0.18 40)",  t: "Incoming anywhere",    d: "Receive ring notifications no matter which page you're on. Accept or decline without leaving." },
                ].map(({ icon: Icon, color, t, d }, i) => (
                  <motion.div
                    key={t}
                    initial={{ opacity: 0, x: 16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-5% 0px" }}
                    transition={{ duration: 0.45, delay: i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `${color}20`, color }}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white/80 mb-0.5">{t}</p>
                      <p className="text-[11px] text-white/35 leading-relaxed">{d}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          HORIZONTAL FEATURE SCROLLER (GSAP)
      ══════════════════════════════════════ */}
      <div className="border-t border-white/5">
        <div className="max-w-5xl mx-auto px-6 pt-16 pb-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2">Everything, detailed</p>
            <h3 className="text-2xl font-black tracking-tight text-white/90">Scroll through the features.</h3>
          </motion.div>
        </div>
        <FeatureScroller />
      </div>

      {/* ══════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════ */}
      <section className="relative border-t border-white/5 py-28 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 100%, oklch(0.55 0.22 278 / 12%), transparent)" }} />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.7 }}
          className="relative z-10 max-w-xl mx-auto"
        >
          <p className="text-xs uppercase tracking-widest text-white/25 mb-4">Ready?</p>
          <h3 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 leading-tight">
            Set up a name.<br />Start messaging.
          </h3>
          <p className="text-sm text-white/35 leading-relaxed mb-8">
            Sign in with your SchoolSoft credentials, pick a display name, and you're in.
            30 seconds. Free. No ads. Open source.
          </p>
          <motion.a
            href="/login"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 rounded-2xl px-8 py-3.5 text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 278), oklch(0.55 0.25 295))" }}
          >
            Start messaging <ArrowRight className="w-4 h-4" />
          </motion.a>
        </motion.div>
      </section>

    </div>
  );
}
