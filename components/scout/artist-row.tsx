import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { ContactDialog } from "@/components/scout/contact-dialog";
import { SaveToList } from "@/components/scout/save-to-list";
import type { ScoutArtist } from "@/lib/data/scout";

export function ArtistRow({
  artist,
  lists,
}: {
  artist: ScoutArtist;
  lists: { id: number; name: string }[];
}) {
  return (
    <div className="flex items-start gap-4 border-b border-bone-10 py-5">
      <Link href={`/scout/artist/${artist.id}`} aria-label={artist.display_name}>
        <Avatar url={artist.avatar_url} name={artist.display_name} size="md" />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Link href={`/scout/artist/${artist.id}`} className="text-bone hover:underline">
            {artist.display_name}
          </Link>
          <span className="meta">@{artist.handle}</span>
          {artist.roles.slice(0, 3).map((r) => (
            <span key={r} className="meta meta-caps text-bone-46">
              {r}
            </span>
          ))}
        </div>

        {artist.voice_note && <p className="mt-1 font-mono text-[0.8rem] text-bone-52">{artist.voice_note}</p>}

        {artist.open_to.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {artist.open_to.map((o) => (
              <span key={o} className="meta rounded-full border border-bone-16 px-2 py-0.5 text-bone-64">
                {o}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center gap-4">
          <SaveToList artistId={artist.id} lists={lists} />
          <ContactDialog targetId={artist.id} artistName={artist.display_name} disabled={artist.open_to.length === 0} />
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="font-mono text-lg tabular-nums text-bone">{artist.momentum.toFixed(1)}</p>
        <p className="meta meta-caps text-bone-32">momentum</p>
      </div>
    </div>
  );
}
