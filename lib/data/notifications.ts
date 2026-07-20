import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/data/profiles";

export interface AppNotification {
  id: number;
  kind: string;
  payload: { org?: string; body?: string; [k: string]: unknown };
  read_at: string | null;
  created_at: string;
}

/** The current user's notifications (RLS: recipient-only), newest first. */
export async function getNotifications(limit = 50): Promise<AppNotification[]> {
  const user = await getSessionUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, kind, payload, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as AppNotification[] | null) ?? [];
}

/** Unread count for the nav dot. Cached per request. */
export const getUnreadNotificationCount = cache(async (): Promise<number> => {
  const user = await getSessionUser();
  if (!user) return 0;
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  return count ?? 0;
});
