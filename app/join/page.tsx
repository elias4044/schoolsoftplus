'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { Comfortaa } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Copy, Loader2, Sparkles, Users } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const comfortaa = Comfortaa({ subsets: ['latin'] });

interface ReferrerInfo {
  username: string;
  displayName: string;
  pfpUrl: string;
  schoolName: string;
}

function JoinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('ref') ?? '';

  const [referrer, setReferrer] = useState<ReferrerInfo | null>(null);
  const [validating, setValidating] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [copied, setCopied] = useState(false);

  const initials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';

  const validate = useCallback(async () => {
    if (!code) return;
    setValidating(true);
    try {
      const res = await fetch(`/api/referrals/validate/${encodeURIComponent(code)}`);
      const json = await res.json();
      if (json.success) {
        setReferrer(json.referrer);
      } else {
        setInvalid(true);
      }
    } catch {
      setInvalid(true);
    } finally {
      setValidating(false);
    }
  }, [code]);

  useEffect(() => {
    validate();
  }, [validate]);

  async function accept() {
    if (!code || accepting) return;
    setAccepting(true);
    try {
      await fetch('/api/referrals/set-ref', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      setAccepted(true);
      setTimeout(() => router.push('/login'), 1200);
    } catch {
      // Still redirect even if cookie failed — just won't credit the referrer
      router.push('/login');
    } finally {
      setAccepting(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-16"
      style={{ background: 'var(--background)' }}
    >
      {/* Logo */}
      <Link href="/" className={'mb-12 flex items-center gap-2 ' + comfortaa.className}>
        <Image src="/logo.png" alt="SchoolSoft+" width={32} height={32} className="h-8 w-8" />
        <span className="text-gradient text-xl font-bold">SchoolSoft+</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="border-border bg-card space-y-6 rounded-2xl border p-8 shadow-xl">
          {validating && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="text-primary h-8 w-8 animate-spin" />
              <p className="text-muted-foreground text-sm">Checking invite link...</p>
            </div>
          )}

          {!validating && invalid && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: 'color-mix(in oklch, var(--destructive) 15%, transparent)' }}
              >
                <Users className="text-destructive h-7 w-7" />
              </div>
              <div>
                <p className="text-foreground font-semibold">Invalid invite link</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  This link is expired or does not exist. You can still sign in normally.
                </p>
              </div>
              <Button asChild className="mt-2 w-full">
                <Link href="/login">Go to login</Link>
              </Button>
            </div>
          )}

          {!validating && !invalid && !code && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: 'color-mix(in oklch, var(--brand) 15%, transparent)' }}
              >
                <Sparkles className="text-primary h-7 w-7" />
              </div>
              <div>
                <p className="text-foreground font-semibold">No invite code</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  You need an invite link to use this page. Ask a friend for theirs.
                </p>
              </div>
              <Button asChild className="mt-2 w-full">
                <Link href="/login">Go to login</Link>
              </Button>
            </div>
          )}

          {!validating && !invalid && referrer && (
            <>
              {/* Referrer card */}
              <div className="flex flex-col items-center gap-3 text-center">
                <Avatar className="ring-border h-16 w-16 ring-2">
                  <AvatarImage src={referrer.pfpUrl} alt={referrer.displayName} />
                  <AvatarFallback
                    className="text-lg font-bold"
                    style={{
                      background: 'color-mix(in oklch, var(--brand) 20%, transparent)',
                      color: 'var(--primary)',
                    }}
                  >
                    {initials(referrer.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-muted-foreground mb-1 text-xs tracking-widest uppercase">
                    You were invited by
                  </p>
                  <p className="text-foreground text-xl font-bold">{referrer.displayName}</p>
                  {referrer.schoolName && (
                    <p className="text-muted-foreground mt-0.5 text-sm">{referrer.schoolName}</p>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="border-border border-t" />

              {/* Feature highlights */}
              <div className="space-y-3">
                <p className="text-foreground text-center text-sm font-medium">
                  What you get with SchoolSoft+
                </p>
                {[
                  'Faster, cleaner schedule and grade views',
                  'AI assistant for homework help',
                  'Notes, flashcards, and countdowns',
                  'Real-time messaging with classmates',
                  'Keyboard shortcuts and dark mode',
                ].map((feat) => (
                  <div key={feat} className="flex items-start gap-2.5">
                    <div
                      className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                      style={{ background: 'color-mix(in oklch, var(--brand) 20%, transparent)' }}
                    >
                      <div className="bg-primary h-1.5 w-1.5 rounded-full" />
                    </div>
                    <p className="text-muted-foreground text-sm">{feat}</p>
                  </div>
                ))}
              </div>

              {/* CTA */}
              {accepted ? (
                <div className="flex items-center justify-center gap-2 py-2 text-sm font-medium text-green-400">
                  <Check className="h-4 w-4" />
                  Invite accepted — redirecting...
                </div>
              ) : (
                <Button className="w-full gap-2" onClick={accept} disabled={accepting}>
                  {accepting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  Accept invite and sign in
                </Button>
              )}

              {/* Share invite (forward it) */}
              <button
                onClick={copyLink}
                className="text-muted-foreground hover:text-foreground flex w-full items-center justify-center gap-2 py-1 text-sm transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy invite link'}
              </button>
            </>
          )}
        </div>

        <p className="text-muted-foreground mt-6 text-center text-xs">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
        </div>
      }
    >
      <JoinContent />
    </Suspense>
  );
}
