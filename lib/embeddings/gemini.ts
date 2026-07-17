import "server-only";

import { SERVER_ENV } from "@/lib/env.server";
import type { EmbedInput } from "@/lib/embeddings";

const BASE = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Gemini Embedding 2 — one shared space for text, images, and audio.
 * Media parts are sent inline (base64). Returns one vector per input.
 * Configurable via GEMINI_EMBED_MODEL / GEMINI_EMBED_DIM.
 */
export async function geminiEmbed(
  inputs: EmbedInput[],
  taskType: "query" | "document",
): Promise<number[][]> {
  const model = SERVER_ENV.GEMINI_EMBED_MODEL;
  const dim = SERVER_ENV.GEMINI_EMBED_DIM;
  const out: number[][] = [];

  for (const input of inputs) {
    const parts =
      input.type === "text"
        ? [{ text: input.text }]
        : [{ inlineData: { mimeType: input.mime, data: toBase64(input.bytes) } }];

    const res = await fetch(
      `${BASE}/models/${encodeURIComponent(model)}:embedContent?key=${SERVER_ENV.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: { parts },
          taskType: taskType === "query" ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT",
          outputDimensionality: dim,
        }),
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!res.ok) throw new Error(`gemini embed ${res.status}`);
    const json = (await res.json()) as { embedding?: { values?: number[] } };
    const values = json.embedding?.values;
    if (!values) throw new Error("gemini embed: no values");
    out.push(values);
  }
  return out;
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}
