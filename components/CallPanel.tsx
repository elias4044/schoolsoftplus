"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  PhoneMissed,
  Users,
  ShieldAlert,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { CallPhase, CallSession, GroupCallSession, GroupCallPhase } from "@/lib/useCall";

/*  Helpers  */
function initials(name: string): string {
  return (
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??"
  );
}

function useCallTimer(active: boolean): string {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (active) {
      setSeconds(0);
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setSeconds(0);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active]);

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function phaseLabel(phase: CallPhase): string {
  switch (phase) {
    case "requesting_mic": return "Requesting microphone...";
    case "calling":        return "Calling...";
    case "connecting":     return "Connecting...";
    case "ended":          return "Call ended";
    case "declined":       return "Call declined";
    case "failed":         return "Call failed";
    default:               return "";
  }
}

/*  Ringtone synthesizer + hook  */
export const RINGTONE_OPTIONS = [
  { id: "default", label: "Default" },
  { id: "classic", label: "Classic" },
  { id: "digital", label: "Digital" },
  { id: "soft",    label: "Soft" },
  { id: "pulse",   label: "Pulse" },
  { id: "custom",  label: "Custom MP3" },
] as const;

export type RingtoneId = typeof RINGTONE_OPTIONS[number]["id"];

function synthRingtone(ctx: AudioContext, id: string, vol = 0.3) {
  function tone(
    freq: number,
    start: number,
    dur: number,
    type: OscillatorType = "sine"
  ) {
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
    case "classic":
      // Retro dual-tone telephone bell
      for (let i = 0; i < 4; i++) {
        tone(480, t + i * 0.12, 0.09, "square");
        tone(440, t + i * 0.12, 0.09, "square");
      }
      break;
    case "digital":
      // Ascending digital beeps
      tone(880,  t,       0.1, "square");
      tone(1100, t + 0.14, 0.1, "square");
      tone(1320, t + 0.28, 0.1, "square");
      break;
    case "soft":
      // Gentle chime — C5 → E5
      tone(523, t,       0.55, "sine");
      tone(659, t + 0.28, 0.40, "sine");
      break;
    case "pulse":
      // Quick double pulse
      tone(880, t,       0.07, "sine");
      tone(880, t + 0.14, 0.07, "sine");
      break;
    default: // "default"
      tone(440, t,       0.45, "sine");
      tone(440, t + 0.55, 0.45, "sine");
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
    const isCustom = id === "custom" && customUrl;

    if (!active) {
      // Stop synth
      if (synthTimerRef.current) { clearInterval(synthTimerRef.current); synthTimerRef.current = null; }
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
      // Stop custom audio
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
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
        if (!ctxRef.current || ctxRef.current.state === "closed") {
          ctxRef.current = new AudioContext();
        }
        if (ctxRef.current.state === "suspended") ctxRef.current.resume().catch(() => {});
        synthRingtone(ctxRef.current, id ?? "default");
      } catch { /* AudioContext may be unavailable */ }
    }

    ring();
    synthTimerRef.current = setInterval(ring, 3_000);

    return () => {
      if (synthTimerRef.current) { clearInterval(synthTimerRef.current); synthTimerRef.current = null; }
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    };
  }, [active, id, customUrl]);
}

