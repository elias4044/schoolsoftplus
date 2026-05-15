"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Users, ArrowRight, Copy, Check, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Comfortaa } from "next/font/google";
import Image from "next/image";

const comfortaa = Comfortaa({ subsets: ["latin"] });

interface ReferrerInfo {
  username: string;
  displayName: string;
  pfpUrl: string;
  schoolName: string;
}

export default function JoinPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("ref") ?? "";

  const [referrer, setReferrer] = useState<ReferrerInfo | null>(null);
  const [validating, setValidating] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [copied, setCopied] = useState(false);

  const initials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

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
      await fetch("/api/referrals/set-ref", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      setAccepted(true);
      setTimeout(() => router.push("/login"), 1200);
    } catch {
      // Still redirect even if cookie failed — just won't credit the referrer
      router.push("/login");
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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16"
      style={{ background: "var(--background)" }}
    >
      {/* Logo */}
      <Link href="/" className={"flex items-center gap-2 mb-12 " + comfortaa.className}>
        <Image src="/logo.png" alt="SchoolSoft+" width={32} height={32} className="w-8 h-8" />
        <span className="text-xl font-bold text-gradient">SchoolSoft+</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-xl space-y-6">
          {validating && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Checking invite link...</p>
            </div>
          )}

          {!validating && invalid && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: "color-mix(in oklch, var(--destructive) 15%, transparent)" }}>
                <Users className="w-7 h-7 text-destructive" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Invalid invite link</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This link is expired or does not exist. You can still sign in normally.
                </p>
              </div>
              <Button asChild className="w-full mt-2">
                <Link href="/login">Go to login</Link>
              </Button>
            </div>
          )}

          {!validating && !invalid && !code && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: "color-mix(in oklch, var(--brand) 15%, transparent)" }}>
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">No invite code</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You need an invite link to use this page. Ask a friend for theirs.
                </p>
              </div>
              <Button asChild className="w-full mt-2">
                <Link href="/login">Go to login</Link>
              </Button>
            </div>
          )}

          {!validating && !invalid && referrer && (
            <>
              {/* Referrer card */}
              <div className="flex flex-col items-center gap-3 text-center">
                <Avatar className="w-16 h-16 ring-2 ring-border">
                  <AvatarImage src={referrer.pfpUrl} alt={referrer.displayName} />
                  <AvatarFallback
                    className="text-lg font-bold"
                    style={{
                      background: "color-mix(in oklch, var(--brand) 20%, transparent)",
                      color: "var(--primary)",
                    }}
                  >
                    {initials(referrer.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">You were invited by</p>
                  <p className="text-xl font-bold text-foreground">{referrer.displayName}</p>
                  {referrer.schoolName && (
                    <p className="text-sm text-muted-foreground mt-0.5">{referrer.schoolName}</p>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Feature highlights */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground text-center">What you get with SchoolSoft+</p>
                {[
                  "Faster, cleaner schedule and grade views",
                  "AI assistant for homework help",
                  "Notes, flashcards, and countdowns",
                  "Real-time messaging with classmates",
                  "Keyboard shortcuts and dark mode",
                ].map((feat) => (
                  <div key={feat} className="flex items-start gap-2.5">
                    <div className="mt-0.5 w-4 h-4 rounded-full shrink-0 flex items-center justify-center"
                      style={{ background: "color-mix(in oklch, var(--brand) 20%, transparent)" }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">{feat}</p>
                  </div>
                ))}
              </div>

              {/* CTA */}
              {accepted ? (
                <div className="flex items-center justify-center gap-2 py-2 text-sm text-green-400 font-medium">
                  <Check className="w-4 h-4" />
                  Invite accepted — redirecting...
                </div>
              ) : (
                <Button
                  className="w-full gap-2"
                  onClick={accept}
                  disabled={accepting}
                >
                  {accepting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  Accept invite and sign in
                </Button>
              )}

              {/* Share invite (forward it) */}
              <button
                onClick={copyLink}
                className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy invite link"}
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
