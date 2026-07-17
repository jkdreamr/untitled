import "server-only";

/**
 * Server-only environment. This module MUST NEVER be imported from a client
 * component — `server-only` makes such an import a build error. Every key here
 * is optional: the platform runs with only the two public Supabase vars set,
 * and each feature degrades gracefully when its key is absent.
 */
export const SERVER_ENV = {
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",

  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "",
  GEMINI_EMBED_MODEL: process.env.GEMINI_EMBED_MODEL ?? "gemini-embedding-2",
  GEMINI_EMBED_DIM: Number(process.env.GEMINI_EMBED_DIM ?? "1536"),

  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
  ANTHROPIC_VISION_MODEL: process.env.ANTHROPIC_VISION_MODEL ?? "claude-sonnet-4-6",

  GROQ_API_KEY: process.env.GROQ_API_KEY ?? "",
  GROQ_WHISPER_MODEL: process.env.GROQ_WHISPER_MODEL ?? "whisper-large-v3-turbo",

  MUX_TOKEN_ID: process.env.MUX_TOKEN_ID ?? "",
  MUX_TOKEN_SECRET: process.env.MUX_TOKEN_SECRET ?? "",
  MUX_WEBHOOK_SECRET: process.env.MUX_WEBHOOK_SECRET ?? "",

  ENABLE_SCOUT: process.env.ENABLE_SCOUT === "true" || process.env.ENABLE_SCOUT === "1",
} as const;

/** Capability flags derived from which server keys are present. */
export const FEATURES = {
  /** Video posting requires a Mux token pair. */
  video: Boolean(SERVER_ENV.MUX_TOKEN_ID && SERVER_ENV.MUX_TOKEN_SECRET),
  /** Mux webhook signature verification requires the signing secret. */
  muxWebhook: Boolean(SERVER_ENV.MUX_WEBHOOK_SECRET),
  /** Unified multimodal embeddings (Layer A). */
  geminiEmbeddings: Boolean(SERVER_ENV.GEMINI_API_KEY),
  /** Vision descriptions for images (enrichment). */
  visionEnrichment: Boolean(SERVER_ENV.ANTHROPIC_API_KEY),
  /** Whisper transcription for sung/rapped audio (enrichment). */
  transcription: Boolean(SERVER_ENV.GROQ_API_KEY),
  /** Service-role operations (enrichment worker, hard deletes, admin). */
  serviceRole: Boolean(SERVER_ENV.SUPABASE_SERVICE_ROLE_KEY),
  /** Scout mode teaser + waitlist. */
  scout: SERVER_ENV.ENABLE_SCOUT,
} as const;

export function requireServiceRole(): string {
  if (!SERVER_ENV.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for this operation but is not set.",
    );
  }
  return SERVER_ENV.SUPABASE_SERVICE_ROLE_KEY;
}
