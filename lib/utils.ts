import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names, de-duplicating conflicting Tailwind utilities. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a Date/ISO string as NOVUM metadata: lowercase month, e.g. "17 jul 2026". */
export function formatPieceDate(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const day = d.getDate();
  const month = d
    .toLocaleString("en-US", { month: "short", timeZone: "UTC" })
    .toLowerCase();
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

/** Relative time, terse and lowercase: "just now", "3h", "2d", or a date past a week. */
export function timeAgo(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 45) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return formatPieceDate(d);
}

/** Seconds → clock string, e.g. 5 → "0:05", 754 → "12:34". */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}

/** The canonical display title for a piece: its title, or "untitled no. {sequence}". */
export function pieceTitle(title: string | null, sequenceNo: number): string {
  const t = title?.trim();
  return t && t.length > 0 ? t : `untitled no. ${sequenceNo}`;
}

/** Compact count formatting: 1200 → "1.2k". Counts are shown, never fabricated. */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}m`;
}

/** Clamp a number into [min, max]. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
