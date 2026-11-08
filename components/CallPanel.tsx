'use client';

import { useEffect, useRef } from 'react';
import { ShieldAlert } from 'lucide-react';

import type { CallPhase, CallSession, GroupCallPhase, GroupCallSession } from '@/lib/useCall';
import type { CallAudioControls } from '@/lib/useCallAudio';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { CallWorkspace } from '@/components/calls/CallWorkspace';

/*  Ringtone synthesizer + hook  */
export const RINGTONE_OPTIONS = [
  { id: 'default', label: 'Default' },
  { id: 'classic', label: 'Classic' },
  { id: 'digital', label: 'Digital' },
  { id: 'soft', label: 'Soft' },
  { id: 'pulse', label: 'Pulse' },
  { id: 'custom', label: 'Custom MP3' },
] as const;

export type RingtoneId = (typeof RINGTONE_OPTIONS)[number]['id'];

function synthRingtone(ctx: AudioContext, id: string, vol = 0.3) {
  function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.015);
    gain.gain.setValueAtTime(vol, Math.max(start + 0.015, start + dur - 0.025));
    gain.gain.linearRampToValueAtTime(0, start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }

  const t = ctx.currentTime;
  switch (id) {
    case 'classic':
      // Retro dual-tone telephone bell
      for (let i = 0; i < 4; i++) {
        tone(480, t + i * 0.12, 0.09, 'square');
        tone(440, t + i * 0.12, 0.09, 'square');
      }
      break;
    case 'digital':
      // Ascending digital beeps
      tone(880, t, 0.1, 'square');
      tone(1100, t + 0.14, 0.1, 'square');
      tone(1320, t + 0.28, 0.1, 'square');
      break;
    case 'soft':
      // Gentle chime — C5 → E5
      tone(523, t, 0.55, 'sine');
      tone(659, t + 0.28, 0.4, 'sine');
      break;
    case 'pulse':
      // Quick double pulse
      tone(880, t, 0.07, 'sine');
      tone(880, t + 0.14, 0.07, 'sine');
      break;
    default: // "default"
      tone(440, t, 0.45, 'sine');
      tone(440, t + 0.55, 0.45, 'sine');
  }
}

export function useRingtone(
  id: string | null | undefined,
  active: boolean,
  customUrl?: string | null
) {
  const ctxRef = useRef<AudioContext | null>(null);
  const synthTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const isCustom = id === 'custom' && customUrl;

    if (!active) {
      // Stop synth
      if (synthTimerRef.current) {
        clearInterval(synthTimerRef.current);
        synthTimerRef.current = null;
      }
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
      // Stop custom audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      return;
    }

    if (isCustom) {
      // Play custom MP3 in a loop
      if (!audioRef.current) audioRef.current = new Audio();
      const a = audioRef.current;
      a.src = customUrl!;
      a.loop = true;
      a.volume = 0.7;
      a.play().catch(() => {});
      return () => {
        a.pause();
        a.currentTime = 0;
      };
    }

    // Synthesised ringtone
    function ring() {
      try {
        if (!ctxRef.current || ctxRef.current.state === 'closed') {
          ctxRef.current = new AudioContext();
        }
        if (ctxRef.current.state === 'suspended') ctxRef.current.resume().catch(() => {});
        synthRingtone(ctxRef.current, id ?? 'default');
      } catch {
        /* AudioContext may be unavailable */
      }
    }

    ring();
    synthTimerRef.current = setInterval(ring, 3_000);

    return () => {
      if (synthTimerRef.current) {
        clearInterval(synthTimerRef.current);
        synthTimerRef.current = null;
      }
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    };
  }, [active, id, customUrl]);
}

export interface IncomingCallInfo {
  callId: string;
  callerUserId: string;
  callerDisplayName?: string;
  callerAvatarUrl?: string;
}

export interface CallPanelProps {
  // DM call state
  phase: CallPhase;
  session: CallSession | null;
  incomingCall: IncomingCallInfo | null;
  isMuted: boolean;
  error: string | null;
  remoteAudioRef: React.RefObject<HTMLAudioElement | null>;
  remoteDisplayName?: string;
  remoteAvatarUrl?: string;
  onAccept: () => void;
  onDecline: () => void;
  onHangUp: () => void;
  onToggleMute: () => void;

  // Group call state
  groupPhase: GroupCallPhase;
  groupSession: GroupCallSession | null;
  groupIsMuted: boolean;
  groupError: string | null;
  onGroupLeave: () => void;
  onGroupToggleMute: () => void;
  groupMutedPeers?: Set<string>;
  onGroupTogglePeerMute?: (username: string) => void;
  // Resolved group participant profiles: username -> { displayName, avatarUrl }
  groupParticipantProfiles?: Record<string, { displayName: string; avatarUrl: string }>;

  // Ringtone preference of the current user
  ringtone?: string;
  ringtoneCustomUrl?: string | null;

  audio: CallAudioControls;
  groupAudio: CallAudioControls;
  connectionState: RTCPeerConnectionState;
  groupPeerStates: Record<string, RTCPeerConnectionState>;
  username: string;
  className?: string;
}

export function CallPanel(props: CallPanelProps) {
  const showIncoming =
    Boolean(props.incomingCall) && props.phase === 'idle' && props.groupPhase === 'idle';
  useRingtone(props.ringtone, showIncoming, props.ringtoneCustomUrl);
  return <CallWorkspace {...props} />;
}

export function GroupCallEncryptionNotice({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent className="max-w-md">
        <ShieldAlert className="text-muted-foreground size-6" />
        <DialogTitle>About this group call</DialogTitle>
        <DialogDescription className="leading-6">
          Voice calls use WebRTC transport encryption. They do not use the group message password,
          so group members can join the call without that password.
        </DialogDescription>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Start voice call</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
