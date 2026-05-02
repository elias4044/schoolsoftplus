"use client";

import { useEffect, useRef, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { clientDb } from "./firebase";
import { useFirebaseAuth } from "./useFirebaseAuth";

/* ── Types ─────────────────────────────────────────────────── */
export type FriendshipStatus = "pending" | "accepted" | "declined";

export interface RTFriendship {
  id: string;
  userA: string;
  userB: string;
  requestedBy: string;
  status: FriendshipStatus;
  createdAt: number;
  updatedAt: number;
}

export interface FriendProfile {
  displayName: string;
  pfpUrl: string;
  schoolName: string;
}

/* ── useFriends ────────────────────────────────────────────── */
export function useFriends(username: string) {
  const { fbUser, ready } = useFirebaseAuth();
  const [friends, setFriends]     = useState<RTFriendship[]>([]);
  const [received, setReceived]   = useState<RTFriendship[]>([]);
  const [sent, setSent]           = useState<RTFriendship[]>([]);
  const [loading, setLoading]     = useState(true);
  const [profileMap, setProfileMap] = useState<Record<string, FriendProfile>>({});

  const unsubsRef = useRef<Unsubscribe[]>([]);

  useEffect(() => {
    if (!ready || !fbUser || !username) { setLoading(false); return; }
    setLoading(true);

    const friendships_col = collection(clientDb, "friendships_v1");

    const qA = query(friendships_col, where("userA", "==", username));
    const qB = query(friendships_col, where("userB", "==", username));

    // Merge two snapshots
    const allByIdRef = { current: new Map<string, RTFriendship>() };
    let loadedA = false;
    let loadedB = false;

    function toFriendship(doc: import("firebase/firestore").QueryDocumentSnapshot): RTFriendship {
      const d = doc.data();
      return {
        id:          doc.id,
        userA:       d.userA,
        userB:       d.userB,
        requestedBy: d.requestedBy,
        status:      d.status,
        createdAt:   d.createdAt ?? 0,
        updatedAt:   d.updatedAt ?? 0,
      };
    }

    function recompute() {
      const all = [...allByIdRef.current.values()];
      const newFriends  = all.filter(f => f.status === "accepted");
      const newReceived = all.filter(f => f.status === "pending" && f.requestedBy !== username);
      const newSent     = all.filter(f => f.status === "pending" && f.requestedBy === username);
      setFriends(newFriends);
      setReceived(newReceived);
      setSent(newSent);

      // Fetch profiles for unknown users
      const toFetch = new Set<string>();
      for (const f of all) {
        const other = f.userA === username ? f.userB : f.userA;
        toFetch.add(other);
      }
      toFetch.forEach(u => {
        setProfileMap(prev => {
          if (prev[u]) return prev;
          fetch(`/api/profile/${encodeURIComponent(u)}`)
            .then(r => r.json())
            .then(d => {
              if (d.success && d.profile) {
                setProfileMap(p => ({
                  ...p,
                  [u]: {
                    displayName: d.profile.displayName || `${d.profile.firstName ?? ""} ${d.profile.lastName ?? ""}`.trim() || u,
                    pfpUrl:      d.profile.pfpUrl ?? "",
                    schoolName:  d.profile.schoolName ?? "",
                  },
                }));
              }
            })
            .catch(() => {/* ignore */});
          return prev;
        });
      });
    }

    const unsubA = onSnapshot(qA, snap => {
      for (const doc of snap.docs) allByIdRef.current.set(doc.id, toFriendship(doc));
      for (const change of snap.docChanges()) {
        if (change.type === "removed") allByIdRef.current.delete(change.doc.id);
      }
      loadedA = true;
      if (loadedA && loadedB) { setLoading(false); }
      recompute();
    });

    const unsubB = onSnapshot(qB, snap => {
      for (const doc of snap.docs) allByIdRef.current.set(doc.id, toFriendship(doc));
      for (const change of snap.docChanges()) {
        if (change.type === "removed") allByIdRef.current.delete(change.doc.id);
      }
      loadedB = true;
      if (loadedA && loadedB) { setLoading(false); }
      recompute();
    });

    unsubsRef.current = [unsubA, unsubB];
    return () => {
      unsubsRef.current.forEach(u => u());
      unsubsRef.current = [];
    };
  }, [ready, fbUser, username]);

  /** Returns the username of the other party in a friendship */
  function otherUser(f: RTFriendship): string {
    return f.userA === username ? f.userB : f.userA;
  }

  /** Returns true if username is friends with target */
  function isFriend(target: string): boolean {
    return friends.some(f => (f.userA === target || f.userB === target));
  }

  /** Returns the pending request (received) from a specific user */
  function pendingFrom(target: string): RTFriendship | undefined {
    return received.find(f => f.requestedBy === target);
  }

  /** Returns the pending request (sent) to a specific user */
  function sentTo(target: string): RTFriendship | undefined {
    return sent.find(f => (f.userA === target || f.userB === target));
  }

  return { friends, received, sent, loading, profileMap, otherUser, isFriend, pendingFrom, sentTo };
}
