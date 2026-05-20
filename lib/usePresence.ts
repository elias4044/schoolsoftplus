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

    const onVisibility = () => {
      void sendHeartbeat(document.hidden ? "idle" : "online");
    };
    document.addEventListener("visibilitychange", onVisibility);

    const onUnload = () => {
      void sendHeartbeat("offline");
    };
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
  const normalizedUsernames = [...new Set(usernames.filter(Boolean))].sort();
  const rawRef = useRef<Map<string, PresenceRecord>>(new Map());
  const abortRef = useRef<AbortController | null>(null);

  const recomputeStatuses = useCallback(() => {
    const next: Record<string, UserStatus> = {};
    for (const username of normalizedUsernames) {
      next[username] = computeStatus(rawRef.current.get(username) ?? null);
    }
    setStatusMap(next);
  }, [normalizedUsernames]);

  const fetchPresence = useCallback(async () => {
    if (normalizedUsernames.length === 0) {
      rawRef.current.clear();
      setStatusMap({});
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/presence?users=${encodeURIComponent(normalizedUsernames.join(","))}`, {
        signal: controller.signal,
      });
      const data = await res.json();
      if (!data.success || controller.signal.aborted) return;

      const fetchedAt = Date.now();
      const nextRaw = new Map<string, PresenceRecord>();
      for (const username of normalizedUsernames) {
        const status = (data.presences?.[username] ?? "offline") as UserStatus;
        const lastSeen =
          status === "online" ? fetchedAt :
          status === "idle" ? fetchedAt - ONLINE_MS - 1 :
          fetchedAt - IDLE_MS - 1;
        nextRaw.set(username, { status, lastSeen });
      }
      rawRef.current = nextRaw;
      recomputeStatuses();
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
    }
  }, [normalizedUsernames, recomputeStatuses]);

  useEffect(() => {
    const id = setInterval(() => {
      recomputeStatuses();
    }, PRESENCE_POLL_MS);
    return () => clearInterval(id);
  }, [recomputeStatuses]);

  useEffect(() => {
    void fetchPresence();
    const id = setInterval(() => {
      void fetchPresence();
    }, PRESENCE_POLL_MS);

    return () => {
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, [fetchPresence]);

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
