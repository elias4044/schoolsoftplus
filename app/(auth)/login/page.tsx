'use client';

import { Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as Popover from '@radix-ui/react-popover';
import {
  browserSupportsWebAuthn,
  startAuthentication,
  type PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';
import { Command } from 'cmdk';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Fingerprint,
  Loader2,
  Search,
  X,
} from 'lucide-react';

import { useAuth } from '@/lib/auth-context';

const DEFAULT_SCHOOL_ID = 'engelska';
const DEFAULT_SCHOOL_NAME = 'Internationella Engelska Skolan - IES Halmstad';
const RECENT_SCHOOLS_KEY = 'ssp_recent_schools';
const MAX_VISIBLE = 100;
interface School {
  name: string;
  id: string;
}
const subscribeToBrowser = () => () => {};

function SchoolPicker({
  value,
  displayName,
  onChange,
  disabled,
}: {
  value: string;
  displayName: string;
  onChange: (id: string, name: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [schools, setSchools] = useState<School[]>([]);
  const [fetched, setFetched] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [recentSchools, setRecentSchools] = useState<School[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  async function loadSchools() {
    if (fetching) return;
    setFetching(true);
    setFetchError(false);
    try {
      const res = await fetch('/api/schools');
      if (!res.ok) throw new Error('Could not load schools.');
      const data = await res.json();
      if (!Array.isArray(data.schools)) throw new Error('Invalid school list.');
      setSchools(
        data.schools.filter(
          (school: School) => typeof school?.id === 'string' && typeof school?.name === 'string'
        )
      );
      setFetched(true);
    } catch {
      setFetchError(true);
    } finally {
      setFetching(false);
    }
  }

  function changeOpen(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) return;
    setQuery('');
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(RECENT_SCHOOLS_KEY) || '[]');
      setRecentSchools(
        Array.isArray(stored)
          ? stored
              .filter(
                (school: School) =>
                  typeof school?.id === 'string' && typeof school?.name === 'string'
              )
              .slice(0, 3)
          : []
      );
    } catch {
      setRecentSchools([]);
    }
    if (!fetched) void loadSchools();
  }

  function selectSchool(school: School) {
    onChange(school.id, school.name);
    const recent = [school, ...recentSchools.filter((item) => item.id !== school.id)].slice(0, 3);
    setRecentSchools(recent);
    try {
      localStorage.setItem(RECENT_SCHOOLS_KEY, JSON.stringify(recent));
    } catch {
      /* Storage can be unavailable in private browsing. */
    }
    setOpen(false);
  }

  const filtered = schools.filter((school) =>
    school.name.toLowerCase().includes(query.trim().toLowerCase())
  );
  const recent = query.trim()
    ? []
    : recentSchools.filter(
        (school) => !schools.length || schools.some((item) => item.id === school.id)
      );
  const recentIds = new Set(recent.map((school) => school.id));
  const main = filtered.filter((school) => !recentIds.has(school.id)).slice(0, MAX_VISIBLE);
  const overflow = filtered.filter((school) => !recentIds.has(school.id)).length - main.length;
  const renderSchool = (school: School) => (
    <Command.Item
      key={`${school.id}-${school.name}`}
      value={`${school.id} ${school.name}`}
      onSelect={() => selectSchool(school)}
      className="data-[selected=true]:bg-surface-3 [&_svg]:text-brand-strong flex min-h-11 cursor-pointer items-center justify-between gap-2.5 rounded-md p-2.5 text-sm leading-snug [&_svg]:shrink-0 [&>span]:min-w-0 [&>span]:wrap-anywhere"
    >
      <span>{school.name}</span>
      {school.id === value && <Check size={16} aria-label="Current school" />}
    </Command.Item>
  );

  return (
    <Popover.Root open={open} onOpenChange={changeOpen}>
      <Popover.Trigger asChild>
        <button
          id="school"
          type="button"
          disabled={disabled}
          className="bg-surface-2 [&_svg]:text-muted-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:not-disabled:bg-surface-3 flex min-h-[60px] w-full cursor-pointer items-center justify-between gap-5 rounded-[10px] px-4 py-3.5 text-left text-sm leading-normal transition-colors duration-180 [&_span]:min-w-0 [&_span]:wrap-anywhere [&_svg]:shrink-0 data-[state=open]:[&_svg]:rotate-180"
          aria-label={`School: ${displayName || value}`}
        >
          <span>{displayName || value}</span>
          <ChevronDown size={18} aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="border-border-strong bg-popover text-popover-foreground [&_button]:focus-visible:outline-brand-strong z-60 w-(--radix-popover-trigger-width) max-w-[calc(100vw-40px)] overflow-hidden rounded-xl border font-sans shadow-xl [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-offset-4"
          align="start"
          sideOffset={8}
          collisionPadding={20}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <Command shouldFilter={false} label="Choose your school" className="w-full">
            <div className="bg-surface-3 [&>svg]:text-muted-foreground [&_input]:placeholder:text-muted-foreground flex items-center gap-2.5 px-3.5 py-2 [&_button]:flex [&_button]:size-9 [&_button]:shrink-0 [&_button]:cursor-pointer [&_button]:items-center [&_button]:justify-center [&_button]:rounded-md [&_input]:min-h-9 [&_input]:w-full [&_input]:min-w-0 [&_input]:text-sm [&_input]:outline-none [&>svg]:shrink-0">
              <Search size={17} aria-hidden="true" />
              <Command.Input
                ref={inputRef}
                value={query}
                onValueChange={setQuery}
                placeholder="Search schools..."
                aria-label="Search schools"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear school search"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <Command.List
              className="max-h-[min(320px,var(--radix-popover-content-available-height))] overflow-y-auto overscroll-contain p-1.5"
              aria-label="Schools"
            >
              {fetching && !schools.length ? (
                <div
                  className="flex flex-wrap items-center justify-center gap-2 px-3.5 py-6 text-center text-sm leading-normal [&_button]:min-h-11 [&_button]:w-full [&_button]:cursor-pointer [&_button]:underline [&_button]:underline-offset-4"
                  role="status"
                >
                  <Loader2 size={16} className="shrink-0 motion-safe:animate-spin" />
                  Loading schools...
                </div>
              ) : fetchError ? (
                <div
                  className="flex flex-wrap items-center justify-center gap-2 px-3.5 py-6 text-center text-sm leading-normal [&_button]:min-h-11 [&_button]:w-full [&_button]:cursor-pointer [&_button]:underline [&_button]:underline-offset-4"
                  role="alert"
                >
                  <p>Couldn&apos;t load schools.</p>
                  <button type="button" onClick={() => void loadSchools()}>
                    Try again
                  </button>
                </div>
              ) : (
                <>
                  {!recent.length && !main.length && (
                    <Command.Empty className="flex flex-wrap items-center justify-center gap-2 px-3.5 py-6 text-center text-sm leading-normal [&_button]:min-h-11 [&_button]:w-full [&_button]:cursor-pointer [&_button]:underline [&_button]:underline-offset-4">
                      No schools match &quot;{query}&quot;. Try a different name.
                    </Command.Empty>
                  )}
                  {!!recent.length && (
                    <Command.Group
                      heading="Recent schools"
                      className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-[13px]"
                    >
                      {recent.map(renderSchool)}
                    </Command.Group>
                  )}
                  {!!main.length && (
                    <Command.Group
                      heading={recent.length ? 'All schools' : undefined}
                      className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-[13px]"
                    >
                      {main.map(renderSchool)}
                    </Command.Group>
                  )}
                  {overflow > 0 && (
                    <p className="text-muted-foreground px-2.5 py-3 text-[13px] leading-normal">
                      {overflow} more schools. Type to narrow the list.
                    </p>
                  )}
                </>
              )}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function LoginFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background text-foreground [&_a]:focus-visible:outline-brand-strong [&_button]:focus-visible:outline-brand-strong [&_summary]:focus-visible:outline-brand-strong [&_textarea]:focus-visible:outline-brand-strong flex min-h-svh min-w-0 flex-col [&_a]:focus-visible:outline-2 [&_a]:focus-visible:outline-offset-4 [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-offset-4 [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-50 [&_summary]:focus-visible:outline-2 [&_summary]:focus-visible:outline-offset-4 [&_textarea]:focus-visible:outline-2 [&_textarea]:focus-visible:outline-offset-4">
      <header className="mx-auto flex min-h-20 w-full max-w-[1440px] items-center justify-between gap-6 px-5 sm:min-h-24 sm:px-8 xl:px-14">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 text-base font-semibold tracking-[-0.035em] sm:text-lg"
        >
          <Image src="/logo.png" alt="" width={30} height={30} />
          SchoolSoft+
        </Link>
        <Link
          href="/"
          className="text-muted-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:text-foreground inline-flex min-h-11 w-11 items-center justify-end gap-0 text-[0px] transition-colors duration-180 sm:w-auto sm:justify-start sm:gap-2 sm:text-sm"
          aria-label="Back to home"
        >
          <ArrowLeft size={16} />
          Back to home
        </Link>
      </header>
      <main className="flex min-w-0 flex-1 items-center justify-center px-5 pt-6 pb-10 sm:pt-10 sm:pb-14">
        {children}
      </main>
      <footer className="text-muted-foreground [@media(hover:hover)_and_(pointer:fine)]:[&_a:hover]:text-foreground mx-auto flex w-full max-w-[1440px] flex-col items-center justify-center gap-2 px-5 py-4 text-center text-[13px] leading-normal sm:flex-row sm:justify-between sm:gap-5 sm:px-8 sm:py-6 sm:text-left xl:px-14 [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a]:whitespace-nowrap [&_a]:transition-colors [&_a]:duration-180 [&>p]:max-w-[290px] sm:[&>p]:max-w-none">
        <p>An independent project. Not affiliated with SchoolSoft AB.</p>
        <Link href="/terms">Terms & privacy</Link>
      </footer>
    </div>
  );
}

function LoginFallback() {
  return (
    <LoginFrame>
      <div className="bg-surface-1 w-full max-w-[400px] rounded-[20px] px-6 py-7 max-[360px]:px-5 sm:max-w-[440px] sm:p-9 [&_h1]:text-[28px] [&_h1]:leading-[1.15] [&_h1]:font-[550] [&_h1]:tracking-[-0.04em] [&_h1]:text-balance">
        <h1>Sign in</h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          Use your existing SchoolSoft account.
        </p>
        <p className="text-muted-foreground mt-6 text-sm" role="status">
          Checking your session...
        </p>
      </div>
    </LoginFrame>
  );
}
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageInner />
    </Suspense>
  );
}

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
  const passkeySupported = useSyncExternalStore(
    subscribeToBrowser,
    browserSupportsWebAuthn,
    () => false
  );
  const [serviceDown, setServiceDown] = useState(false);
  const [serviceDownMessage, setServiceDownMessage] = useState<string | null>(null);
  const [checkingService, setCheckingService] = useState(false);
  const [error, setError] = useState<string | null>(authV2ErrorParam);
  const [advancedLoginOpen, setAdvancedLoginOpen] = useState(false);
  const [refreshTokenValue, setRefreshTokenValue] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const hasAttemptedRefreshRef = useRef(false);
  const tokenInputRef = useRef<HTMLTextAreaElement>(null);
  const anyLoading =
    isAuthV2Loading || isAuthV2ExternalLoading || isRefreshTokenLoading || isPasskeyLoading;
  const blocked = authLoading || isAuthenticated || serviceDown || anyLoading;

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
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (data && data.success === false) return;
        router.replace('/dashboard');
      } catch {
        /* No active session. Keep the sign-in form available. */
      }
    }
    void attemptForceRefresh();
  }, [isAuthenticated, authLoading, authV2ErrorParam, router]);

  const checkServiceStatus = useCallback(async () => {
    setCheckingService(true);
    try {
      const res = await fetch('/api/stats/firebase');
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.operational) {
        setServiceDown(true);
        setServiceDownMessage(
          data?.errorCode === 'RESOURCE_EXHAUSTED' || data?.error === 'RESOURCE_EXHAUSTED'
            ? 'SchoolSoft+ is temporarily unavailable due to high usage. Please try again later.'
            : (data?.message ?? 'SchoolSoft+ is temporarily unavailable. Please try again later.')
        );
      } else {
        setServiceDown(false);
        setServiceDownMessage(null);
      }
    } catch {
      setServiceDown(true);
      setServiceDownMessage("Couldn't check service availability. Please try again.");
    } finally {
      setCheckingService(false);
    }
  }, []);
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void checkServiceStatus();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [checkServiceStatus]);

  const handleAuthV2Login = useCallback(() => {
    if (blocked) return;
    setError(null);
    setIsAuthV2Loading(true);
    window.location.href = `/api/auth/v2/initiate?school=${encodeURIComponent(schoolId)}`;
  }, [blocked, schoolId]);
  const handleAuthV2ExternalLogin = useCallback(() => {
    if (blocked) return;
    setError(null);
    setIsAuthV2ExternalLoading(true);
    window.location.href = `/api/auth/v2/initiate/external?school=${encodeURIComponent(schoolId)}`;
  }, [blocked, schoolId]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        handleAuthV2ExternalLogin();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleAuthV2ExternalLogin]);

  async function handlePasskeyLogin() {
    if (blocked) return;
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
        if ((err as Error).name === 'NotAllowedError')
          throw new Error('Passkey sign-in was cancelled.');
        throw new Error('Could not access your passkey. Please try again.');
      }
      const completeRes = await fetch('/api/auth/passkey/authenticate/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: authResp }),
      });
      const completeData = await completeRes.json();
      if (!completeData.success) throw new Error(completeData.error ?? 'Passkey login failed.');
      router.replace('/dashboard');
    } catch (err) {
      setPasskeyError((err as Error).message);
    } finally {
      setIsPasskeyLoading(false);
    }
  }

  async function handleRefreshTokenLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked) return;
    const trimmedToken = refreshTokenValue.trim();
    setError(null);
    setTokenError(null);
    if (!trimmedToken) {
      setTokenError('Enter a refresh token first.');
      tokenInputRef.current?.focus();
      return;
    }
    setIsRefreshTokenLoading(true);
    try {
      const res = await fetch('/api/auth/v2/refresh-token-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school: schoolId, refreshToken: trimmedToken }),
      });
      const data = await res
        .json()
        .catch(() => ({ success: false, error: 'Refresh token login failed.' }));
      if (!res.ok || !data.success) {
        setTokenError(data.error ?? 'Refresh token login failed.');
        tokenInputRef.current?.focus();
        return;
      }
      setRefreshTokenValue('');
      router.replace('/dashboard');
    } catch {
      setTokenError('Network error. Please try again.');
      tokenInputRef.current?.focus();
    } finally {
      setIsRefreshTokenLoading(false);
    }
  }

  return (
    <LoginFrame>
      <div className="bg-surface-1 w-full max-w-[400px] rounded-[20px] px-6 py-7 max-[360px]:px-5 sm:max-w-[440px] sm:p-9 [&_h1]:text-[28px] [&_h1]:leading-[1.15] [&_h1]:font-[550] [&_h1]:tracking-[-0.04em] [&_h1]:text-balance">
        <div className="mb-8">
          <h1>Sign in</h1>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            Use your existing SchoolSoft account.
          </p>
        </div>
        {serviceDown && (
          <div
            className="bg-surface-2 [&>svg]:text-destructive mb-6 flex items-start gap-2.5 rounded-[10px] p-3.5 text-sm leading-normal [&_button]:block [&_button]:min-h-11 [&_button]:cursor-pointer [&_button]:underline [&_button]:underline-offset-4 [&_strong]:font-medium [&_strong+p]:mt-1.5 [&>svg]:mt-0.5 [&>svg]:shrink-0"
            role="alert"
          >
            <AlertCircle size={18} />
            <div>
              <strong>Service unavailable</strong>
              <p>{serviceDownMessage}</p>
              <button
                type="button"
                onClick={() => void checkServiceStatus()}
                disabled={checkingService}
              >
                {checkingService ? 'Checking...' : 'Try again'}
              </button>
            </div>
          </div>
        )}
        {error && (
          <div
            className="bg-surface-2 [&>svg]:text-destructive mb-6 flex items-start gap-2.5 rounded-[10px] p-3.5 text-sm leading-normal [&_button]:block [&_button]:min-h-11 [&_button]:cursor-pointer [&_button]:underline [&_button]:underline-offset-4 [&_strong]:font-medium [&_strong+p]:mt-1.5 [&>svg]:mt-0.5 [&>svg]:shrink-0"
            role="alert"
          >
            <AlertCircle size={18} />
            <p>{error}</p>
          </div>
        )}
        <div className="grid gap-2.5 [&>label]:text-sm [&>label]:font-medium">
          <label htmlFor="school">Your school</label>
          <SchoolPicker
            value={schoolId}
            displayName={schoolName}
            disabled={blocked}
            onChange={(id, name) => {
              setSchoolId(id);
              setSchoolName(name);
            }}
          />
        </div>
        <button
          type="button"
          onClick={handleAuthV2Login}
          disabled={blocked}
          className="bg-brand text-brand-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:not-disabled:bg-brand-hover mt-5 flex min-h-12 w-full cursor-pointer items-center justify-center gap-4 rounded-full px-5 py-3 text-sm font-semibold transition-[background-color,transform] duration-140 ease-[cubic-bezier(0.23,1,0.32,1)] motion-safe:active:not-focus-visible:not-disabled:scale-[0.97] max-[360px]:gap-2.5 max-[360px]:px-3.5"
          aria-busy={isAuthV2Loading}
        >
          <span>
            {isAuthV2Loading
              ? 'Opening SchoolSoft...'
              : authLoading
                ? 'Checking your session...'
                : isAuthenticated
                  ? 'Opening your dashboard...'
                  : 'Continue with SchoolSoft'}
          </span>
          {isAuthV2Loading || authLoading || isAuthenticated ? (
            <Loader2 size={17} className="shrink-0 motion-safe:animate-spin" aria-hidden="true" />
          ) : (
            <ArrowRight size={17} aria-hidden="true" />
          )}
        </button>
        <p className="text-muted-foreground mt-3 text-center text-[13px] leading-normal">
          You&apos;ll sign in securely on SchoolSoft.
        </p>
        <button
          type="button"
          onClick={handleAuthV2ExternalLogin}
          disabled={blocked}
          className="[&>svg]:text-muted-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:not-disabled:bg-surface-2 mt-3 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2.5 rounded-lg py-3 text-sm transition-colors duration-180 [&>svg]:shrink-0"
          aria-busy={isAuthV2ExternalLoading}
        >
          <span>
            {isAuthV2ExternalLoading
              ? 'Opening school login...'
              : "Use your school's external login"}
          </span>
          {isAuthV2ExternalLoading ? (
            <Loader2 size={17} className="shrink-0 motion-safe:animate-spin" aria-hidden="true" />
          ) : (
            <ArrowRight size={16} aria-hidden="true" />
          )}
        </button>
        {passkeySupported && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => void handlePasskeyLogin()}
              disabled={blocked}
              className="bg-surface-2 [&_svg]:text-muted-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:not-disabled:bg-surface-3 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2.5 rounded-full p-2.5 text-sm transition-[background-color,transform] duration-140 ease-[cubic-bezier(0.23,1,0.32,1)] motion-safe:active:not-focus-visible:not-disabled:scale-[0.97]"
              aria-busy={isPasskeyLoading}
            >
              {isPasskeyLoading ? (
                <Loader2
                  size={18}
                  className="shrink-0 motion-safe:animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Fingerprint size={18} aria-hidden="true" />
              )}
              <span>
                {isPasskeyLoading ? 'Waiting for your passkey...' : 'Use a saved passkey'}
              </span>
            </button>
            {passkeyError && (
              <p className="text-foreground mt-3 text-sm leading-normal" role="alert">
                {passkeyError}
              </p>
            )}
          </div>
        )}
        <details
          className="group [&_summary]:text-muted-foreground [@media(hover:hover)_and_(pointer:fine)]:[&_summary:hover]:text-foreground mt-6 [&_summary]:flex [&_summary]:min-h-11 [&_summary]:cursor-pointer [&_summary]:list-none [&_summary]:items-center [&_summary]:justify-between [&_summary]:gap-3 [&_summary]:text-[13px] open:[&_summary_svg]:rotate-180 [&_summary::-webkit-details-marker]:hidden"
          open={advancedLoginOpen}
          onToggle={(event) => setAdvancedLoginOpen(event.currentTarget.open)}
        >
          <summary>
            Advanced sign-in
            <ChevronDown size={16} aria-hidden="true" />
          </summary>
          <form
            onSubmit={handleRefreshTokenLogin}
            className="bg-surface-2 [&>p]:text-muted-foreground [&_textarea]:bg-surface-1 [&_textarea]:text-foreground [&_textarea]:placeholder:text-muted-foreground [&>p[role=alert]]:text-foreground mt-2 grid gap-2.5 rounded-[10px] p-4 [&_textarea]:min-h-[100px] [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-md [&_textarea]:p-3 [&_textarea]:text-sm [&_textarea]:leading-normal [&_textarea]:wrap-anywhere [&>label]:text-sm [&>label]:font-medium [&>p]:text-[13px] [&>p]:leading-normal [&>p[role=alert]]:mt-0 [&>p[role=alert]]:text-sm"
          >
            <label htmlFor="refresh-token">Refresh token</label>
            <p id="token-help">For an existing AuthV2 refresh token.</p>
            <textarea
              ref={tokenInputRef}
              id="refresh-token"
              value={refreshTokenValue}
              onChange={(event) => setRefreshTokenValue(event.target.value)}
              rows={3}
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              disabled={blocked}
              aria-describedby={tokenError ? 'token-help token-error' : 'token-help'}
              aria-invalid={!!tokenError}
              placeholder="Paste your refresh token"
            />
            {tokenError && (
              <p
                id="token-error"
                className="text-foreground mt-3 text-sm leading-normal"
                role="alert"
              >
                {tokenError}
              </p>
            )}
            <button
              type="submit"
              disabled={blocked}
              className="bg-surface-3 [@media(hover:hover)_and_(pointer:fine)]:hover:not-disabled:bg-surface-3 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors duration-180"
              aria-busy={isRefreshTokenLoading}
            >
              {isRefreshTokenLoading ? (
                <>
                  <Loader2
                    size={16}
                    className="shrink-0 motion-safe:animate-spin"
                    aria-hidden="true"
                  />
                  Signing in...
                </>
              ) : (
                'Sign in with token'
              )}
            </button>
          </form>
        </details>
        <div className="[&_a]:text-foreground [&_a]:decoration-border-strong mt-4 text-center text-sm [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a]:underline [&_a]:underline-offset-4">
          <Link href="/login-help">Need help signing in?</Link>
        </div>
        <noscript>
          <p className="text-foreground mt-3 text-sm leading-normal">
            Enable JavaScript to sign in to SchoolSoft+.
          </p>
        </noscript>
      </div>
    </LoginFrame>
  );
}
