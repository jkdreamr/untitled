export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      collection_follows: {
        Row: { collection_id: string; created_at: string; follower_id: string }
        Insert: { collection_id: string; created_at?: string; follower_id: string }
        Update: { collection_id?: string; created_at?: string; follower_id?: string }
        Relationships: []
      }
      collection_items: {
        Row: { added_at: string; collection_id: string; note: string | null; piece_id: string; position: number }
        Insert: { added_at?: string; collection_id: string; note?: string | null; piece_id: string; position?: number }
        Update: { added_at?: string; collection_id?: string; note?: string | null; piece_id?: string; position?: number }
        Relationships: []
      }
      collections: {
        Row: { created_at: string; description: string | null; follower_count: number; id: string; is_public: boolean; item_count: number; owner_id: string; slug: string; title: string; updated_at: string }
        Insert: { created_at?: string; description?: string | null; follower_count?: number; id?: string; is_public?: boolean; item_count?: number; owner_id: string; slug: string; title: string; updated_at?: string }
        Update: { created_at?: string; description?: string | null; follower_count?: number; id?: string; is_public?: boolean; item_count?: number; owner_id?: string; slug?: string; title?: string; updated_at?: string }
        Relationships: []
      }
      comments: {
        Row: { body: string; created_at: string; id: string; piece_id: string; status: Database["public"]["Enums"]["comment_status"]; updated_at: string; user_id: string }
        Insert: { body: string; created_at?: string; id?: string; piece_id: string; status?: Database["public"]["Enums"]["comment_status"]; updated_at?: string; user_id: string }
        Update: { body?: string; created_at?: string; id?: string; piece_id?: string; status?: Database["public"]["Enums"]["comment_status"]; updated_at?: string; user_id?: string }
        Relationships: []
      }
      enrichment_jobs: {
        Row: { attempts: number; created_at: string; id: string; last_error: string | null; piece_id: string; run_after: string; stage: Database["public"]["Enums"]["job_stage"]; status: Database["public"]["Enums"]["job_status"]; updated_at: string }
        Insert: { attempts?: number; created_at?: string; id?: string; last_error?: string | null; piece_id: string; run_after?: string; stage: Database["public"]["Enums"]["job_stage"]; status?: Database["public"]["Enums"]["job_status"]; updated_at?: string }
        Update: { attempts?: number; created_at?: string; id?: string; last_error?: string | null; piece_id?: string; run_after?: string; stage?: Database["public"]["Enums"]["job_stage"]; status?: Database["public"]["Enums"]["job_status"]; updated_at?: string }
        Relationships: []
      }
      follows: {
        Row: { created_at: string; follower_id: string; following_id: string }
        Insert: { created_at?: string; follower_id: string; following_id: string }
        Update: { created_at?: string; follower_id?: string; following_id?: string }
        Relationships: []
      }
      piece_media: {
        Row: { blurhash: string | null; bytes: number | null; created_at: string; duration_seconds: number | null; height: number | null; id: string; kind: Database["public"]["Enums"]["media_kind"]; mime: string | null; peaks: Json | null; piece_id: string; position: number; storage_path: string | null; width: number | null }
        Insert: { blurhash?: string | null; bytes?: number | null; created_at?: string; duration_seconds?: number | null; height?: number | null; id?: string; kind: Database["public"]["Enums"]["media_kind"]; mime?: string | null; peaks?: Json | null; piece_id: string; position?: number; storage_path?: string | null; width?: number | null }
        Update: { blurhash?: string | null; bytes?: number | null; created_at?: string; duration_seconds?: number | null; height?: number | null; id?: string; kind?: Database["public"]["Enums"]["media_kind"]; mime?: string | null; peaks?: Json | null; piece_id?: string; position?: number; storage_path?: string | null; width?: number | null }
        Relationships: []
      }
      piece_neighbors: {
        Row: { neighbor_id: string; piece_id: string; score: number }
        Insert: { neighbor_id: string; piece_id: string; score: number }
        Update: { neighbor_id?: string; piece_id?: string; score?: number }
        Relationships: []
      }
      piece_search: {
        Row: { description: string | null; doc: string | null; embed_model: string | null; embedding: string | null; embedding_small: string | null; fts: unknown; piece_id: string; status: Database["public"]["Enums"]["search_status"]; transcript: string | null; updated_at: string }
        Insert: { description?: string | null; doc?: string | null; embed_model?: string | null; embedding?: string | null; embedding_small?: string | null; fts?: unknown; piece_id: string; status?: Database["public"]["Enums"]["search_status"]; transcript?: string | null; updated_at?: string }
        Update: { description?: string | null; doc?: string | null; embed_model?: string | null; embedding?: string | null; embedding_small?: string | null; fts?: unknown; piece_id?: string; status?: Database["public"]["Enums"]["search_status"]; transcript?: string | null; updated_at?: string }
        Relationships: []
      }
      pieces: {
        Row: { after_piece_id: string | null; artist_id: string; attested: boolean; body: string | null; caption: string | null; comment_count: number; comments_closed: boolean; created_at: string; id: string; listen_count: number; medium: Database["public"]["Enums"]["medium"]; mux_asset_id: string | null; mux_playback_id: string | null; published_at: string; reaction_count: number; sequence_no: number; status: Database["public"]["Enums"]["piece_status"]; tags: string[]; title: string | null; updated_at: string; view_count: number; visibility: Database["public"]["Enums"]["visibility"] }
        Insert: { after_piece_id?: string | null; artist_id: string; attested?: boolean; body?: string | null; caption?: string | null; comment_count?: number; comments_closed?: boolean; created_at?: string; id?: string; listen_count?: number; medium: Database["public"]["Enums"]["medium"]; mux_asset_id?: string | null; mux_playback_id?: string | null; published_at?: string; reaction_count?: number; sequence_no: number; status?: Database["public"]["Enums"]["piece_status"]; tags?: string[]; title?: string | null; updated_at?: string; view_count?: number; visibility?: Database["public"]["Enums"]["visibility"] }
        Update: { after_piece_id?: string | null; artist_id?: string; attested?: boolean; body?: string | null; caption?: string | null; comment_count?: number; comments_closed?: boolean; created_at?: string; id?: string; listen_count?: number; medium?: Database["public"]["Enums"]["medium"]; mux_asset_id?: string | null; mux_playback_id?: string | null; published_at?: string; reaction_count?: number; sequence_no?: number; status?: Database["public"]["Enums"]["piece_status"]; tags?: string[]; title?: string | null; updated_at?: string; view_count?: number; visibility?: Database["public"]["Enums"]["visibility"] }
        Relationships: []
      }
      profiles: {
        Row: { avatar_path: string | null; bio: string | null; created_at: string; display_name: string; follower_count: number; following_count: number; handle: string; id: string; interests: string[]; links: Json; onboarded: boolean; piece_seq: number; pinned_piece_id: string | null; quiet_mode: boolean; role: Database["public"]["Enums"]["user_role"]; updated_at: string }
        Insert: { avatar_path?: string | null; bio?: string | null; created_at?: string; display_name: string; follower_count?: number; following_count?: number; handle: string; id: string; interests?: string[]; links?: Json; onboarded?: boolean; piece_seq?: number; pinned_piece_id?: string | null; quiet_mode?: boolean; role?: Database["public"]["Enums"]["user_role"]; updated_at?: string }
        Update: { avatar_path?: string | null; bio?: string | null; created_at?: string; display_name?: string; follower_count?: number; following_count?: number; handle?: string; id?: string; interests?: string[]; links?: Json; onboarded?: boolean; piece_seq?: number; pinned_piece_id?: string | null; quiet_mode?: boolean; role?: Database["public"]["Enums"]["user_role"]; updated_at?: string }
        Relationships: []
      }
      rate_limits: {
        Row: { action: string; created_at: string; id: number; subject: string }
        Insert: { action: string; created_at?: string; id?: never; subject: string }
        Update: { action?: string; created_at?: string; id?: never; subject?: string }
        Relationships: []
      }
      reactions: {
        Row: { created_at: string; kind: Database["public"]["Enums"]["reaction_kind"]; piece_id: string; user_id: string }
        Insert: { created_at?: string; kind: Database["public"]["Enums"]["reaction_kind"]; piece_id: string; user_id: string }
        Update: { created_at?: string; kind?: Database["public"]["Enums"]["reaction_kind"]; piece_id?: string; user_id?: string }
        Relationships: []
      }
      reports: {
        Row: { created_at: string; detail: string | null; id: string; reason: Database["public"]["Enums"]["report_reason"]; reporter_id: string | null; resolved_at: string | null; resolved_by: string | null; status: Database["public"]["Enums"]["report_status"]; target_id: string; target_type: Database["public"]["Enums"]["report_target"] }
        Insert: { created_at?: string; detail?: string | null; id?: string; reason: Database["public"]["Enums"]["report_reason"]; reporter_id?: string | null; resolved_at?: string | null; resolved_by?: string | null; status?: Database["public"]["Enums"]["report_status"]; target_id: string; target_type: Database["public"]["Enums"]["report_target"] }
        Update: { created_at?: string; detail?: string | null; id?: string; reason?: Database["public"]["Enums"]["report_reason"]; reporter_id?: string | null; resolved_at?: string | null; resolved_by?: string | null; status?: Database["public"]["Enums"]["report_status"]; target_id?: string; target_type?: Database["public"]["Enums"]["report_target"] }
        Relationships: []
      }
      scout_waitlist: {
        Row: { created_at: string; email: string; id: string; note: string | null; org: string | null; role: string | null }
        Insert: { created_at?: string; email: string; id?: string; note?: string | null; org?: string | null; role?: string | null }
        Update: { created_at?: string; email?: string; id?: string; note?: string | null; org?: string | null; role?: string | null }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      account_media_manifest: { Args: { p_uid: string }; Returns: Json }
      can_view_piece: { Args: { p_id: string }; Returns: boolean }
      consume_rate_limit: { Args: { p_action: string; p_max: number; p_window_seconds: number }; Returns: boolean }
      get_following_feed: { Args: { p_cursor_id?: string; p_cursor_ts?: string; p_limit?: number }; Returns: { card: Json; id: string; published_at: string }[] }
      get_piece: { Args: { p_id: string }; Returns: Json }
      get_piece_comments: { Args: { p_id: string; p_limit?: number }; Returns: { comment: Json }[] }
      get_piece_reactions: { Args: { p_id: string }; Returns: Json }
      get_pieces_after: { Args: { p_id: string; p_limit?: number }; Returns: { card: Json }[] }
      get_profile_pieces: { Args: { p_cursor_id?: string; p_cursor_ts?: string; p_handle: string; p_limit?: number; p_medium?: Database["public"]["Enums"]["medium"] }; Returns: { card: Json; id: string; published_at: string }[] }
      get_wander_pool: { Args: { p_exclude?: string[]; p_limit?: number }; Returns: { artist_id: string; card: Json; is_exploration: boolean; medium: Database["public"]["Enums"]["medium"]; score: number }[] }
      is_admin: { Args: Record<string, never>; Returns: boolean }
      is_following: { Args: { target: string }; Returns: boolean }
      is_reserved_handle: { Args: { h: string }; Returns: boolean }
      piece_card_json: { Args: { p_id: string }; Returns: Json }
      record_engagement: { Args: { p_id: string; p_kind: string }; Returns: undefined }
      refresh_recommendations: { Args: Record<string, never>; Returns: undefined }
      search_pieces: { Args: { p_limit?: number; p_media?: Database["public"]["Enums"]["medium"][]; p_query?: string; p_query_emb?: string; p_query_emb_small?: string; p_tags?: string[] }; Returns: { card: Json; score: number }[] }
      storage_media_piece_id: { Args: { object_name: string }; Returns: string }
      toggle_reaction: { Args: { p_id: string; p_kind: Database["public"]["Enums"]["reaction_kind"] }; Returns: Json }
    }
    Enums: {
      comment_status: "active" | "hidden" | "deleted"
      job_stage: "embed" | "describe" | "transcribe" | "index"
      job_status: "pending" | "processing" | "done" | "error" | "skipped"
      media_kind: "audio" | "image" | "video"
      medium: "sound" | "video" | "image" | "words"
      piece_status: "active" | "hidden" | "deleted"
      reaction_kind: "keep_going" | "felt_this" | "on_repeat" | "teach_me"
      report_reason: "ai_generated" | "stolen" | "harassment" | "explicit" | "other"
      report_status: "open" | "reviewing" | "resolved" | "dismissed"
      report_target: "piece" | "comment" | "profile"
      search_status: "pending" | "partial" | "ready" | "error"
      user_role: "artist" | "admin"
      visibility: "public" | "followers" | "unlisted"
    }
    CompositeTypes: { [_ in never]: never }
  }
}

type DefaultSchema = Database["public"]

export type Tables<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Update"]
export type Enums<T extends keyof DefaultSchema["Enums"]> = DefaultSchema["Enums"][T]
