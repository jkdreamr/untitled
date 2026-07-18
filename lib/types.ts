import type { Enums } from "@/lib/supabase/types";

export type Medium = Enums<"medium">;
/** A track is one of two things: an audio take, or a performance video. */
export type TrackMedium = "sound" | "video";
export type TrackKind = Enums<"track_kind">;
export type LyricsSource = Enums<"lyrics_source">;
export type Visibility = Enums<"visibility">;
export type ReactionKind = Enums<"reaction_kind">;
export type MediaKind = Enums<"media_kind">;
export type PieceStatus = Enums<"piece_status">;
export type ReportReason = Enums<"report_reason">;
export type ReportTarget = Enums<"report_target">;

/** The eight musician roles a profile can claim. */
export const ARTIST_ROLES = [
  "vocalist",
  "rapper",
  "songwriter",
  "producer",
  "instrumentalist",
  "engineer",
  "composer",
  "dj",
] as const;
export type ArtistRole = (typeof ARTIST_ROLES)[number];

/** What a musician is open to. */
export const OPEN_TO = ["collabs", "writing", "features", "sessions"] as const;
export type OpenTo = (typeof OPEN_TO)[number];

/** One time-synced lyric line, confirmed by the artist. */
export interface LyricSegment {
  start: number;
  end: number;
  text: string;
}

/** A single concrete media file within a piece, plus its signed URL (added server-side). */
export interface MediaItem {
  kind: MediaKind;
  storage_path: string | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  peaks: number[] | null;
  blurhash: string | null;
  mime: string | null;
  position: number;
  /** Short-lived signed URL, attached by the data layer. */
  url: string | null;
}

export interface CardArtist {
  id: string;
  handle: string;
  display_name: string;
  avatar_path: string | null;
  quiet_mode: boolean;
  /** The musician roles this artist claims (may be empty). */
  roles: string[];
  /** Signed avatar URL, attached by the data layer. */
  avatar_url: string | null;
}

export interface AfterRef {
  id: string;
  sequence_no: number;
  title: string | null;
  medium: Medium;
  artist_handle: string;
  artist_name: string;
}

/** The canonical card shape returned by `piece_card_json` (parsed + URL-signed). */
export interface PieceCard {
  id: string;
  /** 'sound' or 'video' — how the track is played. */
  medium: Medium;
  track_kind: TrackKind;
  has_vocals: boolean;
  title: string | null;
  caption: string | null;
  cover_of_title: string | null;
  cover_of_artist: string | null;
  /** Confirmed lyric text — written by the artist or a transcription they confirmed. */
  lyrics: string | null;
  lyrics_source: LyricsSource | null;
  /** Confirmed, time-synced lyric lines (empty when none). */
  lyric_segments: LyricSegment[];
  /** Artist preference: open the lyric panel by default on a video track. */
  show_lyrics: boolean;
  tags: string[];
  visibility: Visibility;
  status: PieceStatus;
  sequence_no: number;
  created_at: string;
  published_at: string;
  comments_closed: boolean;
  mux_playback_id: string | null;
  artist: CardArtist;
  media: MediaItem[];
  after: AfterRef | null;
  after_count: number;
  counts: {
    /** null when the artist is in quiet mode and the viewer is not the owner. */
    reactions: number | null;
    comments: number;
  };
  viewer: {
    reactions: ReactionKind[];
    following: boolean;
    is_owner: boolean;
  };
  /** Search-only hints: which retrieval arm surfaced this result (set by search_pieces). */
  lyric_hit?: boolean;
  semantic?: boolean;
}

export interface PieceComment {
  id: string;
  body: string;
  created_at: string;
  author: { handle: string; display_name: string; avatar_path: string | null; avatar_url?: string | null };
  is_mine: boolean;
  can_moderate: boolean;
}

export interface WanderItem {
  card: PieceCard;
  score: number;
  is_exploration: boolean;
  medium: Medium;
  artist_id: string;
}

/** A keyset cursor for reverse-chronological pagination. */
export interface Cursor {
  ts: string;
  id: string;
}
