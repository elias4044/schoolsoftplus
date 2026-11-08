'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import {
  ChevronDown,
  Headphones,
  Maximize2,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Settings2,
  Signal,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { createPortal } from 'react-dom';

import { useMicrophoneLevel, type CallAudioControls } from '@/lib/useCallAudio';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { CallPanelProps } from '@/components/CallPanel';

function CallAvatar({
  name,
  image,
  large = false,
}: {
  name: string;
  image?: string;
  large?: boolean;
}) {
  return (
    <Avatar className={large ? 'size-16' : 'size-10'}>
      {image && <AvatarImage src={image} alt={name} />}
      <AvatarFallback className="bg-primary/10 text-foreground font-semibold">
        {name
          .split(' ')
          .map((part) => part[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

function CallDuration({ callId }: { callId: string }) {
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [callId]);
  const seconds = Math.floor((now - startedAt) / 1000);
  return (
    <span className="tabular-nums">
      {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
    </span>
  );
}

function MicrophoneLevel({ audio, muted }: { audio: CallAudioControls; muted: boolean }) {
  const level = useMicrophoneLevel(audio.localStream);
  return (
    <meter
      aria-label="Microphone input level"
      min={0}
      max={1}
      value={muted ? 0 : level}
      className="accent-primary ml-auto h-2 w-28"
    />
  );
}

export function CallWorkspace(props: CallPanelProps) {
  const { remoteAudioRef } = props;
  const [minimizedId, setMinimizedId] = useState<string | null>(null);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const groupActive = props.groupPhase === 'joining' || props.groupPhase === 'in_call';
  const dmActive = ['requesting_mic', 'calling', 'connecting', 'in_call'].includes(props.phase);
  const active = groupActive || dmActive;
  const incoming =
    Boolean(props.incomingCall) && props.phase === 'idle' && props.groupPhase === 'idle';
  const audio = groupActive ? props.groupAudio : props.audio;
  const callId = (groupActive ? props.groupSession?.callId : props.session?.callId) ?? 'starting';
  const minimized = minimizedId === callId;
  const settings = settingsId === callId;
  const muted = groupActive ? props.groupIsMuted : props.isMuted;
  const connected = groupActive ? props.groupPhase === 'in_call' : props.phase === 'in_call';
  const name = groupActive
    ? 'Study call'
    : (props.remoteDisplayName ?? props.session?.remoteUsername ?? 'Voice call');
  const callerName =
    props.incomingCall?.callerDisplayName ?? props.incomingCall?.callerUserId ?? 'Incoming call';
  const error = props.error ?? props.groupError;
  const phaseText = groupActive
    ? 'Joining the call'
    : props.phase === 'requesting_mic'
      ? 'Waiting for microphone access'
      : props.phase === 'calling'
        ? 'Ringing'
        : 'Connecting';
  const disconnected = !groupActive && props.connectionState === 'disconnected';
  const terminal =
    ['ended', 'declined', 'failed'].includes(props.phase) ||
    ['ended', 'failed'].includes(props.groupPhase);

  const floating = (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {active && (
          <motion.section
            key="call-workspace"
            aria-label={groupActive ? 'Group voice call' : `Voice call with ${name}`}
            initial={{ opacity: 0, transform: 'translateY(12px)' }}
            animate={{ opacity: 1, transform: 'translateY(0)' }}
            exit={{ opacity: 0, transform: 'translateY(12px)' }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className={cn(
              'bg-popover text-popover-foreground border-border fixed right-3 bottom-3 z-150 flex max-h-[85dvh] w-[min(420px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border shadow-xl md:right-6 md:bottom-6',
              props.className
            )}
          >
            <header className="flex shrink-0 items-center gap-3 px-5 py-4">
              {groupActive ? (
                <Users className="text-primary size-5" />
              ) : (
                <CallAvatar name={name} image={props.remoteAvatarUrl} />
              )}
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-semibold">{name}</h2>
                <p
                  className="text-muted-foreground mt-1 flex items-center gap-2 text-xs"
                  role="status"
                >
                  {connected ? (
                    <>
                      <Signal
                        className={cn('size-3', disconnected ? 'text-amber-500' : 'text-primary')}
                      />
                      {disconnected ? 'Reconnecting' : 'Voice connected'}
                      <CallDuration key={callId} callId={callId} />
                    </>
                  ) : (
                    phaseText
                  )}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={minimized ? 'Expand call' : 'Minimize call'}
                aria-expanded={!minimized}
                onClick={() => setMinimizedId(minimized ? null : callId)}
              >
                {minimized ? <Maximize2 className="size-4" /> : <ChevronDown className="size-4" />}
              </Button>
            </header>

            {!minimized && (
              <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-4">
                {groupActive ? (
                  <div className="grid grid-cols-2 gap-2" aria-label="Call participants">
                    {(props.groupSession?.participantIds ?? [props.username]).map((id) => {
                      const self = id === props.username;
                      const profile = props.groupParticipantProfiles?.[id];
                      const participantName = self ? 'You' : (profile?.displayName ?? id);
                      const state = props.groupPeerStates[id];
                      const locallyMuted = props.groupMutedPeers?.has(id) ?? false;
                      return (
                        <div
                          key={id}
                          className="bg-muted/60 flex min-w-0 flex-col items-center rounded-xl px-3 py-4 text-center"
                        >
                          <CallAvatar name={participantName} image={profile?.avatarUrl} />
                          <p className="mt-3 w-full truncate text-sm font-medium">
                            {participantName}
                          </p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            {self
                              ? muted
                                ? 'Microphone muted'
                                : 'Your microphone is on'
                              : state === 'connected'
                                ? 'Connected'
                                : state === 'failed' || state === 'disconnected'
                                  ? 'Connection interrupted'
                                  : 'Connecting'}
                          </p>
                          {!self && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 h-8 text-xs"
                              aria-pressed={locallyMuted}
                              onClick={() => props.onGroupTogglePeerMute?.(id)}
                            >
                              {locallyMuted ? (
                                <VolumeX className="mr-1 size-3" />
                              ) : (
                                <Volume2 className="mr-1 size-3" />
                              )}
                              {locallyMuted ? 'Unmute for me' : 'Mute for me'}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-muted/50 flex flex-col items-center rounded-xl px-4 py-7 text-center">
                    <CallAvatar name={name} image={props.remoteAvatarUrl} large />
                    <p className="mt-4 text-base font-semibold">{name}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {disconnected
                        ? 'Trying to restore the connection.'
                        : connected
                          ? 'You are in a voice call.'
                          : phaseText}
                    </p>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-3">
                  {muted ? (
                    <MicOff className="text-muted-foreground size-4" />
                  ) : (
                    <Mic className="text-primary size-4" />
                  )}
                  <span className="text-muted-foreground text-xs">
                    {muted ? 'Mic muted' : 'Your microphone'}
                  </span>
                  <MicrophoneLevel audio={audio} muted={muted} />
                </div>

                {settings && (
                  <fieldset className="border-border mt-4 space-y-4 border-t pt-4">
                    <legend className="sr-only">Call audio settings</legend>
                    <label className="block text-xs font-medium">
                      Microphone
                      <select
                        value={audio.inputDeviceId}
                        onChange={(event) => void audio.setInputDevice(event.target.value)}
                        disabled={!connected || audio.changingMicrophone}
                        className="bg-background border-border focus-visible:ring-primary/40 mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-2 disabled:opacity-50"
                      >
                        <option value="default">System default</option>
                        {audio.microphones
                          .filter((device) => device.deviceId !== 'default')
                          .map((device, index) => (
                            <option key={device.deviceId} value={device.deviceId}>
                              {device.label || `Microphone ${index + 1}`}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className="block text-xs font-medium">
                      Call volume{' '}
                      <span className="text-muted-foreground float-right tabular-nums">
                        {Math.round(audio.volume * 100)}%
                      </span>
                      <input
                        aria-label="Call volume"
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={audio.volume}
                        onChange={(event) => audio.setVolume(Number(event.target.value))}
                        className="accent-primary mt-3 w-full"
                      />
                    </label>
                    <p className="text-muted-foreground text-xs leading-5">
                      Microphone changes apply during the call. Echo cancellation and noise
                      suppression are requested when supported by your browser.
                    </p>
                  </fieldset>
                )}
              </div>
            )}

            {audio.playbackBlocked && (
              <div role="alert" className="mx-5 mb-3 rounded-lg bg-amber-500/10 p-3 text-sm">
                <p>Your browser paused call audio.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => void audio.resumeAudio()}
                >
                  Enable call audio
                </Button>
              </div>
            )}
            {(audio.audioError || (groupActive ? props.groupError : props.error)) && (
              <p role="alert" className="text-destructive mx-5 mb-3 text-sm">
                {audio.audioError ?? (groupActive ? props.groupError : props.error)}
              </p>
            )}
            <footer className="border-border flex shrink-0 items-center justify-between gap-2 border-t px-5 py-3">
              <div className="flex gap-2">
                <Button
                  variant={muted ? 'secondary' : 'outline'}
                  size="icon"
                  disabled={!connected || audio.changingMicrophone}
                  aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
                  aria-pressed={muted}
                  onClick={groupActive ? props.onGroupToggleMute : props.onToggleMute}
                >
                  {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                </Button>
                <Button
                  variant={audio.isDeafened ? 'secondary' : 'outline'}
                  size="icon"
                  aria-label={audio.isDeafened ? 'Hear call audio' : 'Deafen call audio'}
                  aria-pressed={audio.isDeafened}
                  onClick={audio.toggleDeafen}
                >
                  {audio.isDeafened ? (
                    <VolumeX className="size-4" />
                  ) : (
                    <Headphones className="size-4" />
                  )}
                </Button>
                <Button
                  variant={settings ? 'secondary' : 'outline'}
                  size="icon"
                  aria-label="Audio settings"
                  aria-expanded={settings && !minimized}
                  onClick={() => {
                    setSettingsId(settings ? null : callId);
                    setMinimizedId(null);
                  }}
                >
                  <Settings2 className="size-4" />
                </Button>
              </div>
              <Button
                variant="destructive"
                className="gap-2 rounded-xl"
                onClick={groupActive ? props.onGroupLeave : props.onHangUp}
              >
                <PhoneOff className="size-4" />
                {groupActive ? 'Leave' : 'End call'}
              </Button>
            </footer>
            {audio.isDeafened && (
              <p className="text-muted-foreground px-5 pb-3 text-xs">
                Call audio is off.{' '}
                {muted ? 'Your microphone is also muted.' : 'Your microphone is still on.'}
              </p>
            )}
          </motion.section>
        )}
        {!active && !incoming && (terminal || (error && error !== dismissedError)) && (
          <motion.div
            key="call-result"
            role="status"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-popover border-border fixed right-3 bottom-3 z-150 flex max-w-[calc(100vw-24px)] items-center gap-3 rounded-xl border px-4 py-3 shadow-lg md:right-6 md:bottom-6"
          >
            <PhoneOff className="text-muted-foreground size-4 shrink-0" />
            <p className="max-w-sm text-sm">
              {error ?? (props.phase === 'declined' ? 'Call declined.' : 'Call ended.')}
            </p>
            {error && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Dismiss call error"
                onClick={() => setDismissedError(error)}
              >
                <X className="size-4" />
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );

  return (
    <>
      <audio ref={remoteAudioRef} autoPlay className="hidden" />
      <Dialog
        open={incoming}
        onOpenChange={(open) => {
          if (!open) props.onDecline();
        }}
      >
        <DialogContent className="max-w-sm text-center">
          <div className="flex flex-col items-center pt-4">
            <CallAvatar name={callerName} image={props.incomingCall?.callerAvatarUrl} large />
            <DialogTitle className="mt-5">{callerName}</DialogTitle>
            <DialogDescription className="mt-2">Incoming voice call</DialogDescription>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-12 gap-2 rounded-xl" onClick={props.onDecline}>
              <PhoneOff className="size-4" />
              Decline
            </Button>
            <Button
              className="h-12 gap-2 rounded-xl"
              onClick={() => {
                setDismissedError(null);
                props.onAccept();
              }}
            >
              <Phone className="size-4" />
              Answer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {typeof document !== 'undefined' && createPortal(floating, document.body)}
    </>
  );
}
