'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  CalendarDays,
  BookOpen,
  StickyNote,
  Search,
  ChevronDown,
  Check,
  ExternalLink,
  ShieldCheck,
  GraduationCap,
  Fingerprint,
  Lock,
  SlidersHorizontal,
  AlertCircle,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { markTransitionPending } from '@/lib/page-transition';
import { cn } from '@/lib/utils';
import {
  startAuthentication,
  browserSupportsWebAuthn,
  type PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';

const DEFAULT_SCHOOL_ID = 'engelska';
const DEFAULT_SCHOOL_NAME = 'Internationella Engelska Skolan - IES Halmstad';
const RECENT_SCHOOLS_KEY = 'ssp_recent_schools';
const MAX_VISIBLE = 100;
const KONAMI_SEQ = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
] as const;

interface School {
  name: string;
  id: string;
}

// ---------------------------------------------------------------------------
// SchoolPicker (Searchable, keyboard-navigable, with recents)
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
  const [query, setQuery] = useState('');
  const [schools, setSchools] = useState<School[]>([]);
  const [fetched, setFetched] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const [recentSchools, setRecentSchools] = useState<School[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(RECENT_SCHOOLS_KEY);
      return stored ? (JSON.parse(stored) as School[]) : [];
    } catch {
      return [];
    }
  });

  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const loadSchools = useCallback(async () => {
    if (fetched || fetching) return;
    setFetching(true);
    try {
      const res = await fetch('/api/schools');
      const data = await res.json();
      if (Array.isArray(data.schools)) setSchools(data.schools);
    } catch {
      /* ignore */
    } finally {
      setFetched(true);
      setFetching(false);
    }
  }, [fetched, fetching]);

  function openPicker() {
    setOpen(true);
    setQuery('');
    setFocusedIdx(-1);
    loadSchools();
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function saveRecent(school: School) {
    const updated = [school, ...recentSchools.filter((r) => r.id !== school.id)].slice(0, 3);
    setRecentSchools(updated);
    try {
      localStorage.setItem(RECENT_SCHOOLS_KEY, JSON.stringify(updated));
    } catch {
      /* ignore */
    }
  }

  function selectSchool(school: School) {
    onChange(school.id, school.name);
    saveRecent(school);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = query.trim()
    ? schools.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
    : schools;
  const visible = filtered.slice(0, MAX_VISIBLE);
  const overflow = filtered.length - visible.length;

  const showRecent = !query.trim() && recentSchools.length > 0;
  const recentVisible = showRecent
    ? recentSchools.filter((r) => !schools.length || schools.some((s) => s.id === r.id))
    : [];
  const recentIds = new Set(recentVisible.map((r) => r.id));
  const mainList = visible.filter((s) => !recentIds.has(s.id));
  const navList = [...recentVisible, ...mainList];

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIdx((i) => Math.min(i + 1, navList.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && focusedIdx >= 0 && navList[focusedIdx]) {
      e.preventDefault();
      selectSchool(navList[focusedIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  useEffect(() => {
    if (focusedIdx < 0 || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-nav-idx="${focusedIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [focusedIdx]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={openPicker}
        className={cn(
          'flex h-11 w-full items-center gap-3 rounded-xl border px-3.5 text-left text-sm transition-all duration-150',
          'bg-card/75 hover:bg-card border-border hover:border-primary/40 focus:ring-primary/20 focus:ring-2 focus:outline-none',
          open && 'border-primary/50 ring-primary/20 bg-card ring-2'
        )}
      >
        <div className="bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-lg">
          <GraduationCap className="h-3.5 w-3.5" />
        </div>

        <div className="min-w-0 flex-1">
          <span className="text-foreground block truncate text-xs font-medium sm:text-sm">
            {displayName || value}
          </span>
        </div>

        {fetching ? (
          <Loader2 className="text-muted-foreground h-3.5 w-3.5 shrink-0 animate-spin" />
        ) : (
          <ChevronDown
            className={cn(
              'text-muted-foreground h-4 w-4 shrink-0 transition-transform duration-200',
              open && 'rotate-180'
            )}
          />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{ transformOrigin: 'top' }}
            className="border-border bg-card absolute top-[calc(100%+6px)] right-0 left-0 z-50 overflow-hidden rounded-2xl border shadow-2xl"
          >
            <div className="border-border flex items-center gap-2.5 border-b px-3 py-2.5">
              <Search className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setFocusedIdx(-1);
                }}
                onKeyDown={handleInputKeyDown}
                placeholder="Search school…"
                className="placeholder:text-muted-foreground/50 text-foreground flex-1 bg-transparent text-sm outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <div ref={listRef} className="max-h-60 overflow-y-auto overscroll-contain py-1">
              {fetching && !schools.length ? (
                <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-xs">
                  <Loader2 className="text-primary h-3.5 w-3.5 animate-spin" />
                  Loading schools…
                </div>
              ) : navList.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-xs">
                  No schools found for &ldquo;{query}&rdquo;
                </p>
              ) : (
                <>
                  {showRecent && recentVisible.length > 0 && (
                    <>
                      <p className="text-muted-foreground/50 px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wider uppercase">
                        Recent
                      </p>
                      {recentVisible.map((school, ri) => {
                        const active = school.id === value;
                        const focused = focusedIdx === ri;
                        return (
                          <button
                            key={'r-' + school.id}
                            data-nav-idx={ri}
                            type="button"
                            onClick={() => selectSchool(school)}
                            className={cn(
                              'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs transition-colors sm:text-sm',
                              active && 'bg-primary/10 text-primary font-medium',
                              focused && !active && 'bg-muted/70 text-foreground',
                              !active &&
                                !focused &&
                                'text-foreground/80 hover:bg-muted/50 hover:text-foreground'
                            )}
                          >
                            <span className="flex-1 truncate">{school.name}</span>
                            {active && <Check className="text-primary h-3.5 w-3.5 shrink-0" />}
                          </button>
                        );
                      })}
                      {mainList.length > 0 && <div className="border-border mx-3 my-1 border-t" />}
                    </>
                  )}

                  {mainList.map((school, mi) => {
                    const navIdx = recentVisible.length + mi;
                    const active = school.id === value;
                    const focused = focusedIdx === navIdx;
                    return (
                      <button
                        key={school.id + '-' + school.name}
                        data-nav-idx={navIdx}
                        type="button"
                        onClick={() => selectSchool(school)}
                        className={cn(
                          'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs transition-colors sm:text-sm',
                          active && 'bg-primary/10 text-primary font-medium',
                          focused && !active && 'bg-muted/70 text-foreground',
                          !active &&
                            !focused &&
                            'text-foreground/80 hover:bg-muted/50 hover:text-foreground'
                        )}
                      >
                        <span className="flex-1 truncate">{school.name}</span>
                        {active && <Check className="text-primary h-3.5 w-3.5 shrink-0" />}
                      </button>
                    );
                  })}

                  {overflow > 0 && (
                    <p className="text-muted-foreground/50 border-border border-t py-2 text-center text-[10px]">
                      +{overflow} more — type to filter
                    </p>
                  )}
                </>
              )}
            </div>

            {navList.length > 0 && (
              <div className="border-border text-muted-foreground/50 flex items-center justify-between border-t px-3 py-1.5 text-[10px]">
                <span>{filtered.length} schools</span>
                <span>↑↓ nav · ↵ select · Esc close</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LoginPage Export + Suspense boundary
// ---------------------------------------------------------------------------
export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}

// ---------------------------------------------------------------------------
// Main Login Page Inner
// ---------------------------------------------------------------------------
function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const authV2ErrorParam = searchParams.get('authv2_error');

  const [schoolId, setSchoolId] = useState(DEFAULT_SCHOOL_ID);
  const [schoolName, setSchoolName] = useState(DEFAULT_SCHOOL_NAME);

  const [isAuthV2Loading, setIsAuthV2Loading] = useState(false);
  const [isAuthV2ExternalLoading, setIsAuthV2ExternalLoading] = useState(false);
  const [isRefreshTokenLoading, setIsRefreshTokenLoading] = useState(false);
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [passkeySupported] = useState(() =>
    typeof window !== 'undefined' ? browserSupportsWebAuthn() : false
  );

  const [serviceDown, setServiceDown] = useState(false);
  const [serviceDownMessage, setServiceDownMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(authV2ErrorParam);
  const [exitActive, setExitActive] = useState(false);
  const [easterEgg, setEasterEgg] = useState(false);
  const [taglineAlt, setTaglineAlt] = useState(false);
  const [advancedLoginOpen, setAdvancedLoginOpen] = useState(false);
  const [refreshTokenValue, setRefreshTokenValue] = useState('');

  const shiftHeldRef = useRef(false);
  const konamiBufferRef = useRef<string[]>([]);
  const logoClicksRef = useRef(0);
  const logoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAttemptedRefreshRef = useRef(false);

  // Attempt force token-refresh on load; if successful, navigate to /dashboard
  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) {
      router.replace('/dashboard');
      return;
    }

    if (authV2ErrorParam || hasAttemptedRefreshRef.current) return;
    hasAttemptedRefreshRef.current = true;

    async function attemptForceRefresh() {
      try {
        const res = await fetch('/api/auth/v2/token-refresh', { method: 'POST' });
        if (!res.ok) {
          console.warn('[auth] token-refresh failed:', res.status);
          return;
        }

        const data = await res.json().catch(() => null);
        if (data && data.success === false) {
          console.warn('[auth] token-refresh rejected:', data.error);
          return;
        }

        router.replace('/dashboard');
      } catch (err) {
        console.error('[auth] token-refresh error:', err);
      }
    }

    void attemptForceRefresh();
  }, [isAuthenticated, authLoading, authV2ErrorParam, router]);

  const checkServiceStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/stats/firebase');
      if (!res.ok) {
        setServiceDown(true);
        setServiceDownMessage('SchoolSoft+ is currently down due to high usage.');
        return;
      }
      const data = await res.json().catch(() => ({ operational: false }));
      if (!data.operational) {
        if (data.errorCode === 'RESOURCE_EXHAUSTED' || data.error === 'RESOURCE_EXHAUSTED') {
          setServiceDownMessage(
            'SchoolSoft+ is currently down due to high usage (quota exceeded).'
          );
        } else {
          setServiceDownMessage(data.message ?? 'SchoolSoft+ is currently unavailable.');
        }
        setServiceDown(true);
      }
    } catch {
      setServiceDown(true);
      setServiceDownMessage('SchoolSoft+ is currently down due to high usage.');
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void checkServiceStatus();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [checkServiceStatus]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Shift') shiftHeldRef.current = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Shift') shiftHeldRef.current = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      konamiBufferRef.current = [...konamiBufferRef.current, e.key].slice(-KONAMI_SEQ.length);
      if (konamiBufferRef.current.join(',') === KONAMI_SEQ.join(',')) {
        setEasterEgg(true);
        konamiBufferRef.current = [];
        setTimeout(() => setEasterEgg(false), 4200);
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  function handleLogoClick() {
    logoClicksRef.current += 1;
    if (logoTimerRef.current) clearTimeout(logoTimerRef.current);
    if (logoClicksRef.current >= 5) {
      setTaglineAlt(true);
      logoClicksRef.current = 0;
      setTimeout(() => setTaglineAlt(false), 3000);
    } else {
      logoTimerRef.current = setTimeout(() => {
        logoClicksRef.current = 0;
      }, 1500);
    }
  }

  function completeLogin() {
    const isLarge = window.innerWidth >= 1024;
    if (isLarge && !shiftHeldRef.current) {
      setExitActive(true);
    } else {
      router.replace('/dashboard');
    }
  }

  const handlePasskeyLogin = async () => {
    setPasskeyError(null);
    setIsPasskeyLoading(true);
    try {
      const beginRes = await fetch('/api/auth/passkey/authenticate/begin', { method: 'POST' });
      const beginData = await beginRes.json();
      if (!beginData.success) throw new Error(beginData.error ?? 'Failed to start passkey login.');

      const options = beginData.options as PublicKeyCredentialRequestOptionsJSON;

      let authResp;
      try {
        authResp = await startAuthentication({ optionsJSON: options });
      } catch (err) {
        const e = err as Error;
        if (e.name === 'NotAllowedError') throw new Error('Passkey sign-in was cancelled.');
        throw new Error('Could not access your passkey. Please try again.');
      }

      const completeRes = await fetch('/api/auth/passkey/authenticate/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: authResp }),
      });
      const completeData = await completeRes.json();
      if (!completeData.success) throw new Error(completeData.error ?? 'Passkey login failed.');

      completeLogin();
    } catch (err) {
      setPasskeyError((err as Error).message);
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  const handleAuthV2Login = () => {
    setError(null);
    setIsAuthV2Loading(true);
    window.location.href = `/api/auth/v2/initiate?school=${encodeURIComponent(schoolId)}`;
  };

  const handleAuthV2ExternalLogin = () => {
    setError(null);
    setIsAuthV2ExternalLoading(true);
    window.location.href = `/api/auth/v2/initiate/external?school=${encodeURIComponent(schoolId)}`;
  };

  const handleRefreshTokenLogin = async () => {
    const trimmedToken = refreshTokenValue.trim();
    setError(null);

    if (!trimmedToken) {
      setError('Enter a refresh token first.');
      setAdvancedLoginOpen(true);
      return;
    }

    setIsRefreshTokenLoading(true);
    try {
      const res = await fetch('/api/auth/v2/refresh-token-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school: schoolId,
          refreshToken: trimmedToken,
        }),
      });

      const data = await res
        .json()
        .catch(() => ({ success: false, error: 'Refresh token login failed.' }));
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Refresh token login failed.');
        setAdvancedLoginOpen(true);
        return;
      }

      setRefreshTokenValue('');
      completeLogin();
    } catch {
      setError('Network error. Please try again.');
      setAdvancedLoginOpen(true);
    } finally {
      setIsRefreshTokenLoading(false);
    }
  };

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        handleAuthV2ExternalLogin()
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (authLoading) return null;

  if (serviceDown) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center p-8">
        <div className="border-border bg-card w-full max-w-md space-y-4 rounded-2xl border p-8 text-center shadow-xl">
          <h2 className="text-foreground text-xl font-bold">Service unavailable</h2>
          <p className="text-muted-foreground text-sm">
            {serviceDownMessage ?? 'SchoolSoft+ is currently down. Please try again later.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setServiceDown(false);
              setServiceDownMessage(null);
              checkServiceStatus();
            }}
            className="bg-primary text-primary-foreground h-10 w-full rounded-xl text-sm font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const anyLoading = isAuthV2Loading || isAuthV2ExternalLoading;

  return (
    <div className="bg-background flex min-h-screen overflow-hidden">
      {/* ----------------------------------------------------------------- */}
      {/* Left panel: Original 3D Hero Mockup (Scaled up & roomier)        */}
      {/* ----------------------------------------------------------------- */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex lg:w-[54%] xl:p-14"
        style={{ background: 'var(--card)', borderRight: '1px solid var(--border)' }}
      >
        {/* dot grid */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* ambient top-left orb */}
        <div
          className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full"
          style={{ background: 'radial-gradient(circle, var(--brand-dim) 0%, transparent 70%)' }}
        />
        {/* ambient bottom-right orb */}
        <div
          className="pointer-events-none absolute -right-24 -bottom-24 h-80 w-80 rounded-full"
          style={{
            background: 'radial-gradient(circle, oklch(0.55 0.25 295 / 10%) 0%, transparent 70%)',
          }}
        />

        {/* Logo */}
        <Link href="/" className="relative flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="SchoolSoft+ Logo"
            className="h-6 w-6"
            width={24}
            height={24}
          />
          <span className="text-foreground/80 text-sm font-semibold">SchoolSoft+</span>
        </Link>

        {/* Hero copy + Reverted bigger 3D App mockup */}
        <div className="relative flex flex-col items-start gap-10 xl:gap-12">
          <div>
            <AnimatePresence mode="wait">
              <motion.h2
                key={taglineAlt ? 'alt' : 'default'}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="text-foreground cursor-default text-4xl leading-[1.15] font-bold tracking-tight select-none xl:text-5xl"
                onClick={handleLogoClick}
              >
                {taglineAlt ? (
                  <>
                    Your teacher&apos;s
                    <br />
                    nightmare.
                  </>
                ) : (
                  <>
                    Your school,
                    <br />
                    streamlined.
                  </>
                )}
              </motion.h2>
            </AnimatePresence>
            <p
              className="mt-3.5 max-w-sm text-sm leading-relaxed xl:text-base"
              style={{ color: 'oklch(1 0 0 / 45%)' }}
            >
              Schedule, assignments, grades, and AI — in one clean dashboard.
            </p>
          </div>

          {/* 3-D app card (Reverted to original card structure, made bigger) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            style={{ perspective: '1000px' }}
          >
            <motion.div
              style={{ rotateX: 6, rotateY: -10, transformStyle: 'preserve-3d' }}
              className="w-80 xl:w-[350px]"
              whileHover={{ rotateX: 4, rotateY: -7 }}
              transition={{ type: 'spring', stiffness: 160, damping: 22 }}
            >
              {/* card background */}
              <div
                style={{
                  background: 'var(--background)',
                  border: '1px solid oklch(1 0 0 / 10%)',
                  boxShadow: '0 32px 80px oklch(0 0 0 / 60%)',
                  borderRadius: '1.15rem',
                  overflow: 'hidden',
                }}
              >
                {/* chrome */}
                <div
                  className="flex items-center gap-1.5 border-b px-3.5 py-3"
                  style={{ borderColor: 'oklch(1 0 0 / 6%)', background: 'oklch(1 0 0 / 3%)' }}
                >
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: 'oklch(0.68 0.18 20)' }}
                  />
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: 'oklch(0.78 0.16 70)' }}
                  />
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: 'oklch(0.68 0.18 148)' }}
                  />
                  <span className="ml-auto text-[10px]" style={{ color: 'oklch(1 0 0 / 35%)' }}>
                    Today
                  </span>
                </div>
                {/* rows */}
                <div className="space-y-2.5 p-3.5">
                  {[
                    {
                      icon: CalendarDays,
                      label: 'Mathematics · 08:15',
                      color: 'oklch(0.65 0.22 278)',
                    },
                    { icon: BookOpen, label: 'English · 10:00', color: 'oklch(0.72 0.18 148)' },
                    { icon: StickyNote, label: '2 notes · updated', color: 'oklch(0.75 0.18 310)' },
                  ].map(({ icon: Icon, label, color }, i) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35, delay: 0.4 + i * 0.08 }}
                      className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
                      style={{ background: 'oklch(1 0 0 / 3%)', borderColor: 'oklch(1 0 0 / 6%)' }}
                    >
                      <div
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                        style={{
                          background: `${color.replace('oklch(', 'oklch(').replace(')', ' / 18%)')}`,
                          color,
                        }}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="truncate text-xs" style={{ color: 'oklch(1 0 0 / 55%)' }}>
                        {label}
                      </span>
                    </motion.div>
                  ))}
                </div>
                {/* footer */}
                <div
                  className="flex items-center justify-between border-t px-3.5 py-2.5"
                  style={{ borderColor: 'oklch(1 0 0 / 6%)', background: 'oklch(1 0 0 / 2%)' }}
                >
                  <span className="text-[10px]" style={{ color: 'oklch(1 0 0 / 30%)' }}>
                    3 lessons today
                  </span>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: i === 0 ? 'var(--primary)' : 'oklch(1 0 0 / 10%)' }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <p className="relative text-[10px]" style={{ color: 'oklch(1 0 0 / 25%)' }}>
          Not affiliated with SchoolSoft AB · MIT Licensed
        </p>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Right panel: Fast, 1-Click Form (No walls of text)                */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-1 flex-col justify-between p-6 sm:p-10 lg:p-12">
        {/* Mobile brand header */}
        <div className="mb-6 flex items-center gap-3 lg:hidden">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{
              background:
                'linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary) 75%, oklch(0.4 0.3 285)))',
            }}
          >
            <span className="text-xs font-bold text-white">S+</span>
          </div>
          <span className="text-foreground text-sm font-semibold">SchoolSoft+</span>
        </div>

        {/* Center Card */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto my-auto w-full max-w-[360px] space-y-5"
        >
          <div>
            <h1 className="text-foreground text-2xl font-bold tracking-tight">Sign in</h1>
          </div>

          {/* School Selector */}
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs font-medium">School</Label>
            <SchoolPicker
              value={schoolId}
              displayName={schoolName}
              onChange={(id, name) => {
                setSchoolId(id);
                setSchoolName(name);
              }}
            />
          </div>

          {/* Error notice */}
          <AnimatePresence>
            {error && (
              <motion.div
                key="err"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="border-destructive/20 bg-destructive/10 text-destructive flex items-center gap-2 rounded-xl border p-2.5 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Direct 1-Click Login Actions: Standard & School SSO */}
          <div className="space-y-2.5 pt-1">
            {/* Direct SchoolSoft Login */}
            <button
              type="button"
              onClick={handleAuthV2Login}
              disabled={anyLoading}
              className="bg-primary flex h-11 w-full items-center justify-center gap-2 rounded-xl p-5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-60"
            >
              {isAuthV2Loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Sign in with SchoolSoft</span>
                  <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-60" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleAuthV2ExternalLogin}
              disabled={anyLoading}
              className="border-border bg-card/80 hover:bg-card hover:border-primary/40 text-foreground flex h-11 w-full items-center justify-center gap-2 rounded-xl border p-5 text-sm font-semibold shadow-sm transition-all active:scale-[0.99] disabled:opacity-60"
            >
              {isAuthV2ExternalLoading ? (
                <Loader2 className="text-primary h-4 w-4 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="text-primary h-4 w-4" />
                  <span>Sign in with External Login</span>
                  <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-40" />
                </>
              )}
            </button>
          </div>

          {/* Passkey Sign-in (Streamlined biometric) */}
          {passkeySupported && (
            <div className="space-y-3 pt-1">
              <div className="relative flex items-center justify-center text-xs">
                <div className="border-border/70 w-full border-t" />
                <span className="bg-background text-muted-foreground/60 px-3 text-[10px] font-medium tracking-widest uppercase">
                  or
                </span>
                <div className="border-border/70 w-full border-t" />
              </div>

              <button
                type="button"
                onClick={handlePasskeyLogin}
                disabled={isPasskeyLoading || anyLoading}
                className="border-border/80 bg-card/50 hover:bg-card hover:border-primary/30 text-foreground flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-xs font-medium transition-all disabled:opacity-60 sm:text-sm"
              >
                {isPasskeyLoading ? (
                  <Loader2 className="text-primary h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Fingerprint className="text-primary h-4 w-4" />
                    <span>Sign in with Passkey</span>
                  </>
                )}
              </button>

              <AnimatePresence>
                {passkeyError && (
                  <motion.p
                    key="pk-err"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-destructive/20 bg-destructive/10 text-destructive overflow-hidden rounded-lg border px-2.5 py-1.5 text-xs"
                  >
                    {passkeyError}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Advanced Developer / Token Sign-in Accordion */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setAdvancedLoginOpen(!advancedLoginOpen)}
              className="text-muted-foreground/60 hover:text-foreground flex w-full items-center justify-between py-1 text-[11px] font-medium transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal className="h-3 w-3" />
                <span>Advanced login</span>
              </span>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 transition-transform duration-200',
                  advancedLoginOpen && 'rotate-180'
                )}
              />
            </button>

            <AnimatePresence initial={false}>
              {advancedLoginOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="border-border/80 bg-muted/20 mt-2.5 space-y-2 rounded-xl border p-3">
                    <Label
                      htmlFor="refresh-token"
                      className="text-muted-foreground text-[10px] font-medium"
                    >
                      Refresh Token
                    </Label>
                    <textarea
                      id="refresh-token"
                      value={refreshTokenValue}
                      onChange={(e) => setRefreshTokenValue(e.target.value)}
                      rows={3}
                      spellCheck={false}
                      autoCapitalize="none"
                      autoCorrect="off"
                      className="border-border bg-card text-foreground placeholder:text-muted-foreground/40 focus:border-primary/50 focus:ring-primary/20 w-full resize-none rounded-lg border px-2.5 py-2 font-mono text-xs transition-colors outline-none focus:ring-1"
                      placeholder="Paste your AuthV2 refresh token..."
                    />
                    <button
                      type="button"
                      onClick={handleRefreshTokenLogin}
                      disabled={isRefreshTokenLoading}
                      className="border-border bg-secondary hover:bg-secondary/80 text-foreground flex h-8.5 w-full items-center justify-center gap-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-60"
                    >
                      {isRefreshTokenLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        'Sign in with token'
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Footer links */}
        <div className="border-border text-muted-foreground/60 flex items-center justify-between border-t pt-6 text-[11px]">
          <Link href="/login-help" className="hover:text-foreground transition-colors">
            Can&apos;t sign in?
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms &amp; Privacy
          </Link>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Cinematic Exit Curtain: 7 Strips                                  */}
      {/* ----------------------------------------------------------------- */}
      {exitActive && (
        <div className="pointer-events-none fixed inset-0 z-9999 overflow-hidden">
          {Array.from({ length: 7 }).map((_, i) => {
            const fromLeft = i % 2 === 0;
            const isLast = i === 6;
            const bg =
              i % 3 === 0
                ? 'oklch(0.11 0.16 278)'
                : i % 3 === 1
                  ? 'oklch(0.09 0.13 295)'
                  : 'oklch(0.07 0.10 310)';
            return (
              <motion.div
                key={i}
                className="absolute right-0 left-0"
                style={{
                  top: `${(i / 7) * 100}%`,
                  height: `${100 / 7 + 0.3}%`,
                  background: bg,
                }}
                initial={{ x: fromLeft ? '-105%' : '105%' }}
                animate={{ x: '0%' }}
                transition={{
                  duration: 0.58,
                  delay: i * 0.048,
                  ease: [0.76, 0, 0.24, 1],
                }}
                onAnimationComplete={
                  isLast
                    ? () => {
                        markTransitionPending();
                        router.replace('/dashboard');
                      }
                    : undefined
                }
              >
                <div
                  className="absolute top-0 bottom-0"
                  style={{
                    [fromLeft ? 'right' : 'left']: 0,
                    width: '28px',
                    background: fromLeft
                      ? 'linear-gradient(to right, transparent, rgba(255,255,255,0.06) 60%, rgba(255,255,255,0.18))'
                      : 'linear-gradient(to left,  transparent, rgba(255,255,255,0.06) 60%, rgba(255,255,255,0.18))',
                  }}
                />
              </motion.div>
            );
          })}

          <motion.div
            className="absolute inset-0 flex items-center justify-center select-none"
            style={{ zIndex: 20 }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.44, duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex flex-col items-center gap-4">
              <div
                style={{
                  filter:
                    'drop-shadow(0 0 24px oklch(0.65 0.22 278 / 0.65)) drop-shadow(0 4px 16px oklch(0 0 0 / 0.7))',
                }}
              >
                <Image src="/logo.png" alt="SchoolSoft+" width={52} height={52} priority />
              </div>
              <span
                className="text-[11px] font-medium tracking-[0.40em] uppercase"
                style={{ color: 'rgba(255,255,255,0.22)' }}
              >
                SchoolSoft+
              </span>
            </div>
          </motion.div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Konami Code Easter Egg Modal                                      */}
      {/* ----------------------------------------------------------------- */}
      <AnimatePresence>
        {easterEgg && (
          <motion.div
            key="easter-egg"
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-9998 flex items-center justify-center p-6"
            style={{ background: 'oklch(0 0 0 / 60%)', backdropFilter: 'blur(6px)' }}
            onClick={() => setEasterEgg(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl p-6 font-mono text-sm shadow-2xl"
              style={{
                background: 'oklch(0.08 0.02 150)',
                border: '1px solid oklch(0.50 0.18 148 / 35%)',
                boxShadow: '0 0 80px oklch(0.50 0.18 148 / 15%), 0 32px 64px oklch(0 0 0 / 60%)',
                color: 'oklch(0.72 0.18 148)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="mb-3 flex items-center gap-2 text-xs tracking-widest uppercase"
                style={{ color: 'oklch(0.50 0.18 148)' }}
              >
                <span>▶</span>
                <span>Cheat Code Activated</span>
              </div>
              {[
                'HACKING SCHOOLSOFT',
                'HACKING INTO YOUR GRADES',
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
                  <span style={{ color: 'oklch(0.45 0.15 148)' }}>{'>'}</span> {line}{' '}
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.13 + 0.22 }}
                    style={{ color: 'oklch(0.65 0.2 148)' }}
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
                style={{ color: 'oklch(0.45 0.15 148)' }}
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
