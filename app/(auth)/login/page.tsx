"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Eye, EyeOff, ArrowRight } from "lucide-react";
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
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-surface-1 border-r border-border flex-col justify-between p-12">
        {/* Very subtle dot grid */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle, oklch(1 0 0 / 12%) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Soft vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 30% 50%, oklch(0.62 0.16 263 / 6%) 0%, transparent 65%)",
          }}
        />

        <div className="relative">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-bold">S+</span>
            </div>
            <span className="text-sm font-medium text-foreground/70 tracking-wide">Schoolsoft+</span>
          </div>
        </div>

        <div className="relative space-y-6">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground leading-snug">
              Your school,<br />streamlined.
            </h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xs">
              A cleaner interface for Schoolsoft - schedule, assignments, grades, and more in one place.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {[
              "Schedule & lessons at a glance",
              "Assignments and upcoming tests",
              "Notes, and AI assistant",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <div className="w-1 h-1 rounded-full bg-primary/60 shrink-0" />
                <span className="text-xs text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-muted-foreground/50">
          Not affiliated with SchoolSoft AB
        </p>
      </div>

      {/* -- Right panel: form ------------------------------ */}
      <div className="flex-1 flex items-center justify-center p-8">
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
            <span className="text-sm font-medium text-foreground/70">Schoolsoft+</span>
          </div>

          <div className="mb-8">
            <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your school credentials below.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="School" htmlFor="school">
              <Input
                id="school"
                value={school}
                onChange={e => setSchool(e.target.value)}
                className="bg-surface-1 border-border/70 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/40"
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
                className="bg-surface-1 border-border/70 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/40"
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
                  className="pr-9 bg-surface-1 border-border/70 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/40"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
              className="w-full h-9 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mt-1"
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
          <div className="mt-6 flex items-center justify-between text-[11px] text-muted-foreground">
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
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
