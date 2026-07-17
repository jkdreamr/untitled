import "server-only";

import { SERVER_ENV, FEATURES } from "@/lib/env.server";
import { PUBLIC_ENV } from "@/lib/env";
import { geminiEmbed } from "@/lib/embeddings/gemini";

/**
 * Embeddings provider interface. Model + dimensions are configurable via env.
 * One shared vector space when Gemini is present (true cross-media retrieval);
 * gte-small (384) as a text-only fallback; null when neither is available.
 */
export interface QueryEmbedding {
  model: string;
  dim: number;
  /** pgvector text literal, e.g. "[0.12,-0.03,...]" — passed straight to the RPC. */
  literal: string;
}

export type EmbedInput =
  | { type: "text"; text: string }
  | { type: "image"; bytes: Uint8Array; mime: string }
  | { type: "audio"; bytes: Uint8Array; mime: string };

function toLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}

/** Embed a search query in the same space as the indexed corpus. */
export async function embedQuery(text: string): Promise<QueryEmbedding | null> {
  const q = text.trim();
  if (!q) return null;

  if (FEATURES.geminiEmbeddings) {
    try {
      const vec = await geminiEmbed([{ type: "text", text: q }], "query");
      if (vec[0]) return { model: SERVER_ENV.GEMINI_EMBED_MODEL, dim: vec[0].length, literal: toLiteral(vec[0]) };
    } catch {
      /* fall through */
    }
  }

  // gte-small (384) fallback via the Supabase Edge Function (matches the index).
  const small = await gteSmallQuery(q);
  if (small) return { model: "gte-small", dim: 384, literal: toLiteral(small) };

  return null; // -> FTS only
}

/**
 * Embed post inputs for indexing (used by the enrichment worker). Returns the
 * unified multimodal vector when Gemini is configured; null otherwise (the
 * worker then relies on gte-small text embedding + FTS).
 */
export async function embedForIndex(
  inputs: EmbedInput[],
): Promise<{ model: string; dim: number; literal: string } | null> {
  if (!FEATURES.geminiEmbeddings) return null;
  try {
    const vecs = await geminiEmbed(inputs, "document");
    if (vecs[0]) return { model: SERVER_ENV.GEMINI_EMBED_MODEL, dim: vecs[0].length, literal: toLiteral(vecs[0]) };
  } catch {
    /* graceful */
  }
  return null;
}

/** Best-effort gte-small query embedding via the deployed Edge Function. */
async function gteSmallQuery(text: string): Promise<number[] | null> {
  if (!PUBLIC_ENV.SUPABASE_URL || !PUBLIC_ENV.SUPABASE_ANON_KEY) return null;
  try {
    const res = await fetch(`${PUBLIC_ENV.SUPABASE_URL}/functions/v1/embed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PUBLIC_ENV.SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ input: text }),
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { embedding?: number[] };
    return Array.isArray(json.embedding) && json.embedding.length === 384 ? json.embedding : null;
  } catch {
    return null;
  }
}
