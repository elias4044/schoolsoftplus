"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  doc,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { clientDb } from "./firebase";

/* ── Types ─────────────────────────────────────────────────── */
export type UserStatus = "online" | "idle" | "offline";

interface PresenceRecord {
  status: UserStatus;
  lastSeen: number;
}

/* ── Status thresholds ─────────────────────────────────────── */
const ONLINE_MS = 3  * 60 * 1000;
const IDLE_MS   = 15 * 60 * 1000;

function computeStatus(record: PresenceRecord | null): UserStatus {
  if (!record) return "offline";
  const age = Date.now() - record.lastSeen;
  if (age < ONLINE_MS) return "online";
  if (age < IDLE_MS)   return "idle";
  return "offline";
}

/* ── useMyPresence — sends heartbeats ─────────────────────── */
export function useMyPresence(username: string) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendHeartbeat = useCallback(async (status: UserStatus) => {
    if (!username) return;
    try {
      await fetch("/api/presence", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch { /* ignore */ }
  }, [username]);

  useEffect(() => {
    if (!username) return;

    sendHeartbeat("online");
    intervalRef.current = setInterval(() => {
      sendHeartbeat(document.hidden ? "idle" : "online");
    }, 30_000);

    const onVisibility = () => sendHeartbeat(document.hidden ? "idle" : "online");
    document.addEventListener("visibilitychange", onVisibility);

    const onUnload = () => sendHeartbeat("offline");
    window.addEventListener("beforeunload", onUnload);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onUnload);
      sendHeartbeat("offline");
    };
  }, [username, sendHeartbeat]);
}

/* ── usePresenceMap — watches a set of usernames ──────────── */
export function usePresenceMap(usernames: string[]) {
  const [statusMap, setStatusMap] = useState<Record<string, UserStatus>>({});
  const unsubsRef = useRef<Map<string, Unsubscribe>>(new Map());
  const rawRef    = useRef<Map<string, PresenceRecord>>(new Map());

  // Recompute statuses every 60 seconds (to handle stale heartbeats)
  useEffect(() => {
    const id = setInterval(() => {
      const next: Record<string, UserStatus> = {};
      for (const [u, rec] of rawRef.current) next[u] = computeStatus(rec);
      setStatusMap(next);
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const currentSet = new Set(usernames);

    // Remove subscriptions for users no longer needed
    for (const [u, unsub] of unsubsRef.current) {
      if (!currentSet.has(u)) { unsub(); unsubsRef.current.delete(u); rawRef.current.delete(u); }
    }

    // Add subscriptions for new users
    for (const u of usernames) {
      if (unsubsRef.current.has(u)) continue;
      const ref = doc(clientDb, "presence_v1", u);
      const unsub = onSnapshot(ref, snap => {
        if (snap.exists()) {
          const d = snap.data() as PresenceRecord;
          rawRef.current.set(u, d);
        } else {
          rawRef.current.delete(u);
        }
        // Recompute all at once
        const next: Record<string, UserStatus> = {};
        for (const [un, rec] of rawRef.current) next[un] = computeStatus(rec);
        setStatusMap({ ...next });
      });
      unsubsRef.current.set(u, unsub);
    }

    return () => { /* cleanup happens above on next run */ };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usernames.join(",")]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const unsub of unsubsRef.current.values()) unsub();
      unsubsRef.current.clear();
    };
  }, []);

  return statusMap;
}

/* ── Status dot helpers ────────────────────────────────────── */
export function statusColor(status: UserStatus): string {
  if (status === "online") return "#22c55e"; // green-500
  if (status === "idle")   return "#eab308"; // yellow-500
  return "#6b7280"; // gray-500
}

export function statusLabel(status: UserStatus): string {
  if (status === "online") return "Online";
  if (status === "idle")   return "In SchoolSoft+";
  return "Offline";
}
