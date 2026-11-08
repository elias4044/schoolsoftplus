'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Headphones, Mic, MicOff, PhoneOff, VolumeX } from 'lucide-react';

import { CallPanel } from '@/components/CallPanel';

import { useRegisterCommandActions, type PaletteAction } from './command-actions';
import {
  useCall,
  useGroupCall,
  useIncomingCall,
  type IncomingCall,
  type UseCallReturn,
  type UseGroupCallReturn,
} from './useCall';
import { useSession } from './useSession';

interface RemoteProfile {
  displayName: string;
  avatarUrl: string;
}

function useRemoteProfile(username: string | null): RemoteProfile | null {
  const [profile, setProfile] = useState<(RemoteProfile & { userId: string }) | null>(null);
  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    fetch(`/api/profile/${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.success) {
          setProfile({
            userId: username,
            displayName: data.profile?.displayName ?? username,
            avatarUrl: data.profile?.pfpUrl ?? '',
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [username]);
  return profile?.userId === username ? profile : null;
}

function useGroupParticipantProfiles(
  participantIds: string[]
): Record<string, { displayName: string; avatarUrl: string }> {
  const [profiles, setProfiles] = useState<
    Record<string, { displayName: string; avatarUrl: string }>
  >({});

  useEffect(() => {
    if (participantIds.length === 0) return;
    for (const username of participantIds) {
      if (profiles[username]) continue;
      fetch(`/api/profile/${encodeURIComponent(username)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setProfiles((prev) => ({
              ...prev,
              [username]: {
                displayName: data.profile?.displayName ?? username,
                avatarUrl: data.profile?.pfpUrl ?? '',
              },
            }));
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantIds.join(',')]);

  return profiles;
}

function useOwnRingtone(username: string): { ringtone: string; ringtoneCustomUrl: string } {
  const [ringtone, setRingtone] = useState('default');
  const [ringtoneCustomUrl, setRingtoneCustomUrl] = useState('');
  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.success) {
          if (data.profile?.ringtone) setRingtone(data.profile.ringtone);
          if (data.profile?.ringtoneCustomUrl) setRingtoneCustomUrl(data.profile.ringtoneCustomUrl);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
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
  if (!ctx) throw new Error('useCallContext must be used inside CallProvider');
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
  const callerProfile = useRemoteProfile(incomingCall?.callerUserId ?? null);
  const groupParticipantProfiles = useGroupParticipantProfiles(
    groupCall.session?.participantIds ?? []
  );
  const groupActive = groupCall.phase === 'in_call';
  const voiceActive = call.phase === 'in_call' || groupActive;
  const muted = groupActive ? groupCall.isMuted : call.isMuted;
  const audio = groupActive ? groupCall.audio : call.audio;
  const callCommands: PaletteAction[] = voiceActive
    ? [
        {
          id: 'call-toggle-mute',
          label: muted ? 'Unmute microphone' : 'Mute microphone',
          group: 'Active call',
          keywords: 'voice audio call mic',
          icon: muted ? Mic : MicOff,
          run: groupActive ? groupCall.toggleMute : call.toggleMute,
        },
        {
          id: 'call-toggle-deafen',
          label: audio.isDeafened ? 'Hear call audio' : 'Deafen call audio',
          group: 'Active call',
          keywords: 'speaker sound volume',
          icon: audio.isDeafened ? Headphones : VolumeX,
          run: audio.toggleDeafen,
        },
        {
          id: 'call-end',
          label: groupActive ? 'Leave group call' : 'End voice call',
          group: 'Active call',
          keywords: 'hang up disconnect',
          icon: PhoneOff,
          run: () => {
            void (groupActive ? groupCall.leaveGroupCall() : call.hangUp());
          },
        },
      ]
    : [];
  useRegisterCommandActions('voice-call', callCommands);

  return (
    <CallPanel
      phase={call.phase}
      session={call.session}
      incomingCall={
        incomingCall
          ? {
              callId: incomingCall.callId,
              callerUserId: incomingCall.callerUserId,
              callerDisplayName: callerProfile?.displayName,
              callerAvatarUrl: callerProfile?.avatarUrl,
            }
          : null
      }
      isMuted={call.isMuted}
      error={call.error}
      remoteAudioRef={call.remoteAudioRef}
      audio={call.audio}
      groupAudio={groupCall.audio}
      connectionState={call.connectionState}
      groupPeerStates={groupCall.peerStates}
      username={username}
      remoteDisplayName={remoteProfile?.displayName}
      remoteAvatarUrl={remoteProfile?.avatarUrl}
      onAccept={() => {
        if (incomingCall) {
          call.acceptCall(incomingCall.callId, incomingCall.callerUserId, username);
        }
      }}
      onDecline={() => {
        if (incomingCall) call.declineCall(incomingCall.callId);
      }}
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
  const username = session?.userId ?? '';
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
