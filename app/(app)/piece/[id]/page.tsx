import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { SoundBlock } from "@/components/piece/sound-block";
import { ImageRoll } from "@/components/piece/image-roll";
import { VideoBlock } from "@/components/piece/video-block";
import { WordsBlock } from "@/components/piece/words-block";
import { ReactionBar } from "@/components/piece/reaction-bar";
import { CollectButton } from "@/components/piece/collect-button";
import { CopyLink } from "@/components/ui/copy-link";
import { FollowButton } from "@/components/piece/follow-button";
import { CommentSection } from "@/components/piece/comment-section";
import { ReportDialog } from "@/components/piece/report-dialog";
import { ViewPing } from "@/components/piece/view-ping";
import { getPiece, getPieceComments, getPieceReactions, getPiecesAfter } from "@/lib/data/pieces";
import { getSessionUser, getCurrentProfile } from "@/lib/data/profiles";
import { pieceTitle, formatPieceDate, formatDuration } from "@/lib/utils";
import type { PlayerTrack } from "@/components/player/player-context";
import type { ReactionKind } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const card = await getPiece(id);
  if (!card) return { title: "piece" };
  const label = pieceTitle(card.title, card.sequence_no);
  const desc = card.caption ?? card.body?.slice(0, 140) ?? `a ${card.medium} piece by @${card.artist.handle}`;
  return { title: `${label} · @${card.artist.handle}`, description: desc };
}

export default async function PiecePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getPiece(id);
  if (!card) notFound();

  const [reactions, comments, afters, user, profile] = await Promise.all([
    getPieceReactions(id),
    getPieceComments(id),
    getPiecesAfter(id),
    getSessionUser(),
    getCurrentProfile(),
  ]);
  const authed = !!user;

  const audio = card.media.find((m) => m.kind === "audio");
  const track: PlayerTrack | null = audio?.url
    ? {
        id: card.id, title: pieceTitle(card.title, card.sequence_no), artistName: card.artist.display_name,
        artistHandle: card.artist.handle, url: audio.url, peaks: audio.peaks, duration: audio.duration_seconds,
        href: `/piece/${card.id}`,
      }
    : null;
  const video = card.media.find((m) => m.kind === "video");
  const aspect = video?.width && video?.height ? video.width / video.height : 16 / 9;
  const titled = !!card.title?.trim();

  return (
    <article className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <ViewPing pieceId={card.id} />

      {/* artist */}
      <header className="mb-6 flex items-center gap-3">
        <Link href={`/${card.artist.handle}`}>
          <Avatar url={card.artist.avatar_url} name={card.artist.display_name} size="md" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/${card.artist.handle}`} className="block text-bone hover:underline">
            {card.artist.display_name}
          </Link>
          <p className="meta">@{card.artist.handle}</p>
        </div>
        {!card.viewer.is_owner && (
          <FollowButton targetId={card.artist.id} initialFollowing={card.viewer.following} authed={authed} size="sm" />
        )}
      </header>

      {/* media */}
      <div className="space-y-4">
        {card.medium === "sound" && track && <SoundBlock track={track} tall />}
        {card.medium === "image" && (
          <ImageRoll media={card.media} priority alt={card.caption ?? `${pieceTitle(card.title, card.sequence_no)} by @${card.artist.handle}`} />
        )}
        {card.medium === "video" && <VideoBlock playbackId={card.mux_playback_id} title={pieceTitle(card.title, card.sequence_no)} aspect={aspect} />}
        {card.medium === "words" && card.body && <WordsBlock body={card.body} />}
        {card.medium !== "words" && card.body && <WordsBlock body={card.body} className="text-[1.15rem]" />}
      </div>

      {/* title + meta */}
      <div className="mt-6">
        {titled ? (
          <h1 className="font-serif text-3xl text-bone">{pieceTitle(card.title, card.sequence_no)}</h1>
        ) : (
          <h1 className="font-mono text-lg text-bone-64">untitled no. {card.sequence_no}</h1>
        )}
        <p className="meta mt-1">
          {formatPieceDate(card.published_at)} · <span className="meta-caps">{card.medium}</span>
          {audio?.duration_seconds ? ` · ${formatDuration(audio.duration_seconds)}` : ""}
        </p>
      </div>

      {card.caption && <p className="mt-4 max-w-prose leading-relaxed text-bone-64">{card.caption}</p>}

      {card.after && (
        <p className="meta mt-4 text-bone-46">
          after{" "}
          <Link href={`/piece/${card.after.id}`} className="text-bone-64 hover:text-bone">
            {pieceTitle(card.after.title, card.after.sequence_no)}
          </Link>{" "}
          by <Link href={`/${card.after.artist_handle}`} className="text-bone-64 hover:text-bone">@{card.after.artist_handle}</Link>
        </p>
      )}

      {card.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {card.tags.map((t) => (
            <Link key={t} href={`/search?tag=${encodeURIComponent(t)}`} className="meta rounded-full border border-bone-10 px-2 py-0.5 text-bone-46 hover:text-bone">
              {t}
            </Link>
          ))}
        </div>
      )}

      {/* actions */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-bone-10 py-5">
        <ReactionBar
          pieceId={card.id}
          initialViewer={card.viewer.reactions}
          total={card.counts.reactions}
          breakdown={reactions as Partial<Record<ReactionKind, number>> | null}
          authed={authed}
          showBreakdown={!!reactions}
        />
        <div className="flex items-center gap-4">
          <CollectButton pieceId={card.id} authed={authed} />
          <CopyLink path={`/piece/${card.id}`} />
          {!card.viewer.is_owner && <ReportDialog targetType="piece" targetId={card.id} authed={authed} />}
        </div>
      </div>

      {/* after-graph */}
      {(card.after_count > 0 || afters.length > 0) && (
        <div className="mt-8">
          <h2 className="meta meta-caps mb-4 text-bone-46">{card.after_count} made after this</h2>
          <div className="flex flex-wrap gap-3">
            {afters.map((a) => (
              <Link key={a.id} href={`/piece/${a.id}`} className="rounded-lg border border-bone-10 px-4 py-3 text-sm text-bone-64 transition-colors hover:border-bone-16 hover:text-bone">
                {pieceTitle(a.title, a.sequence_no)} · @{a.artist.handle}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* comments */}
      <div className="mt-12">
        <CommentSection
          pieceId={card.id}
          initial={comments}
          authed={authed}
          closed={card.comments_closed}
          isOwner={card.viewer.is_owner}
          viewer={profile ? { handle: profile.handle, display_name: profile.display_name } : null}
        />
      </div>
    </article>
  );
}
