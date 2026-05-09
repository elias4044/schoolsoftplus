"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "./useSession";
import { useCall, useIncomingCall, type UseCallReturn, type IncomingCall } from "./useCall";
import { CallPanel } from "@/components/CallPanel";

/* ── Remote profile (display name + avatar) ─────────────────── */
interface RemoteProfile {
  displayName: string;
  avatarUrl: string;
}

function useRemoteProfile(username: string | null): RemoteProfile | null {
  const [profile, setProfile] = useState<RemoteProfile | null>(null);

  useEffect(() => {
    if (!username) { setProfile(null); return; }
    let cancelled = false;
    fetch(`/api/profile/${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.success) {
          setProfile({
            displayName: data.profile?.displayName ?? username,
            avatarUrl: data.profile?.pfpUrl ?? "",
          });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [username]);

  return profile;
}

/* ── Context ─────────────────────────────────────────────────── */
interface CallContextValue {
  call: UseCallReturn;
  incomingCall: IncomingCall | null;
  /** The logged-in user's username, available globally without an extra useSession call. */
  username: string;
}

const CallContext = createContext<CallContextValue | null>(null);

export function useCallContext(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCallContext must be used inside CallProvider");
  return ctx;
}

/* ── GlobalCallPanel (rendered once inside CallProvider) ─────── */
function GlobalCallPanel({
  call,
  incomingCall,
  username,
}: {
  call: UseCallReturn;
  incomingCall: IncomingCall | null;
  username: string;
}) {
  const remoteProfile = useRemoteProfile(call.session?.remoteUsername ?? null);
  const callerProfile = useRemoteProfile(incomingCall?.callerUsername ?? null);

  return (
    <CallPanel
      phase={call.phase}
      session={call.session}
      incomingCall={incomingCall}
      isMuted={call.isMuted}
      error={call.error}
      remoteAudioRef={call.remoteAudioRef}
      remoteDisplayName={remoteProfile?.displayName}
      remoteAvatarUrl={remoteProfile?.avatarUrl}
      callerDisplayName={callerProfile?.displayName}
      callerAvatarUrl={callerProfile?.avatarUrl}
      onAccept={() => {
        if (incomingCall) {
          call.acceptCall(incomingCall.callId, incomingCall.callerUsername, username);
        }
      }}
      onDecline={() => {
        if (incomingCall) call.declineCall(incomingCall.callId);
      }}
      onHangUp={call.hangUp}
      onToggleMute={call.toggleMute}
    />
  );
}

/* ── CallProvider ────────────────────────────────────────────── */
export function CallProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const username = session?.username ?? "";

  const call = useCall();
  const incomingCall = useIncomingCall(username);

  return (
    <CallContext.Provider value={{ call, incomingCall, username }}>
      {children}
      <GlobalCallPanel call={call} incomingCall={incomingCall} username={username} />
    </CallContext.Provider>
  );
}
