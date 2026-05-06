"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation"
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Eye, EyeOff, ArrowRight, CalendarDays, BookOpen, StickyNote, Search, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import Image from "next/image";

const DEFAULT_SCHOOL_ID   = "engelska";
const DEFAULT_SCHOOL_NAME = "Internationella Engelska Skolan - IES Halmstad";

interface School { name: string; id: string; }

// How many items to render at most — keeps the DOM small for 3000+ entries
const MAX_VISIBLE = 100;

// ---------------------------------------------------------------------------
// SchoolPicker
// ---------------------------------------------------------------------------
function SchoolPicker({
  value,
  displayName,
  onChange,
}: {
  value: string;
  displayName: string;
  onChange: (id: string, name: string) => void;
}) {
  const [open, setOpen]         = useState(false);
  const [query, setQuery]       = useState("");
  const [schools, setSchools]   = useState<School[]>([]);
  const [fetched, setFetched]   = useState(false);
  const [fetching, setFetching] = useState(false);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch once on first open
  const loadSchools = useCallback(async () => {
    if (fetched || fetching) return;
    setFetching(true);
    try {
      const res = await fetch("/api/schools");
      const data = await res.json();
      if (Array.isArray(data.schools)) setSchools(data.schools);
    } catch { /* ignore */ }
    finally {
      setFetched(true);
      setFetching(false);
    }
  }, [fetched, fetching]);

  function openPicker() {
    setOpen(true);
    setQuery("");
    loadSchools();
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Keyboard: close on Escape
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const filtered = query.trim()
    ? schools.filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
    : schools;
  const visible = filtered.slice(0, MAX_VISIBLE);
  const overflow = filtered.length - visible.length;

  return (
    <div ref={wrapRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={openPicker}
        className={cn(
          "w-full h-10 flex items-center gap-2 px-3 rounded-md border text-sm text-left transition-colors",
          "bg-card border-border hover:border-primary/40",
          open && "border-primary/50 ring-1 ring-primary/30"
        )}
      >
        <span className="flex-1 truncate text-foreground">
          {displayName || value}
        </span>
        {fetching
          ? <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin shrink-0" />
          : <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
        }
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scaleY: 0.96 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -6, scaleY: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{ transformOrigin: "top" }}
            className="absolute z-50 top-[calc(100%+6px)] left-0 right-0 rounded-xl border border-border bg-card shadow-[0_16px_48px_oklch(0_0_0/0.5)] overflow-hidden"
          >
            {/* Search input */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search your school…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50 text-foreground"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="text-muted-foreground hover:text-foreground transition-colors text-[10px]"
                >
                  ✕
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-56 overflow-y-auto overscroll-contain">
              {fetching && !schools.length ? (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading schools…
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-6">
                  No schools found for &ldquo;{query}&rdquo;
                </p>
              ) : (
                <>
                  {visible.map(school => {
                    const active = school.id === value;
                    return (
                      <button
                        key={school.name}
                        type="button"
                        onClick={() => { onChange(school.id, school.name); setOpen(false); }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-foreground/80 hover:bg-white/5 hover:text-foreground"
                        )}
                      >
                        <span className="flex-1 truncate">{school.name}</span>
                        {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                  {overflow > 0 && (
                    <p className="text-center text-[10px] text-muted-foreground/50 py-2 border-t border-border">
                      {overflow} more — type to narrow results
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Footer hint */}
            {schools.length > 0 && (
              <div className="border-t border-border px-3 py-1.5 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground/50">
                  {filtered.length} of {schools.length} schools
                </span>
                <span className="text-[10px] text-muted-foreground/40">Esc to close</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [schoolId,   setSchoolId]   = useState(DEFAULT_SCHOOL_ID);
  const [schoolName, setSchoolName] = useState(DEFAULT_SCHOOL_NAME);
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
        headers: { "Content-Type": "application/json", "x-school": schoolId },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.message ?? "Invalid credentials.");
        return;
      }
      router.replace("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: "var(--background)" }}>

      {/*  Left panel: immersive dark hero  */}
      <div className="hidden lg:flex lg:w-[54%] relative overflow-hidden flex-col justify-between p-12"
        style={{ background: "var(--card)", borderRight: "1px solid oklch(1 0 0 / 6%)" }}>

        {/* dot grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        {/* ambient top-left orb */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, var(--brand-dim) 0%, transparent 70%)" }} />
        {/* ambient bottom-right orb */}
        <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, oklch(0.55 0.25 295 / 8%) 0%, transparent 70%)" }} />

        {/* Logo */}
        <Link href="/" className="relative flex items-center gap-3">
          <Image src="/logo.png" alt="SchoolSoft+ Logo" className="w-6 h-6" width={16} height={16} />
          <span className="text-sm font-semibold text-foreground/80">SchoolSoft+</span>
        </Link>

        {/* Hero copy + App mockup */}
        <div className="relative flex flex-col items-start gap-10">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground leading-tight">
              Your school,<br />streamlined.
            </h2>
            <p className="mt-3 text-sm leading-relaxed max-w-xs" style={{ color: "oklch(1 0 0 / 45%)" }}>
              Schedule, assignments, grades, and AI — in one clean dashboard.
            </p>
          </div>

          {/* 3-D app card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            style={{ perspective: "1000px" }}
          >
            <motion.div
              style={{ rotateX: 6, rotateY: -10, transformStyle: "preserve-3d" }}
              className="w-72"
              whileHover={{ rotateX: 4, rotateY: -7 }}
              transition={{ type: "spring", stiffness: 160, damping: 22 }}
            >
              {/* card background */}
              <div style={{ background: "var(--background)", border: "1px solid oklch(1 0 0 / 10%)", boxShadow: "0 32px 80px oklch(0 0 0 / 60%)", borderRadius: "1rem", overflow: "hidden" }}>
                {/* chrome */}
                <div className="flex items-center gap-1.5 px-3 py-2.5 border-b" style={{ borderColor: "oklch(1 0 0 / 6%)", background: "oklch(1 0 0 / 3%)" }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: "oklch(0.68 0.18 20)" }} />
                  <div className="w-2 h-2 rounded-full" style={{ background: "oklch(0.78 0.16 70)" }} />
                  <div className="w-2 h-2 rounded-full" style={{ background: "oklch(0.68 0.18 148)" }} />
                  <span className="ml-auto text-[9px]" style={{ color: "oklch(1 0 0 / 35%)" }}>Today</span>
                </div>
                {/* rows */}
                <div className="p-3 space-y-2">
                  {[
                    { icon: CalendarDays, label: "Mathematics · 08:15",   color: "oklch(0.65 0.22 278)" },
                    { icon: BookOpen,     label: "English · 10:00",        color: "oklch(0.72 0.18 148)" },
                    { icon: StickyNote,   label: "2 notes · updated",      color: "oklch(0.75 0.18 310)" },
                  ].map(({ icon: Icon, label, color }, i) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35, delay: 0.4 + i * 0.08 }}
                      className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 border"
                      style={{ background: "oklch(1 0 0 / 3%)", borderColor: "oklch(1 0 0 / 6%)" }}
                    >
                      <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                        style={{ background: `${color.replace("oklch(", "oklch(").replace(")", " / 18%)")}`, color }}>
                        <Icon className="w-3 h-3" />
                      </div>
                      <span className="text-[10px] truncate" style={{ color: "oklch(1 0 0 / 55%)" }}>{label}</span>
                    </motion.div>
                  ))}
                </div>
                {/* footer */}
                <div className="px-3 py-2 border-t flex items-center justify-between"
                  style={{ borderColor: "oklch(1 0 0 / 6%)", background: "oklch(1 0 0 / 2%)" }}>
                  <span className="text-[9px]" style={{ color: "oklch(1 0 0 / 30%)" }}>3 lessons today</span>
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full"
                        style={{ background: i === 0 ? "var(--primary)" : "oklch(1 0 0 / 10%)" }} />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <p className="relative text-[10px]" style={{ color: "oklch(1 0 0 / 25%)" }}>
          Not affiliated with SchoolSoft AB · MIT Licensed
        </p>
      </div>

      {/*  Right panel: form  */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, var(--primary), oklch(0.55 0.25 295))" }}>
              <span className="text-white text-xs font-bold">S+</span>
            </div>
            <span className="text-sm font-semibold text-foreground/80">SchoolSoft+</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
            <p className="text-sm mt-1.5" style={{ color: "oklch(1 0 0 / 45%)" }}>
              Use your SchoolSoft credentials.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="School" htmlFor="school">
              <SchoolPicker
                value={schoolId}
                displayName={schoolName}
                onChange={(id, name) => { setSchoolId(id); setSchoolName(name); }}
              />
            </Field>

            <Field label="Username" htmlFor="username">
              <Input
                id="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="h-10 text-sm"
                style={{ background: "var(--card)", borderColor: "oklch(1 0 0 / 8%)" }}
                placeholder="firstname.lastname"
                autoComplete="username"
                type="text"
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
                  className="pr-9 h-10 text-sm"
                  style={{ background: "var(--card)", borderColor: "oklch(1 0 0 / 8%)" }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "oklch(1 0 0 / 35%)" }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </Field>

            <AnimatePresence>
              {error && (
                <motion.div
                  key="err"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <p className="text-xs px-3 py-2.5 rounded-lg border"
                    style={{ color: "oklch(0.68 0.19 24)", background: "oklch(0.58 0.19 24 / 8%)", borderColor: "oklch(0.58 0.19 24 / 20%)" }}>
                    {error}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, var(--primary), oklch(0.55 0.25 295))" }}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>Sign in <ArrowRight className="w-3.5 h-3.5" /></>
              )}
            </button>
          </form>

          {/* Help links */}
          <div className="mt-6 pt-5 border-t flex items-center justify-between text-[11px]"
            style={{ borderColor: "oklch(1 0 0 / 6%)", color: "oklch(1 0 0 / 35%)" }}>
            <Link href="/login-help" className="hover:text-foreground transition-colors">
              Can&apos;t sign in?
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
      <Label htmlFor={htmlFor} className="text-xs font-medium" style={{ color: "oklch(1 0 0 / 45%)" }}>
        {label}
      </Label>
      {children}
    </div>
  );
}