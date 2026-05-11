"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { markTransitionPending } from "@/lib/page-transition";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Eye, EyeOff, ArrowRight, CalendarDays, BookOpen, StickyNote, Search, ChevronDown, Check, ExternalLink, FlaskConical, ShieldCheck, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { startAuthentication, browserSupportsWebAuthn, type PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";

const DEFAULT_SCHOOL_ID = "engelska";
const DEFAULT_SCHOOL_NAME = "Internationella Engelska Skolan - IES Halmstad";
const RECENT_SCHOOLS_KEY = "ssp_recent_schools";
const KONAMI_SEQ = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
  "b", "a",
] as const;

interface School { name: string; id: string; }

// How many items to render at most — keeps the DOM small for 3000+ entries
const MAX_VISIBLE = 100;


// ---------------------------------------------------------------------------
// SchoolPicker  (keyboard-navigable + recent schools)
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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [fetched, setFetched] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const [recentSchools, setRecentSchools] = useState<School[]>([]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load recent schools from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SCHOOLS_KEY);
      if (stored) setRecentSchools(JSON.parse(stored) as School[]);
    } catch { /* ignore */ }
  }, []);

  // Fetch schools once on first open
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
    setFocusedIdx(-1);
    loadSchools();
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function saveRecent(school: School) {
    const updated = [school, ...recentSchools.filter(r => r.id !== school.id)].slice(0, 3);
    setRecentSchools(updated);
    try { localStorage.setItem(RECENT_SCHOOLS_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  }

  function selectSchool(school: School) {
    onChange(school.id, school.name);
    saveRecent(school);
    setOpen(false);
  }

  // Reset keyboard focus whenever the search query changes
  useEffect(() => { setFocusedIdx(-1); }, [query]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Build item lists
  const filtered = query.trim()
    ? schools.filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
    : schools;
  const visible = filtered.slice(0, MAX_VISIBLE);
  const overflow = filtered.length - visible.length;

  const showRecent = !query.trim() && recentSchools.length > 0;
  const recentVisible = showRecent
    ? recentSchools.filter(r => !schools.length || schools.some(s => s.id === r.id))
    : [];
  const recentIds = new Set(recentVisible.map(r => r.id));
  const mainList = visible.filter(s => !recentIds.has(s.id));
  // Flat list used for keyboard-navigation index tracking
  const navList = [...recentVisible, ...mainList];

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIdx(i => Math.min(i + 1, navList.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && focusedIdx >= 0 && navList[focusedIdx]) {
      e.preventDefault();
      selectSchool(navList[focusedIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Auto-scroll focused item into view
  useEffect(() => {
    if (focusedIdx < 0 || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-nav-idx="${focusedIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [focusedIdx]);

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
        <span className="flex-1 truncate text-foreground">{displayName || value}</span>
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
                onKeyDown={handleInputKeyDown}
                placeholder="Search your school…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50 text-foreground"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                  className="text-muted-foreground hover:text-foreground transition-colors text-[10px]"
                >
                  ✕
                </button>
              )}
            </div>

            {/* List */}
            <div ref={listRef} className="max-h-56 overflow-y-auto overscroll-contain">
              {fetching && !schools.length ? (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading schools…
                </div>
              ) : navList.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-6">
                  No schools found for &ldquo;{query}&rdquo;
                </p>
              ) : (
                <>
                  {/* Recent section */}
                  {showRecent && recentVisible.length > 0 && (
                    <>
                      <p className="px-3 pt-2 pb-1 text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">
                        Recent
                      </p>
                      {recentVisible.map((school, ri) => {
                        const active = school.id === value;
                        const focused = focusedIdx === ri;
                        return (
                          <button
                            key={"r-" + school.id}
                            data-nav-idx={ri}
                            type="button"
                            onClick={() => selectSchool(school)}
                            className={cn(
                              "w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors",
                              active && "bg-primary/10 text-primary",
                              focused && !active && "bg-white/8 text-foreground",
                              !active && !focused && "text-foreground/80 hover:bg-white/5 hover:text-foreground"
                            )}
                          >
                            <span className="flex-1 truncate">{school.name}</span>
                            {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                          </button>
                        );
                      })}
                      {mainList.length > 0 && (
                        <div className="mx-3 my-1 border-t border-border" />
                      )}
                    </>
                  )}

                  {/* Main list */}
                  {mainList.map((school, mi) => {
                    const navIdx = recentVisible.length + mi;
                    const active = school.id === value;
                    const focused = focusedIdx === navIdx;
                    return (
                      <button
                        key={school.name}
                        data-nav-idx={navIdx}
                        type="button"
                        onClick={() => selectSchool(school)}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors",
                          active && "bg-primary/10 text-primary",
                          focused && !active && "bg-white/8 text-foreground",
                          !active && !focused && "text-foreground/80 hover:bg-white/5 hover:text-foreground"
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
            {navList.length > 0 && (
              <div className="border-t border-border px-3 py-1.5 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground/50">
                  {filtered.length} of {schools.length || "?"} schools
                </span>
                <span className="text-[10px] text-muted-foreground/40">↑↓ navigate · ↵ select · Esc close</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [schoolId, setSchoolId] = useState(DEFAULT_SCHOOL_ID);
  const [schoolName, setSchoolName] = useState(DEFAULT_SCHOOL_NAME);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthV2Loading, setIsAuthV2Loading] = useState(false);
  const [isAuthV2ExternalLoading, setIsAuthV2ExternalLoading] = useState(false);
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exitActive, setExitActive] = useState(false);
  const [easterEgg, setEasterEgg] = useState(false);
  const [taglineAlt, setTaglineAlt] = useState(false);

  const shiftHeldRef = useRef(false);
  const konamiBufferRef = useRef<string[]>([]);
  const logoClicksRef = useRef(0);
  const logoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingNavRef = useRef(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    setPasskeySupported(browserSupportsWebAuthn());
  }, []);

  // Show AuthV2 error returned via ?authv2_error=... query param
  useEffect(() => {
    const authv2Error = searchParams.get("authv2_error");
    if (authv2Error) setError(authv2Error);
  }, [searchParams]);

  // Track Shift key state globally for the skip-transition shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === "Shift") shiftHeldRef.current = true; };
    const up = (e: KeyboardEvent) => { if (e.key === "Shift") shiftHeldRef.current = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  // Konami code easter egg  ↑↑↓↓←→←→BA
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      konamiBufferRef.current = [...konamiBufferRef.current, e.key].slice(-KONAMI_SEQ.length);
      if (konamiBufferRef.current.join(",") === KONAMI_SEQ.join(",")) {
        setEasterEgg(true);
        konamiBufferRef.current = [];
        setTimeout(() => setEasterEgg(false), 4200);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Secret tagline: click the hero heading 5× quickly
  function handleLogoClick() {
    logoClicksRef.current += 1;
    if (logoTimerRef.current) clearTimeout(logoTimerRef.current);
    if (logoClicksRef.current >= 5) {
      setTaglineAlt(true);
      logoClicksRef.current = 0;
      setTimeout(() => setTaglineAlt(false), 3000);
    } else {
      logoTimerRef.current = setTimeout(() => { logoClicksRef.current = 0; }, 1500);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingNavRef.current) return;
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
      pendingNavRef.current = true;
      const isLarge = window.innerWidth >= 1024;
      if (isLarge && !shiftHeldRef.current) {
        setExitActive(true); // curtain animates in → onAnimationComplete navigates
      } else {
        router.replace("/dashboard");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setPasskeyError(null);
    setIsPasskeyLoading(true);
    try {
      const beginRes = await fetch("/api/auth/passkey/authenticate/begin", { method: "POST" });
      const beginData = await beginRes.json();
      if (!beginData.success) throw new Error(beginData.error ?? "Failed to start passkey login.");

      const options = beginData.options as PublicKeyCredentialRequestOptionsJSON;

      let authResp;
      try {
        authResp = await startAuthentication({ optionsJSON: options });
      } catch (err) {
        const e = err as Error;
        if (e.name === "NotAllowedError") throw new Error("Passkey sign-in was cancelled.");
        throw new Error("Could not access your passkey. Please try again.");
      }

      const completeRes = await fetch("/api/auth/passkey/authenticate/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: authResp }),
      });
      const completeData = await completeRes.json();
      if (!completeData.success) throw new Error(completeData.error ?? "Passkey login failed.");

      // Navigate to dashboard
      const isLarge = window.innerWidth >= 1024;
      if (isLarge && !shiftHeldRef.current) {
        setExitActive(true);
      } else {
        router.replace("/dashboard");
      }
    } catch (err) {
      setPasskeyError((err as Error).message);
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  const handleAuthV2Login = () => {
    setError(null);
    setIsAuthV2Loading(true);
    // Navigate to the initiate route — it will set cookies then redirect to SchoolSoft
    window.location.href = `/api/auth/v2/initiate?school=${encodeURIComponent(schoolId)}`;
  };

  const handleAuthV2ExternalLogin = () => {
    setError(null);
    setIsAuthV2ExternalLoading(true);
    // Navigate to the initiate route — it will set cookies then redirect to SchoolSoft
    window.location.href = `/api/auth/v2/initiate/external?school=${encodeURIComponent(schoolId)}`;
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: "var(--background)" }}>

      {/*  Left panel: immersive dark hero  */}
      <div className="hidden lg:flex lg:w-[54%] relative overflow-hidden flex-col justify-between p-12"
        style={{ background: "var(--card)", borderRight: "1px solid var(--border)" }}>

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
            <AnimatePresence mode="wait">
              <motion.h2
                key={taglineAlt ? "alt" : "default"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="text-3xl font-bold tracking-tight text-foreground leading-tight cursor-default select-none"
                onClick={handleLogoClick}
              >
                {taglineAlt
                  ? <>Your teacher&apos;s<br />nightmare.</>
                  : <>Your school,<br />streamlined.</>}
              </motion.h2>
            </AnimatePresence>
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
                    { icon: CalendarDays, label: "Mathematics · 08:15", color: "oklch(0.65 0.22 278)" },
                    { icon: BookOpen, label: "English · 10:00", color: "oklch(0.72 0.18 148)" },
                    { icon: StickyNote, label: "2 notes · updated", color: "oklch(0.75 0.18 310)" },
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
                    {[0, 1, 2].map(i => (
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
              style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary) 75%, oklch(0.4 0.3 285)))" }}>
              <span className="text-white text-xs font-bold">S+</span>
            </div>
            <span className="text-sm font-semibold text-foreground/80">SchoolSoft+</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
            <p className="text-sm mt-1.5 text-muted-foreground">
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
                className="h-10 text-sm bg-card"
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
                  className="pr-9 h-10 text-sm bg-card"
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
                <motion.div
                  key="err"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <p className="text-xs px-3 py-2.5 rounded-lg border border-destructive/20 bg-destructive/8 text-destructive">
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

          {/*  AuthV2 separator  */}
          <div className="mt-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] text-muted-foreground/50">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/*  AuthV2 login  */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="mt-4"
          >
            {/* Experimental badge */}
            <div className="flex items-center gap-1.5 mb-3">
              <FlaskConical className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-medium text-primary">
                Experimental
              </span>
              <span className="text-[10px] text-muted-foreground/60">
                &middot; Schoolsoft OAuth Login (AuthV2)
              </span>
            </div>

            <button
              type="button"
              onClick={handleAuthV2Login}
              disabled={isAuthV2Loading}
              className="w-full mb-3 h-10 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all disabled:opacity-60 border border-primary/25 hover:border-primary/40 hover:bg-brand-dim"
              style={{
                background: "color-mix(in oklch, var(--brand) 6%, transparent)",
                color: "var(--primary)",
              }}
            >
              {isAuthV2Loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ExternalLink className="w-3.5 h-3.5" />
                  Login through SchoolSoft
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleAuthV2ExternalLogin}
              disabled={isAuthV2ExternalLoading}
              className="w-full h-10 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all disabled:opacity-60 border border-primary/25 hover:border-primary/40 hover:bg-brand-dim"
              style={{
                background: "color-mix(in oklch, var(--brand) 8%, transparent)",
                color: "var(--primary)",
              }}
            >
              {isAuthV2ExternalLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Login with external provider
                </>
              )}
            </button>
          </motion.div>

          {/* Help links */}
          <div className="mt-6 pt-5 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground/60">
            <Link href="/login-help" className="hover:text-foreground transition-colors">
              Can&apos;t sign in?
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms &amp; Privacy
            </Link>
          </div>
        </motion.div>
      </div>

      {/*  Cinematic exit curtain: 7 strips close in from both sides  */}
      {exitActive && (
        <div className="fixed inset-0 z-9999 overflow-hidden pointer-events-none">
          {Array.from({ length: 7 }).map((_, i) => {
            const fromLeft = i % 2 === 0;
            const isLast = i === 6;
            const bg =
              i % 3 === 0
                ? "oklch(0.11 0.16 278)"
                : i % 3 === 1
                  ? "oklch(0.09 0.13 295)"
                  : "oklch(0.07 0.10 310)";
            return (
              <motion.div
                key={i}
                className="absolute left-0 right-0"
                style={{
                  top: `${(i / 7) * 100}%`,
                  height: `${100 / 7 + 0.3}%`,
                  background: bg,
                }}
                initial={{ x: fromLeft ? "-105%" : "105%" }}
                animate={{ x: "0%" }}
                transition={{
                  duration: 0.58,
                  delay: i * 0.048,
                  ease: [0.76, 0, 0.24, 1],
                }}
                onAnimationComplete={
                  isLast
                    ? () => { markTransitionPending(); router.replace("/dashboard"); }
                    : undefined
                }
              >
                {/* Leading-edge shimmer */}
                <div
                  className="absolute top-0 bottom-0"
                  style={{
                    [fromLeft ? "right" : "left"]: 0,
                    width: "28px",
                    background: fromLeft
                      ? "linear-gradient(to right, transparent, rgba(255,255,255,0.06) 60%, rgba(255,255,255,0.18))"
                      : "linear-gradient(to left,  transparent, rgba(255,255,255,0.06) 60%, rgba(255,255,255,0.18))",
                  }}
                />
              </motion.div>
            );
          })}

          {/* Brand mark springs in once strips converge */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center select-none"
            style={{ zIndex: 20 }}
            initial={{ opacity: 0, scale: 0.80 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.44, duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex flex-col items-center gap-4">
              <div
                style={{
                  filter:
                    "drop-shadow(0 0 24px oklch(0.65 0.22 278 / 0.65)) drop-shadow(0 4px 16px oklch(0 0 0 / 0.7))",
                }}
              >
                <Image
                  src="/logo.png"
                  alt="SchoolSoft+"
                  width={52}
                  height={52}
                  priority
                />
              </div>
              <span
                className="text-[11px] tracking-[0.40em] uppercase font-medium"
                style={{ color: "rgba(255,255,255,0.22)" }}
              >
                SchoolSoft+
              </span>
            </div>
          </motion.div>
        </div>
      )}

      {/*  Konami code easter egg  */}
      <AnimatePresence>
        {easterEgg && (
          <motion.div
            key="easter-egg"
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-9998 flex items-center justify-center p-6"
            style={{ background: "oklch(0 0 0 / 60%)", backdropFilter: "blur(6px)" }}
            onClick={() => setEasterEgg(false)}
          >
            <div
              className="font-mono text-sm rounded-2xl p-6 shadow-2xl max-w-sm w-full"
              style={{
                background: "oklch(0.08 0.02 150)",
                border: "1px solid oklch(0.50 0.18 148 / 35%)",
                boxShadow:
                  "0 0 80px oklch(0.50 0.18 148 / 15%), 0 32px 64px oklch(0 0 0 / 60%)",
                color: "oklch(0.72 0.18 148)",
              }}
              onClick={e => e.stopPropagation()}
            >
              <div
                className="mb-3 flex items-center gap-2 text-xs tracking-widest uppercase"
                style={{ color: "oklch(0.50 0.18 148)" }}
              >
                <span>▶</span><span>Cheat Code Activated</span>
              </div>
              {[
                "HACKING SCHOOLSOFT",
                "HACKING INTO YOUR GRADES",
                "WHY ARE THEY ALL F'S",
                "NOT CHANGING ALL OF THEM TO A'S",
              ].map((line, i) => (
                <motion.p
                  key={line}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.13 + 0.05 }}
                  className="text-xs leading-7"
                >
                  <span style={{ color: "oklch(0.45 0.15 148)" }}>{">"}</span>{" "}
                  {line}{" "}
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.13 + 0.22 }}
                    style={{ color: "oklch(0.65 0.2 148)" }}
                  >
                    ✓
                  </motion.span>
                </motion.p>
              ))}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.78 }}
                className="mt-4 text-center text-[10px] tracking-[0.2em] uppercase"
                style={{ color: "oklch(0.45 0.15 148)" }}
              >
                Good luck today, student · click to dismiss
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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