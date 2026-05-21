"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type UserStatus = "online" | "idle" | "offline";

interface PresenceRecord {
  status: UserStatus;
  lastSeen: number;
}

const ONLINE_MS = 3 * 60 * 1000;
const IDLE_MS = 15 * 60 * 1000;
const HEARTBEAT_MS = 2 * 60 * 1000;
const PRESENCE_POLL_MS = 60 * 1000;

function computeStatus(record: PresenceRecord | null): UserStatus {
  if (!record) return "offline";
  const age = Date.now() - record.lastSeen;
  if (age < ONLINE_MS) return "online";
  if (age < IDLE_MS) return "idle";
  return "offline";
}

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
  timer: 0 as unknown as ReturnType<typeof setInterval> | null,
  abort: null as AbortController | null,
};

async function fetchForUnion() {
  const users = [...manager.union];
  if (users.length === 0) return {} as Record<string, PresenceRecord>;

  manager.abort?.abort();
  manager.abort = new AbortController();

  try {
    const res = await fetch(`/api/presence?users=${encodeURIComponent(users.join(","))}`, {
      signal: manager.abort.signal,
    });
    const data = await res.json();
    if (!data.success) return {};

    const now = Date.now();
    const out: Record<string, PresenceRecord> = {};
    for (const u of users) {
      const status = (data.presences?.[u] ?? "offline") as UserStatus;
      const lastSeen =
        status === "online" ? now : status === "idle" ? now - ONLINE_MS - 1 : now - IDLE_MS - 1;
      out[u] = { status, lastSeen };
    }
    return out;
  } catch (err) {
    return {};
  }
}

function startManagerIfNeeded() {
  if (manager.timer) return;
  // poll immediately then on interval
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    const records = await fetchForUnion();
    // notify subscribers
    for (const sub of manager.subs.values()) {
      const map: Record<string, UserStatus> = {};
      for (const u of sub.usernames) map[u] = computeStatus(records[u] ?? null);
      sub.cb(map);
    }
    running = false;
  };
  void run();
  manager.timer = setInterval(() => void run(), PRESENCE_POLL_MS);
}

function stopManagerIfIdle() {
  if (manager.subs.size === 0 && manager.timer) {
    clearInterval(manager.timer as unknown as number);
    manager.timer = null;
    manager.abort?.abort();
    manager.abort = null;
    manager.union.clear();
  }
}

function recomputeUnion() {
  manager.union.clear();
  for (const s of manager.subs.values()) for (const u of s.usernames) manager.union.add(u);
}

export function useMyPresence(username: string) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSentRef = useRef<{ status: UserStatus; at: number } | null>(null);

  const sendHeartbeat = useCallback(async (status: UserStatus) => {
    if (!username) return;
    const now = Date.now();
    const lastSent = lastSentRef.current;
    if (lastSent && lastSent.status === status && now - lastSent.at < HEARTBEAT_MS - 5_000) {
      return;
    }
    lastSentRef.current = { status, at: now };
    try {
      await fetch("/api/presence", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        keepalive: status === "offline",
        body: JSON.stringify({ status }),
      });
    } catch {
      /* ignore */
    }
  }, [username]);

  useEffect(() => {
    if (!username) return;
    void sendHeartbeat("online");
    intervalRef.current = setInterval(() => {
      void sendHeartbeat(document.hidden ? "idle" : "online");
    }, HEARTBEAT_MS);
    const onVisibility = () => void sendHeartbeat(document.hidden ? "idle" : "online");
    document.addEventListener("visibilitychange", onVisibility);
    const onUnload = () => void sendHeartbeat("offline");
    window.addEventListener("beforeunload", onUnload);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onUnload);
      void sendHeartbeat("offline");
    };
  }, [username, sendHeartbeat]);
}

export function usePresenceMap(usernames: string[]) {
  const [statusMap, setStatusMap] = useState<Record<string, UserStatus>>({});
  const normalized = [...new Set(usernames.filter(Boolean))].sort();
  const idRef = useRef<number | null>(null);

  useEffect(() => {
    // subscribe
    const id = manager.nextId++;
    idRef.current = id;
    const sub: Subscriber = { id, usernames: normalized, cb: (m) => setStatusMap(m) };
    manager.subs.set(id, sub);
    recomputeUnion();
    startManagerIfNeeded();

    // immediate empty map until fetch returns
    setStatusMap(Object.fromEntries(normalized.map(u => [u, "offline" as UserStatus])));

    return () => {
      manager.subs.delete(id);
      recomputeUnion();
      stopManagerIfIdle();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(normalized)]);

  return statusMap;
}

export function statusColor(status: UserStatus): string {
  if (status === "online") return "#22c55e";
  if (status === "idle") return "#eab308";
  return "#6b7280";
}

export function statusLabel(status: UserStatus): string {
  if (status === "online") return "Online";
  if (status === "idle") return "In SchoolSoft+";
  return "Offline";
}
