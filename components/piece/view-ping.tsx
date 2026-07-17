"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/** Record a view once when a piece page mounts (deduped + owner-excluded server-side). */
export function ViewPing({ pieceId }: { pieceId: string }) {
  useEffect(() => {
    createClient()
      .rpc("record_engagement", { p_id: pieceId, p_kind: "view" })
      .then(() => {});
  }, [pieceId]);
  return null;
}
