import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { ScoutNav } from "@/components/scout/scout-nav";
import { MomentumPanel } from "@/components/scout/momentum-panel";
import { ScoutTracks } from "@/components/scout/scout-tracks";
import { ContactDialog } from "@/components/scout/contact-dialog";
import { SaveToList } from "@/components/scout/save-to-list";
import {
  isApprovedScout,
  getScoutArtistProfile,
  getScoutArtistSignals,
  getScoutListNames,
} from "@/lib/data/scout";
import { getProfilePieces } from "@/lib/data/pieces";
import { cardsToTracks } from "@/lib/tracks";

export const metadata: Metadata = { title: "scout · artist", robots: "noindex" };
export const dynamic = "force-dynamic";

export default async function ScoutArtistPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isApprovedScout())) notFound();
  const { id } = await params;

  const profile = await getScoutArtistProfile(id);
  if (!profile) notFound();

  const [signals, { cards }, lists] = await Promise.all([
    getScoutArtistSignals(id),
    getProfilePieces(profile.handle, null),
    getScoutListNames(),
  ]);
  const tracks = cardsToTracks(cards);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <ScoutNav active="search" />

      <div className="flex items-start gap-5">
        <Avatar url={profile.avatar_url} name={profile.display_name} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-3xl text-bone">{profile.display_name}</h1>
          <Link href={`/${profile.handle}`} className="meta transition-colors hover:text-bone">
            @{profile.handle} ↗
          </Link>
          {profile.roles.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.roles.map((r) => (
                <span key={r} className="meta meta-caps text-bone-46">
                  {r}
                </span>
              ))}
            </div>
          )}
          {profile.voice_note && <p className="mt-2 font-mono text-[0.85rem] text-bone-52">{profile.voice_note}</p>}
        </div>
      </div>

      {profile.bio && <p className="mt-4 max-w-prose text-sm leading-relaxed text-bone-64">{profile.bio}</p>}

      {profile.open_to.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="meta meta-caps text-bone-46">open to</span>
          {profile.open_to.map((o) => (
            <span key={o} className="meta rounded-full border border-bone-16 px-2 py-0.5 text-bone-64">
              {o}
            </span>
          ))}
        </div>
      ) : (
        <p className="meta mt-4 text-bone-32">not currently open to contact</p>
      )}

      <div className="mt-5 flex items-center gap-4">
        <SaveToList artistId={profile.id} lists={lists} />
        <ContactDialog
          targetId={profile.id}
          artistName={profile.display_name}
          disabled={profile.open_to.length === 0}
        />
      </div>

      {profile.links.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {profile.links.map((l, i) => (
            <a
              key={i}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="meta text-bone-46 underline decoration-bone-16 transition-colors hover:text-bone"
            >
              {l.label || l.url}
            </a>
          ))}
        </div>
      )}

      <div className="mt-8">
        {signals && signals.momentum ? (
          <MomentumPanel signals={signals} />
        ) : (
          <div className="rounded-lg border border-bone-10 p-5">
            <p className="meta meta-caps text-bone-46">momentum</p>
            <p className="mt-2 text-sm text-bone-52">
              not enough signal yet — momentum builds as the work is heard, followed, and collected.
            </p>
          </div>
        )}
      </div>

      <div className="mt-8">
        <div className="mb-2 flex items-baseline justify-between border-b border-bone-10 pb-2">
          <h2 className="font-serif text-xl text-bone">the work</h2>
          <Link href={`/${profile.handle}`} className="meta transition-colors hover:text-bone">
            full profile ↗
          </Link>
        </div>
        <ScoutTracks tracks={tracks} />
      </div>
    </div>
  );
}
