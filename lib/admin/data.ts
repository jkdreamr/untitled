import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ReportReason, ReportTarget } from "@/lib/types";

export interface QueuedReport {
  id: string;
  target_type: ReportTarget;
  target_id: string;
  reason: ReportReason;
  detail: string | null;
  status: string;
  created_at: string;
  target: {
    label: string;
    handle?: string;
    pieceStatus?: string;
    suspended?: boolean;
    href?: string;
  } | null;
}

/** Admin report queue with batched target previews (RLS gates to admins). */
export async function getReportQueue(): Promise<QueuedReport[]> {
  const supabase = await createClient();
  const { data: reports } = await supabase
    .from("reports")
    .select("id,target_type,target_id,reason,detail,status,created_at")
    .in("status", ["open", "reviewing"])
    .order("created_at", { ascending: false })
    .limit(60);
  if (!reports || reports.length === 0) return [];

  const pieceIds = reports.filter((r) => r.target_type === "piece").map((r) => r.target_id);
  const commentIds = reports.filter((r) => r.target_type === "comment").map((r) => r.target_id);
  const profileIds = reports.filter((r) => r.target_type === "profile").map((r) => r.target_id);

  const [pieces, comments, profiles] = await Promise.all([
    pieceIds.length
      ? supabase.from("pieces").select("id,title,sequence_no,medium,status, artist:profiles!pieces_artist_id_fkey(handle)").in("id", pieceIds)
      : Promise.resolve({ data: [] as unknown[] }),
    commentIds.length
      ? supabase.from("comments").select("id,body,piece_id,status, author:profiles!comments_user_id_fkey(handle)").in("id", commentIds)
      : Promise.resolve({ data: [] as unknown[] }),
    profileIds.length
      ? supabase.from("profiles").select("id,handle,display_name,suspended").in("id", profileIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const pieceMap = new Map((pieces.data as Record<string, unknown>[]).map((p) => [p.id as string, p]));
  const commentMap = new Map((comments.data as Record<string, unknown>[]).map((c) => [c.id as string, c]));
  const profileMap = new Map((profiles.data as Record<string, unknown>[]).map((p) => [p.id as string, p]));

  return reports.map((r) => {
    let target: QueuedReport["target"] = null;
    if (r.target_type === "piece") {
      const p = pieceMap.get(r.target_id);
      if (p) {
        const artist = p.artist as { handle?: string } | undefined;
        target = {
          label: (p.title as string) || `untitled no. ${p.sequence_no}`,
          handle: artist?.handle,
          pieceStatus: p.status as string,
          href: `/piece/${r.target_id}`,
        };
      }
    } else if (r.target_type === "comment") {
      const c = commentMap.get(r.target_id);
      if (c) {
        const author = c.author as { handle?: string } | undefined;
        target = { label: String(c.body).slice(0, 120), handle: author?.handle, pieceStatus: c.status as string, href: `/piece/${c.piece_id}` };
      }
    } else {
      const p = profileMap.get(r.target_id);
      if (p) target = { label: p.display_name as string, handle: p.handle as string, suspended: p.suspended as boolean, href: `/${p.handle}` };
    }
    return { ...r, target } as QueuedReport;
  });
}
