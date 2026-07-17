import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { describeImage } from "@/lib/enrichment/anthropic";
import { transcribeAudio } from "@/lib/enrichment/groq";
import { embedForIndex, type EmbedInput } from "@/lib/embeddings";
import type { Database, TablesUpdate } from "@/lib/supabase/types";

type Admin = SupabaseClient<Database>;
interface Job { id: string; piece_id: string; stage: "embed" | "describe" | "transcribe" | "index"; attempts: number }

/**
 * Drain enrichment jobs. Everything degrades: missing keys → the stage is a
 * no-op and the piece stays searchable by FTS. Requires the service role.
 */
export async function drainEnrichment(limit = 10): Promise<{ processed: number; skipped?: string }> {
  const admin = createAdminClient();
  if (!admin) return { processed: 0, skipped: "no service role" };

  const { data: jobs } = await admin
    .from("enrichment_jobs")
    .select("id,piece_id,stage,attempts")
    .in("status", ["pending", "error"])
    .lte("run_after", new Date().toISOString())
    .order("run_after", { ascending: true })
    .limit(limit);
  if (!jobs || jobs.length === 0) return { processed: 0 };

  await admin.from("enrichment_jobs").update({ status: "processing" }).in("id", jobs.map((j) => j.id));

  let processed = 0;
  for (const job of jobs as Job[]) {
    try {
      const status = await runJob(admin, job);
      await admin.from("enrichment_jobs").update({ status }).eq("id", job.id);
      processed++;
    } catch (e) {
      const attempts = (job.attempts ?? 0) + 1;
      await admin
        .from("enrichment_jobs")
        .update({
          status: attempts >= 3 ? "error" : "pending",
          attempts,
          last_error: String(e).slice(0, 500),
          run_after: new Date(Date.now() + attempts * 60_000).toISOString(),
        })
        .eq("id", job.id);
    }
  }
  return { processed };
}

async function runJob(admin: Admin, job: Job): Promise<"done" | "skipped"> {
  const { data: piece } = await admin
    .from("pieces")
    .select("id,medium,title,caption,body,tags,mux_playback_id")
    .eq("id", job.piece_id)
    .maybeSingle();
  if (!piece) return "skipped";

  const { data: media } = await admin.from("piece_media").select("kind,storage_path").eq("piece_id", job.piece_id);
  const image = media?.find((m) => m.kind === "image" && m.storage_path);
  const audio = media?.find((m) => m.kind === "audio" && m.storage_path);

  if (job.stage === "describe") {
    if (!image?.storage_path) return "skipped";
    const bytes = await download(admin, image.storage_path);
    if (!bytes) return "skipped";
    const desc = await describeImage(bytes, "image/webp");
    if (desc) {
      await admin.from("piece_search").update({ description: desc }).eq("piece_id", job.piece_id);
      await rebuildDoc(admin, job.piece_id);
    }
    return "done";
  }

  if (job.stage === "transcribe") {
    if (!audio?.storage_path) return "skipped";
    const bytes = await download(admin, audio.storage_path);
    if (!bytes) return "skipped";
    const transcript = await transcribeAudio(bytes, audio.storage_path.split("/").pop() ?? "audio");
    if (transcript) {
      await admin.from("piece_search").update({ transcript }).eq("piece_id", job.piece_id);
      await rebuildDoc(admin, job.piece_id);
    }
    return "done";
  }

  if (job.stage === "embed") {
    const inputs: EmbedInput[] = [];
    if (piece.medium === "image" && image?.storage_path) {
      const bytes = await download(admin, image.storage_path);
      if (bytes) inputs.push({ type: "image", bytes, mime: "image/webp" });
    } else if (piece.medium === "sound" && audio?.storage_path) {
      const bytes = await download(admin, audio.storage_path);
      if (bytes) inputs.push({ type: "audio", bytes, mime: "audio/mpeg" });
    }
    if (inputs.length === 0) {
      const { data: ps } = await admin.from("piece_search").select("doc").eq("piece_id", job.piece_id).maybeSingle();
      if (ps?.doc) inputs.push({ type: "text", text: ps.doc });
    }
    if (inputs.length === 0) return "skipped";
    const vec = await embedForIndex(inputs);
    if (vec) {
      const patch: TablesUpdate<"piece_search"> = { embed_model: vec.model };
      if (vec.dim === 384) patch.embedding_small = vec.literal;
      else patch.embedding = vec.literal;
      await admin.from("piece_search").update(patch).eq("piece_id", job.piece_id);
    }
    return "done";
  }

  // index: recompute doc + mark ready
  await rebuildDoc(admin, job.piece_id);
  await admin.from("piece_search").update({ status: "ready" }).eq("piece_id", job.piece_id);
  return "done";
}

async function download(admin: Admin, path: string): Promise<Uint8Array | null> {
  const { data } = await admin.storage.from("media").download(path);
  if (!data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

async function rebuildDoc(admin: Admin, pieceId: string): Promise<void> {
  const [{ data: piece }, { data: ps }] = await Promise.all([
    admin.from("pieces").select("title,caption,body,tags").eq("id", pieceId).maybeSingle(),
    admin.from("piece_search").select("description,transcript").eq("piece_id", pieceId).maybeSingle(),
  ]);
  if (!piece) return;
  const doc = [
    piece.title, piece.caption, piece.body,
    (piece.tags ?? []).join(" "),
    ps?.description, ps?.transcript,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
  await admin.from("piece_search").update({ doc: doc || null }).eq("piece_id", pieceId);
}
