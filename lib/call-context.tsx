"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "./useSession";
import {
  useCall,
  useGroupCall,
  useIncomingCall,
  type UseCallReturn,
  type UseGroupCallReturn,
  type IncomingCall,
} from "./useCall";
import { CallPanel } from "@/components/CallPanel";

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

function useGroupParticipantProfiles(
  participants: string[]
): Record<string, { displayName: string; avatarUrl: string }> {
  const [profiles, setProfiles] = useState<
    Record<string, { displayName: string; avatarUrl: string }>
  >({});

  useEffect(() => {
    if (participants.length === 0) return;
    for (const username of participants) {
      if (profiles[username]) continue;
      fetch(`/api/profile/${encodeURIComponent(username)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setProfiles((prev) => ({
              ...prev,
              [username]: {
                displayName: data.profile?.displayName ?? username,
                avatarUrl: data.profile?.pfpUrl ?? "",
              },
            }));
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants.join(",")]);

  return profiles;
}

function useOwnRingtone(username: string): { ringtone: string; ringtoneCustomUrl: string } {
  const [ringtone, setRingtone] = useState("default");
  const [ringtoneCustomUrl, setRingtoneCustomUrl] = useState("");
  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.success) {
          if (data.profile?.ringtone) setRingtone(data.profile.ringtone);
          if (data.profile?.ringtoneCustomUrl) setRingtoneCustomUrl(data.profile.ringtoneCustomUrl);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [username]);
  return { ringtone, ringtoneCustomUrl };
}

interface CallContextValue {
  call: UseCallReturn;
  incomingCall: IncomingCall | null;
  groupCall: UseGroupCallReturn;
  username: string;
}

const CallContext = createContext<CallContextValue | null>(null);

export function useCallContext(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCallContext must be used inside CallProvider");
  return ctx;
}

function GlobalCallPanel({
  call,
  incomingCall,
  groupCall,
  username,
  ringtone,
  ringtoneCustomUrl,
}: {
  call: UseCallReturn;
  incomingCall: IncomingCall | null;
  groupCall: UseGroupCallReturn;
  username: string;
  ringtone: string;
  ringtoneCustomUrl: string;
}) {
  const remoteProfile = useRemoteProfile(call.session?.remoteUsername ?? null);
  const callerProfile = useRemoteProfile(incomingCall?.callerUsername ?? null);
  const groupParticipantProfiles = useGroupParticipantProfiles(
    groupCall.session?.participants ?? []
  );

  return (
    <CallPanel
      phase={call.phase}
      session={call.session}
      incomingCall={
        incomingCall
          ? {
              callId: incomingCall.callId,
              callerUsername: incomingCall.callerUsername,
              callerDisplayName: callerProfile?.displayName,
              callerAvatarUrl: callerProfile?.avatarUrl,
            }
          : null
      }
      isMuted={call.isMuted}
      error={call.error}
      remoteAudioRef={call.remoteAudioRef}
      remoteDisplayName={remoteProfile?.displayName}
      remoteAvatarUrl={remoteProfile?.avatarUrl}
      onAccept={() => {
        if (incomingCall) {
          call.acceptCall(incomingCall.callId, incomingCall.callerUsername, username);
        }
      }}
      onDecline={() => { if (incomingCall) call.declineCall(incomingCall.callId); }}
      onHangUp={call.hangUp}
      onToggleMute={call.toggleMute}
      groupPhase={groupCall.phase}
      groupSession={groupCall.session}
      groupIsMuted={groupCall.isMuted}
      groupError={groupCall.error}
      onGroupLeave={groupCall.leaveGroupCall}
      onGroupToggleMute={groupCall.toggleMute}
      groupMutedPeers={groupCall.mutedPeers}
      onGroupTogglePeerMute={groupCall.togglePeerMute}
      groupParticipantProfiles={groupParticipantProfiles}
      ringtone={ringtone}
      ringtoneCustomUrl={ringtoneCustomUrl}
    />
  );
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const username = session?.username ?? "";
  const call = useCall();
  const groupCall = useGroupCall();
  const incomingCall = useIncomingCall(username);
  const { ringtone, ringtoneCustomUrl } = useOwnRingtone(username);

  return (
    <CallContext.Provider value={{ call, incomingCall, groupCall, username }}>
      {children}
      <GlobalCallPanel
        call={call}
        incomingCall={incomingCall}
        groupCall={groupCall}
        username={username}
        ringtone={ringtone}
        ringtoneCustomUrl={ringtoneCustomUrl}
      />
    </CallContext.Provider>
  );
}
