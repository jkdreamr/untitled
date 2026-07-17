import "server-only";

import { SERVER_ENV } from "@/lib/env.server";

/**
 * Dense factual image description for search recall + alt text (never shown as
 * the artist's writing). Anthropic vision. Returns null on any failure.
 */
export async function describeImage(bytes: Uint8Array, mime: string): Promise<string | null> {
  if (!SERVER_ENV.ANTHROPIC_API_KEY) return null;
  const mediaType = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mime) ? mime : "image/webp";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": SERVER_ENV.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: SERVER_ENV.ANTHROPIC_VISION_MODEL,
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: Buffer.from(bytes).toString("base64") } },
              {
                type: "text",
                text:
                  "Describe this artwork factually for a search index: medium, subject, technique, composition, mood, and color palette. " +
                  "Two or three sentences. No preamble, no opinions, no 'this image shows'.",
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { content?: { type: string; text?: string }[] };
    return json.content?.find((c) => c.type === "text")?.text?.trim() ?? null;
  } catch {
    return null;
  }
}
