'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Mail,
  Settings2,
  ShieldCheck,
} from 'lucide-react';

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
  const inView = useInView(ref, { once: true, margin: '-6% 0px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const muted = 'oklch(0.58 0 0)';
const accent = 'oklch(0.72 0.16 263)';

export default function LoginHelpPage() {
  return (
    <main
      className="relative min-h-screen overflow-x-hidden"
      style={{
        background: 'oklch(0.09 0 0)',
        color: 'oklch(0.85 0 0)',
      }}
    >
      {/* Navigation */}
      <header
        className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between px-5 sm:px-6"
        style={{
          background: 'oklch(0.09 0 0 / 85%)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid oklch(1 0 0 / 5%)',
        }}
      >
        <Link
          href="/login"
          className="flex items-center gap-2 text-sm transition-colors hover:text-white"
          style={{ color: muted }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>

        <div className="flex items-center gap-2 text-sm font-semibold">
          <HelpCircle className="h-4 w-4" style={{ color: accent }} />
          Login help
        </div>

        <div className="w-[100px] sm:w-28" />
      </header>

      {/* Background glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 rounded-full blur-3xl"
        style={{
          width: 560,
          height: 320,
          background: 'radial-gradient(ellipse, oklch(0.62 0.16 263 / 10%) 0%, transparent 70%)',
        }}
      />

      {/* Hero */}
      <section className="relative px-6 pt-32 pb-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative mx-auto max-w-xl"
        >
          <h1 className="mb-5 text-4xl font-black tracking-tight sm:text-5xl">
            Having trouble logging in?
          </h1>

          <p className="mx-auto max-w-md text-base leading-relaxed" style={{ color: muted }}>
            You just need to make sure{' '}
            <span className="font-semibold text-white">Access from app</span> is enabled in your
            SchoolSoft account.
          </p>
        </motion.div>
      </section>

      {/* Main instructions */}
      <div className="relative mx-auto max-w-xl space-y-5 px-5 pb-16 sm:px-6">
        <Reveal>
          <section
            className="rounded-2xl p-5 sm:p-7"
            style={{
              background: 'oklch(0.12 0 0)',
              border: '1px solid oklch(1 0 0 / 8%)',
            }}
          >
            <div className="space-y-6">
              <div className="flex gap-4">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  style={{
                    background: 'oklch(0.62 0.16 263 / 15%)',
                    color: accent,
                  }}
                >
                  1
                </div>

                <div className="min-w-0 flex-1 pt-1">
                  <p className="mb-1 text-sm font-semibold text-white">Open SchoolSoft</p>
                  <p className="mb-3 text-sm leading-relaxed" style={{ color: muted }}>
                    Sign in to your normal SchoolSoft account, not SchoolSoft+.
                  </p>

                  <a
                    href="https://sms.schoolsoft.se/engelska/jsp/Login.jsp"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
                    style={{
                      background: 'oklch(0.62 0.16 263 / 14%)',
                      border: '1px solid oklch(0.62 0.16 263 / 25%)',
                      color: 'oklch(0.8 0.14 263)',
                    }}
                  >
                    Open SchoolSoft
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              <div className="ml-4 h-5 w-px" style={{ background: 'oklch(1 0 0 / 9%)' }} />

              <div className="flex gap-4">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  style={{
                    background: 'oklch(0.62 0.16 263 / 15%)',
                    color: accent,
                  }}
                >
                  2
                </div>

                <div className="min-w-0 flex-1 pt-1">
                  <p className="mb-1 text-sm font-semibold text-white">
                    Find your profile settings
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: muted }}>
                    Open your profile and look for the setting named{' '}
                    <strong className="text-white">Access from app</strong> or{' '}
                    <strong className="text-white">Åtkomst från app</strong>.
                  </p>
                </div>
              </div>

              <div className="ml-4 h-5 w-px" style={{ background: 'oklch(1 0 0 / 9%)' }} />

              <div className="flex gap-4">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  style={{
                    background: 'oklch(0.72 0.18 148 / 12%)',
                    color: 'oklch(0.72 0.18 148)',
                  }}
                >
                  3
                </div>

                <div className="min-w-0 flex-1 pt-1">
                  <p className="mb-2 text-sm font-semibold text-white">Turn it on</p>

                  <p className="mb-3 text-sm leading-relaxed" style={{ color: muted }}>
                    Make sure the <strong className="text-white">Access from app</strong> toggle is
                    enabled.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        {/* Success message */}
        <Reveal delay={0.08}>
          <section
            className="rounded-2xl p-5 sm:p-6"
            style={{
              background: 'oklch(0.12 0 0)',
              border: '1px solid oklch(0.72 0.18 148 / 20%)',
            }}
          >
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0"
                style={{ color: 'oklch(0.72 0.18 148)' }}
              />

              <div>
                <h2 className="mb-1 text-sm font-bold text-white">That&apos;s it!</h2>
                <p className="text-sm leading-relaxed" style={{ color: muted }}>
                  Head back to SchoolSoft+ and try logging in again. If the setting was already
                  enabled, or you still can&apos;t log in, get in touch and we&apos;ll help you out.
                </p>

                <Link
                  href="/login"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-75"
                  style={{ color: 'oklch(0.72 0.18 148)' }}
                >
                  Back to login
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        </Reveal>

        {/* Contact */}
        <Reveal delay={0.12}>
          <section
            className="rounded-2xl p-5 sm:p-6"
            style={{
              background: 'oklch(0.12 0 0)',
              border: '1px solid oklch(1 0 0 / 7%)',
            }}
          >
            <div className="mb-3 flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{
                  background: 'oklch(0.62 0.16 263 / 12%)',
                  color: accent,
                }}
              >
                <Mail className="h-4 w-4" />
              </div>

              <h2 className="text-sm font-bold text-white">Still having trouble?</h2>
            </div>

            <p className="mb-4 text-sm leading-relaxed" style={{ color: muted }}>
              If you have enabled the setting and login still fails, send us the error message you
              see and we&apos;ll look into it.
            </p>

            <a
              href="mailto:hello@elias4044.com"
              className="inline-flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-75"
              style={{ color: 'oklch(0.78 0.14 263)' }}
            >
              <Mail className="h-4 w-4" />
              hello@elias4044.com
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </section>
        </Reveal>

        {/* Footer */}
        <Reveal delay={0.15}>
          <footer
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 pt-4 text-xs"
            style={{ color: 'oklch(0.45 0 0)' }}
          >
            <Link href="/" className="flex items-center gap-1 transition-colors hover:text-white">
              <ArrowLeft className="h-3 w-3" />
              Home
            </Link>

            <span className="opacity-30">·</span>

            <Link href="/terms" className="transition-colors hover:text-white">
              Terms &amp; Privacy
            </Link>

            <span className="opacity-30">·</span>

            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              SchoolSoft+
            </span>
          </footer>
        </Reveal>
      </div>
    </main>
  );
}
