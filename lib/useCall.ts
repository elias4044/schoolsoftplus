"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  query,
  where,
  Timestamp,
  Unsubscribe,
} from "firebase/firestore";
import { clientDb } from "./firebase";
import { useFirebaseAuth } from "./useFirebaseAuth";

/* ── STUN servers ────────────────────────────────────────────── */
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
];

/* ── Types ──────────────────────────────────────────────────── */
export type CallPhase =
  | "idle"
  | "requesting_mic"
  | "calling"
  | "connecting"
  | "in_call"
  | "ended"
  | "failed";

export interface CallSession {
  callId: string;
  remoteUsername: string;
  isOutgoing: boolean;
}

export interface IncomingCall {
  callId: string;
  callerUsername: string;
}

export interface UseCallReturn {
  phase: CallPhase;
  session: CallSession | null;
  error: string | null;
  isMuted: boolean;
  startCall: (myUsername: string, calleeUsername: string) => Promise<void>;
  acceptCall: (callId: string, callerUsername: string, myUsername: string) => Promise<void>;
  declineCall: (callId: string) => Promise<void>;
  hangUp: () => Promise<void>;
  toggleMute: () => void;
  remoteAudioRef: React.RefObject<HTMLAudioElement | null>;
}

/* ── useCall ────────────────────────────────────────────────── */
export function useCall(): UseCallReturn {
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [session, setSession] = useState<CallSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const unsubsRef = useRef<Unsubscribe[]>([]);
  const callIdRef = useRef<string | null>(null);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── cleanup ─────────────────────────────────────────── */
  const cleanup = useCallback(async (markEnded = false) => {
    // Clear unanswered-call ring timeout
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }

    // Unsubscribe all Firestore listeners
    for (const unsub of unsubsRef.current) unsub();
    unsubsRef.current = [];

    // Delete the call document and its ICE-candidate subcollections.
    // Using a batch ensures everything disappears atomically.
    if (markEnded && callIdRef.current) {
      try {
        const callId = callIdRef.current;
        const batch = writeBatch(clientDb);
        const [callerSnap, calleeSnap] = await Promise.all([
          getDocs(collection(clientDb, "calls_v1", callId, "callerCandidates")),
          getDocs(collection(clientDb, "calls_v1", callId, "calleeCandidates")),
        ]);
        callerSnap.docs.forEach((d) => batch.delete(d.ref));
        calleeSnap.docs.forEach((d) => batch.delete(d.ref));
        batch.delete(doc(clientDb, "calls_v1", callId));
        await batch.commit();
      } catch {
        /* ignore — may already be deleted by the other party */
      }
    }

    // Stop local audio tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    // Close peer connection
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.onsignalingstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    // Clear remote audio element
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    callIdRef.current = null;
  }, []);

  /* ── createPeerConnection ─────────────────────────────── */
  const createPeerConnection = useCallback((): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.play().catch(() => {
          /* Autoplay may be blocked until user interaction; browser will retry */
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") {
        setPhase("in_call");
      } else if (state === "failed") {
        setPhase("failed");
        setError("Connection failed. Please try again.");
        cleanup(false);
      } else if (state === "disconnected") {
        // Give a grace period before treating as ended
        setTimeout(() => {
          if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
            setPhase("ended");
            cleanup(false);
          }
        }, 5000);
      }
    };

    return pc;
  }, [cleanup]);

  /* ── startCall (outgoing) ─────────────────────────────── */
  const startCall = useCallback(
    async (myUsername: string, calleeUsername: string) => {
      if (phase !== "idle") return;
      setError(null);

      try {
        setPhase("requesting_mic");

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;

        const pc = createPeerConnection();
        pcRef.current = pc;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        // Pre-generate a Firestore document reference so we know the callId
        // before ICE gathering starts (avoids buffering candidates).
        const callDocRef = doc(collection(clientDb, "calls_v1"));
        callIdRef.current = callDocRef.id;

        // Wire up ICE candidate sender using the known callId
        const callerCandidatesRef = collection(
          clientDb,
          "calls_v1",
          callDocRef.id,
          "callerCandidates"
        );
        pc.onicecandidate = async (event) => {
          if (event.candidate) {
            await addDoc(callerCandidatesRef, event.candidate.toJSON()).catch(() => {});
          }
        };

        // Create offer and start ICE gathering
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Write the call document.
        // expireAt is a Firestore TTL field — configure a TTL policy on calls_v1
        // in the Firebase console so documents are auto-deleted server-side after 24 h
        // (safety net for calls that never get explicitly cleaned up).
        await setDoc(callDocRef, {
          callerUsername: myUsername,
          calleeUsername,
          offer: { type: offer.type, sdp: offer.sdp },
          answer: null,
          status: "ringing",
          createdAt: Date.now(),
          expireAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
        });

        setSession({ callId: callDocRef.id, remoteUsername: calleeUsername, isOutgoing: true });
        setPhase("calling");

        // Auto-cancel the call if unanswered after 45 seconds
        const expectedCallId = callDocRef.id;
        ringTimeoutRef.current = setTimeout(async () => {
          if (callIdRef.current !== expectedCallId) return; // already cleaned up
          setPhase("ended");
          await cleanup(true);
        }, 45_000);

        // Listen for answer and remote status changes
        const unsubCall = onSnapshot(callDocRef, async (snap) => {
          if (!snap.exists()) {
            // Doc deleted — callee declined or the call was cleaned up remotely
            setPhase("ended");
            cleanup(false);
            return;
          }
          const data = snap.data();

          if (data.answer && pc.signalingState !== "closed" && !pc.currentRemoteDescription) {
            const answerDesc = new RTCSessionDescription(data.answer as RTCSessionDescriptionInit);
            await pc.setRemoteDescription(answerDesc).catch(() => {});
            setPhase("connecting");
          }

          if (data.status === "ended") {
            setPhase("ended");
            cleanup(false);
          }
        });
        unsubsRef.current.push(unsubCall);

        // Listen for callee's ICE candidates
        const calleeCandidatesRef = collection(
          clientDb,
          "calls_v1",
          callDocRef.id,
          "calleeCandidates"
        );
        const unsubCallee = onSnapshot(calleeCandidatesRef, (snap) => {
          snap.docChanges().forEach(async (change) => {
            if (change.type === "added" && pc.remoteDescription) {
              const candidate = new RTCIceCandidate(change.doc.data() as RTCIceCandidateInit);
              await pc.addIceCandidate(candidate).catch(() => {});
            }
          });
        });
        unsubsRef.current.push(unsubCallee);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.name === "NotAllowedError"
              ? "Microphone access was denied. Please allow microphone access and try again."
              : err.message
            : "Could not start the call.";
        setError(msg);
        setPhase("failed");
        await cleanup(false);
      }
    },
    [phase, createPeerConnection, cleanup]
  );

  /* ── acceptCall (incoming) ────────────────────────────── */
  const acceptCall = useCallback(
    async (callId: string, callerUsername: string, myUsername: string) => {
      if (phase !== "idle") return;
      setError(null);

      try {
        setPhase("requesting_mic");

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;

        const pc = createPeerConnection();
        pcRef.current = pc;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        callIdRef.current = callId;
        setSession({ callId, remoteUsername: callerUsername, isOutgoing: false });

        // Read offer from Firestore
        const callDocRef = doc(clientDb, "calls_v1", callId);
        const callSnap = await getDoc(callDocRef);
        if (!callSnap.exists()) throw new Error("Call session not found.");

        const callData = callSnap.data();
        if (callData.status !== "ringing") throw new Error("Call is no longer available.");

        // Set remote description (offer) and create answer
        await pc.setRemoteDescription(
          new RTCSessionDescription(callData.offer as RTCSessionDescriptionInit)
        );
        const answer = await pc.createAnswer();

        // Wire up ICE candidate sender BEFORE setLocalDescription
        const calleeCandidatesRef = collection(
          clientDb,
          "calls_v1",
          callId,
          "calleeCandidates"
        );
        pc.onicecandidate = async (event) => {
          if (event.candidate) {
            await addDoc(calleeCandidatesRef, event.candidate.toJSON()).catch(() => {});
          }
        };

        await pc.setLocalDescription(answer);

        // Update Firestore with answer + active status; shorten TTL to 2 h
        // (active calls won't last that long; gives time to clean up if app crashes)
        await updateDoc(callDocRef, {
          answer: { type: answer.type, sdp: answer.sdp },
          status: "active",
          expireAt: Timestamp.fromMillis(Date.now() + 2 * 60 * 60 * 1000),
        });

        setPhase("connecting");

        // Listen for caller's ICE candidates
        const callerCandidatesRef = collection(
          clientDb,
          "calls_v1",
          callId,
          "callerCandidates"
        );
        const unsubCaller = onSnapshot(callerCandidatesRef, (snap) => {
          snap.docChanges().forEach(async (change) => {
            if (change.type === "added") {
              const candidate = new RTCIceCandidate(change.doc.data() as RTCIceCandidateInit);
              await pc.addIceCandidate(candidate).catch(() => {});
            }
          });
        });
        unsubsRef.current.push(unsubCaller);

        // Listen for call end
        const unsubCall = onSnapshot(callDocRef, (snap) => {
          if (!snap.exists()) {
            // Doc deleted — caller hung up or cleaned up remotely
            setPhase("ended");
            cleanup(false);
            return;
          }
          const data = snap.data();
          if (data.status === "ended") {
            setPhase("ended");
            cleanup(false);
          }
        });
        unsubsRef.current.push(unsubCall);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.name === "NotAllowedError"
              ? "Microphone access was denied. Please allow microphone access and try again."
              : err.message
            : "Could not connect the call.";
        setError(msg);
        setPhase("failed");
        await cleanup(false);
      }
    },
    [phase, createPeerConnection, cleanup]
  );

  /* ── declineCall ──────────────────────────────────────── */
  const declineCall = useCallback(async (callId: string) => {
    try {
      // Delete the doc outright — the caller's onSnapshot sees !snap.exists()
      // and transitions to "ended". No stale data left behind.
      await deleteDoc(doc(clientDb, "calls_v1", callId));
    } catch {
      /* ignore */
    }
  }, []);

  /* ── hangUp ───────────────────────────────────────────── */
  const hangUp = useCallback(async () => {
    setPhase("ended");
    await cleanup(true);
  }, [cleanup]);

  /* ── toggleMute ───────────────────────────────────────── */
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const audioTracks = localStreamRef.current.getAudioTracks();
    const next = !isMuted;
    audioTracks.forEach((t) => {
      t.enabled = !next;
    });
    setIsMuted(next);
  }, [isMuted]);

  /* ── cleanup on unmount ───────────────────────────────── */
  useEffect(() => {
    return () => {
      // Fire-and-forget cleanup on unmount — mark ended if active
      const shouldMarkEnded = phase === "in_call" || phase === "calling" || phase === "connecting";
      cleanup(shouldMarkEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── reset to idle after a short delay when ended/failed ── */
  useEffect(() => {
    if (phase === "ended" || phase === "failed") {
      const t = setTimeout(() => {
        setPhase("idle");
        setSession(null);
        setIsMuted(false);
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [phase]);

  return {
    phase,
    session,
    error,
    isMuted,
    startCall,
    acceptCall,
    declineCall,
    hangUp,
    toggleMute,
    remoteAudioRef,
  };
}

/* ── useIncomingCall ────────────────────────────────────────── */
/**
 * Listens for incoming (ringing) calls addressed to `username`.
 * Returns the first pending IncomingCall, or null if none.
 */
export function useIncomingCall(username: string): IncomingCall | null {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const { fbUser, ready } = useFirebaseAuth();

  useEffect(() => {
    if (!ready || !fbUser || !username) return;

    const q = query(
      collection(clientDb, "calls_v1"),
      where("calleeUsername", "==", username),
      where("status", "==", "ringing")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          setIncomingCall(null);
          return;
        }
        const sorted = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as { id: string; callerUsername: string; createdAt: number }))
          .sort((a, b) => b.createdAt - a.createdAt);
        const first = sorted[0];
        setIncomingCall({ callId: first.id, callerUsername: first.callerUsername });
      },
      (err) => {
        // Silently handle permission-denied (rules not yet deployed) or auth errors.
        if (err.code !== "permission-denied") {
          console.warn("[useIncomingCall] snapshot error:", err);
        }
        setIncomingCall(null);
      }
    );

    return unsub;
  }, [ready, fbUser, username]);

  return incomingCall;
}
