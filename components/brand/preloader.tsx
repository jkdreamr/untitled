"use client";

import { useEffect, useRef, useState } from "react";

const FACES = [
  "var(--font-space-grotesk)",
  "var(--font-instrument-serif)",
  "var(--font-space-mono)",
  "var(--font-space-grotesk)",
];

/**
 * NOVUM preloader — the wordmark cycles through the three brand faces, then
 * lifts away. Runs once per session, under 1.2s, and is skipped entirely for
 * reduced-motion or repeat visits (no flash of overlay).
 */
export function Preloader() {
  const [phase, setPhase] = useState<"pending" | "run" | "leaving" | "done">("pending");
  const [face, setFace] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const seen = sessionStorage.getItem("novum_preloaded");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduce) {
      setPhase("done");
      sessionStorage.setItem("novum_preloaded", "1");
      return;
    }
    setPhase("run");
    // 4 faces × ~190ms ≈ 760ms cycle, then fade — comfortably under 1.2s.
    for (let i = 1; i < FACES.length; i++) {
      timers.current.push(setTimeout(() => setFace(i), i * 190));
    }
    timers.current.push(setTimeout(() => setPhase("leaving"), 900));
    timers.current.push(
      setTimeout(() => {
        setPhase("done");
        sessionStorage.setItem("novum_preloaded", "1");
      }, 1140),
    );
    return () => timers.current.forEach(clearTimeout);
  }, []);

  if (phase === "done" || phase === "pending") return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[200] grid place-items-center bg-ink transition-opacity duration-200 ease-out"
      style={{ opacity: phase === "leaving" ? 0 : 1 }}
    >
      <div className="flex items-baseline gap-2">
        <span
          className="text-2xl font-semibold tracking-[0.18em] text-bone"
          style={{ fontFamily: FACES[face] }}
        >
          UNTITLED
        </span>
        <span className="h-[3px] w-4 self-end bg-lime" />
      </div>
    </div>
  );
}
