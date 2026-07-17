import { NextResponse } from "next/server";
import { drainEnrichment } from "@/lib/enrichment/worker";
import { SERVER_ENV } from "@/lib/env.server";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Drain the enrichment queue. Protected by CRON_SECRET (Vercel Cron or a
 * scheduler sends `Authorization: Bearer <CRON_SECRET>`). No-op without the
 * service role — the piece stays searchable via FTS regardless.
 */
async function handle(request: Request) {
  if (!SERVER_ENV.CRON_SECRET) {
    return NextResponse.json({ error: "enrichment runner not configured" }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${SERVER_ENV.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await drainEnrichment(10);
  return NextResponse.json(result);
}

export const GET = handle;
export const POST = handle;
