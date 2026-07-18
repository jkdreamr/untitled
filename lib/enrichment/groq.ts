import "server-only";

import { SERVER_ENV } from "@/lib/env.server";

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface Transcription {
  /** Full transcript text. */
  text: string;
  /** Time-synced segments (empty if the model returned none). */
  segments: TranscriptSegment[];
}

/**
 * Transcribe sung/rapped vocals so lyrics become searchable and syncable
 * ("covers of Yellow" works, and the words scroll with the take). Groq Whisper,
 * verbose_json for segment timings. Returns null on any failure — the piece
 * stays FTS-searchable regardless.
 */
export async function transcribeAudio(bytes: Uint8Array, filename: string): Promise<Transcription | null> {
  if (!SERVER_ENV.GROQ_API_KEY) return null;
  try {
    const form = new FormData();
    form.append("file", new Blob([bytes as BlobPart]), filename);
    form.append("model", SERVER_ENV.GROQ_WHISPER_MODEL);
    form.append("response_format", "verbose_json");
    form.append("temperature", "0");

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { authorization: `Bearer ${SERVER_ENV.GROQ_API_KEY}` },
      body: form,
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      text?: string;
      segments?: Array<{ start?: number; end?: number; text?: string }>;
    };

    const text = (json.text ?? "").trim();
    if (text.length === 0) return null;

    const segments: TranscriptSegment[] = (json.segments ?? [])
      .filter((s) => typeof s.text === "string" && s.text.trim().length > 0)
      .map((s) => ({
        start: Number(s.start ?? 0),
        end: Number(s.end ?? 0),
        text: String(s.text).trim(),
      }))
      .slice(0, 400);

    return { text: text.slice(0, 8000), segments };
  } catch {
    return null;
  }
}
