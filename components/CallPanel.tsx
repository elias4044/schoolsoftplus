"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  PhoneMissed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { CallPhase, CallSession, IncomingCall } from "@/lib/useCall";

/* ── Helpers ────────────────────────────────────────────────── */
function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";
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

/* ── Status label ────────────────────────────────────────────── */
function phaseLabel(phase: CallPhase): string {
  switch (phase) {
    case "requesting_mic": return "Requesting microphone…";
    case "calling":        return "Calling…";
    case "connecting":     return "Connecting…";
    case "ended":          return "Call ended";
    case "failed":         return "Call failed";
    default:               return "";
  }
}

/* ── Props ───────────────────────────────────────────────────── */
export interface CallPanelProps {
  phase: CallPhase;
  session: CallSession | null;
  incomingCall: IncomingCall | null;
  isMuted: boolean;
  error: string | null;
  remoteAudioRef: React.RefObject<HTMLAudioElement | null>;
  /** Display name for the remote party — resolved by the parent */
  remoteDisplayName?: string;
  remoteAvatarUrl?: string;
  /** Display name for the incoming caller — resolved by the parent */
  callerDisplayName?: string;
  callerAvatarUrl?: string;
  onStartCall?: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onHangUp: () => void;
  onToggleMute: () => void;
  className?: string;
}

