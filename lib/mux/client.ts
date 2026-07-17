import "server-only";

import Mux from "@mux/mux-node";
import { SERVER_ENV, FEATURES } from "@/lib/env.server";

export { muxThumbnail, muxAnimated } from "@/lib/mux/thumb";

let client: Mux | null = null;

/** Lazily construct the Mux node client; null when tokens are absent. */
export function getMux(): Mux | null {
  if (!FEATURES.video) return null;
  if (!client) {
    client = new Mux({
      tokenId: SERVER_ENV.MUX_TOKEN_ID,
      tokenSecret: SERVER_ENV.MUX_TOKEN_SECRET,
    });
  }
  return client;
}

/**
 * Verify + parse a Mux webhook. Throws when the signature is invalid or the
 * signing secret is missing. Returns the parsed event.
 */
export function verifyMuxWebhook(rawBody: string, headers: Record<string, string>) {
  const mux = getMux();
  if (!mux || !SERVER_ENV.MUX_WEBHOOK_SECRET) {
    throw new Error("mux webhook not configured");
  }
  // Throws if the signature does not verify.
  return mux.webhooks.unwrap(rawBody, headers, SERVER_ENV.MUX_WEBHOOK_SECRET);
}
