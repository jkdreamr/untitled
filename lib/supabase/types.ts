export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      collection_follows: {
        Row: {
          collection_id: string
          created_at: string
          follower_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          follower_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          follower_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_follows_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_items: {
        Row: {
          added_at: string
          collection_id: string
          note: string | null
          piece_id: string
          position: number
        }
        Insert: {
          added_at?: string
          collection_id: string
          note?: string | null
          piece_id: string
          position?: number
        }
        Update: {
          added_at?: string
          collection_id?: string
          note?: string | null
          piece_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "pieces"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          description: string | null
          follower_count: number
          id: string
          is_public: boolean
          item_count: number
          owner_id: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          follower_count?: number
          id?: string
          is_public?: boolean
          item_count?: number
          owner_id: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          follower_count?: number
          id?: string
          is_public?: boolean
          item_count?: number
          owner_id?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          created_at: string
          id: string
          piece_id: string
          status: Database["public"]["Enums"]["comment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          piece_id: string
          status?: Database["public"]["Enums"]["comment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          piece_id?: string
          status?: Database["public"]["Enums"]["comment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "pieces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrichment_jobs: {
        Row: {
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          piece_id: string
          run_after: string
          stage: Database["public"]["Enums"]["job_stage"]
          status: Database["public"]["Enums"]["job_status"]
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          piece_id: string
          run_after?: string
          stage: Database["public"]["Enums"]["job_stage"]
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          piece_id?: string
          run_after?: string
          stage?: Database["public"]["Enums"]["job_stage"]
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrichment_jobs_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "pieces"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      piece_media: {
        Row: {
          blurhash: string | null
          bytes: number | null
          created_at: string
          duration_seconds: number | null
          height: number | null
          id: string
          kind: Database["public"]["Enums"]["media_kind"]
          mime: string | null
          peaks: Json | null
          piece_id: string
          position: number
          storage_path: string | null
          width: number | null
        }
        Insert: {
          blurhash?: string | null
          bytes?: number | null
          created_at?: string
          duration_seconds?: number | null
          height?: number | null
          id?: string
          kind: Database["public"]["Enums"]["media_kind"]
          mime?: string | null
          peaks?: Json | null
          piece_id: string
          position?: number
          storage_path?: string | null
          width?: number | null
        }
        Update: {
          blurhash?: string | null
          bytes?: number | null
          created_at?: string
          duration_seconds?: number | null
          height?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["media_kind"]
          mime?: string | null
          peaks?: Json | null
          piece_id?: string
          position?: number
          storage_path?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "piece_media_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "pieces"
            referencedColumns: ["id"]
          },
        ]
      }
      piece_neighbors: {
        Row: {
          neighbor_id: string
          piece_id: string
          score: number
        }
        Insert: {
          neighbor_id: string
          piece_id: string
          score: number
        }
        Update: {
          neighbor_id?: string
          piece_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "piece_neighbors_neighbor_id_fkey"
            columns: ["neighbor_id"]
            isOneToOne: false
            referencedRelation: "pieces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "piece_neighbors_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "pieces"
            referencedColumns: ["id"]
          },
        ]
      }
      piece_search: {
        Row: {
          description: string | null
          doc: string | null
          embed_model: string | null
          embedding: string | null
          embedding_small: string | null
          fts: unknown
          lyrics_text: string | null
          piece_id: string
          status: Database["public"]["Enums"]["search_status"]
          transcript: string | null
          transcript_segments: Json | null
          updated_at: string
        }
        Insert: {
          description?: string | null
          doc?: string | null
          embed_model?: string | null
          embedding?: string | null
          embedding_small?: string | null
          fts?: unknown
          lyrics_text?: string | null
          piece_id: string
          status?: Database["public"]["Enums"]["search_status"]
          transcript?: string | null
          transcript_segments?: Json | null
          updated_at?: string
        }
        Update: {
          description?: string | null
          doc?: string | null
          embed_model?: string | null
          embedding?: string | null
          embedding_small?: string | null
          fts?: unknown
          lyrics_text?: string | null
          piece_id?: string
          status?: Database["public"]["Enums"]["search_status"]
          transcript?: string | null
          transcript_segments?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "piece_search_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: true
            referencedRelation: "pieces"
            referencedColumns: ["id"]
          },
        ]
      }
      pieces: {
        Row: {
          after_piece_id: string | null
          artist_id: string
          attested: boolean
          body: string | null
          caption: string | null
          comment_count: number
          comments_closed: boolean
          cover_of_artist: string | null
          cover_of_title: string | null
          created_at: string
          has_vocals: boolean
          id: string
          listen_count: number
          lyric_segments: Json | null
          lyrics: string | null
          lyrics_source: Database["public"]["Enums"]["lyrics_source"] | null
          medium: Database["public"]["Enums"]["medium"]
          mux_asset_id: string | null
          mux_playback_id: string | null
          published_at: string
          reaction_count: number
          sequence_no: number
          show_lyrics: boolean
          status: Database["public"]["Enums"]["piece_status"]
          tags: string[]
          title: string | null
          track_kind: Database["public"]["Enums"]["track_kind"]
          updated_at: string
          view_count: number
          visibility: Database["public"]["Enums"]["visibility"]
        }
        Insert: {
          after_piece_id?: string | null
          artist_id: string
          attested?: boolean
          body?: string | null
          caption?: string | null
          comment_count?: number
          comments_closed?: boolean
          cover_of_artist?: string | null
          cover_of_title?: string | null
          created_at?: string
          has_vocals?: boolean
          id?: string
          listen_count?: number
          lyric_segments?: Json | null
          lyrics?: string | null
          lyrics_source?: Database["public"]["Enums"]["lyrics_source"] | null
          medium: Database["public"]["Enums"]["medium"]
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          published_at?: string
          reaction_count?: number
          sequence_no: number
          show_lyrics?: boolean
          status?: Database["public"]["Enums"]["piece_status"]
          tags?: string[]
          title?: string | null
          track_kind?: Database["public"]["Enums"]["track_kind"]
          updated_at?: string
          view_count?: number
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Update: {
          after_piece_id?: string | null
          artist_id?: string
          attested?: boolean
          body?: string | null
          caption?: string | null
          comment_count?: number
          comments_closed?: boolean
          cover_of_artist?: string | null
          cover_of_title?: string | null
          created_at?: string
          has_vocals?: boolean
          id?: string
          listen_count?: number
          lyric_segments?: Json | null
          lyrics?: string | null
          lyrics_source?: Database["public"]["Enums"]["lyrics_source"] | null
          medium?: Database["public"]["Enums"]["medium"]
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          published_at?: string
          reaction_count?: number
          sequence_no?: number
          show_lyrics?: boolean
          status?: Database["public"]["Enums"]["piece_status"]
          tags?: string[]
          title?: string | null
          track_kind?: Database["public"]["Enums"]["track_kind"]
          updated_at?: string
          view_count?: number
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "pieces_after_piece_id_fkey"
            columns: ["after_piece_id"]
            isOneToOne: false
            referencedRelation: "pieces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pieces_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          bio: string | null
          created_at: string
          display_name: string
          follower_count: number
          following_count: number
          handle: string
          id: string
          interests: string[]
          links: Json
          onboarded: boolean
          open_to: string[]
          piece_seq: number
          pinned_piece_id: string | null
          quiet_mode: boolean
          role: Database["public"]["Enums"]["user_role"]
          roles: string[]
          suspended: boolean
          updated_at: string
          voice_note: string | null
        }
        Insert: {
          avatar_path?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          follower_count?: number
          following_count?: number
          handle: string
          id: string
          interests?: string[]
          links?: Json
          onboarded?: boolean
          open_to?: string[]
          piece_seq?: number
          pinned_piece_id?: string | null
          quiet_mode?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          roles?: string[]
          suspended?: boolean
          updated_at?: string
          voice_note?: string | null
        }
        Update: {
          avatar_path?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          follower_count?: number
          following_count?: number
          handle?: string
          id?: string
          interests?: string[]
          links?: Json
          onboarded?: boolean
          open_to?: string[]
          piece_seq?: number
          pinned_piece_id?: string | null
          quiet_mode?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          roles?: string[]
          suspended?: boolean
          updated_at?: string
          voice_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_pinned_piece_fk"
            columns: ["pinned_piece_id"]
            isOneToOne: false
            referencedRelation: "pieces"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action: string
          created_at: string
          id: number
          subject: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: never
          subject: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: never
          subject?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          created_at: string
          kind: Database["public"]["Enums"]["reaction_kind"]
          piece_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          kind: Database["public"]["Enums"]["reaction_kind"]
          piece_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          kind?: Database["public"]["Enums"]["reaction_kind"]
          piece_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "pieces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scout_waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          note: string | null
          org: string | null
          role: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          note?: string | null
          org?: string | null
          role?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          note?: string | null
          org?: string | null
          role?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      account_media_manifest: { Args: { p_uid: string }; Returns: Json }
      build_piece_doc: {
        Args: {
          p_caption: string
          p_cover_artist: string
          p_cover_title: string
          p_desc: string
          p_lyrics: string
          p_tags: string[]
          p_title: string
          p_transcript: string
        }
        Returns: string
      }
      can_view_piece: { Args: { p_id: string }; Returns: boolean }
      confirm_lyrics: {
        Args: { p_id: string; p_lyrics: string; p_segments: Json }
        Returns: boolean
      }
      consume_rate_limit: {
        Args: { p_action: string; p_max: number; p_window_seconds: number }
        Returns: boolean
      }
      get_following_feed: {
        Args: { p_cursor_id?: string; p_cursor_ts?: string; p_limit?: number }
        Returns: {
          card: Json
          id: string
          published_at: string
        }[]
      }
      get_my_dashboard: { Args: never; Returns: Json }
      get_pending_transcription: { Args: { p_id: string }; Returns: Json }
      get_piece: { Args: { p_id: string }; Returns: Json }
      get_piece_comments: {
        Args: { p_id: string; p_limit?: number }
        Returns: {
          comment: Json
        }[]
      }
      get_piece_reactions: { Args: { p_id: string }; Returns: Json }
      get_pieces_after: {
        Args: { p_id: string; p_limit?: number }
        Returns: {
          card: Json
        }[]
      }
      get_profile_pieces: {
        Args: {
          p_cursor_id?: string
          p_cursor_ts?: string
          p_handle: string
          p_limit?: number
          p_medium?: Database["public"]["Enums"]["medium"]
        }
        Returns: {
          card: Json
          id: string
          published_at: string
        }[]
      }
      get_wander_pool: {
        Args: { p_exclude?: string[]; p_limit?: number }
        Returns: {
          artist_id: string
          card: Json
          is_exploration: boolean
          medium: Database["public"]["Enums"]["medium"]
          score: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_following: { Args: { target: string }; Returns: boolean }
      is_reserved_handle: { Args: { h: string }; Returns: boolean }
      piece_card_json: { Args: { p_id: string }; Returns: Json }
      record_engagement: {
        Args: { p_id: string; p_kind: string }
        Returns: undefined
      }
      refresh_recommendations: { Args: never; Returns: undefined }
      resolve_report: {
        Args: {
          p_report_id: string
          p_status: Database["public"]["Enums"]["report_status"]
        }
        Returns: undefined
      }
      search_pieces: {
        Args: {
          p_has_vocals?: boolean
          p_kinds?: Database["public"]["Enums"]["track_kind"][]
          p_limit?: number
          p_media?: Database["public"]["Enums"]["medium"][]
          p_query?: string
          p_query_emb?: string
          p_query_emb_small?: string
          p_tags?: string[]
        }
        Returns: {
          card: Json
          lyric_hit: boolean
          score: number
          semantic: boolean
        }[]
      }
      storage_media_piece_id: { Args: { object_name: string }; Returns: string }
      suspend_user: {
        Args: { p_suspended: boolean; p_uid: string }
        Returns: undefined
      }
      toggle_reaction: {
        Args: {
          p_id: string
          p_kind: Database["public"]["Enums"]["reaction_kind"]
        }
        Returns: Json
      }
    }
    Enums: {
      comment_status: "active" | "hidden" | "deleted"
      job_stage: "embed" | "describe" | "transcribe" | "index"
      job_status: "pending" | "processing" | "done" | "error" | "skipped"
      lyrics_source: "written" | "transcribed_confirmed"
      media_kind: "audio" | "image" | "video"
      medium: "sound" | "video" | "image" | "words"
      piece_status: "active" | "hidden" | "deleted"
      reaction_kind: "keep_going" | "felt_this" | "on_repeat" | "teach_me"
      report_reason:
        | "ai_generated"
        | "stolen"
        | "harassment"
        | "explicit"
        | "other"
      report_status: "open" | "reviewing" | "resolved" | "dismissed"
      report_target: "piece" | "comment" | "profile"
      search_status: "pending" | "partial" | "ready" | "error"
      track_kind: "original" | "cover" | "beat" | "freestyle"
      user_role: "artist" | "admin"
      visibility: "public" | "followers" | "unlisted"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      comment_status: ["active", "hidden", "deleted"],
      job_stage: ["embed", "describe", "transcribe", "index"],
      job_status: ["pending", "processing", "done", "error", "skipped"],
      lyrics_source: ["written", "transcribed_confirmed"],
      media_kind: ["audio", "image", "video"],
      medium: ["sound", "video", "image", "words"],
      piece_status: ["active", "hidden", "deleted"],
      reaction_kind: ["keep_going", "felt_this", "on_repeat", "teach_me"],
      report_reason: [
        "ai_generated",
        "stolen",
        "harassment",
        "explicit",
        "other",
      ],
      report_status: ["open", "reviewing", "resolved", "dismissed"],
      report_target: ["piece", "comment", "profile"],
      search_status: ["pending", "partial", "ready", "error"],
      track_kind: ["original", "cover", "beat", "freestyle"],
      user_role: ["artist", "admin"],
      visibility: ["public", "followers", "unlisted"],
    },
  },
} as const
