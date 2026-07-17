"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/data/profiles";
import { consumeUserRateLimit } from "@/lib/rate-limit";

export interface CommentResult {
  ok: boolean;
  error?: string;
  comment?: { id: string; body: string; created_at: string };
}

export async function addComment(pieceId: string, bodyRaw: string): Promise<CommentResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "sign in to comment." };
  const body = z.string().trim().min(1).max(500).safeParse(bodyRaw);
  if (!body.success) return { ok: false, error: "comments are 1–500 characters." };

  if (!(await consumeUserRateLimit("comment", 60, 60 * 60)))
    return { ok: false, error: "slow down a moment." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .insert({ piece_id: pieceId, user_id: user.id, body: body.data })
    .select("id, body, created_at")
    .single();
  if (error) return { ok: false, error: "couldn't post that comment." };
  revalidatePath(`/piece/${pieceId}`);
  return { ok: true, comment: data };
}

export async function setCommentStatus(
  commentId: string,
  pieceId: string,
  status: "active" | "hidden" | "deleted",
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.from("comments").update({ status }).eq("id", commentId);
  revalidatePath(`/piece/${pieceId}`);
  return { ok: !error };
}

export async function setCommentsClosed(pieceId: string, closed: boolean): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.from("pieces").update({ comments_closed: closed }).eq("id", pieceId);
  revalidatePath(`/piece/${pieceId}`);
  return { ok: !error };
}

const ReportInput = z.object({
  target_type: z.enum(["piece", "comment", "profile"]),
  target_id: z.string().uuid(),
  reason: z.enum(["ai_generated", "stolen", "harassment", "explicit", "other"]),
  detail: z.string().trim().max(1000).optional(),
});

export async function createReport(input: z.infer<typeof ReportInput>): Promise<{ ok: boolean; error?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "sign in to report." };
  const parsed = ReportInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "pick a reason." };
  if (!(await consumeUserRateLimit("report", 20, 24 * 60 * 60)))
    return { ok: false, error: "you've filed a lot of reports today." };

  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: parsed.data.target_type,
    target_id: parsed.data.target_id,
    reason: parsed.data.reason,
    detail: parsed.data.detail ?? null,
  });
  if (error) return { ok: false, error: "couldn't file that report." };
  return { ok: true };
}