/*  Incoming call pulse ring  */
function PulseRing() {
  return (
    <>
      <motion.div
        animate={{ scale: [1, 1.18, 1], opacity: [0.3, 0, 0.3] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        className="absolute -inset-3 rounded-full"
        style={{ background: "oklch(0.65 0.22 278 / 25%)" }}
      />
      <motion.div
        animate={{ scale: [1, 1.35, 1], opacity: [0.2, 0, 0.2] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.3 }}
        className="absolute -inset-5 rounded-full"
        style={{ background: "oklch(0.65 0.22 278 / 12%)" }}
      />
    </>
  );
}

/*  Props  */
export interface IncomingCallInfo {
  callId: string;
  callerUsername: string;
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

  className?: string;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CallPanel
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
export function CallPanel({
  phase,
  session,
  incomingCall,
  isMuted,
  error,
  remoteAudioRef,
  remoteDisplayName,
  remoteAvatarUrl,
  onAccept,
  onDecline,
  onHangUp,
  onToggleMute,
  groupPhase,
  groupSession,
  groupIsMuted,
  groupError,
  onGroupLeave,
  onGroupToggleMute,
  groupMutedPeers,
  onGroupTogglePeerMute,
  groupParticipantProfiles = {},
  ringtone,
  ringtoneCustomUrl,
  className,
}: CallPanelProps) {
  const timer = useCallTimer(phase === "in_call");
  const groupTimer = useCallTimer(groupPhase === "in_call");

  const isActiveDm = phase !== "idle" && phase !== "ended" && phase !== "declined" && phase !== "failed";
  const showIncoming = !!incomingCall && phase === "idle" && groupPhase === "idle";
  const activeName = remoteDisplayName ?? session?.remoteUsername ?? "Unknown";
  const callerName = incomingCall?.callerDisplayName ?? incomingCall?.callerUsername ?? "Unknown";

  const isActiveGroup = groupPhase === "in_call" || groupPhase === "joining";

  // Play ringtone while an incoming DM call is pending
  useRingtone(ringtone, showIncoming, ringtoneCustomUrl);

  return (
    <>
      {/*  Hidden remote audio element  */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={remoteAudioRef} autoPlay className="hidden" />

      {/*  Incoming DM call modal  */}
      <AnimatePresence>
        {showIncoming && (
          <motion.div
            key="incoming"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-200 flex items-center justify-center p-4"
            style={{ backdropFilter: "blur(12px)", background: "oklch(0 0 0 / 55%)" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 20 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-72 rounded-3xl overflow-hidden"
              style={{
                background: "color-mix(in oklch, var(--card) 85%, transparent)",
                border: "1px solid oklch(1 0 0 / 10%)",
                boxShadow: "0 32px 80px oklch(0 0 0 / 50%), 0 0 0 1px oklch(1 0 0 / 5%)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Accent gradient bar */}
              <div
                className="h-1 w-full"
                style={{ background: "linear-gradient(90deg, oklch(0.65 0.22 278), oklch(0.58 0.24 295))" }}
              />

              <div className="flex flex-col items-center px-7 py-8 gap-5">
                {/* Avatar with pulse */}
                <div className="relative flex items-center justify-center">
                  <PulseRing />
                  <Avatar className="relative w-20 h-20 ring-[3px] ring-primary/30">
                    {incomingCall.callerAvatarUrl && (
                      <AvatarImage src={incomingCall.callerAvatarUrl} alt={callerName} />
                    )}
                    <AvatarFallback
                      className="text-lg font-bold"
                      style={{
                        background: "linear-gradient(135deg, oklch(0.65 0.22 278 / 35%), oklch(0.55 0.25 295 / 35%))",
                        color: "oklch(0.82 0.16 278)",
                      }}
                    >
                      {initials(callerName)}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Caller info */}
                <div className="text-center space-y-1">
                  <p className="font-semibold text-base leading-tight">{callerName}</p>
                  <div className="flex items-center justify-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ background: "oklch(0.68 0.18 148)" }}
                    />
                    <p className="text-xs text-muted-foreground">Incoming voice call</p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-end justify-center gap-8 w-full pt-1">
                  {/* Decline */}
                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={onDecline}
                      className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50"
                      style={{
                        background: "oklch(0.55 0.18 24 / 18%)",
                        border: "1.5px solid oklch(0.55 0.18 24 / 35%)",
                      }}
                      aria-label="Decline call"
                    >
                      <PhoneMissed className="w-6 h-6" style={{ color: "oklch(0.72 0.20 24)" }} />
                    </button>
                    <span className="text-[11px] text-muted-foreground">Decline</span>
                  </div>

                  {/* Accept */}
                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={onAccept}
                      className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400/50"
                      style={{
                        background: "linear-gradient(135deg, oklch(0.60 0.20 148), oklch(0.52 0.22 160))",
                        boxShadow: "0 6px 20px oklch(0.60 0.20 148 / 40%)",
                      }}
                      aria-label="Accept call"
                    >
                      <Phone className="w-6 h-6 text-white" />
                    </button>
                    <span className="text-[11px] text-muted-foreground">Accept</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/*  Active DM call floating bar  */}
      <AnimatePresence>
        {isActiveDm && (
          <motion.div
            key="active-dm-call"
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.94 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "fixed z-150 bottom-4 right-4 md:bottom-6 md:right-6",
              "w-64 rounded-2xl overflow-hidden",
              className
            )}
            style={{
              background: "color-mix(in oklch, var(--card) 92%, transparent)",
              border: "1px solid oklch(1 0 0 / 10%)",
              boxShadow: "0 16px 48px oklch(0 0 0 / 35%), 0 0 0 1px oklch(1 0 0 / 4%)",
            }}
          >
            {/* Status accent line */}
            <div
              className="h-0.5 w-full"
              style={{
                background:
                  phase === "in_call"
                    ? "linear-gradient(90deg, oklch(0.60 0.20 148), oklch(0.52 0.22 160))"
                    : "linear-gradient(90deg, oklch(0.65 0.22 278), oklch(0.55 0.25 295))",
              }}
            />

            <div className="flex items-center gap-3 px-3 py-3">
              {/* Avatar */}
              <div className="relative shrink-0">
                <Avatar className="w-9 h-9">
                  {remoteAvatarUrl && (
                    <AvatarImage src={remoteAvatarUrl} alt={activeName} />
                  )}
                  <AvatarFallback
                    className="text-xs font-bold"
                    style={{
                      background: "linear-gradient(135deg, oklch(0.65 0.22 278 / 35%), oklch(0.55 0.25 295 / 35%))",
                      color: "oklch(0.80 0.18 278)",
                    }}
                  >
                    {initials(activeName)}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
                    phase !== "in_call" && "animate-pulse"
                  )}
                  style={{
                    background:
                      phase === "in_call"
                        ? "oklch(0.60 0.20 148)"
                        : "oklch(0.65 0.22 278)",
                  }}
                />
              </div>

              {/* Name + status */}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate">{activeName}</p>
                <p
                  className="text-[10px] tabular-nums"
                  style={{
                    color:
                      phase === "in_call"
                        ? "oklch(0.60 0.20 148)"
                        : "oklch(0.65 0.22 278 / 80%)",
                  }}
                >
                  {phase === "in_call" ? timer : phaseLabel(phase)}
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={onToggleMute}
                  title={isMuted ? "Unmute" : "Mute"}
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                    isMuted
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
                      : "bg-white/8 text-muted-foreground border border-white/10 hover:bg-white/14 hover:text-foreground"
                  )}
                >
                  {isMuted ? (
                    <MicOff className="w-3.5 h-3.5" />
                  ) : (
                    <Mic className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={onHangUp}
                  title="End call"
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: "oklch(0.55 0.18 24 / 18%)",
                    border: "1px solid oklch(0.55 0.18 24 / 35%)",
                    color: "oklch(0.72 0.20 24)",
                  }}
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {error && (
              <div className="px-3 pb-2.5">
                <p className="text-[10px] text-destructive bg-destructive/10 rounded-lg px-2.5 py-1.5 leading-snug">
                  {error}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/*  Active group call floating bar  */}
      <AnimatePresence>
        {isActiveGroup && (
          <motion.div
            key="active-group-call"
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.94 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "fixed z-150 bottom-4 right-4 md:bottom-6 md:right-6",
              "w-72 rounded-2xl overflow-hidden",
              className
            )}
            style={{
              background: "color-mix(in oklch, var(--card) 92%, transparent)",
              border: "1px solid oklch(1 0 0 / 10%)",
              boxShadow: "0 16px 48px oklch(0 0 0 / 35%), 0 0 0 1px oklch(1 0 0 / 4%)",
            }}
          >
            <div
              className="h-0.5 w-full"
              style={{
                background:
                  groupPhase === "in_call"
                    ? "linear-gradient(90deg, oklch(0.60 0.20 148), oklch(0.52 0.22 160))"
                    : "linear-gradient(90deg, oklch(0.65 0.22 278), oklch(0.55 0.25 295))",
              }}
            />

            <div className="px-3 py-3 space-y-2.5">
              {/* Header row */}
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "oklch(0.65 0.22 278 / 15%)" }}
                >
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">
                    Group call
                    {groupPhase === "joining" && (
                      <span className="text-muted-foreground font-normal"> â€” joining...</span>
                    )}
                  </p>
                  {groupPhase === "in_call" && (
                    <p className="text-[10px] tabular-nums" style={{ color: "oklch(0.60 0.20 148)" }}>
                      {groupTimer} &middot; {groupSession?.participants.length ?? 0} participant
                      {(groupSession?.participants.length ?? 0) !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={onGroupToggleMute}
                    title={groupIsMuted ? "Unmute" : "Mute"}
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                      groupIsMuted
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
                        : "bg-white/8 text-muted-foreground border border-white/10 hover:bg-white/14 hover:text-foreground"
                    )}
                  >
                    {groupIsMuted ? (
                      <MicOff className="w-3.5 h-3.5" />
                    ) : (
                      <Mic className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={onGroupLeave}
                    title="Leave call"
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: "oklch(0.55 0.18 24 / 18%)",
                      border: "1px solid oklch(0.55 0.18 24 / 35%)",
                      color: "oklch(0.72 0.20 24)",
                    }}
                  >
                    <PhoneOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Participant avatar row */}
              {groupSession && groupSession.participants.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {groupSession.participants.slice(0, 8).map((p) => {
                    const profile = groupParticipantProfiles[p];
                    const isPeerMuted = groupMutedPeers?.has(p) ?? false;
                    return (
                      <div key={p} className="relative group/peer" title={profile?.displayName ?? p}>
                        <button
                          onClick={() => onGroupTogglePeerMute?.(p)}
                          className="relative block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-full"
                          aria-label={isPeerMuted ? `Unmute ${profile?.displayName ?? p}` : `Mute ${profile?.displayName ?? p} for you`}
                        >
                          <Avatar className={cn("w-7 h-7 ring-1", isPeerMuted ? "ring-amber-500/60" : "ring-card")}>
                            {profile?.avatarUrl && (
                              <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
                            )}
                            <AvatarFallback
                              className="text-[9px] font-bold"
                              style={{
                                background: "linear-gradient(135deg, oklch(0.65 0.22 278 / 30%), oklch(0.55 0.25 295 / 30%))",
                                color: "oklch(0.80 0.18 278)",
                              }}
                            >
                              {initials(profile?.displayName ?? p)}
                            </AvatarFallback>
                          </Avatar>
                          {/* Muted overlay icon */}
                          {isPeerMuted && (
                            <span
                              className="absolute inset-0 rounded-full flex items-center justify-center"
                              style={{ background: "oklch(0 0 0 / 50%)" }}
                            >
                              <MicOff className="w-3 h-3 text-amber-400" />
                            </span>
                          )}
                          {/* Speaking / active indicator (only when not muted) */}
                          {!isPeerMuted && (
                            <span
                              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-card"
                              style={{ background: "oklch(0.60 0.20 148)" }}
                            />
                          )}
                        </button>
                      </div>
                    );
                  })}
                  {groupSession.participants.length > 8 && (
                    <span className="text-[10px] text-muted-foreground ml-0.5">
                      +{groupSession.participants.length - 8}
                    </span>
                  )}
                </div>
              )}
              {groupSession && groupSession.participants.length > 0 && onGroupTogglePeerMute && (
                <p className="text-[9px] text-muted-foreground/50 leading-tight">
                  Tap a participant to mute them for you only.
                </p>
              )}

              {groupError && (
                <p className="text-[10px] text-destructive bg-destructive/10 rounded-lg px-2.5 py-1.5 leading-snug">
                  {groupError}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/*  Ended / failed / declined toast  */}
      <AnimatePresence>
        {(phase === "ended" || phase === "failed" || phase === "declined") && (
          <motion.div
            key="dm-call-toast"
            initial={{ opacity: 0, y: 12, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.94 }}
            transition={{ duration: 0.2 }}
            className="fixed z-150 bottom-4 right-4 md:bottom-6 md:right-6"
          >
            <div
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl"
              style={{
                background: "color-mix(in oklch, var(--card) 92%, transparent)",
                border: "1px solid oklch(1 0 0 / 10%)",
                boxShadow: "0 8px 24px oklch(0 0 0 / 25%)",
              }}
            >
              <PhoneOff
                className="w-3.5 h-3.5 shrink-0"
                style={{
                  color:
                    phase === "failed"
                      ? "oklch(0.72 0.20 24)"
                      : phase === "declined"
                      ? "oklch(0.72 0.20 24)"
                      : "oklch(0.55 0 0)",
                }}
              />
              <span className="text-xs text-muted-foreground">
                {phase === "failed"
                  ? (error ?? "Call failed")
                  : phase === "declined"
                  ? "Call declined"
                  : "Call ended"}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/*  Encryption warning for group calls  */
export function GroupCallEncryptionNotice({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-200 flex items-center justify-center p-4"
      style={{ backdropFilter: "blur(8px)", background: "oklch(0 0 0 / 50%)" }}
    >
      <motion.div
        initial={{ scale: 0.92, y: 12, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, y: 12, opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: "var(--card)",
          border: "1px solid oklch(1 0 0 / 10%)",
          boxShadow: "0 24px 64px oklch(0 0 0 / 40%)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, oklch(0.72 0.20 55), oklch(0.65 0.22 40))" }} />
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "oklch(0.72 0.20 55 / 15%)" }}
            >
              <ShieldAlert className="w-4.5 h-4.5" style={{ color: "oklch(0.72 0.20 55)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold">Voice call notice</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                This group uses end-to-end encrypted messages, but <strong>voice calls are not
                encrypted</strong> with the same group key. The call uses WebRTC's built-in
                transport encryption (DTLS-SRTP), but participants do not need the group
                password to join.
              </p>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={onCancel}
              className="flex-1 h-9 rounded-xl text-xs font-medium border border-white/10 text-muted-foreground hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 h-9 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 278), oklch(0.55 0.25 295))" }}
            >
              Start call anyway
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
