'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useInView,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowRight,
  AtSign,
  Bell,
  CheckCircle2,
  Eye,
  EyeOff,
  FlaskConical,
  Hash,
  ImageIcon,
  Key,
  Lock,
  MessageSquare,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Pin,
  Reply,
  Server,
  ShieldCheck,
  Smile,
  Users,
  Wifi,
  Zap,
} from 'lucide-react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/*  helpers  */
function useGsapRef<T extends HTMLElement>() {
  return useRef<T>(null);
}

/*  Animated conversation  */
const MESSAGES = [
  { id: 1, from: 'Sofia', mine: false, text: 'did you see the physics results 👀', delay: 0 },
  { id: 2, from: 'you', mine: true, text: 'yeah… not great lol', delay: 0.6 },
  {
    id: 3,
    from: 'Sofia',
    mine: false,
    text: 'same 💀 wanna study together after school?',
    delay: 1.2,
  },
  { id: 4, from: 'you', mine: true, text: 'yes definitely — library @ 15:30?', delay: 1.8 },
  { id: 5, from: 'Sofia', mine: false, text: 'perfect 🙌', delay: 2.4 },
];

const REACTIONS = [
  { emoji: '👍', count: 3, delay: 3.0 },
  { emoji: '❤️', count: 1, delay: 3.2 },
];

