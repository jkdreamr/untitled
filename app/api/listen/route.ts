import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/data/profiles";
import { consumeUserRateLimit, consumeAnonRateLimit, subjectFromRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUARTILES = new Set([25, 50, 75, 100]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Ping {
  piece_id: string;
  quartile: number;
}

/**
 * Listen-telemetry sink. The player batches 25/50/75/100% quartile crossings
 * and flushes them here via navigator.sendBeacon on pagehide/visibilitychange.
 * Consumer-invisible: rows land in listen_events through record_listen_progress
 * (owner-excluded + deduped). Rate-limited, and it degrades to a silent accept
 * — telemetry must never surface an error to the listener.
 */
export async function POST(request: Request) {
  let body: { events?: Ping[] } | null = null;
  try {
    body = (await request.json()) as { events?: Ping[] };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const events = Array.isArray(body?.events) ? body.events.slice(0, 20) : [];
  const clean = events.filter(
    (e) => e && typeof e.piece_id === "string" && UUID_RE.test(e.piece_id) && QUARTILES.has(e.quartile),
  );
  if (clean.length === 0) return NextResponse.json({ ok: true });

  // rate limit: 120 pings/min (user, else hashed IP). Silent-accept on limit.
  const user = await getSessionUser();
  const allowed = user
    ? await consumeUserRateLimit("listen_ping", 120, 60)
    : await consumeAnonRateLimit(await subjectFromRequest(await headers()), "listen_ping", 120, 60);
  if (!allowed) return NextResponse.json({ ok: true });

  const supabase = await createClient();
  await Promise.all(
    clean.map((e) => supabase.rpc("record_listen_progress", { p_id: e.piece_id, p_quartile: e.quartile })),
  );
  return NextResponse.json({ ok: true });
}
