"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/data/profiles";

export async function deleteCollection(id: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const supabase = await createClient();
  await supabase.from("collections").delete().eq("id", id).eq("owner_id", user.id);
  redirect("/collections");
}

export async function removeFromCollection(collectionId: string, pieceId: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("collection_items")
    .delete()
    .eq("collection_id", collectionId)
    .eq("piece_id", pieceId);
  return { ok: !error };
}
