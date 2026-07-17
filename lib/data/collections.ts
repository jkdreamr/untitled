import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getCardsByIds } from "@/lib/data/pieces";
import { signOne } from "@/lib/data/cards";
import type { PieceCard } from "@/lib/types";

export interface CollectionSummary {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  item_count: number;
  follower_count: number;
  owner_handle: string;
  owner_name: string;
  is_public: boolean;
}

export interface CollectionDetail {
  id: string;
  title: string;
  description: string | null;
  item_count: number;
  follower_count: number;
  is_public: boolean;
  owner: { id: string; handle: string; display_name: string; avatar_url: string | null };
  pieces: PieceCard[];
  is_owner: boolean;
  is_following: boolean;
}

export async function listMyCollections(): Promise<CollectionSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("collections")
    .select("id,title,slug,description,item_count,follower_count,is_public")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });
  const { data: me } = await supabase.from("profiles").select("handle,display_name").eq("id", user.id).maybeSingle();
  return (data ?? []).map((c) => ({ ...c, owner_handle: me?.handle ?? "", owner_name: me?.display_name ?? "" }));
}

export async function listPublicCollections(limit = 24): Promise<CollectionSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("collections")
    .select("id,title,slug,description,item_count,follower_count,is_public, owner:profiles!collections_owner_id_fkey(handle,display_name)")
    .eq("is_public", true)
    .gt("item_count", 0)
    .order("updated_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((c) => {
    const owner = c.owner as unknown as { handle: string; display_name: string } | null;
    return {
      id: c.id, title: c.title, slug: c.slug, description: c.description,
      item_count: c.item_count, follower_count: c.follower_count, is_public: c.is_public,
      owner_handle: owner?.handle ?? "", owner_name: owner?.display_name ?? "",
    };
  });
}

export async function getCollection(id: string): Promise<CollectionDetail | null> {
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("collections")
    .select("id,title,description,item_count,follower_count,is_public,owner_id, owner:profiles!collections_owner_id_fkey(id,handle,display_name,avatar_path)")
    .eq("id", id)
    .maybeSingle();
  if (!c) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const owner = c.owner as unknown as { id: string; handle: string; display_name: string; avatar_path: string | null };

  const { data: items } = await supabase
    .from("collection_items")
    .select("piece_id, position, added_at")
    .eq("collection_id", id)
    .order("position", { ascending: true })
    .order("added_at", { ascending: false });
  const pieces = await getCardsByIds((items ?? []).map((i) => i.piece_id));

  let isFollowing = false;
  if (user && user.id !== owner.id) {
    const { data: f } = await supabase
      .from("collection_follows")
      .select("collection_id")
      .eq("collection_id", id)
      .eq("follower_id", user.id)
      .maybeSingle();
    isFollowing = !!f;
  }

  return {
    id: c.id, title: c.title, description: c.description, item_count: c.item_count,
    follower_count: c.follower_count, is_public: c.is_public,
    owner: { id: owner.id, handle: owner.handle, display_name: owner.display_name, avatar_url: await signOne(supabase, "avatars", owner.avatar_path) },
    pieces,
    is_owner: user?.id === owner.id,
    is_following: isFollowing,
  };
}
