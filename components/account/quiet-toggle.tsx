"use client";

import { useState, useTransition } from "react";
import { setQuietMode } from "@/lib/account/actions";
import { cn } from "@/lib/utils";

export function QuietToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [, start] = useTransition();
  function toggle() {
    const next = !on;
    setOn(next);
    start(() => setQuietMode(next).then(() => {}));
  }
  return (
    <button
      onClick={toggle}
      role="switch"
      aria-checked={on}
      className="flex items-center gap-3 text-sm text-bone-64"
    >
      <span className={cn("relative h-5 w-9 rounded-full transition-colors duration-150", on ? "bg-lime" : "bg-bone-16")}>
        <span className={cn("absolute top-0.5 size-4 rounded-full bg-ink transition-transform duration-150", on ? "translate-x-4" : "translate-x-0.5")} />
      </span>
      quiet mode {on ? "on" : "off"}
    </button>
  );
}
