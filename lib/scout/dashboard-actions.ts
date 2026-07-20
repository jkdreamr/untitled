"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profiles";
import { isApprovedScout } from "@/lib/data/scout";
import type { Json } from "@/lib/supabase/types";

export interface ScoutActionState {
  ok: boolean;
  error?: string;
}

async function ensureScout(): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const profile = await getCurrentProfile();
  if (!profile || !(await isApprovedScout())) return { ok: false, error: "scout access required." };
  return { ok: true, id: profile.id };
}

export async function saveScoutSearch(name: string, params: unknown): Promise<ScoutActionState> {
  const gate = await ensureScout();
  if (!gate.ok) return gate;
  const clean = name.trim().slice(0, 80);
  if (!clean) return { ok: false, error: "name the search." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("scout_saved_searches")
    .insert({ scout_id: gate.id, name: clean, params: params as Json });
  if (error) return { ok: false, error: "couldn't save." };
  revalidatePath("/scout/search");
  return { ok: true };
}

export async function deleteSavedSearch(id: number): Promise<ScoutActionState> {
  const gate = await ensureScout();
  if (!gate.ok) return gate;
  const supabase = await createClient();
  const { error } = await supabase.from("scout_saved_searches").delete().eq("id", id);
  if (error) return { ok: false, error: "couldn't remove." };
  revalidatePath("/scout/search");
  return { ok: true };
}

export async function createScoutList(name: string): Promise<ScoutActionState> {
  const gate = await ensureScout();
  if (!gate.ok) return gate;
  const clean = name.trim().slice(0, 80);
  if (!clean) return { ok: false, error: "name the list." };
  const supabase = await createClient();
  const { error } = await supabase.from("scout_lists").insert({ scout_id: gate.id, name: clean });
  if (error) return { ok: false, error: "couldn't create." };
  revalidatePath("/scout/lists");
  return { ok: true };
}

export async function createListAndAdd(name: string, artistId: string): Promise<ScoutActionState> {
  const gate = await ensureScout();
  if (!gate.ok) return gate;
  const clean = name.trim().slice(0, 80);
  if (!clean) return { ok: false, error: "name the list." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scout_lists")
    .insert({ scout_id: gate.id, name: clean })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "couldn't create." };
  const { error: e2 } = await supabase
    .from("scout_list_items")
    .insert({ list_id: (data as { id: number }).id, artist_id: artistId });
  if (e2) return { ok: false, error: "list made, but couldn't add." };
  revalidatePath("/scout/lists");
  return { ok: true };
}

export async function deleteScoutList(id: number): Promise<ScoutActionState> {
  const gate = await ensureScout();
  if (!gate.ok) return gate;
  const supabase = await createClient();
  const { error } = await supabase.from("scout_lists").delete().eq("id", id);
  if (error) return { ok: false, error: "couldn't delete." };
  revalidatePath("/scout/lists");
  return { ok: true };
}

export async function addToList(listId: number, artistId: string, note?: string): Promise<ScoutActionState> {
  const gate = await ensureScout();
  if (!gate.ok) return gate;
  const supabase = await createClient();
  const { error } = await supabase
    .from("scout_list_items")
    .upsert({ list_id: listId, artist_id: artistId, note: note?.trim().slice(0, 500) || null });
  if (error) return { ok: false, error: "couldn't add to list." };
  revalidatePath("/scout/lists");
  return { ok: true };
}

export async function updateListNote(listId: number, artistId: string, note: string): Promise<ScoutActionState> {
  const gate = await ensureScout();
  if (!gate.ok) return gate;
  const supabase = await createClient();
  const { error } = await supabase
    .from("scout_list_items")
    .update({ note: note.trim().slice(0, 500) || null })
    .eq("list_id", listId)
    .eq("artist_id", artistId);
  if (error) return { ok: false, error: "couldn't save the note." };
  revalidatePath("/scout/lists");
  return { ok: true };
}

export async function removeFromList(listId: number, artistId: string): Promise<ScoutActionState> {
  const gate = await ensureScout();
  if (!gate.ok) return gate;
  const supabase = await createClient();
  const { error } = await supabase
    .from("scout_list_items")
    .delete()
    .eq("list_id", listId)
    .eq("artist_id", artistId);
  if (error) return { ok: false, error: "couldn't remove." };
  revalidatePath("/scout/lists");
  return { ok: true };
}

/** Send an in-app contact request. Server RPC enforces open_to + 10/day limit. */
export async function sendScoutContact(targetId: string, body: string): Promise<ScoutActionState> {
  const gate = await ensureScout();
  if (!gate.ok) return gate;
  const clean = body.trim();
  if (!clean) return { ok: false, error: "write a message." };
  if (clean.length > 500) return { ok: false, error: "keep it under 500 characters." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_scout_contact", { p_target_id: targetId, p_body: clean });
  if (error) {
    const msg = /not reachable|open to/i.test(error.message)
      ? "this artist isn't open to contact right now."
      : /limit/i.test(error.message)
        ? "you've hit today's contact limit."
        : "couldn't send.";
    return { ok: false, error: msg };
  }
  return { ok: true };
}
