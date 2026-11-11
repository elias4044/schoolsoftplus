'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type UserStatus = 'online' | 'idle' | 'offline';

const HEARTBEAT_MS = 150_000;
const PRESENCE_POLL_MS = 120_000;

/* -----------------------------------------------------------
   Shared presence manager
   - Coalesces requests from multiple hooks/components
   - Polls `/api/presence` once for the union of usernames
   - Calls subscriber callbacks with per-username status maps
----------------------------------------------------------- */

type Subscriber = {
  id: number;
  usernames: string[];
  cb: (map: Record<string, UserStatus>) => void;
};

const manager = {
  subs: new Map<number, Subscriber>(),
  nextId: 1,
  union: new Set<string>(),
  timer: null as ReturnType<typeof setTimeout> | null,
  abort: null as AbortController | null,
  lastPollAt: null as number | null,
};

async function fetchForUnion(users: string[]) {
  const request = new AbortController();
  manager.abort = request;
  const timeout = setTimeout(() => request.abort(), 10_000);

  try {
    const res = await fetch(`/api/presence?users=${encodeURIComponent(users.join(','))}`, {
      signal: request.signal,
    });
    const data = (await res.json()) as {
      success?: boolean;
      presences?: Record<string, UserStatus>;
    };
    if (!res.ok || !data.success || manager.abort !== request) return;

    for (const sub of manager.subs.values()) {
      const statuses = sub.usernames.map((user) => [
        user,
        data.presences?.[user] ?? 'offline',
      ]);
      sub.cb(Object.fromEntries(statuses));
    }
  } catch {
    // Keep the previous status if a poll fails.
  } finally {
    clearTimeout(timeout);
    if (manager.abort === request) manager.abort = null;
  }
}

function pollPresence() {
  if (manager.timer !== null) clearTimeout(manager.timer);
  manager.timer = null;
  if (document.hidden || manager.union.size === 0) return;

  const now = Date.now();
  const wait = manager.lastPollAt === null ? 0 : PRESENCE_POLL_MS - (now - manager.lastPollAt);
  if (wait <= 0 && !manager.abort) {
    manager.lastPollAt = now;
    void fetchForUnion([...manager.union]);
  }
  manager.timer = setTimeout(pollPresence, wait > 0 ? wait : PRESENCE_POLL_MS);
}

function stopManagerIfIdle() {
  if (manager.subs.size !== 0) return;
  if (manager.timer !== null) clearTimeout(manager.timer);
  manager.timer = null;
  manager.abort?.abort();
  manager.abort = null;
  manager.lastPollAt = null;
  document.removeEventListener('visibilitychange', pollPresence);
}

function recomputeUnion() {
  manager.union.clear();
  for (const s of manager.subs.values()) for (const u of s.usernames) manager.union.add(u);
}

function subscribeToPresence(usernames: string[], cb: Subscriber['cb']) {
  if (usernames.length === 0) return;
  const id = manager.nextId++;
  manager.subs.set(id, { id, usernames, cb });
  recomputeUnion();
  if (manager.subs.size === 1) {
    document.addEventListener('visibilitychange', pollPresence);
    pollPresence();
  }
  return () => {
    manager.subs.delete(id);
    recomputeUnion();
    stopManagerIfIdle();
  };
}

export function useMyPresence(username: string) {
  const lastSentRef = useRef<{ username: string; status: UserStatus; at: number } | null>(null);
  const inFlightRef = useRef(false);

  const sendHeartbeat = useCallback(
    async (status: UserStatus) => {
      if (!username || inFlightRef.current) return;
      const now = Date.now();
      const lastSent = lastSentRef.current;
      if (
        lastSent?.username === username &&
        lastSent.status === status &&
        now - lastSent.at < HEARTBEAT_MS
      ) {
        return;
      }
      lastSentRef.current = { username, status, at: now };
      inFlightRef.current = true;
      try {
        await fetch('/api/presence', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          keepalive: status === 'offline',
          body: JSON.stringify({ status }),
          signal: AbortSignal.timeout(10_000),
        });
      } catch {
        /* ignore */
      } finally {
        inFlightRef.current = false;
      }
    },
    [username]
  );

  useEffect(() => {
    if (!username) return;
    let timer: ReturnType<typeof setTimeout>;
    const renew = () => {
      if (document.hidden) return;
      void sendHeartbeat('online');
      const lastSent = lastSentRef.current;
      const dueAt =
        lastSent?.username === username && lastSent.status === 'online'
          ? lastSent.at + HEARTBEAT_MS
          : Date.now();
      timer = setTimeout(renew, Math.max(1_000, dueAt - Date.now()));
    };
    const onVisibility = () => {
      clearTimeout(timer);
      if (document.hidden) void sendHeartbeat('idle');
      else renew();
    };
    renew();
    document.addEventListener('visibilitychange', onVisibility);
    const onUnload = () => void sendHeartbeat('offline');
    window.addEventListener('beforeunload', onUnload);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [username, sendHeartbeat]);
}

export function usePresenceMap(usernames: string[]) {
  const [statusMap, setStatusMap] = useState<Record<string, UserStatus>>({});
  const normalized = [...new Set(usernames.filter(Boolean))].sort();

  useEffect(() => {
    return subscribeToPresence(normalized, setStatusMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(normalized)]);

  return statusMap;
}

export function statusColor(status: UserStatus): string {
  if (status === 'online') return '#22c55e';
  if (status === 'idle') return '#eab308';
  return '#6b7280';
}

export function statusLabel(status: UserStatus): string {
  if (status === 'online') return 'Online';
  if (status === 'idle') return 'In SchoolSoft+';
  return 'Offline';
}
