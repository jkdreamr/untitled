import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { SoundBlock } from "@/components/piece/sound-block";
import { LyricsBlock } from "@/components/piece/lyrics-block";
import { VideoBlock } from "@/components/piece/video-block";
import { TrackKindTag, CoverOf } from "@/components/piece/track-kind-tag";
import { ReactionBar } from "@/components/piece/reaction-bar";
import { CollectButton } from "@/components/piece/collect-button";
import { CopyLink } from "@/components/ui/copy-link";
import { pieceTitle, formatPieceDate, timeAgo } from "@/lib/utils";
import type { PieceCard as PieceCardType } from "@/lib/types";
import type { PlayerTrack } from "@/components/player/player-context";

export function PieceCard({
  card,
  authed,
  priority = false,
}: {
  card: PieceCardType;
  authed: boolean;
  priority?: boolean;
}) {
  const href = `/piece/${card.id}`;
  const titled = !!card.title?.trim();
  const label = pieceTitle(card.title, card.sequence_no);

  const audio = card.media.find((m) => m.kind === "audio");
  const track: PlayerTrack | null = audio?.url
    ? {
        id: card.id,
        title: label,
        artistName: card.artist.display_name,
        artistHandle: card.artist.handle,
        url: audio.url,
        peaks: audio.peaks,
        duration: audio.duration_seconds,
        href,
      }
    : null;
  const video = card.media.find((m) => m.kind === "video");
  const aspect = video?.width && video?.height ? video.width / video.height : 16 / 9;

  return (
    <article className="border-b border-bone-10 py-8 first:pt-4 [animation:rise-in_.3s_var(--ease-out)_both]">
      {/* header */}
      <header className="mb-4 flex items-center gap-3">
        <Link href={`/${card.artist.handle}`} aria-label={card.artist.display_name}>
          <Avatar url={card.artist.avatar_url} name={card.artist.display_name} size="sm" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/${card.artist.handle}`} className="text-sm text-bone hover:underline">
            {card.artist.display_name}
          </Link>
          <p className="meta flex items-center gap-1.5 truncate">
            <span className="truncate">@{card.artist.handle}</span>
            <span className="meta-caps">{card.medium === "video" ? "video" : "audio"}</span>
            <TrackKindTag kind={card.track_kind} />
          </p>
        </div>
        <Link href={href} className="meta shrink-0 text-bone-32 hover:text-bone" title={formatPieceDate(card.published_at)}>
          {timeAgo(card.published_at)}
        </Link>
      </header>

      {/* media */}
      <div className="space-y-4">
        {card.medium === "sound" && track && <SoundBlock track={track} />}
        {card.medium === "video" && <VideoBlock playbackId={card.mux_playback_id} title={label} aspect={aspect} priority={priority} />}
        {/* a lyric teaser under the take */}
        {card.lyrics && (
          <LyricsBlock lyrics={card.lyrics} clamp className="text-[1.1rem] sm:text-[1.2rem]" />
        )}
      </div>

      {/* title + date */}
      <div className="mt-5">
        <Link href={href} className="group inline-block">
          {titled ? (
            <h2 className="font-serif text-2xl leading-tight text-bone group-hover:text-bone-80">{label}</h2>
          ) : (
            <h2 className="font-mono text-[0.95rem] tracking-tight text-bone-64 group-hover:text-bone">{label}</h2>
          )}
        </Link>
        <CoverOf
          title={card.cover_of_title}
          artist={card.cover_of_artist}
          verb={card.track_kind === "cover" ? "cover of" : "over"}
          className="mt-1"
        />
        <p className="meta mt-1">{formatPieceDate(card.published_at)}</p>
      </div>

      {card.caption && <p className="mt-3 max-w-prose text-[0.95rem] leading-relaxed text-bone-64">{card.caption}</p>}

      {card.after && (
        <p className="meta mt-3 text-bone-46">
          after{" "}
          <Link href={`/piece/${card.after.id}`} className="text-bone-64 hover:text-bone">
            {pieceTitle(card.after.title, card.after.sequence_no)}
          </Link>{" "}
          by{" "}
          <Link href={`/${card.after.artist_handle}`} className="text-bone-64 hover:text-bone">
            @{card.after.artist_handle}
          </Link>
        </p>
      )}

      {card.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {card.tags.slice(0, 5).map((t) => (
            <Link key={t} href={`/search?tag=${encodeURIComponent(t)}`} className="meta rounded-full border border-bone-10 px-2 py-0.5 text-bone-46 transition-colors hover:border-bone-16 hover:text-bone">
              {t}
            </Link>
          ))}
        </div>
      )}

      {/* footer */}
      <footer className="mt-5 flex items-center justify-between gap-4">
        <ReactionBar pieceId={card.id} initialViewer={card.viewer.reactions} total={card.counts.reactions} authed={authed} />
        <div className="flex shrink-0 items-center gap-4">
          <Link href={`${href}#comments`} className="meta text-bone-46 hover:text-bone">
            {card.counts.comments > 0 ? `${card.counts.comments} comments` : "comment"}
          </Link>
          <CollectButton pieceId={card.id} authed={authed} />
          <CopyLink path={href} />
        </div>
      </footer>
    </article>
  );
}
