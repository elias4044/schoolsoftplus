"use client";

import { useEffect, useRef, useState } from "react";
import { signInWithCustomToken, onAuthStateChanged, User } from "firebase/auth";
import { clientAuth } from "./firebase";

/**
 * Fetches a custom Firebase token from our API (which validates the SchoolSoft
 * session), then signs into Firebase Auth with it.  Subsequent Firestore
 * onSnapshot calls will be authenticated as the SchoolSoft username.
 *
 * The token is refreshed every 55 minutes (Firebase custom tokens expire in
 * 1 hour; Firebase ID tokens expire in 1 hour but are auto-refreshed by the SDK).
 */
export function useFirebaseAuth() {
  const [fbUser, setFbUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const signIn = async () => {
    try {
      const res  = await fetch("/api/firebase-token");
      const data = await res.json();
      if (data.success && data.token) {
        await signInWithCustomToken(clientAuth, data.token);
      }
    } catch (err) {
      console.error("[useFirebaseAuth] sign-in error:", err);
    }
  };

  useEffect(() => {
    // Listen for auth state changes
    const unsub = onAuthStateChanged(clientAuth, user => {
      setFbUser(user);
      setReady(true);
    });

    // Kick off initial sign-in
    signIn();

    // Refresh the custom token every 55 minutes
    timerRef.current = setInterval(signIn, 55 * 60 * 1000);

    return () => {
      unsub();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { fbUser, ready };
}
