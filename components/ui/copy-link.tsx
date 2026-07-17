"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** Copy a piece's permalink. No download of others' work — links only. */
export function CopyLink({ path, className }: { path: string; className?: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      const url = `${window.location.origin}${path}`;
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch {
      /* ignore */
    }
  }
  return (
    <button
      onClick={copy}
      className={cn("meta text-bone-46 transition-colors hover:text-bone", className)}
      aria-label="copy link"
    >
      {done ? "copied" : "share"}
    </button>
  );
}
