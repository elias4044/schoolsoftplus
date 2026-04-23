"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Eye, EyeOff, ArrowRight, CalendarDays, BookOpen, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";

const DEFAULT_SCHOOL = "engelska";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [school, setSchool] = useState(DEFAULT_SCHOOL);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-school": school },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.message ?? "Invalid credentials.");
        return;
      }
      // The server set the session cookies — just redirect.
      router.replace("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background flex">
      {/* -- Left panel: decorative ------------------------- */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-card border-r border-border flex-col justify-between p-12">
        {/* Subtle line grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(oklch(1 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Top-right fade */}
        <div className="absolute inset-0 bg-linear-to-br from-transparent via-transparent to-background/60 pointer-events-none" />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-bold">S+</span>
          </div>
          <span className="text-sm font-medium text-foreground/70 tracking-wide">SchoolSoft+</span>
        </div>

        {/* 3-D mockup */}
        <div className="relative flex flex-col items-start gap-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground leading-snug">
              Your school,<br />streamlined.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-xs leading-relaxed">
              Schedule, assignments, grades, and AI — in one place.
            </p>
          </div>

          {/* Fixed-tilt app card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ perspective: "900px" }}
          >
            <motion.div
              style={{ rotateX: 8, rotateY: -12, transformStyle: "preserve-3d" }}
              className="rounded-xl border border-border bg-background overflow-hidden w-64 shadow-[0_24px_60px_oklch(0_0_0/0.5)]"
            >
              {/* chrome */}
              <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-border bg-card/60">
                <div className="w-2 h-2 rounded-full bg-border" />
                <div className="w-2 h-2 rounded-full bg-border" />
                <div className="w-2 h-2 rounded-full bg-border" />
                <span className="ml-auto text-[9px] text-muted-foreground">Wednesday</span>
              </div>
              {/* rows */}
              <div className="p-2.5 space-y-1.5">
                {[
                  { icon: CalendarDays, label: "Mathematics · 08:15", color: "oklch(0.72 0.18 263)" },
                  { icon: BookOpen,     label: "English · 10:00",     color: "oklch(0.72 0.18 148)" },
                  { icon: StickyNote,   label: "2 notes · updated",   color: "oklch(0.75 0.18 310)" },
                ].map(({ icon: Icon, label, color }, i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: 0.35 + i * 0.07 }}
                    className="flex items-center gap-2.5 rounded-md bg-card border border-border px-2.5 py-2"
                  >
                    <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ background: `oklch(from ${color} l c h / 18%)`, color }}>
                      <Icon className="w-3 h-3" />
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate">{label}</span>
                  </motion.div>
                ))}
              </div>
              {/* footer */}
              <div className="border-t border-border px-3 py-2 bg-card/40 flex items-center justify-between">
                <span className="text-[9px] text-muted-foreground">3 lessons today</span>
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i === 0 ? "oklch(0.62 0.16 263)" : "oklch(1 0 0 / 10%)" }} />
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <p className="relative text-xs text-muted-foreground/40">
          Not affiliated with SchoolSoft AB
        </p>
      </div>

      {/* -- Right panel: form ------------------------------ */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-bold">S+</span>
            </div>
            <span className="text-sm font-medium text-foreground/70">SchoolSoft+</span>
          </div>

          <div className="mb-8">
            <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Use your SchoolSoft credentials.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Field label="School" htmlFor="school">
              <Input
                id="school"
                value={school}
                onChange={e => setSchool(e.target.value)}
                className="bg-card border-border focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/40 h-10"
                placeholder="engelska"
                autoComplete="off"
                type="text"
              />
            </Field>

            <Field label="Username" htmlFor="username">
              <Input
                id="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="bg-card border-border focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/40 h-10"
                placeholder="firstname.lastname"
                autoComplete="username"
                type="username"
                required
              />
            </Field>

            <Field label="Password" htmlFor="password">
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pr-9 bg-card border-border focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/40 h-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </Field>

            <AnimatePresence>
              {error && (
                <motion.p
                  key="err"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-destructive overflow-hidden"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mt-1 font-medium"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  Sign in <ArrowRight className="w-3.5 h-3.5" />
                </span>
              )}
            </Button>
          </form>

          {/* Help links */}
          <div className="mt-6 pt-5 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
            <Link href="/login-help" className="hover:text-foreground transition-colors">
              Can't sign in?
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms &amp; Privacy
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
