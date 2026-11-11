'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';

import { clearCache } from './cache';
import { clientAuth } from './firebase';
import { refreshSessionToken } from './session-refresh';
import { resetSession, useSession } from './useSession';

export interface AuthSession {
  school: string;
  username: string;
  userId: string;
  name?: string;
  theme: string;
  authType?: 'classic' | 'authv2';
}

interface AuthContextValue {
  session: AuthSession | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  login: () => void;
  logout: () => void;
  isAuthenticated: boolean;
  theme: string;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  isLoading: true,
  isRefreshing: false,
  error: null,
  refresh: async () => {},
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
  theme: 'light',
});

/** Returns the AuthV2 token expiry timestamp from the client-readable cookie, or null. */
function getAuthV2ExpiresAt(): number | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)ssp_ss_token_expires=([^;]+)/);
  return match ? parseInt(match[1], 10) : null;
}

/** Returns true if the user is logged in via AuthV2 (client cookie). */
function isAuthV2(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.includes('ssp_auth_type=authv2');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session: sessionData, loading, refreshing, error, refresh } = useSession();

  // Derive AuthSession from the /api/session response
  const session = useMemo<AuthSession | null>(
    () =>
      sessionData
        ? {
            school: sessionData.school,
            userId: sessionData.userId,
            username: sessionData.username ?? sessionData.user.userName,
            name: `${sessionData.user.firstName} ${sessionData.user.lastName}`.trim() || undefined,
            theme: sessionData.theme ?? 'light',
            authType: isAuthV2() ? 'authv2' : 'classic',
          }
        : null,
    [sessionData]
  );

  // login() is a no-op — the browser already has the cookies set by the auth flow.
  // Callers should simply redirect to /dashboard after authentication succeeds.
  const login = useCallback(() => {
    resetSession();
    clearCache();
    router.replace('/dashboard');
  }, [router]);

  const logout = useCallback(async () => {
    await fetch('/api/logout', { method: 'POST' });
    await signOut(clientAuth).catch(() => console.error('[auth] Firebase sign-out failed'));
    clearCache();
    resetSession();
    router.replace('/login');
  }, [router]);

  useEffect(() => {
    if (session?.authType !== 'authv2') return;

    async function maybeRefresh() {
      const expiresAt = getAuthV2ExpiresAt();
      if (!expiresAt) return;

      const secsLeft = expiresAt - Math.floor(Date.now() / 1000);
      if (secsLeft < 300) {
        try {
          const refreshed = await refreshSessionToken();
          if (!refreshed) {
            resetSession();
            router.replace('/login');
            return;
          }
          await refresh();
        } catch {
          await refresh();
        }
      }
    }

    // Run immediately and then on an interval, catching any unexpected errors.
    maybeRefresh().catch((err) => console.error('[auth] maybeRefresh error:', err));
    const interval = setInterval(() => {
      maybeRefresh().catch((err) => console.error('[auth] maybeRefresh error:', err));
    }, 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [session?.authType, router, refresh]);

  const value = useMemo(
    () => ({
      session,
      isLoading: loading,
      isRefreshing: refreshing,
      error,
      refresh,
      login,
      logout,
      isAuthenticated: session !== null,
      theme: session?.theme ?? 'light',
    }),
    [session, loading, refreshing, error, refresh, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuthContext = () => useContext(AuthContext);
export const useAuth = () => useContext(AuthContext);
