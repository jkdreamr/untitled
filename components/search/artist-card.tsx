import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { RoleChips, OpenToBadges, VoiceNote } from "@/components/piece/talent-chips";
import type { ArtistResult } from "@/lib/types";

/** A musician in talent-search results — a compact talent card. */
export function ArtistCard({ artist }: { artist: ArtistResult }) {
  return (
    <Link
      href={`/${artist.handle}`}
      className="group flex items-start gap-4 rounded-lg border border-transparent px-3 py-3 transition-colors hover:border-bone-10 hover:bg-bone-06"
    >
      <Avatar url={artist.avatar_url} name={artist.display_name} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-sm text-bone">{artist.display_name}</span>
          <span className="meta shrink-0">@{artist.handle}</span>
        </div>
        <RoleChips roles={artist.roles} className="mt-1.5" />
        {artist.voice_note && <VoiceNote note={artist.voice_note} className="mt-1.5 line-clamp-1" />}
        <OpenToBadges openTo={artist.open_to} className="mt-1.5" />
        <p className="meta mt-1.5">
          {artist.track_count} track{artist.track_count === 1 ? "" : "s"}
          {artist.top_tags.length > 0 && ` · ${artist.top_tags.slice(0, 3).join(" · ")}`}
        </p>
      </div>
    </Link>
  );
}