function LiveChat({ active }: { active: boolean }) {
  const [visible, setVisible] = useState<number[]>([]);
  const [reactionsVisible, setReactionsVisible] = useState(false);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible([]);
      setReactionsVisible(false);
      setTyping(false);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    MESSAGES.forEach((m, i) => {
      // show typing indicator before each received message
      if (!m.mine && i > 0) {
        timers.push(setTimeout(() => setTyping(true), m.delay * 1000 - 400));
      }
      timers.push(
        setTimeout(
          () => {
            setTyping(false);
            setVisible((v) => [...v, m.id]);
          },
          m.delay * 1000 + 300
        )
      );
    });
    timers.push(setTimeout(() => setReactionsVisible(true), 3200));
    return () => timers.forEach(clearTimeout);
  }, [active]);

  return (
    <div className="flex min-h-70 flex-col gap-2 px-4 py-4">
      {MESSAGES.map((m) =>
        visible.includes(m.id) ? (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 10, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-[11px] leading-relaxed ${
                m.mine
                  ? 'rounded-br-sm text-white'
                  : 'rounded-bl-sm border border-white/10 bg-white/8 text-white/90'
              }`}
              style={
                m.mine
                  ? {
                      background:
                        'linear-gradient(135deg, oklch(0.65 0.22 278), oklch(0.55 0.25 295))',
                    }
                  : undefined
              }
            >
              {!m.mine && (
                <p className="mb-0.5 text-[9px] font-semibold text-purple-300/70">{m.from}</p>
              )}
              {m.text}
            </div>
          </motion.div>
        ) : null
      )}

      {/* Typing indicator */}
      <AnimatePresence>
        {typing && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="flex justify-start"
          >
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-white/10 bg-white/8 px-3.5 py-2.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-white/40"
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
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            className="-mt-1 flex justify-end gap-1 pr-1"
          >
            {REACTIONS.map((r) => (
              <div
                key={r.emoji}
                className="flex items-center gap-0.5 rounded-full border border-white/15 bg-white/8 px-2 py-0.5 text-[10px]"
              >
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

/*  E2EE visualiser  */
const E2EE_STEPS = [
  {
    icon: Key,
    label: 'Your device generates a key',
    desc: 'AES-GCM 256-bit — happens locally, never leaves your browser',
  },
  {
    icon: Lock,
    label: 'Message is encrypted client-side',
    desc: 'Ciphertext only — not even our servers can read it',
  },
  {
    icon: Server,
    label: 'Encrypted blob stored + relayed',
    desc: 'We store gibberish. Breach us, get nothing.',
  },
  {
    icon: ShieldCheck,
    label: 'Recipient decrypts locally',
    desc: 'Only someone with the group password can read it',
  },
];

function E2EEFlow() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-15% 0px' });
  const [active, setActive] = useState(-1);

  useEffect(() => {
    if (!inView) return;
    const timers = E2EE_STEPS.map((_, i) => setTimeout(() => setActive(i), 300 + i * 500));
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
              <div className="absolute top-8 bottom-0 left-3.75 w-px">
                <motion.div
                  className="absolute inset-0 origin-top"
                  style={{ background: 'oklch(0.65 0.22 278 / 40%)' }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: active > i ? 1 : 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                />
                <div className="absolute inset-0 bg-white/10" />
              </div>
            )}
            {/* icon dot */}
            <motion.div
              className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
              initial={{ borderColor: 'oklch(1 0 0 / 10%)', backgroundColor: 'transparent' }}
              animate={{
                borderColor: done ? 'oklch(0.65 0.22 278)' : 'oklch(1 0 0 / 10%)',
                backgroundColor: done ? 'oklch(0.65 0.22 278 / 20%)' : 'transparent',
              }}
              transition={{ duration: 0.35 }}
            >
              <motion.div
                initial={{ opacity: 0.2, scale: 0.7 }}
                animate={{ opacity: done ? 1 : 0.2, scale: done ? 1 : 0.7 }}
                transition={{ duration: 0.3 }}
              >
                <Icon
                  className="h-3.5 w-3.5"
                  style={{ color: done ? 'oklch(0.65 0.22 278)' : 'oklch(1 0 0 / 30%)' }}
                />
              </motion.div>
            </motion.div>
            {/* text */}
            <motion.div
              className="flex flex-col justify-center"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: done ? 1 : 0.2, x: done ? 0 : -8 }}
              transition={{ duration: 0.35 }}
            >
              <p
                className="text-xs leading-snug font-semibold"
                style={{ color: done ? 'white' : 'oklch(1 0 0 / 30%)' }}
              >
                {step.label}
              </p>
              <p className="mt-0.5 text-[10px] leading-snug text-white/40">{step.desc}</p>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

/*  Feature pill  */
function Pill({
  icon: Icon,
  label,
  color,
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-5% 0px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12, scale: 0.92 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[11px] font-medium text-white/80 backdrop-blur"
    >
      <div className="flex h-4 w-4 items-center justify-center" style={{ color }}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      {label}
    </motion.div>
  );
}

/*  Encrypted message preview  */
function EncryptedPreview() {
  const [revealed, setRevealed] = useState(false);
  const raw = 'U2FsdGVkX1+9kX2mRhQZ4wAbc...=';
  const plain = 'yeah… not great lol';

  return (
    <div
      className="cursor-pointer space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur select-none"
      onClick={() => setRevealed((v) => !v)}
    >
      <div className="flex items-center gap-2 font-mono text-[10px] text-white/40">
        <span className="inline-block h-2 w-2 rounded-full bg-green-400/60" />
        stored in database
      </div>
      <div className="relative min-h-10 overflow-hidden rounded-lg border border-white/8 bg-black/30 px-3 py-2">
        <AnimatePresence mode="wait">
          {revealed ? (
            <motion.p
              key="plain"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-xs font-medium text-green-300"
            >
              {plain}
            </motion.p>
          ) : (
            <motion.p
              key="cipher"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="font-mono text-[10px] leading-relaxed break-all text-white/25"
            >
              {raw}
              <span className="ml-1 inline-block h-2 w-48 rounded bg-white/10 align-middle" />
              <span className="ml-1 inline-block h-2 w-32 rounded bg-white/10 align-middle" />
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-white/30">
        {revealed ? (
          <>
            <Eye className="h-3 w-3 text-green-400/60" />
            <span className="text-green-400/60">Decrypted with your key</span>
          </>
        ) : (
          <>
            <EyeOff className="h-3 w-3" />
            <span>Click to simulate decryption</span>
          </>
        )}
      </div>
    </div>
  );
}

/*  Group chat mock  */
function GroupChatMock() {
  const members = ['Alex', 'Sofia', 'Marcus', 'Emma', 'You'];
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
      <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
          style={{ background: 'oklch(0.65 0.22 278 / 30%)', color: 'oklch(0.75 0.22 278)' }}
        >
          <Hash className="h-3.5 w-3.5" />
        </div>
        <div>
          <p className="text-xs font-semibold text-white/90">Physics Study Group</p>
          <p className="text-[9px] text-white/35">
            {members.length} members · end-to-end encrypted
          </p>
        </div>
        <Lock className="ml-auto h-3 w-3 text-purple-400/60" />
      </div>
      <div className="flex -space-x-2 border-b border-white/8 px-4 py-3">
        {members.map((m, i) => (
          <div
            key={m}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-[#0f0f0f] text-[8px] font-bold"
            style={{ background: `oklch(${0.55 + i * 0.05} 0.18 ${240 + i * 30})` }}
            title={m}
          >
            {m[0]}
          </div>
        ))}
        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[#0f0f0f] bg-white/10 text-[8px] text-white/50">
          +1
        </div>
      </div>
      <div className="space-y-2 px-4 py-3">
        {[
          { from: 'Marcus', text: "I'll bring my notes on chapter 12", mine: false },
          { from: 'Emma', text: 'same for 13 and 14 👍', mine: false },
          { from: 'You', text: 'perfect, see you all at 15:30', mine: true },
        ].map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: m.mine ? 10 : -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-3 py-1.5 text-[10px] ${
                m.mine
                  ? 'rounded-br-sm text-white'
                  : 'rounded-bl-sm border border-white/8 bg-white/8 text-white/80'
              }`}
              style={m.mine ? { background: 'oklch(0.55 0.22 278 / 80%)' } : undefined}
            >
              {!m.mine && (
                <p className="mb-0.5 text-[8px] font-semibold text-purple-300/50">{m.from}</p>
              )}
              {m.text}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/*  disabled  */
function FeatureScroller() {
  const trackRef = useRef<HTMLDivElement>(null);
  const inView = useInView(trackRef, { once: true, margin: '-10% 0px' });

  const FEATURES = [
    {
      icon: MessageSquare,
      color: 'oklch(0.65 0.22 278)',
      title: 'Real-time, always',
      body: "No polling. No refresh button. Messages arrive via Firestore's realtime socket the instant they're sent. If both of you are online you'll feel it.",
    },
    {
      icon: Lock,
      color: 'oklch(0.72 0.18 148)',
      title: 'End-to-end encrypted groups',
      body: 'When you create an encrypted group the password never leaves your browser. We derive an AES-GCM-256 key via PBKDF2 (310 000 iterations) and every message is encrypted before it hits the network.',
    },
    {
      icon: Users,
      color: 'oklch(0.75 0.18 40)',
      title: 'Quick to get started',
      body: "Pick a display name — that's the only required step. After that you can DM anyone at your school who's set up their profile. No phone numbers, no extra accounts.",
    },
    {
      icon: ImageIcon,
      color: 'oklch(0.70 0.18 310)',
      title: 'Images & GIFs',
      body: 'Attach images straight from your device, paste from clipboard, or pick a GIF. Images host on ImgBB, render inline. No awkward links, no downloading.',
    },
    {
      icon: Reply,
      color: 'oklch(0.72 0.18 190)',
      title: 'Threads that make sense',
      body: 'Quote any message to reply directly. Conversations stay readable even with 20 people in a group. Reactions, edits, pins — the stuff that actually matters.',
    },
    {
      icon: ShieldCheck,
      color: 'oklch(0.68 0.20 150)',
      title: 'Zero server-side reading',
      body: "In encrypted mode our database literally stores ciphertext. We can't read it. Law enforcement can't subpoena it. Even if someone cloned the database they'd get noise.",
    },
  ];

  return (
    <div className="relative">
      <div ref={trackRef} className="grid w-full grid-cols-1 gap-3 p-4 md:grid-cols-3">
        {FEATURES.map(({ icon: Icon, color, title, body }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="flex w-75 shrink-0 flex-col gap-4 rounded-3xl border border-white/10 bg-[#0a0a0a] p-7 md:w-85"
            style={{ scrollSnapAlign: 'start' }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl"
              style={{ background: `${color}20`, color }}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="mb-2 text-base font-bold tracking-tight text-white">{title}</p>
              <p className="text-sm leading-relaxed text-white/45">{body}</p>
            </div>
          </motion.div>
        ))}
        {/* trailing spacer */}
        <div className="w-[4vw] shrink-0" />
      </div>

      {/* fade edges */}
      <div
        className="pointer-events-none absolute top-0 bottom-6 left-0 w-16"
        style={{ background: 'linear-gradient(to right, #080808, transparent)' }}
      />
      <div
        className="pointer-events-none absolute top-0 right-0 bottom-6 w-24"
        style={{ background: 'linear-gradient(to left, #080808, transparent)' }}
      />

      {/* scroll hint dots */}
      <div className="mt-2 flex justify-center gap-1.5 pb-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-1 w-1 rounded-full bg-white/20"
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.25 }}
          />
        ))}
      </div>
    </div>
  );
}

