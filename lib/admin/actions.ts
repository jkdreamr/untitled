"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profiles";
import type { PieceStatus, ReportReason } from "@/lib/types";

async function assertAdmin() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") throw new Error("forbidden");
}

export async function resolveReport(id: string, status: "resolved" | "dismissed" | "reviewing"): Promise<{ ok: boolean }> {
  await assertAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_report", { p_report_id: id, p_status: status });
  revalidatePath("/admin");
  return { ok: !error };
}

export async function setPieceStatusAdmin(pieceId: string, status: PieceStatus): Promise<{ ok: boolean }> {
  await assertAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("pieces").update({ status }).eq("id", pieceId);
  revalidatePath("/admin");
  return { ok: !error };
}

export async function setCommentStatusAdmin(commentId: string, status: "active" | "hidden" | "deleted"): Promise<{ ok: boolean }> {
  await assertAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("comments").update({ status }).eq("id", commentId);
  revalidatePath("/admin");
  return { ok: !error };
}

export async function suspendUser(uid: string, suspended: boolean): Promise<{ ok: boolean }> {
  await assertAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("suspend_user", { p_uid: uid, p_suspended: suspended });
  revalidatePath("/admin");
  return { ok: !error };
}

export type { ReportReason };
