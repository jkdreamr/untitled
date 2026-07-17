import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Sliding-window rate limit for the authenticated caller (enforced in Postgres).
 * Returns true when the action is allowed (and records it).
 */
export async function consumeUserRateLimit(
  action: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("consume_rate_limit", {
    p_action: action,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) return false;
  return data === true;
}

/**
 * Sliding-window rate limit for anonymous flows (auth, scout), keyed by a
 * subject you provide (e.g. a hashed IP). Uses the service role to read/write
 * rate_limits; when no service role is configured it degrades to allow.
 */
export async function consumeAnonRateLimit(
  subject: string,
  action: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return true; // cannot enforce without service role — fail open, gracefully

  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const { count } = await admin
    .from("rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("subject", subject)
    .eq("action", action)
    .gt("created_at", since);

  if ((count ?? 0) >= max) return false;
  await admin.from("rate_limits").insert({ subject, action });
  return true;
}

/** Best-effort client IP from proxy headers, hashed to avoid storing raw IPs. */
export async function subjectFromRequest(headersList: Headers, salt = "untitled"): Promise<string> {
  const fwd = headersList.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim() || headersList.get("x-real-ip") || "unknown";
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest).slice(0, 12))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
