import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { FollowButton } from "@/components/piece/follow-button";
import { ReportDialog } from "@/components/piece/report-dialog";
import { PieceCard } from "@/components/piece/piece-card";
import { FeedItems } from "@/components/feed/feed-items";
import { FeedStream } from "@/components/feed/feed-stream";
import { buttonClasses } from "@/components/ui/button";
import { getProfileByHandle, getSessionUser } from "@/lib/data/profiles";
import { getProfilePieces } from "@/lib/data/pieces";
import { loadMoreProfile } from "@/lib/profile/actions";
import { cardsToTracks } from "@/lib/tracks";
import { cn, formatCount } from "@/lib/utils";
import type { Medium } from "@/lib/types";

export const dynamic = "force-dynamic";

const MEDIA: (Medium | "all")[] = ["all", "sound", "image", "video", "words"];

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getProfileByHandle(handle);
  if (!profile) return { title: "not found" };
  return { title: `${profile.display_name} (@${profile.handle})`, description: profile.bio ?? undefined };
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ medium?: string }>;
}) {
  const { handle } = await params;
  const { medium: mediumRaw } = await searchParams;
  const profile = await getProfileByHandle(handle);
  if (!profile) notFound();

  const activeMedium = (MEDIA.includes(mediumRaw as Medium) ? mediumRaw : "all") as Medium | "all";
  const filter = activeMedium === "all" ? null : activeMedium;

  const [{ cards, nextCursor }, user] = await Promise.all([
    getProfilePieces(profile.handle, filter),
    getSessionUser(),
  ]);
  const authed = !!user;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* header */}
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        <Avatar url={profile.avatar_url} name={profile.display_name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-3xl text-bone">{profile.display_name}</h1>
            {profile.role === "admin" && <span className="meta rounded-full border border-bone-16 px-2 py-0.5 text-bone-46">team</span>}
          </div>
          <p className="meta mt-0.5">@{profile.handle}</p>
          {profile.bio && <p className="mt-3 max-w-prose text-sm leading-relaxed text-bone-64">{profile.bio}</p>}

          {profile.links.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-3">
              {profile.links.map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="meta text-bone-46 underline decoration-bone-16 hover:text-bone">
                  {l.label || l.url}
                </a>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center gap-4">
            {profile.follower_count !== null ? (
              <span className="meta"><span className="text-bone">{formatCount(profile.follower_count)}</span> followers</span>
            ) : (
              <span className="meta text-bone-32">followers quiet</span>
            )}
            {profile.following_count !== null && (
              <span className="meta"><span className="text-bone">{formatCount(profile.following_count)}</span> following</span>
            )}
          </div>

          <div className="mt-5 flex items-center gap-3">
            {profile.is_self ? (
              <Link href="/settings" className={buttonClasses("outline", "sm")}>edit profile</Link>
            ) : (
              <>
                <FollowButton targetId={profile.id} initialFollowing={profile.is_following} authed={authed} size="md" />
                <ReportDialog targetType="profile" targetId={profile.id} authed={authed} />
              </>
            )}
          </div>
        </div>
      </header>

      {/* pinned */}
      {profile.pinned && activeMedium === "all" && (
        <section className="mt-10">
          <p className="meta meta-caps mb-2 text-lime">pinned</p>
          <PieceCard card={profile.pinned} authed={authed} />
        </section>
      )}

      {/* filter */}
      <nav className="mt-8 flex gap-1 border-b border-bone-10 pb-3">
        {MEDIA.map((m) => (
          <Link
            key={m}
            href={m === "all" ? `/${profile.handle}` : `/${profile.handle}?medium=${m}`}
            className={cn("rounded-full px-3 py-1.5 text-sm transition-colors", activeMedium === m ? "text-bone" : "text-bone-46 hover:text-bone")}
          >
            {m}
          </Link>
        ))}
      </nav>

      {/* work */}
      <div className="mt-2">
        {cards.length === 0 ? (
          <p className="py-16 text-center text-sm text-bone-32">
            {profile.is_self ? "you haven't posted here yet. post the first take." : "nothing here yet."}
          </p>
        ) : (
          <FeedStream
            initialNode={<FeedItems cards={cards} authed={authed} firstPriority />}
            initialCursor={nextCursor}
            initialTracks={cardsToTracks(cards)}
            loader={loadMoreProfile.bind(null, profile.handle, filter)}
          />
        )}
      </div>
    </div>
  );
}
