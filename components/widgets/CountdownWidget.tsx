"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, Maximize2, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { WidgetSize } from "@/lib/widgets/types";
import Link from "next/link";

/* ---------------------------------------------------------- */
/*  Types (minimal mirror)                                      */
/* ---------------------------------------------------------- */

type CountdownTheme = "violet" | "rose" | "amber" | "emerald" | "sky" | "slate";

interface Countdown {
  id: string;
  title: string;
  description: string;
  targetDate: number;
  theme: CountdownTheme;
  emoji: string;
  pinned: boolean;
  archived: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

/* ---------------------------------------------------------- */
/*  Helpers                                                     */
/* ---------------------------------------------------------- */

const THEME_COLORS: Record<CountdownTheme, string> = {
  violet:  "oklch(0.65 0.22 278)",
  rose:    "oklch(0.68 0.22 10)",
  amber:   "oklch(0.78 0.17 75)",
  emerald: "oklch(0.70 0.18 148)",
  sky:     "oklch(0.72 0.17 220)",
  slate:   "oklch(0.60 0.04 255)",
};

function calcTimeLeft(target: number): TimeLeft {
  const total = target - Date.now();
  const abs   = Math.max(0, total);
  return {
    total,
    days:    Math.floor(abs / 86_400_000),
    hours:   Math.floor((abs % 86_400_000) / 3_600_000),
    minutes: Math.floor((abs % 3_600_000)  / 60_000),
    seconds: Math.floor((abs % 60_000)     / 1_000),
  };
}

function pad(n: number) { return String(n).padStart(2, "0"); }

/* ---------------------------------------------------------- */
/*  Widget                                                      */
/* ---------------------------------------------------------- */

interface Props { size: WidgetSize }

export default function CountdownWidget({ size }: Props) {
  const [countdowns, setCountdowns] = useState<Countdown[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tick, setTick]             = useState(0);

  useEffect(() => {
    apiFetch<{ countdowns: Countdown[] }>("/api/countdowns")
      .then(d => {
        const cs = Array.isArray(d.countdowns) ? d.countdowns : [];
        // Sort: pinned first, then soonest
        cs.sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return a.targetDate - b.targetDate;
        });
        setCountdowns(cs.filter(c => !c.archived));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Tick every second
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const isTiny = size === "1x1";
  const isWide = size.startsWith("4");
  const maxItems = isTiny ? 1 : isWide ? 4 : size === "2x2" ? 2 : 1;
  const visible  = countdowns.slice(0, maxItems);

  if (loading) {
    return (
      <div className="flex flex-col gap-2 h-full">
        {Array.from({ length: maxItems }).map((_, i) => (
          <div key={i} className="flex-1 rounded-xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (countdowns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
        <Timer className="w-7 h-7 text-muted-foreground/30" />
        <p className="text-xs text-muted-foreground">No countdowns</p>
        <Link
          href="/countdown"
          className="text-[10px] text-primary hover:underline flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add one
        </Link>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full gap-2", isWide ? "flex-row" : "flex-col")}>
      {visible.map(c => (
        <CountdownItem key={c.id + tick} countdown={c} compact={isTiny} flex={isWide} />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------- */
/*  Single countdown item                                       */
/* ---------------------------------------------------------- */

function CountdownItem({
  countdown,
  compact,
  flex,
}: {
  countdown: Countdown;
  compact: boolean;
  flex: boolean;
}) {
  const time   = calcTimeLeft(countdown.targetDate);
  const color  = THEME_COLORS[countdown.theme] ?? THEME_COLORS.violet;
  const past   = time.total <= 0;

  return (
    <div
      className={cn(
        "relative rounded-xl border border-white/8 overflow-hidden p-3 flex flex-col justify-between",
        flex ? "flex-1" : "w-full"
      )}
      style={{
        background: "oklch(0.10 0.01 260 / 70%)",
        boxShadow: `0 0 0 1px ${color}20`,
      }}
    >
      {/* Top accent */}
      <div
        className="absolute top-0 inset-x-0 h-0.5 opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className={cn("shrink-0", compact ? "text-lg" : "text-xl")}>{countdown.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate">{countdown.title}</p>
          {!compact && (
            <p className="text-[10px] text-muted-foreground truncate">
              {new Date(countdown.targetDate).toLocaleDateString(undefined, {
                month: "short", day: "numeric",
              })}
            </p>
          )}
        </div>
        <Link href="/countdown" className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
          <Maximize2 className="w-3 h-3" />
        </Link>
      </div>

      {/* Timer */}
      {past ? (
        <p className="text-center text-sm">🎉 Now!</p>
      ) : compact ? (
        <p className="text-sm font-bold tabular-nums text-center" style={{ color }}>
          {time.days > 0
            ? `${time.days}d ${pad(time.hours)}h`
            : `${pad(time.hours)}:${pad(time.minutes)}:${pad(time.seconds)}`}
        </p>
      ) : (
        <div className="flex gap-2 justify-center">
          {([
            ["d",  time.days],
            ["h",  time.hours],
            ["m",  time.minutes],
            ["s",  time.seconds],
          ] as [string, number][]).map(([label, val]) => (
            <div key={label} className="flex flex-col items-center">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={val}
                  initial={{ y: -6, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 6, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="text-base font-bold tabular-nums leading-none"
                  style={{ color }}
                >
                  {pad(val)}
                </motion.span>
              </AnimatePresence>
              <span className="text-[8px] uppercase tracking-wider text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
