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
  runTransaction,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { clientDb } from "./firebase";
import { useFirebaseAuth } from "./useFirebaseAuth";

/* ── ICE server config ─────────────────────────────────────── */
function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ];
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME ?? "",
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL ?? "",
    });
  }
  return servers;
}

/* ── Internal group peer state ─────────────────────────────── */
interface PeerEntry {
  pc: RTCPeerConnection;
  connectionKey: string;
  isInitiator: boolean;
  candidateBuffer: RTCIceCandidateInit[];
  remoteDescSet: boolean;
  audioElement: HTMLAudioElement;
  unsubs: Unsubscribe[];
}

/* ── Types ──────────────────────────────────────────────────── */
export type CallPhase =
  | "idle"
  | "requesting_mic"
  | "calling"
  | "connecting"
  | "in_call"
  | "ended"
  | "declined"
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

export type GroupCallPhase = "idle" | "joining" | "in_call" | "ended" | "failed";

export interface GroupCallSession {
  callId: string;
  conversationId: string;
  participants: string[];
}

export interface UseGroupCallReturn {
  phase: GroupCallPhase;
  session: GroupCallSession | null;
  error: string | null;
  isMuted: boolean;
  mutedPeers: Set<string>;
  startGroupCall: (myUsername: string, conversationId: string) => Promise<void>;
  joinGroupCall: (callId: string, conversationId: string, myUsername: string) => Promise<void>;
  leaveGroupCall: () => Promise<void>;
  toggleMute: () => void;
  togglePeerMute: (username: string) => void;
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
  // Buffer for remote ICE candidates received before setRemoteDescription
  const iceCandidateBufferRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescSetRef = useRef(false);

