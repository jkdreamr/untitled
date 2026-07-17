import "server-only";

import { SERVER_ENV } from "@/lib/env.server";

/**
 * Transcribe sung/rapped vocals so lyrics become searchable ("covers of Yellow"
 * works). Groq Whisper. Returns null on any failure.
 */
export async function transcribeAudio(bytes: Uint8Array, filename: string): Promise<string | null> {
  if (!SERVER_ENV.GROQ_API_KEY) return null;
  try {
    const form = new FormData();
    form.append("file", new Blob([bytes as BlobPart]), filename);
    form.append("model", SERVER_ENV.GROQ_WHISPER_MODEL);
    form.append("response_format", "text");
    form.append("temperature", "0");

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { authorization: `Bearer ${SERVER_ENV.GROQ_API_KEY}` },
      body: form,
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    return text.length > 0 ? text.slice(0, 8000) : null;
  } catch {
    return null;
  }
}
