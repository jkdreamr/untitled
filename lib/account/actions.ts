"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/data/profiles";
import { getMux } from "@/lib/mux/client";
import { ALL_TAGS } from "@/lib/taxonomy";

const linkSchema = z.object({
  label: z.string().trim().max(40),
  // http(s) only — reject javascript:/data: and other schemes (stored-XSS via href)
  url: z
    .string()
    .trim()
    .max(200)
    .url()
    .refine((u) => /^https?:\/\//i.test(u), "links must start with http:// or https://"),
});

const profileSchema = z.object({
  display_name: z.string().trim().min(1).max(40),
  bio: z.string().trim().max(160).optional().default(""),
  links: z.array(linkSchema).max(6).default([]),
  interests: z.array(z.string()).max(15).refine((t) => t.every((x) => (ALL_TAGS as readonly string[]).includes(x))),
  quiet_mode: z.boolean(),
  avatar_path: z.string().max(200).nullable().optional(),
});

export interface ProfileState {
  ok: boolean;
  error?: string;
}

export async function updateProfile(input: z.infer<typeof profileSchema>): Promise<ProfileState> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "sign in again." };
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "check your details." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.display_name,
      bio: parsed.data.bio || null,
      links: parsed.data.links,
      interests: parsed.data.interests,
      quiet_mode: parsed.data.quiet_mode,
      ...(parsed.data.avatar_path !== undefined ? { avatar_path: parsed.data.avatar_path } : {}),
    })
    .eq("id", user.id);
  if (error) return { ok: false, error: "couldn't save." };
  revalidatePath("/settings");
  revalidatePath(`/${user.id}`);
  return { ok: true };
}

export async function setQuietMode(quiet: boolean): Promise<{ ok: boolean }> {
  const user = await getSessionUser();
  if (!user) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ quiet_mode: quiet }).eq("id", user.id);
  revalidatePath("/dashboard");
  return { ok: !error };
}

export async function setPinnedPiece(pieceId: string | null): Promise<{ ok: boolean }> {
  const user = await getSessionUser();
  if (!user) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ pinned_piece_id: pieceId }).eq("id", user.id);
  return { ok: !error };
}

/**
 * Hard-delete the account: purge Storage + Mux assets, then remove the auth user
 * (cascades all DB rows). Requires the service role for a true hard delete; when
 * it's absent we purge what we can as the user and remove the profile.
 */
export async function deleteAccount(confirmation: string): Promise<ProfileState> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "sign in again." };
  if (confirmation.trim().toLowerCase() !== "delete") return { ok: false, error: 'type "delete" to confirm.' };

  const supabase = await createClient();
  const { data: manifest } = await supabase.rpc("account_media_manifest", { p_uid: user.id });
  const m = (manifest ?? {}) as { storage_paths?: string[]; mux_asset_ids?: string[]; avatar_path?: string | null };

  // Storage (as the user — RLS-scoped to own folder)
  if (m.storage_paths?.length) await supabase.storage.from("media").remove(m.storage_paths).catch(() => {});
  if (m.avatar_path) await supabase.storage.from("avatars").remove([m.avatar_path]).catch(() => {});

  // Mux assets
  const mux = getMux();
  if (mux && m.mux_asset_ids?.length) {
    for (const id of m.mux_asset_ids) await mux.video.assets.delete(id).catch(() => {});
  }

  const admin = createAdminClient();
  if (admin) {
    // true hard delete — removes auth user + cascades every row
    await admin.auth.admin.deleteUser(user.id);
  } else {
    // best effort without service role: cascade DB rows by removing the profile
    await supabase.from("profiles").delete().eq("id", user.id);
    await supabase.auth.signOut();
  }

  redirect("/");
}