  /* ── cleanup ─────────────────────────────────────────── */
  const cleanup = useCallback(async (markEnded = false) => {
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }

    for (const unsub of unsubsRef.current) unsub();
    unsubsRef.current = [];

    iceCandidateBufferRef.current = [];
    remoteDescSetRef.current = false;

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

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    callIdRef.current = null;
  }, []);

  /* ── ICE candidate helpers ───────────────────────────── */
  // Add a remote candidate — buffer it if remote description isn't set yet
  const addRemoteCandidate = useCallback(
    async (pc: RTCPeerConnection, candidate: RTCIceCandidateInit) => {
      if (remoteDescSetRef.current && pc.signalingState !== "closed") {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
          /* ignore stale candidates */
        }
      } else {
        iceCandidateBufferRef.current.push(candidate);
      }
    },
    []
  );

  // Drain all buffered candidates after remote description is set
  const drainCandidateBuffer = useCallback(async (pc: RTCPeerConnection) => {
    remoteDescSetRef.current = true;
    const buffered = iceCandidateBufferRef.current.splice(0);
    for (const c of buffered) {
      if (pc.signalingState !== "closed") {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        } catch {
          /* ignore */
        }
      }
    }
  }, []);

  /* ── createPeerConnection ─────────────────────────────── */
  const createPeerConnection = useCallback((): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: buildIceServers() });

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.play().catch(() => {});
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") {
        setPhase("in_call");
      } else if (state === "failed") {
        // Attempt ICE restart before giving up
        if (pc.signalingState !== "closed") {
          pc.restartIce();
          setTimeout(() => {
            if (pc.connectionState === "failed") {
              setPhase("failed");
              setError("Connection failed. Please try again.");
              cleanup(false);
            }
          }, 10_000);
        }
      } else if (state === "disconnected") {
        setTimeout(() => {
          if (
            pc.connectionState === "disconnected" ||
            pc.connectionState === "failed"
          ) {
            setPhase("ended");
            cleanup(false);
          }
        }, 8_000);
      }
    };

    return pc;
  }, [cleanup]);

  /* ── startCall (outgoing) ─────────────────────────────── */
  const startCall = useCallback(
    async (myUsername: string, calleeUsername: string) => {
      if (phase !== "idle") return;
      setError(null);
      iceCandidateBufferRef.current = [];
      remoteDescSetRef.current = false;

      try {
        setPhase("requesting_mic");

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;

        const pc = createPeerConnection();
        pcRef.current = pc;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        const callDocRef = doc(collection(clientDb, "calls_v1"));
        callIdRef.current = callDocRef.id;

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

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

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

        const expectedCallId = callDocRef.id;
        ringTimeoutRef.current = setTimeout(async () => {
          if (callIdRef.current !== expectedCallId) return;
          setPhase("ended");
          await cleanup(true);
        }, 45_000);

        // Listen for answer, decline, and end
        const unsubCall = onSnapshot(callDocRef, async (snap) => {
          if (!snap.exists()) {
            setPhase("ended");
            cleanup(false);
            return;
          }
          const data = snap.data();

          if (data.status === "declined") {
            setPhase("declined");
            cleanup(false);
            return;
          }

          if (data.status === "ended") {
            setPhase("ended");
            cleanup(false);
            return;
          }

          if (
            data.answer &&
            pc.signalingState !== "closed" &&
            !pc.currentRemoteDescription
          ) {
            try {
              await pc.setRemoteDescription(
                new RTCSessionDescription(data.answer as RTCSessionDescriptionInit)
              );
              await drainCandidateBuffer(pc);
              setPhase("connecting");
            } catch {
              /* ignore signaling errors */
            }
          }
        });
        unsubsRef.current.push(unsubCall);

        // Listen for callee's ICE candidates — buffer if answer not yet applied
        const calleeCandidatesRef = collection(
          clientDb,
          "calls_v1",
          callDocRef.id,
          "calleeCandidates"
        );
        const unsubCallee = onSnapshot(calleeCandidatesRef, (snap) => {
          snap.docChanges().forEach(async (change) => {
            if (change.type === "added") {
              const currentPc = pcRef.current;
              if (currentPc) {
                await addRemoteCandidate(
                  currentPc,
                  change.doc.data() as RTCIceCandidateInit
                );
              }
            }
          });
        });
        unsubsRef.current.push(unsubCallee);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.name === "NotAllowedError"
              ? "Microphone access denied. Allow access and try again."
              : err.message
            : "Could not start the call.";
        setError(msg);
        setPhase("failed");
        await cleanup(false);
      }
    },
    [phase, createPeerConnection, cleanup, addRemoteCandidate, drainCandidateBuffer]
  );

  /* ── acceptCall (incoming) ────────────────────────────── */
  const acceptCall = useCallback(
    async (callId: string, callerUsername: string, myUsername: string) => {
      if (phase !== "idle") return;
      setError(null);
      iceCandidateBufferRef.current = [];
      remoteDescSetRef.current = false;

      try {
        setPhase("requesting_mic");

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;

        const pc = createPeerConnection();
        pcRef.current = pc;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        callIdRef.current = callId;
        setSession({ callId, remoteUsername: callerUsername, isOutgoing: false });

        const callDocRef = doc(clientDb, "calls_v1", callId);
        const callSnap = await getDoc(callDocRef);
        if (!callSnap.exists()) throw new Error("Call session not found.");

        const callData = callSnap.data();
        if (callData.status !== "ringing") throw new Error("Call is no longer available.");

        await pc.setRemoteDescription(
          new RTCSessionDescription(callData.offer as RTCSessionDescriptionInit)
        );
        // Remote desc set — callee side is safe to add ICE candidates immediately
        remoteDescSetRef.current = true;

        const answer = await pc.createAnswer();

        const calleeCandidatesRef = collection(clientDb, "calls_v1", callId, "calleeCandidates");
        pc.onicecandidate = async (event) => {
          if (event.candidate) {
            await addDoc(calleeCandidatesRef, event.candidate.toJSON()).catch(() => {});
          }
        };

        await pc.setLocalDescription(answer);

        await updateDoc(callDocRef, {
          answer: { type: answer.type, sdp: answer.sdp },
          status: "active",
          expireAt: Timestamp.fromMillis(Date.now() + 2 * 60 * 60 * 1000),
        });

        setPhase("connecting");

        // Caller's ICE candidates — remote desc is already set so add directly
        const callerCandidatesRef = collection(clientDb, "calls_v1", callId, "callerCandidates");
        const unsubCaller = onSnapshot(callerCandidatesRef, (snap) => {
          snap.docChanges().forEach(async (change) => {
            if (change.type === "added") {
              const currentPc = pcRef.current;
              if (currentPc && currentPc.signalingState !== "closed") {
                try {
                  await currentPc.addIceCandidate(
                    new RTCIceCandidate(change.doc.data() as RTCIceCandidateInit)
                  );
                } catch {
                  /* ignore */
                }
              }
            }
          });
        });
        unsubsRef.current.push(unsubCaller);

        const unsubCall = onSnapshot(callDocRef, (snap) => {
          if (!snap.exists()) {
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
              ? "Microphone access denied. Allow access and try again."
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
      // Signal "declined" first so the caller sees the explicit status,
      // then clean up the document after a brief delay.
      await updateDoc(doc(clientDb, "calls_v1", callId), { status: "declined" });
      setTimeout(async () => {
        try {
          await deleteDoc(doc(clientDb, "calls_v1", callId));
        } catch {
          /* ignore */
        }
      }, 1_500);
    } catch {
      try {
        await deleteDoc(doc(clientDb, "calls_v1", callId));
      } catch {
        /* ignore */
      }
    }
  }, []);

  /* ── hangUp ───────────────────────────────────────────── */
  const hangUp = useCallback(async () => {
    // Write status: "ended" before deleting so the other party's onSnapshot
    // fires the status change and transitions to ended immediately.
    if (callIdRef.current) {
      try {
        await updateDoc(doc(clientDb, "calls_v1", callIdRef.current), {
          status: "ended",
        });
      } catch {
        /* ignore — might already be deleted */
      }
    }
    setPhase("ended");
    await cleanup(true);
  }, [cleanup]);

  /* ── toggleMute ───────────────────────────────────────── */
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const next = !isMuted;
    localStreamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
    setIsMuted(next);
  }, [isMuted]);

  /* ── cleanup on unmount ───────────────────────────────── */
  useEffect(() => {
    return () => {
      const shouldMarkEnded =
        phase === "in_call" || phase === "calling" || phase === "connecting";
      cleanup(shouldMarkEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── reset to idle after ended / failed / declined ──── */
  useEffect(() => {
    if (phase === "ended" || phase === "failed" || phase === "declined") {
      const t = setTimeout(() => {
        setPhase("idle");
        setSession(null);
        setIsMuted(false);
      }, 2_500);
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

/* ══════════════════════════════════════════════════════════════
   useGroupCall — multi-party voice calls
══════════════════════════════════════════════════════════════ */
export function useGroupCall(): UseGroupCallReturn {
  const [phase, setPhase] = useState<GroupCallPhase>("idle");
  const [session, setSession] = useState<GroupCallSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [mutedPeers, setMutedPeers] = useState<Set<string>>(new Set());

  const peersRef = useRef<Map<string, PeerEntry>>(new Map());
  const callIdRef = useRef<string | null>(null);
  const myUsernameRef = useRef<string>("");
  const localStreamRef = useRef<MediaStream | null>(null);
  const unsubsRef = useRef<Unsubscribe[]>([]);

  /* ── cleanup a single peer ──────────────────────────── */
  const cleanupPeer = useCallback((username: string) => {
    const entry = peersRef.current.get(username);
    if (!entry) return;
    for (const unsub of entry.unsubs) unsub();
    entry.pc.ontrack = null;
    entry.pc.onicecandidate = null;
    entry.pc.onconnectionstatechange = null;
    entry.pc.close();
    entry.audioElement.pause();
    entry.audioElement.srcObject = null;
    peersRef.current.delete(username);
  }, []);

  /* ── cleanup everything ─────────────────────────────── */
  const cleanupAll = useCallback(
    async (removeFromFirestore = false) => {
      for (const unsub of unsubsRef.current) unsub();
      unsubsRef.current = [];

      for (const username of [...peersRef.current.keys()]) {
        cleanupPeer(username);
      }

      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;

      if (removeFromFirestore && callIdRef.current) {
        const callId = callIdRef.current;
        const myUsername = myUsernameRef.current;
        try {
          const callRef = doc(clientDb, "group_calls_v2", callId);
          const callSnap = await getDoc(callRef);
          if (callSnap.exists()) {
            const remaining = (callSnap.data().participants as string[]).filter(
              (p) => p !== myUsername
            );
            if (remaining.length === 0) {
              await updateDoc(callRef, { status: "ended", participants: [] });
            } else {
              await updateDoc(callRef, { participants: arrayRemove(myUsername) });
            }
          }

          // Delete connection documents for this user
          const connectionsRef = collection(clientDb, "group_calls_v2", callId, "connections");
          const [asInit, asResp] = await Promise.all([
            getDocs(query(connectionsRef, where("initiator", "==", myUsername))),
            getDocs(query(connectionsRef, where("responder", "==", myUsername))),
          ]);
          const batch = writeBatch(clientDb);
          for (const d of [...asInit.docs, ...asResp.docs]) {
            const key = d.id;
            const [fromI, fromR] = await Promise.all([
              getDocs(collection(clientDb, "group_calls_v2", callId, "connections", key, "fromInitiator")),
              getDocs(collection(clientDb, "group_calls_v2", callId, "connections", key, "fromResponder")),
            ]);
            fromI.docs.forEach((c) => batch.delete(c.ref));
            fromR.docs.forEach((c) => batch.delete(c.ref));
            batch.delete(d.ref);
          }
          await batch.commit();
        } catch {
          /* ignore */
        }
      }

      callIdRef.current = null;
      myUsernameRef.current = "";
    },
    [cleanupPeer]
  );

  /* ── create a PeerConnection for a group participant ── */
  const createGroupPeer = useCallback(
    (
      peerUsername: string,
      callId: string,
      isInitiator: boolean,
      connectionKey: string
    ): PeerEntry => {
      const pc = new RTCPeerConnection({ iceServers: buildIceServers() });
      const audioElement = new Audio();
      audioElement.autoplay = true;

      const entry: PeerEntry = {
        pc,
        connectionKey,
        isInitiator,
        candidateBuffer: [],
        remoteDescSet: false,
        audioElement,
        unsubs: [],
      };

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (stream) {
          audioElement.srcObject = stream;
          audioElement.play().catch(() => {});
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") {
          pc.restartIce();
        } else if (pc.connectionState === "disconnected") {
          setTimeout(() => {
            if (
              pc.connectionState === "disconnected" ||
              pc.connectionState === "failed"
            ) {
              cleanupPeer(peerUsername);
              setSession((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  participants: prev.participants.filter((p) => p !== peerUsername),
                };
              });
            }
          }, 8_000);
        }
      };

      const iceColl = isInitiator
        ? collection(clientDb, "group_calls_v2", callId, "connections", connectionKey, "fromInitiator")
        : collection(clientDb, "group_calls_v2", callId, "connections", connectionKey, "fromResponder");

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await addDoc(iceColl, event.candidate.toJSON()).catch(() => {});
        }
      };

      return entry;
    },
    [cleanupPeer]
  );

  /* ── add a remote ICE candidate (with buffering) ──── */
  const addGroupCandidate = useCallback(
    async (entry: PeerEntry, candidate: RTCIceCandidateInit) => {
      if (entry.remoteDescSet && entry.pc.signalingState !== "closed") {
        try {
          await entry.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
          /* ignore */
        }
      } else {
        entry.candidateBuffer.push(candidate);
      }
    },
    []
  );

  /* ── drain buffered ICE candidates ─────────────────── */
  const drainGroupBuffer = useCallback(async (entry: PeerEntry) => {
    entry.remoteDescSet = true;
    const buffered = entry.candidateBuffer.splice(0);
    for (const c of buffered) {
      if (entry.pc.signalingState !== "closed") {
        try {
          await entry.pc.addIceCandidate(new RTCIceCandidate(c));
        } catch {
          /* ignore */
        }
      }
    }
  }, []);

  /* ── connect to an existing peer (we are the joiner) */
  const connectToExistingPeer = useCallback(
    async (peerUsername: string, callId: string, myUsername: string) => {
      if (peersRef.current.has(peerUsername)) return;
      const localStream = localStreamRef.current;
      if (!localStream) return;

      const connectionKey = `${myUsername}---${peerUsername}`;
      const entry = createGroupPeer(peerUsername, callId, true, connectionKey);
      localStream.getTracks().forEach((t) => entry.pc.addTrack(t, localStream));
      peersRef.current.set(peerUsername, entry);

      const connectionRef = doc(clientDb, "group_calls_v2", callId, "connections", connectionKey);

      try {
        const offer = await entry.pc.createOffer();
        await entry.pc.setLocalDescription(offer);

        await setDoc(connectionRef, {
          initiator: myUsername,
          responder: peerUsername,
          offer: { type: offer.type, sdp: offer.sdp },
          answer: null,
          createdAt: Date.now(),
        });

        const unsubConn = onSnapshot(connectionRef, async (snap) => {
          if (!snap.exists()) return;
          const data = snap.data();
          if (
            data.answer &&
            entry.pc.signalingState !== "closed" &&
            !entry.pc.currentRemoteDescription
          ) {
            try {
              await entry.pc.setRemoteDescription(
                new RTCSessionDescription(data.answer as RTCSessionDescriptionInit)
              );
              await drainGroupBuffer(entry);
            } catch {
              /* ignore */
            }
          }
        });
        entry.unsubs.push(unsubConn);

        const fromResponderRef = collection(
          clientDb, "group_calls_v2", callId, "connections", connectionKey, "fromResponder"
        );
        const unsubIce = onSnapshot(fromResponderRef, (snap) => {
          snap.docChanges().forEach(async (change) => {
            if (change.type === "added") {
              const e = peersRef.current.get(peerUsername);
              if (e) await addGroupCandidate(e, change.doc.data() as RTCIceCandidateInit);
            }
          });
        });
        entry.unsubs.push(unsubIce);
      } catch {
        cleanupPeer(peerUsername);
      }
    },
    [createGroupPeer, drainGroupBuffer, addGroupCandidate, cleanupPeer]
  );

  /* ── respond to an incoming connection (we are responder) */
  const handleIncomingConnection = useCallback(
    async (
      initiatorUsername: string,
      connectionKey: string,
      offerData: RTCSessionDescriptionInit,
      callId: string
    ) => {
      if (peersRef.current.has(initiatorUsername)) return;
      const localStream = localStreamRef.current;
      if (!localStream) return;

      const entry = createGroupPeer(initiatorUsername, callId, false, connectionKey);
      localStream.getTracks().forEach((t) => entry.pc.addTrack(t, localStream));
      peersRef.current.set(initiatorUsername, entry);

      const connectionRef = doc(
        clientDb, "group_calls_v2", callId, "connections", connectionKey
      );

      try {
        await entry.pc.setRemoteDescription(new RTCSessionDescription(offerData));
        await drainGroupBuffer(entry);

        const answer = await entry.pc.createAnswer();
        await entry.pc.setLocalDescription(answer);

        await updateDoc(connectionRef, {
          answer: { type: answer.type, sdp: answer.sdp },
        });

        const fromInitiatorRef = collection(
          clientDb, "group_calls_v2", callId, "connections", connectionKey, "fromInitiator"
        );
        const unsubIce = onSnapshot(fromInitiatorRef, (snap) => {
          snap.docChanges().forEach(async (change) => {
            if (change.type === "added") {
              const e = peersRef.current.get(initiatorUsername);
              if (e) await addGroupCandidate(e, change.doc.data() as RTCIceCandidateInit);
            }
          });
        });
        entry.unsubs.push(unsubIce);

        setSession((prev) => {
          if (!prev || prev.participants.includes(initiatorUsername)) return prev;
          return { ...prev, participants: [...prev.participants, initiatorUsername] };
        });
      } catch {
        cleanupPeer(initiatorUsername);
      }
    },
    [createGroupPeer, drainGroupBuffer, addGroupCandidate, cleanupPeer]
  );

  /* ── subscribe to Firestore group call events ────── */
  const subscribeToGroupCall = useCallback(
    (callId: string, myUsername: string) => {
      const callRef = doc(clientDb, "group_calls_v2", callId);

      const unsubCall = onSnapshot(callRef, (snap) => {
        if (!snap.exists() || snap.data().status === "ended") {
          setPhase("ended");
          cleanupAll(false);
          return;
        }
        const participants = snap.data().participants as string[];
        setSession((prev) => (prev ? { ...prev, participants } : prev));
      });
      unsubsRef.current.push(unsubCall);

      const connectionsRef = collection(clientDb, "group_calls_v2", callId, "connections");
      const incomingQuery = query(connectionsRef, where("responder", "==", myUsername));
      const unsubConns = onSnapshot(incomingQuery, (snap) => {
        snap.docChanges().forEach(async (change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            if (data.offer && !peersRef.current.has(data.initiator)) {
              await handleIncomingConnection(
                data.initiator,
                change.doc.id,
                data.offer as RTCSessionDescriptionInit,
                callId
              );
            }
          }
        });
      });
      unsubsRef.current.push(unsubConns);
    },
    [cleanupAll, handleIncomingConnection]
  );

  /* ── startGroupCall ─────────────────────────────── */
  const startGroupCall = useCallback(
    async (myUsername: string, conversationId: string) => {
      if (phase !== "idle") return;
      setError(null);

      try {
        setPhase("joining");
        myUsernameRef.current = myUsername;

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;

        const callDocRef = doc(collection(clientDb, "group_calls_v2"));
        callIdRef.current = callDocRef.id;

        await setDoc(callDocRef, {
          conversationId,
          startedBy: myUsername,
          status: "active",
          participants: [myUsername],
          createdAt: Date.now(),
          expireAt: Timestamp.fromMillis(Date.now() + 4 * 60 * 60 * 1000),
        });

        setSession({ callId: callDocRef.id, conversationId, participants: [myUsername] });
        setPhase("in_call");

        subscribeToGroupCall(callDocRef.id, myUsername);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.name === "NotAllowedError"
              ? "Microphone access denied. Allow access and try again."
              : err.message
            : "Could not start the call.";
        setError(msg);
        setPhase("failed");
        await cleanupAll(false);
      }
    },
    [phase, cleanupAll, subscribeToGroupCall]
  );

  /* ── joinGroupCall ──────────────────────────────── */
  const joinGroupCall = useCallback(
    async (callId: string, conversationId: string, myUsername: string) => {
      if (phase !== "idle") return;
      setError(null);

      try {
        setPhase("joining");
        myUsernameRef.current = myUsername;

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        callIdRef.current = callId;

        const callRef = doc(clientDb, "group_calls_v2", callId);
        const existingParticipants = await runTransaction(clientDb, async (tx) => {
          const snap = await tx.get(callRef);
          if (!snap.exists()) throw new Error("Call not found.");
          const data = snap.data();
          if (data.status !== "active") throw new Error("Call has ended.");
          const current = data.participants as string[];
          if (current.includes(myUsername)) return current.filter((p) => p !== myUsername);
          tx.update(callRef, { participants: arrayUnion(myUsername) });
          return current;
        });

        setSession({ callId, conversationId, participants: [...existingParticipants, myUsername] });
        setPhase("in_call");

        for (const peer of existingParticipants) {
          await connectToExistingPeer(peer, callId, myUsername);
        }

        subscribeToGroupCall(callId, myUsername);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.name === "NotAllowedError"
              ? "Microphone access denied. Allow access and try again."
              : err.message
            : "Could not join the call.";
        setError(msg);
        setPhase("failed");
        await cleanupAll(false);
      }
    },
    [phase, cleanupAll, connectToExistingPeer, subscribeToGroupCall]
  );

  /* ── leaveGroupCall ─────────────────────────────── */
  const leaveGroupCall = useCallback(async () => {
    setPhase("ended");
    await cleanupAll(true);
    setTimeout(() => {
      setPhase("idle");
      setSession(null);
      setIsMuted(false);
      setMutedPeers(new Set());
    }, 2_000);
  }, [cleanupAll]);

  /* ── toggleMute (local mic) ─────────────────────── */
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const next = !isMuted;
    localStreamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
    setIsMuted(next);
  }, [isMuted]);

  /* ── togglePeerMute (mute a remote participant locally) */
  const togglePeerMute = useCallback((username: string) => {
    const entry = peersRef.current.get(username);
    if (entry) {
      entry.audioElement.muted = !entry.audioElement.muted;
    }
    setMutedPeers((prev) => {
      const next = new Set(prev);
      if (next.has(username)) {
        next.delete(username);
      } else {
        next.add(username);
      }
      return next;
    });
  }, []);

  /* ── cleanup on unmount ─────────────────────────── */
  useEffect(() => {
    return () => {
      if (phase === "in_call" || phase === "joining") {
        cleanupAll(true);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── reset to idle after ended / failed ─────────── */
  useEffect(() => {
    if (phase === "ended" || phase === "failed") {
      const t = setTimeout(() => {
        setPhase("idle");
        setSession(null);
        setIsMuted(false);
        setMutedPeers(new Set());
      }, 2_500);
      return () => clearTimeout(t);
    }
  }, [phase]);

  return {
    phase,
    session,
    error,
    isMuted,
    mutedPeers,
    startGroupCall,
    joinGroupCall,
    leaveGroupCall,
    toggleMute,
    togglePeerMute,
  };
}

/* ══════════════════════════════════════════════════════════════
   useIncomingCall — detect ringing DM calls for a user
══════════════════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════════════════
   useActiveGroupCallForConversation
   Returns the live group call in a conversation, or null.
══════════════════════════════════════════════════════════════ */
export function useActiveGroupCallForConversation(
  conversationId: string | null
): { callId: string; participants: string[]; startedBy: string } | null {
  const [data, setData] = useState<{
    callId: string;
    participants: string[];
    startedBy: string;
  } | null>(null);
  const { fbUser, ready } = useFirebaseAuth();

  useEffect(() => {
    if (!ready || !fbUser || !conversationId) {
      setData(null);
      return;
    }

    const q = query(
      collection(clientDb, "group_calls_v2"),
      where("conversationId", "==", conversationId),
      where("status", "==", "active")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          setData(null);
          return;
        }
        const d = snap.docs[0];
        const callData = d.data();
        setData({
          callId: d.id,
          participants: callData.participants as string[],
          startedBy: callData.startedBy as string,
        });
      },
      () => setData(null)
    );

    return unsub;
  }, [ready, fbUser, conversationId]);

  return data;
}
