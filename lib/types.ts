import type { Enums } from "@/lib/supabase/types";

export type Medium = Enums<"medium">;
export type Visibility = Enums<"visibility">;
export type ReactionKind = Enums<"reaction_kind">;
export type MediaKind = Enums<"media_kind">;
export type PieceStatus = Enums<"piece_status">;
export type ReportReason = Enums<"report_reason">;
export type ReportTarget = Enums<"report_target">;

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
  medium: Medium;
  title: string | null;
  caption: string | null;
  body: string | null;
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
