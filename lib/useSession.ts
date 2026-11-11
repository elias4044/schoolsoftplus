'use client';

import { useEffect, useSyncExternalStore } from 'react';

import { refreshSessionToken } from './session-refresh';

interface Session {
  app: boolean;
  language: {
    langId: number;
    langCode: string;
  };
  adminLoggedInAsUser: boolean;
  hasProtectedIdentityViewAccess: boolean;
  calendarVersion: number;
  superUser: boolean;
  superLoggedInAsUser: boolean;
  printLogoUrl: string;
  organization: {
    id: number;
    name: string;
    school: boolean;
  };
  samlRedirect: boolean;
  theme: string;
  userType: {
    id: number;
    name: string;
  };
  user: {
    id: number;
    firstName: string;
    lastName: string;
    userName: string;
    email: string;
  };
  // Injected by our /api/session route
  school: string;
  username: string;
  userId: string;
}

interface SessionState {
  session: Session | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

const initialState: SessionState = { session: null, loading: true, refreshing: false, error: null };
let state = initialState;
let pending: Promise<void> | null = null;
let generation = 0;
let savedAt = 0;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
function publish(next: SessionState) {
  state = next;
  listeners.forEach((listener) => listener());
}

export function resetSession() {
  generation++;
  pending = null;
  savedAt = 0;
  publish(initialState);
}

export function reloadSession(): Promise<void> {
  if (pending) return pending;
  const startedGeneration = generation;
  publish({ ...state, loading: !state.session, refreshing: true, error: null });
  const request = (async () => {
    try {
      const read = () =>
        fetch('/api/session', { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
      let response = await read();
      if (response.status === 401 && document.cookie.includes('ssp_auth_type=authv2')) {
        if (await refreshSessionToken()) response = await read();
      }
      if (startedGeneration !== generation) return;
      if (response.status === 401) {
        savedAt = Date.now();
        publish({ session: null, loading: false, refreshing: false, error: null });
        return;
      }
      const data = await response.json();
      if (!response.ok || !data.success || !data.session?.user) {
        throw new Error(data.error || 'Could not load your session. Please try again.');
      }
      if (startedGeneration !== generation) return;
      savedAt = Date.now();
      publish({ session: data.session, loading: false, refreshing: false, error: null });
    } catch (error) {
      if (startedGeneration !== generation) return;
      publish({
        ...state,
        loading: false,
        refreshing: false,
        error: error instanceof Error ? error.message : 'Could not load your session.',
      });
    }
  })().finally(() => {
    if (pending === request) pending = null;
  });
  pending = request;
  return request;
}

export function useSession() {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    () => initialState
  );
  useEffect(() => {
    if (Date.now() - savedAt > 30_000) void reloadSession();
  }, []);
  return { ...snapshot, refresh: reloadSession };
}
