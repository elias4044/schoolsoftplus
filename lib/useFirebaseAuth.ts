"use client";

import { useEffect, useRef, useState } from "react";
import { signInWithCustomToken, onAuthStateChanged, User } from "firebase/auth";
import { clientAuth } from "./firebase";

type Subscriber = (state: { fbUser: User | null; ready: boolean }) => void;

let sharedUser: User | null = clientAuth.currentUser;
let sharedReady = Boolean(clientAuth.currentUser);
let authObserverAttached = false;
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let refreshPromise: Promise<void> | null = null;
const subscribers = new Set<Subscriber>();

async function signInShared() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch("/api/firebase-token");
      const data = await res.json();
      if (data.success && data.token) {
        await signInWithCustomToken(clientAuth, data.token);
      }
    } catch (err) {
      console.error("[useFirebaseAuth] sign-in error:", err);
    }
  })();

  try {
    await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

function emitAuthState() {
  const snapshot = { fbUser: sharedUser, ready: sharedReady };
  subscribers.forEach((subscriber) => subscriber(snapshot));
}

function ensureAuthBootstrap() {
  if (!authObserverAttached) {
    authObserverAttached = true;
    onAuthStateChanged(clientAuth, (user) => {
      sharedUser = user;
      sharedReady = true;
      emitAuthState();
    });
  }

  if (!refreshTimer) {
    void signInShared();
    refreshTimer = setInterval(() => {
      void signInShared();
    }, 55 * 60 * 1000);
  }
}

/**
 * Fetches a custom Firebase token from our API (which validates the SchoolSoft
 * session), then signs into Firebase Auth with it.  Subsequent Firestore
 * onSnapshot calls will be authenticated as the SchoolSoft username.
 *
 * The token is refreshed every 55 minutes (Firebase custom tokens expire in
 * 1 hour; Firebase ID tokens expire in 1 hour but are auto-refreshed by the SDK).
 */
export function useFirebaseAuth() {
  const [fbUser, setFbUser] = useState<User | null>(sharedUser);
  const [ready, setReady] = useState(sharedReady);
  const subscriberRef = useRef<Subscriber | null>(null);

  useEffect(() => {
    ensureAuthBootstrap();

    const subscriber: Subscriber = (state) => {
      setFbUser(state.fbUser);
      setReady(state.ready);
    };
    subscriberRef.current = subscriber;
    subscribers.add(subscriber);
    subscriber({ fbUser: sharedUser, ready: sharedReady });

    return () => {
      if (subscriberRef.current) {
        subscribers.delete(subscriberRef.current);
        subscriberRef.current = null;
      }
    };
  }, []);

  return { fbUser, ready };
}
