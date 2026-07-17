import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/account/settings-form";
import { getCurrentProfile } from "@/lib/data/profiles";
import { signOne } from "@/lib/data/cards";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "settings" };
export const dynamic = "force-dynamic";

interface LinkRow { label: string; url: string }

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/settings");

  const supabase = await createClient();
  const avatarUrl = await signOne(supabase, "avatars", profile.avatar_path);
  const links = Array.isArray(profile.links) ? (profile.links as unknown as LinkRow[]) : [];

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <h1 className="mb-8 font-serif text-3xl text-bone">settings</h1>
      <SettingsForm
        initial={{
          display_name: profile.display_name,
          bio: profile.bio ?? "",
          links,
          interests: profile.interests,
          quiet_mode: profile.quiet_mode,
          handle: profile.handle,
        }}
        avatarUrl={avatarUrl}
      />
    </div>
  );
}