/* ═══════════════════════════════════════════════════════════════
   CallPanel
═══════════════════════════════════════════════════════════════ */
export function CallPanel({
  phase,
  session,
  incomingCall,
  isMuted,
  error,
  remoteAudioRef,
  remoteDisplayName,
  remoteAvatarUrl,
  callerDisplayName,
  callerAvatarUrl,
  onAccept,
  onDecline,
  onHangUp,
  onToggleMute,
  className,
}: CallPanelProps) {
  const timer = useCallTimer(phase === "in_call");
  const isActive = phase !== "idle" && phase !== "ended" && phase !== "failed";
  const showIncoming = !!incomingCall && phase === "idle";

  /* Decide what name to show in the active call bar */
  const activeName = remoteDisplayName ?? session?.remoteUsername ?? "Unknown";
  const incomingName = callerDisplayName ?? incomingCall?.callerUsername ?? "Unknown";

  return (
    <>
      {/* ─── Hidden remote audio element ──────────────────── */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={remoteAudioRef} autoPlay className="hidden" />

      {/* ─── Incoming call modal ─────────────────────────── */}
      <AnimatePresence>
        {showIncoming && (
          <motion.div
            key="incoming"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-200 flex items-center justify-center p-4"
            style={{ backdropFilter: "blur(8px)", background: "oklch(0 0 0 / 60%)" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-75 rounded-2xl border border-white/10 bg-card shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top accent bar */}
              <div
                className="h-1 w-full"
                style={{ background: "linear-gradient(90deg, oklch(0.65 0.22 278), oklch(0.55 0.25 295))" }}
              />

              <div className="flex flex-col items-center px-6 py-7 gap-4">
                {/* Pulsing avatar */}
                <div className="relative">
                  <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-full"
                    style={{ background: "oklch(0.65 0.22 278 / 20%)" }}
                  />
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut", delay: 0.15 }}
                    className="absolute -inset-2 rounded-full"
                    style={{ background: "oklch(0.65 0.22 278 / 10%)" }}
                  />
                  <Avatar className="relative w-16 h-16 ring-2 ring-primary/40">
                    {callerAvatarUrl && (
                      <AvatarImage src={callerAvatarUrl} alt={incomingName} />
                    )}
                    <AvatarFallback
                      className="text-base font-bold"
                      style={{
                        background:
                          "linear-gradient(135deg, oklch(0.65 0.22 278 / 40%), oklch(0.55 0.25 295 / 40%))",
                        color: "oklch(0.80 0.18 278)",
                      }}
                    >
                      {initials(incomingName)}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Caller info */}
                <div className="text-center space-y-0.5">
                  <p className="text-sm font-semibold">{incomingName}</p>
                  <div className="flex items-center justify-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ background: "oklch(0.68 0.18 148)" }}
                    />
                    <p className="text-xs text-muted-foreground">Incoming voice call</p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-center gap-6 mt-1">
                  {/* Decline */}
                  <div className="flex flex-col items-center gap-1.5">
                    <button
                      onClick={onDecline}
                      className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                      style={{ background: "oklch(0.58 0.19 24 / 20%)", border: "1px solid oklch(0.58 0.19 24 / 40%)" }}
                    >
                      <PhoneMissed
                        className="w-6 h-6"
                        style={{ color: "oklch(0.72 0.20 24)" }}
                      />
                    </button>
                    <span className="text-[10px] text-muted-foreground">Decline</span>
                  </div>

                  {/* Accept */}
                  <div className="flex flex-col items-center gap-1.5">
                    <button
                      onClick={onAccept}
                      className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                      style={{
                        background: "linear-gradient(135deg, oklch(0.62 0.20 148), oklch(0.55 0.22 160))",
                        boxShadow: "0 4px 16px oklch(0.62 0.20 148 / 35%)",
                      }}
                    >
                      <Phone className="w-6 h-6 text-white" />
                    </button>
                    <span className="text-[10px] text-muted-foreground">Accept</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Active call floating card ────────────────────── */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            key="active-call"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "fixed z-150 bottom-4 right-4 md:bottom-6 md:right-6",
              "w-65 rounded-2xl border border-white/12 bg-card shadow-2xl overflow-hidden",
              className
            )}
          >
            {/* Thin accent line at top */}
            <div
              className="h-0.5 w-full"
              style={{
                background:
                  phase === "in_call"
                    ? "linear-gradient(90deg, oklch(0.62 0.20 148), oklch(0.55 0.22 160))"
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
                      background:
                        "linear-gradient(135deg, oklch(0.65 0.22 278 / 40%), oklch(0.55 0.25 295 / 40%))",
                      color: "oklch(0.80 0.18 278)",
                    }}
                  >
                    {initials(activeName)}
                  </AvatarFallback>
                </Avatar>
                {/* Status indicator */}
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2",
                    "border-card",
                    phase === "in_call" ? "animate-none" : "animate-pulse"
                  )}
                  style={{
                    background:
                      phase === "in_call"
                        ? "oklch(0.62 0.20 148)"
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
                        ? "oklch(0.62 0.20 148)"
                        : "oklch(0.65 0.22 278 / 80%)",
                  }}
                >
                  {phase === "in_call" ? timer : phaseLabel(phase)}
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Mute toggle */}
                <button
                  onClick={onToggleMute}
                  title={isMuted ? "Unmute" : "Mute"}
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                    isMuted
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
                      : "bg-white/8 text-muted-foreground border border-white/10 hover:bg-white/12 hover:text-foreground"
                  )}
                >
                  {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>

                {/* End call */}
                <button
                  onClick={onHangUp}
                  title="End call"
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: "oklch(0.58 0.19 24 / 20%)",
                    border: "1px solid oklch(0.58 0.19 24 / 40%)",
                    color: "oklch(0.72 0.20 24)",
                  }}
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="px-3 pb-2">
                <p className="text-[10px] text-destructive bg-destructive/10 rounded-lg px-2 py-1.5 leading-tight">
                  {error}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Ended / failed toast ────────────────────────── */}
      <AnimatePresence>
        {(phase === "ended" || phase === "failed") && (
          <motion.div
            key="call-toast"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="fixed z-150 bottom-4 right-4 md:bottom-6 md:right-6"
          >
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-white/10 bg-card shadow-lg">
              <PhoneOff
                className="w-3.5 h-3.5 shrink-0"
                style={{ color: phase === "failed" ? "oklch(0.72 0.20 24)" : "oklch(0.55 0 0)" }}
              />
              <span className="text-xs text-muted-foreground">
                {phase === "failed" ? (error ?? "Call failed") : "Call ended"}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
