import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { signOne } from "@/lib/data/cards";
import { getCurrentProfile } from "@/lib/data/profiles";
import type { TrackKind } from "@/lib/types";

export interface ScoutAccount {
  org_name: string;
  status: "pending" | "approved" | "revoked";
}

/** The current user's scout account row (RLS: self-only), or null. */
export const getScoutAccount = cache(async (): Promise<ScoutAccount | null> => {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("scout_accounts")
    .select("org_name, status")
    .eq("profile_id", profile.id)
    .maybeSingle();
  return (data as ScoutAccount | null) ?? null;
});

export const isApprovedScout = cache(async (): Promise<boolean> => {
  const acc = await getScoutAccount();
  return acc?.status === "approved";
});

export interface ScoutArtist {
  id: string;
  handle: string;
  display_name: string;
  bio: string | null;
  avatar_path: string | null;
  avatar_url: string | null;
  roles: string[];
  open_to: string[];
  voice_note: string | null;
  momentum: number;
  last_post: string | null;
}

export interface ScoutSearchParams {
  query?: string;
  roles?: string[];
  openTo?: string[];
  tags?: string[];
  kinds?: TrackKind[];
  hasVocals?: boolean;
  sort?: "momentum" | "recent" | "relevance";
  limit?: number;
}

/** Scout-gated talent search (momentum-sortable, consent-filtered). Signs avatars. */
export async function scoutSearchArtists(params: ScoutSearchParams): Promise<ScoutArtist[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("scout_search_artists", {
    p_query: params.query ?? "",
    p_roles: params.roles?.length ? params.roles : undefined,
    p_open_to: params.openTo?.length ? params.openTo : undefined,
    p_tags: params.tags?.length ? params.tags : undefined,
    p_kinds: params.kinds?.length ? params.kinds : undefined,
    p_has_vocals: params.hasVocals ?? undefined,
    p_sort: params.sort ?? "momentum",
    p_limit: params.limit ?? 24,
  });
  if (error || !data) return [];
  const rows = (data as unknown as { artist: Omit<ScoutArtist, "avatar_url"> }[]).map((r) => r.artist);
  return Promise.all(
    rows.map(async (a) => ({ ...a, avatar_url: await signOne(supabase, "avatars", a.avatar_path) })),
  );
}

export interface ScoutArtistProfile {
  id: string;
  handle: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  roles: string[];
  open_to: string[];
  voice_note: string | null;
  links: { label: string; url: string }[];
}

/** Public profile for the scout detail view, by id. Null if opted out or suspended. */
export async function getScoutArtistProfile(id: string): Promise<ScoutArtistProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, handle, display_name, bio, avatar_path, roles, open_to, voice_note, links, visible_to_scouts, suspended")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const p = data as {
    id: string;
    handle: string;
    display_name: string;
    bio: string | null;
    avatar_path: string | null;
    roles: string[] | null;
    open_to: string[] | null;
    voice_note: string | null;
    links: unknown;
    visible_to_scouts: boolean;
    suspended: boolean;
  };
  if (!p.visible_to_scouts || p.suspended) return null; // opted out / suspended ⇒ invisible to scouts
  return {
    id: p.id,
    handle: p.handle,
    display_name: p.display_name,
    bio: p.bio,
    avatar_url: await signOne(supabase, "avatars", p.avatar_path),
    roles: p.roles ?? [],
    open_to: p.open_to ?? [],
    voice_note: p.voice_note,
    links: Array.isArray(p.links) ? (p.links as { label: string; url: string }[]) : [],
  };
}

export interface MomentumComponent {
  raw: number;
  normalized: number;
  weight: number;
  contribution: number;
}
export interface ArtistMomentum {
  window_days: number;
  score: number;
  components: Record<string, MomentumComponent>;
  computed_at: string;
}
export interface DailySignal {
  day: string;
  followers_gained: number;
  listens: number;
  completes: number;
  completion_rate: number;
  repeat_listeners: number;
  collections_gained: number;
  reactions_gained: number;
  after_children_gained: number;
  scout_query_hits: number;
}
export interface ArtistSignals {
  momentum: ArtistMomentum | null;
  daily: DailySignal[];
}

/** Scout-gated momentum + daily series for one artist (null if opted out). */
export async function getScoutArtistSignals(artistId: string): Promise<ArtistSignals | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("scout_artist_signals", { p_artist_id: artistId });
  if (error || !data) return null;
  return data as unknown as ArtistSignals;
}

/** The URL-shaped filter state persisted with a saved search. */
export interface SavedSearchParams {
  q?: string;
  roles?: string[];
  open_to?: string[];
  kinds?: string[];
  vocals?: "any" | "yes" | "no";
  sort?: string;
}

export interface ScoutSavedSearch {
  id: number;
  name: string;
  params: SavedSearchParams;
  created_at: string;
}
export async function getSavedSearches(): Promise<ScoutSavedSearch[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("scout_saved_searches")
    .select("id, name, params, created_at")
    .order("created_at", { ascending: false });
  return (data as ScoutSavedSearch[] | null) ?? [];
}

export interface ScoutListItem {
  artist_id: string;
  note: string | null;
  added_at: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
}
export interface ScoutList {
  id: number;
  name: string;
  created_at: string;
  items: ScoutListItem[];
}

/** Just the scout's list id+name pairs (for the save-to-list picker). */
export async function getScoutListNames(): Promise<{ id: number; name: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("scout_lists")
    .select("id, name")
    .order("created_at", { ascending: false });
  return (data as { id: number; name: string }[] | null) ?? [];
}

/** The scout's lists with their items (private notes joined in). */
export async function getScoutLists(): Promise<ScoutList[]> {
  const supabase = await createClient();
  const { data: lists } = await supabase
    .from("scout_lists")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });
  if (!lists?.length) return [];

  const { data: items } = await supabase
    .from("scout_list_items")
    .select("list_id, artist_id, note, added_at, profiles(handle, display_name, avatar_path)")
    .order("added_at", { ascending: false });

  const rows = (items as unknown as RawListItem[] | null) ?? [];
  const byList = new Map<number, ScoutListItem[]>();
  for (const it of rows) {
    const list = byList.get(it.list_id) ?? [];
    list.push({
      artist_id: it.artist_id,
      note: it.note,
      added_at: it.added_at,
      handle: it.profiles?.handle ?? "",
      display_name: it.profiles?.display_name ?? "",
      avatar_url: await signOne(supabase, "avatars", it.profiles?.avatar_path ?? null),
    });
    byList.set(it.list_id, list);
  }
  return (lists as { id: number; name: string; created_at: string }[]).map((l) => ({
    ...l,
    items: byList.get(l.id) ?? [],
  }));
}

interface RawListItem {
  list_id: number;
  artist_id: string;
  note: string | null;
  added_at: string;
  profiles: { handle: string; display_name: string; avatar_path: string | null } | null;
}