/*  Stats counter  */
function BigStat({
  value,
  label,
  suffix = '',
}: {
  value: number | null;
  label: string;
  suffix?: string;
}) {
  const [display, setDisplay] = useState('0');
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
      <p
        className="text-4xl font-black tracking-tighter tabular-nums md:text-5xl"
        style={{ color: 'oklch(0.75 0.22 278)' }}
      >
        {value ? display : <span className="opacity-20">—</span>}
        {suffix}
      </p>
      <p className="max-w-30 text-center text-xs leading-snug text-white/35">{label}</p>
    </div>
  );
}

/*  Main export  */
export default function MessagingShowcase() {
  const heroRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const chatInView = useInView(chatRef, { once: true, margin: '-20% 0px' });

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  const [msgCount, setMsgCount] = useState<number | null>(null);
  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setMsgCount(d.totalMessagesSent ?? null);
      })
      .catch(() => {});
  }, []);

  /* GSAP parallax orbs */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ctx = gsap.context(() => {
      gsap.to('.orb-1', {
        yPercent: -40,
        ease: 'none',
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });
      gsap.to('.orb-2', {
        yPercent: -20,
        ease: 'none',
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });

      /* stagger in the headline words */
      gsap.fromTo(
        '.hero-word',
        { opacity: 0, y: 40, rotateX: -30 },
        {
          opacity: 1,
          y: 0,
          rotateX: 0,
          stagger: 0.06,
          duration: 0.9,
          ease: 'power4.out',
          delay: 0.1,
        }
      );
    });
    return () => ctx.revert();
  }, []);

  return (
    <div className="overflow-hidden bg-[#080808] text-white">
      <section
        ref={heroRef}
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden"
      >
        {/* ambient orbs */}

        <div
          className="orb-2 pointer-events-none absolute -right-20 -bottom-20 h-125 w-125 rounded-full"
          style={{
            background: 'radial-gradient(circle, oklch(0.60 0.20 310 / 12%) 0%, transparent 70%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(oklch(1 0 0 / 3%) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <motion.div
          style={{ y, opacity }}
          className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 text-center"
        >
          {/* eyebrow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-purple-500/25 bg-purple-500/10 px-4 py-1.5 text-xs text-purple-300/80 backdrop-blur"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400" />
            Built into SchoolSoft+ · No extra app
          </motion.div>

          <div className="mb-6 perspective-midrange">
            <h2 className="text-5xl leading-[0.95] font-black tracking-tighter md:text-7xl">
              {'Talk to your\nclassmates.'.split(/\s+/).map((word, i) => (
                <span key={i} className="hero-word mr-[0.22em] inline-block opacity-0 last:mr-0">
                  {word}
                </span>
              ))}
            </h2>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mb-10 max-w-xl text-base leading-relaxed text-white/45 md:text-lg"
          >
            Real-time DMs, group chats with end-to-end encryption, reactions, images, GIFs. No phone
            number. No third-party app. Set up a display name once — then message anyone at your
            school.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="mb-12 flex flex-wrap justify-center gap-2"
          >
            {[
              [MessageSquare, 'Real-time', 'oklch(0.65 0.22 278)'],
              [Lock, 'E2E encrypted', 'oklch(0.72 0.18 148)'],
              [ImageIcon, 'Images & GIFs', 'oklch(0.70 0.18 310)'],
              [Smile, 'Reactions', 'oklch(0.75 0.18 40)'],
              [Bell, 'Notifications', 'oklch(0.72 0.18 190)'],
              [AtSign, 'Everyone included', 'oklch(0.68 0.20 60)'],
            ].map(([icon, label, color], i) => (
              <Pill
                key={label as string}
                icon={icon as React.ElementType}
                label={label as string}
                color={color as string}
                delay={1.0 + i * 0.06}
              />
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
      </section>

      {/* 
          LIVE CHAT DEMO
       */}
      <section className="relative overflow-hidden border-t border-white/5 px-6 py-24">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 80% 50%, oklch(0.55 0.22 278 / 8%), transparent)',
          }}
        />

        <div className="mx-auto grid max-w-5xl items-center gap-16 md:grid-cols-2">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-15% 0px' }}
              transition={{ duration: 0.6 }}
            >
              <p className="mb-3 text-[10px] tracking-widest text-white/30 uppercase">
                Direct messages
              </p>
              <h3 className="mb-4 text-3xl leading-tight font-black tracking-tight md:text-4xl">
                Feels instant.
                <br />
                <span style={{ color: 'oklch(0.70 0.22 278)' }}>Because it is.</span>
              </h3>
              <p className="mb-6 text-sm leading-relaxed text-white/40">
                We use realtime subscriptions. The moment someone sends a message, it's on your
                screen. No "refresh to see new messages". No 3-second delay. Just instant.
              </p>
              <p className="text-sm leading-relaxed text-white/40">
                Any student at your school can sign up. All it takes is setting a display name once
                — after that, DM anyone by username. You'll see if they are online and get browser
                notifications when someone messages you while you're away.
              </p>
            </motion.div>
          </div>

          {/* Chat window */}
          <motion.div
            ref={chatRef}
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-15% 0px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden rounded-3xl border border-white/10 bg-[#0d0d0d] shadow-[0_40px_100px_oklch(0_0_0/0.6)]"
          >
            {/* chrome */}
            <div className="flex items-center gap-1.5 border-b border-white/8 bg-white/3 px-4 py-3">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: 'oklch(0.60 0.22 20)' }}
              />
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: 'oklch(0.72 0.18 70)' }}
              />
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: 'oklch(0.65 0.22 145)' }}
              />
              <div className="ml-3 flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/30 text-[9px] font-bold text-purple-300">
                  S
                </div>
                <span className="text-[11px] font-medium text-white/60">Sofia</span>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
              </div>
              <div className="ml-auto flex items-center gap-1 text-[9px] text-white/20">
                <Wifi className="h-3 w-3" /> live
              </div>
            </div>
            <LiveChat active={chatInView} />
            {/* compose mock */}
            <div className="flex items-center gap-2 border-t border-white/8 px-4 py-3">
              <div className="flex-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] text-white/20">
                Message Sofia…
              </div>
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: 'linear-gradient(135deg, oklch(0.65 0.22 278), oklch(0.55 0.25 295))',
                }}
              >
                <ArrowRight className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 
          E2EE DEEP DIVE
       */}
      <section className="relative overflow-hidden border-t border-white/5 px-6 py-24">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 50% 60% at 20% 50%, oklch(0.50 0.22 148 / 8%), transparent)',
          }}
        />

        <div className="mx-auto grid max-w-5xl items-start gap-16 md:grid-cols-2">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-15% 0px' }}
              transition={{ duration: 0.6 }}
            >
              <p className="mb-3 text-[10px] tracking-widest text-white/30 uppercase">
                End-to-end encryption
              </p>
              <h3 className="mb-5 text-3xl leading-tight font-black tracking-tight md:text-4xl">
                We genuinely
                <br />
                <span style={{ color: 'oklch(0.70 0.18 148)' }}>can't read it.</span>
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-white/40">
                Not "we promise we don't look". Technically cannot. When you create an encrypted
                group and set a password, your browser derives an AES-GCM 256-bit key using PBKDF2
                with 310,000 iterations — way above NIST recommendations.
              </p>
              <p className="mb-4 text-sm leading-relaxed text-white/40">
                Every message is encrypted{' '}
                <span className="font-medium text-white/70">before it leaves your device</span>.
                What hits our server is ciphertext. What's stored in our database is ciphertext. If
                we got hacked tomorrow, the attacker would get a pile of base64 garbage.
              </p>
              <p className="mb-8 text-sm leading-relaxed text-white/40">
                The password never touches the server. We don't store a hash of it. There's no
                "forgot password" — if you lose it, the group's history is gone. That's the point.
              </p>
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/70" />
                <p className="text-xs leading-relaxed text-amber-300/60">
                  Images sent in encrypted groups are hosted on ImgBB and are{' '}
                  <span className="text-amber-300/90">not</span> encrypted — only text messages are.
                  This is noted in the UI.
                </p>
              </div>
            </motion.div>
          </div>

          <div className="flex flex-col gap-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-15% 0px' }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <E2EEFlow />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10% 0px' }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <p className="mb-3 text-[10px] tracking-widest text-white/25 uppercase">
                What an attacker sees in the database
              </p>
              <EncryptedPreview />
            </motion.div>
          </div>
        </div>
      </section>

      {/* 
          GROUP CHAT SECTION
       */}
      <section className="relative overflow-hidden border-t border-white/5 px-6 py-24">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 60% 60%, oklch(0.55 0.18 310 / 8%), transparent)',
          }}
        />

        <div className="mx-auto grid max-w-5xl items-center gap-16 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-15% 0px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="order-2 md:order-1"
          >
            <GroupChatMock />
          </motion.div>

          <div className="order-1 md:order-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-15% 0px' }}
              transition={{ duration: 0.6 }}
            >
              <p className="mb-3 text-[10px] tracking-widest text-white/30 uppercase">
                Group chats
              </p>
              <h3 className="mb-5 text-3xl leading-tight font-black tracking-tight md:text-4xl">
                Coordinate.
                <br />
                <span style={{ color: 'oklch(0.70 0.18 310)' }}>Actually.</span>
              </h3>
              <p className="mb-6 text-sm leading-relaxed text-white/40">
                Create a group for your study session, add the people who matter, lock it down with
                E2EE if you want. No one outside the group can see the name list or message history.
              </p>
              <div className="space-y-4">
                {[
                  {
                    icon: Hash,
                    color: 'oklch(0.65 0.22 278)',
                    t: 'Named groups',
                    d: 'Give the group a name and description. Works for study groups, friend groups, project teams — whatever.',
                  },
                  {
                    icon: Lock,
                    color: 'oklch(0.72 0.18 148)',
                    t: 'Optional E2EE',
                    d: 'Toggle encryption at creation time. Set a shared password. From that point forward, messages are unreadable without it.',
                  },
                  {
                    icon: Pin,
                    color: 'oklch(0.75 0.18 40)',
                    t: 'Pin important stuff',
                    d: "Pin messages so they don't get buried. See all pinned messages in the side panel at any time.",
                  },
                  {
                    icon: CheckCircle2,
                    color: 'oklch(0.72 0.18 190)',
                    t: 'Admin controls',
                    d: "Transfer admin, remove members, change description. You're in charge of groups you create.",
                  },
                ].map(({ icon: Icon, color, t, d }, i) => (
                  <motion.div
                    key={t}
                    initial={{ opacity: 0, x: 16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-5% 0px' }}
                    transition={{ duration: 0.45, delay: i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: `${color}20`, color }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="mb-0.5 text-xs font-semibold text-white/80">{t}</p>
                      <p className="text-[11px] leading-relaxed text-white/35">{d}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 
          VOICE CALLS (EARLY BETA)
       */}
      <section className="relative overflow-hidden border-t border-white/5 px-6 py-24">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 55% 60% at 30% 50%, oklch(0.55 0.18 190 / 9%), transparent)',
          }}
        />

        <div className="mx-auto grid max-w-5xl items-center gap-16 md:grid-cols-2">
          {/* Call UI mock */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-15% 0px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            {/* Phone card */}
            <div className="mx-auto max-w-75 overflow-hidden rounded-3xl border border-white/10 bg-[#0d0d0d] shadow-[0_40px_80px_oklch(0_0_0/0.5)]">
              {/* header */}
              <div className="flex items-center gap-3 border-b border-white/8 bg-white/3 px-5 py-4">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
                  style={{
                    background: 'oklch(0.55 0.18 190 / 30%)',
                    color: 'oklch(0.72 0.18 190)',
                  }}
                >
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
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute rounded-full border"
                      style={{
                        inset: -(i + 1) * 14,
                        borderColor: 'oklch(0.55 0.18 190 / 20%)',
                      }}
                      animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.1, 0.4] }}
                      transition={{
                        duration: 2,
                        delay: i * 0.5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                  <div
                    className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full"
                    style={{
                      background: 'oklch(0.55 0.18 190 / 20%)',
                      border: '1.5px solid oklch(0.55 0.18 190 / 40%)',
                    }}
                  >
                    <Phone className="h-6 w-6" style={{ color: 'oklch(0.72 0.18 190)' }} />
                  </div>
                </div>

                {/* sound bars */}
                <div className="flex h-8 items-end gap-1">
                  {[3, 5, 8, 6, 4, 7, 5, 3, 6, 4].map((h, i) => (
                    <motion.div
                      key={i}
                      className="w-1 rounded-full"
                      style={{ background: 'oklch(0.65 0.18 190)', height: h * 3 }}
                      animate={{ scaleY: [1, 0.3 + Math.random() * 0.7, 1] }}
                      transition={{
                        duration: 0.5 + Math.random() * 0.4,
                        repeat: Infinity,
                        delay: i * 0.07,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </div>

                <p className="font-mono text-[11px] text-white/30">0:23</p>
              </div>

              {/* controls */}
              <div className="flex items-center justify-center gap-5 border-t border-white/8 px-5 py-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/8">
                  <MicOff className="h-4 w-4 text-white/50" />
                </div>
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full"
                  style={{ background: 'oklch(0.55 0.22 20 / 90%)' }}
                >
                  <PhoneOff className="h-5 w-5 text-white" />
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/8">
                  <Mic className="h-4 w-4 text-white/50" />
                </div>
              </div>
            </div>

            {/* Incoming call card floating above */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="absolute -top-6 -right-4 flex w-52 items-center gap-3 rounded-2xl border border-white/10 bg-[#0d0d0d]/95 px-4 py-3 shadow-2xl backdrop-blur"
            >
              <motion.div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: 'oklch(0.55 0.22 145 / 25%)',
                  border: '1px solid oklch(0.55 0.22 145 / 40%)',
                }}
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                <Phone className="h-3.5 w-3.5" style={{ color: 'oklch(0.72 0.22 145)' }} />
              </motion.div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-semibold text-white/80">Incoming call</p>
                <p className="text-[9px] text-white/35">Sofia</p>
              </div>
              <div className="flex gap-1">
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-full"
                  style={{ background: 'oklch(0.55 0.22 145 / 30%)' }}
                >
                  <Phone className="h-3 w-3" style={{ color: 'oklch(0.72 0.22 145)' }} />
                </div>
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-full"
                  style={{ background: 'oklch(0.55 0.22 20 / 30%)' }}
                >
                  <PhoneOff className="h-3 w-3" style={{ color: 'oklch(0.72 0.22 20)' }} />
                </div>
              </div>
            </motion.div>
          </motion.div>

          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-15% 0px' }}
              transition={{ duration: 0.6 }}
            >
              {/* Beta badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] text-amber-300/80"
              >
                <FlaskConical className="h-3 w-3" />
                Early Beta — expect rough edges
              </motion.div>

              <p className="mb-3 text-[10px] tracking-widest text-white/30 uppercase">
                Voice calls
              </p>
              <h3 className="mb-5 text-3xl leading-tight font-black tracking-tight md:text-4xl">
                Talk, don&apos;t type.
                <br />
                <span style={{ color: 'oklch(0.72 0.18 190)' }}>Right here.</span>
              </h3>
              <p className="mb-6 text-sm leading-relaxed text-white/40">
                1-to-1 voice calls are built directly into SchoolSoft+. No Zoom link, no Discord, no
                switching apps. Click the phone icon in any DM and ring the person directly — they
                get an incoming call notification wherever they are in the app.
              </p>
              <div className="space-y-4">
                {[
                  {
                    icon: Phone,
                    color: 'oklch(0.72 0.18 190)',
                    t: 'In-app calling',
                    d: 'Works on any page — the call panel floats globally so you can keep browsing while on a call.',
                  },
                  {
                    icon: Mic,
                    color: 'oklch(0.65 0.22 278)',
                    t: 'Mute anytime',
                    d: 'Toggle your mic with one tap. The other person sees your mute state in real time.',
                  },
                  {
                    icon: Zap,
                    color: 'oklch(0.75 0.18 60)',
                    t: 'WebRTC, peer-to-peer',
                    d: 'Audio travels directly between browsers — no server relay. Low latency, no recording.',
                  },
                  {
                    icon: Bell,
                    color: 'oklch(0.72 0.18 40)',
                    t: 'Incoming anywhere',
                    d: "Receive ring notifications no matter which page you're on. Accept or decline without leaving.",
                  },
                ].map(({ icon: Icon, color, t, d }, i) => (
                  <motion.div
                    key={t}
                    initial={{ opacity: 0, x: 16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-5% 0px' }}
                    transition={{ duration: 0.45, delay: i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: `${color}20`, color }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="mb-0.5 text-xs font-semibold text-white/80">{t}</p>
                      <p className="text-[11px] leading-relaxed text-white/35">{d}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* <div className="border-t border-white/5">
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
      </div> */}

      {/* 
          FINAL CTA
       */}
      <section className="relative overflow-hidden border-t border-white/5 px-6 py-28 text-center">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 100%, oklch(0.55 0.22 278 / 12%), transparent)',
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10% 0px' }}
          transition={{ duration: 0.7 }}
          className="relative z-10 mx-auto max-w-xl"
        >
          <p className="mb-4 text-xs tracking-widest text-white/25 uppercase">Ready?</p>
          <h3 className="mb-4 text-4xl leading-tight font-black tracking-tighter md:text-5xl">
            Set up a name.
            <br />
            Start messaging.
          </h3>
          <p className="mb-8 text-sm leading-relaxed text-white/35">
            Sign in with your SchoolSoft credentials, pick a display name, and you're in. 30
            seconds. Free. No ads. Open source.
          </p>
          <motion.a
            href="/login"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="bg-primary inline-flex items-center gap-2 rounded-2xl px-8 py-3.5 text-sm font-bold text-white"
          >
            Start messaging <ArrowRight className="h-4 w-4" />
          </motion.a>
        </motion.div>
      </section>
    </div>
  );
}
