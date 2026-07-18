import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { signOne } from "@/lib/data/cards";
import { getPiece } from "@/lib/data/pieces";
import { hasSupabasePublicEnv } from "@/lib/env";
import type { Tables } from "@/lib/supabase/types";
import type { PieceCard } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

export type Profile = Tables<"profiles">;

export interface ProfileLink {
  label: string;
  url: string;
}

export interface PublicProfile {
  id: string;
  handle: string;
  display_name: string;
  bio: string | null;
  links: ProfileLink[];
  avatar_url: string | null;
  quiet_mode: boolean;
  role: Profile["role"];
  roles: string[];
  open_to: string[];
  voice_note: string | null;
  /** null when quiet mode and not self */
  follower_count: number | null;
  following_count: number | null;
  is_self: boolean;
  is_following: boolean;
  pinned: PieceCard | null;
  created_at: string;
}

/** The authenticated auth user (verified against Supabase Auth). Cached per request. */
export const getSessionUser = cache(async (): Promise<User | null> => {
  // Not configured yet → treat everyone as a guest (no network call, no throw).
  if (!hasSupabasePublicEnv()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** The current user's profile row, or null if signed out / not yet onboarded. */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data ?? null;
});

export async function getProfileByHandle(handle: string): Promise<PublicProfile | null> {
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("profiles")
    .select(
      "id, handle, display_name, bio, links, avatar_path, quiet_mode, role, roles, open_to, voice_note, follower_count, following_count, pinned_piece_id, created_at",
    )
    .eq("handle", handle)
    .maybeSingle();
  if (!p) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isSelf = user?.id === p.id;

  let isFollowing = false;
  if (user && !isSelf) {
    const { data: f } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id)
      .eq("following_id", p.id)
      .maybeSingle();
    isFollowing = !!f;
  }

  const masked = p.quiet_mode && !isSelf;
  const avatar_url = await signOne(supabase, "avatars", p.avatar_path);
  const pinned = p.pinned_piece_id ? await getPiece(p.pinned_piece_id) : null;

  return {
    id: p.id,
    handle: p.handle,
    display_name: p.display_name,
    bio: p.bio,
    links: parseLinks(p.links),
    avatar_url,
    quiet_mode: p.quiet_mode,
    role: p.role,
    roles: p.roles ?? [],
    open_to: p.open_to ?? [],
    voice_note: p.voice_note,
    follower_count: masked ? null : p.follower_count,
    following_count: masked ? null : p.following_count,
    is_self: isSelf,
    is_following: isFollowing,
    pinned,
    created_at: p.created_at,
  };
}

function parseLinks(json: unknown): ProfileLink[] {
  if (!Array.isArray(json)) return [];
  return json
    .filter((l): l is ProfileLink => !!l && typeof l === "object" && "url" in l)
    // defense-in-depth: only ever surface http(s) hrefs (guards against a
    // javascript:/data: URL that predates the write-side validation)
    .filter((l) => typeof l.url === "string" && /^https?:\/\//i.test(l.url))
    .slice(0, 6);
}
