import { redirect } from "next/navigation";
import { PlayerProvider } from "@/components/player/player-context";
import { MiniPlayer } from "@/components/player/mini-player";
import { AppNav, type NavProfile } from "@/components/nav/app-nav";
import { getSessionUser, getCurrentProfile } from "@/lib/data/profiles";
import { isApprovedScout } from "@/lib/data/scout";
import { getUnreadNotificationCount } from "@/lib/data/notifications";
import { signOne } from "@/lib/data/cards";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const profile = user ? await getCurrentProfile() : null;

  // Authenticated but hasn't finished onboarding -> finish it first.
  if (user && !profile?.onboarded) redirect("/onboarding");

  let navProfile: NavProfile | null = null;
  if (profile) {
    const supabase = await createClient();
    const [avatarUrl, isScout, unreadNotifications] = await Promise.all([
      signOne(supabase, "avatars", profile.avatar_path),
      isApprovedScout(),
      getUnreadNotificationCount(),
    ]);
    navProfile = {
      handle: profile.handle,
      displayName: profile.display_name,
      avatarUrl,
      isAdmin: profile.role === "admin",
      isScout,
      unreadNotifications,
    };
  }

  return (
    <PlayerProvider>
      <div className="relative flex min-h-dvh flex-col">
        <AppNav profile={navProfile} />
        <main id="main" className="flex-1 pb-28">
          {children}
        </main>
      </div>
      <MiniPlayer />
    </PlayerProvider>
  );
}
