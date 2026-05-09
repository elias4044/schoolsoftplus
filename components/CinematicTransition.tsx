"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { peekTransitionPending, consumeTransitionPending } from "@/lib/page-transition";

const STRIP_COUNT = 7;
const EASE_IN:  [number, number, number, number] = [0.76, 0, 0.24, 1];
const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Zero-flash dashboard-side reveal.
 *
 * The lazy useState initializer reads sessionStorage synchronously on the
 * very first render, so the overlay is painted before any dashboard content
 * appears — eliminating the flash entirely.
 *
 * Sequence: covering (strips already there) → beat (logo breathes) →
 *           streak (light beam races left→right) → uncovering (strips peel away)
 */
export function CinematicTransition() {
  const [phase, setPhase] = useState<"hidden" | "covering" | "beat" | "streak" | "uncovering">(() => {
    // Lazy init: synchronous check so first paint is already covering
    if (typeof window === "undefined") return "hidden";
    if (window.innerWidth < 1024) return "hidden";
    return peekTransitionPending() ? "covering" : "hidden";
  });

  useEffect(() => {
    if (phase !== "covering") return;
    // Consume the flag now that we've confirmed we're covering
    consumeTransitionPending();

    // Beat pause → light streak → strips peel
    const t1 = setTimeout(() => setPhase("beat"),      120);
    const t2 = setTimeout(() => setPhase("streak"),    520);
    const t3 = setTimeout(() => setPhase("uncovering"), 760);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only run once on mount

  if (phase === "hidden") return null;

  // Strip colours: alternating near-black deep-indigo shades
  const stripBg = (i: number) =>
    i % 3 === 0
      ? "oklch(0.11 0.16 278)"
      : i % 3 === 1
      ? "oklch(0.09 0.13 295)"
      : "oklch(0.07 0.10 310)";

  return (
    <div className="fixed inset-0 z-9999 overflow-hidden pointer-events-none">

      {/* Light-streak: races left → right right before reveal */}
      {phase === "streak" && (
        <motion.div
          className="absolute top-0 bottom-0"
          style={{
            left: 0,
            width: "3px",
            background:
              "linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.95) 50%, transparent 100%)",
            filter: "blur(2px)",
            boxShadow: "0 0 22px 10px rgba(255,255,255,0.25)",
            zIndex: STRIP_COUNT + 3,
          }}
          initial={{ x: 0 }}
          animate={{ x: "100vw" }}
          transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}
        />
      )}

      {/* Horizontal strips — already covering on first paint */}
      {Array.from({ length: STRIP_COUNT }).map((_, i) => {
        const isLast   = i === STRIP_COUNT - 1;
        const peeling  = phase === "uncovering";
        return (
          <motion.div
            key={i}
            className="absolute left-0 right-0"
            style={{
              top:        `${(i / STRIP_COUNT) * 100}%`,
              height:     `${100 / STRIP_COUNT + 0.3}%`,
              background: stripBg(i),
              zIndex:     STRIP_COUNT - i,
            }}
            initial={{ x: 0 }}
            animate={peeling ? { x: "105%" } : { x: 0 }}
            transition={
              peeling
                ? {
                    duration: 0.82,
                    delay:    0.05 + i * 0.065,
                    ease:     EASE_OUT,
                  }
                : { duration: 0 }
            }
            onAnimationComplete={() => {
              if (peeling && isLast) setPhase("hidden");
            }}
          >
            {/* Trailing shimmer as strip sweeps away */}
            {peeling && (
              <div
                className="absolute right-0 top-0 bottom-0"
                style={{
                  width: "32px",
                  background:
                    "linear-gradient(to right, transparent, rgba(255,255,255,0.08) 60%, rgba(255,255,255,0.22))",
                }}
              />
            )}
          </motion.div>
        );
      })}

      {/* Brand mark: fades + scales in during beat, retreats before reveal */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center select-none"
        style={{ zIndex: STRIP_COUNT + 2 }}
        animate={
          phase === "uncovering" || phase === "streak"
            ? { opacity: 0, scale: 0.86, y: -10 }
            : phase === "beat"
            ? { opacity: 1, scale: 1,    y: 0 }
            : { opacity: 0, scale: 0.92, y: 0 }
        }
        transition={{ duration: 0.30, ease: EASE_OUT }}
      >
        <div className="flex flex-col items-center gap-4">
          {/* Logo */}
          <motion.div
            animate={phase === "beat" ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={{ duration: 0.40, ease: "easeInOut" }}
            style={{
              filter:
                "drop-shadow(0 0 24px oklch(0.65 0.22 278 / 0.65)) drop-shadow(0 4px 16px oklch(0 0 0 / 0.7))",
            }}
          >
            <Image
              src="/logo.png"
              alt="SchoolSoft+"
              width={52}
              height={52}
              priority
              style={{ imageRendering: "crisp-edges" }}
            />
          </motion.div>

          {/* Wordmark */}
          <motion.span
            className="text-[11px] tracking-[0.40em] uppercase font-medium"
            style={{ color: "rgba(255,255,255,0.22)" }}
            animate={phase === "beat" ? { opacity: [0.22, 0.50, 0.22] } : { opacity: 0.22 }}
            transition={{ duration: 0.40, ease: "easeInOut" }}
          >
            SchoolSoft+
          </motion.span>
        </div>
      </motion.div>
    </div>
  );
}
