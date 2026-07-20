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
      artist_momentum: {
        Row: {
          artist_id: string
          components: Json
          computed_at: string
          score: number
          window_days: number
        }
        Insert: {
          artist_id: string
          components: Json
          computed_at?: string
          score: number
          window_days: number
        }
        Update: {
          artist_id?: string
          components?: Json
          computed_at?: string
          score?: number
          window_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "artist_momentum_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_signals_daily: {
        Row: {
          after_children_gained: number
          artist_id: string
          collections_gained: number
          completes: number
          completion_rate: number
          day: string
          followers_gained: number
          listens: number
          reactions_gained: number
          repeat_listeners: number
          scout_query_hits: number
        }
        Insert: {
          after_children_gained?: number
          artist_id: string
          collections_gained?: number
          completes?: number
          completion_rate?: number
          day: string
          followers_gained?: number
          listens?: number
          reactions_gained?: number
          repeat_listeners?: number
          scout_query_hits?: number
        }
        Update: {
          after_children_gained?: number
          artist_id?: string
          collections_gained?: number
          completes?: number
          completion_rate?: number
          day?: string
          followers_gained?: number
          listens?: number
          reactions_gained?: number
          repeat_listeners?: number
          scout_query_hits?: number
        }
        Relationships: [
          {
            foreignKeyName: "artist_signals_daily_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brief_matches: {
        Row: {
          brief_id: number
          created_at: string
          piece_id: string
          score: number
          status: Database["public"]["Enums"]["brief_match_status"]
        }
        Insert: {
          brief_id: number
          created_at?: string
          piece_id: string
          score?: number
          status?: Database["public"]["Enums"]["brief_match_status"]
        }
        Update: {
          brief_id?: number
          created_at?: string
          piece_id?: string
          score?: number
          status?: Database["public"]["Enums"]["brief_match_status"]
        }
        Relationships: [
          {
            foreignKeyName: "brief_matches_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "sync_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brief_matches_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "pieces"
            referencedColumns: ["id"]
          },
        ]
      }
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
      listen_events: {
        Row: {
          created_at: string
          id: number
          listener_id: string | null
          piece_id: string
          quartile: number
        }
        Insert: {
          created_at?: string
          id?: never
          listener_id?: string | null
          piece_id: string
          quartile: number
        }
        Update: {
          created_at?: string
          id?: never
          listener_id?: string | null
          piece_id?: string
          quartile?: number
        }
        Relationships: [
          {
            foreignKeyName: "listen_events_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "pieces"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: number
          kind: string
          payload: Json
          read_at: string | null
          recipient_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          kind: string
          payload?: Json
          read_at?: string | null
          recipient_id: string
        }
        Update: {
          created_at?: string
          id?: never
          kind?: string
          payload?: Json
          read_at?: string | null
          recipient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
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
          visible_to_scouts: boolean
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
          visible_to_scouts?: boolean
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
          visible_to_scouts?: boolean
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
      scout_accounts: {
        Row: {
          created_at: string
          granted_by: string | null
          org_name: string
          profile_id: string
          status: Database["public"]["Enums"]["scout_status"]
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          org_name: string
          profile_id: string
          status?: Database["public"]["Enums"]["scout_status"]
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          org_name?: string
          profile_id?: string
          status?: Database["public"]["Enums"]["scout_status"]
        }
        Relationships: [
          {
            foreignKeyName: "scout_accounts_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scout_accounts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scout_list_items: {
        Row: {
          added_at: string
          artist_id: string
          list_id: number
          note: string | null
        }
        Insert: {
          added_at?: string
          artist_id: string
          list_id: number
          note?: string | null
        }
        Update: {
          added_at?: string
          artist_id?: string
          list_id?: number
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scout_list_items_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scout_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "scout_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      scout_lists: {
        Row: {
          created_at: string
          id: number
          name: string
          scout_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          name: string
          scout_id: string
        }
        Update: {
          created_at?: string
          id?: never
          name?: string
          scout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scout_lists_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scout_queries: {
        Row: {
          created_at: string
          filters: Json
          id: number
          query_text: string
          scout_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: never
          query_text?: string
          scout_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: never
          query_text?: string
          scout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scout_queries_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scout_saved_searches: {
        Row: {
          created_at: string
          id: number
          name: string
          params: Json
          scout_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          name: string
          params?: Json
          scout_id: string
        }
        Update: {
          created_at?: string
          id?: never
          name?: string
          params?: Json
          scout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scout_saved_searches_scout_id_fkey"
            columns: ["scout_id"]
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
      sync_briefs: {
        Row: {
          brief_text: string
          budget_range: string | null
          contact_email: string | null
          contact_name: string | null
          created_at: string
          id: number
          org_name: string
          status: Database["public"]["Enums"]["sync_brief_status"]
          usage_type: Database["public"]["Enums"]["sync_usage_type"]
        }
        Insert: {
          brief_text: string
          budget_range?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: never
          org_name: string
          status?: Database["public"]["Enums"]["sync_brief_status"]
          usage_type?: Database["public"]["Enums"]["sync_usage_type"]
        }
        Update: {
          brief_text?: string
          budget_range?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: never
          org_name?: string
          status?: Database["public"]["Enums"]["sync_brief_status"]
          usage_type?: Database["public"]["Enums"]["sync_usage_type"]
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
          p_lyrics: string
          p_tags: string[]
          p_title: string
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
          p_kind?: Database["public"]["Enums"]["track_kind"]
          p_limit?: number
          p_medium?: Database["public"]["Enums"]["medium"]
        }
        Returns: {
          card: Json
          id: string
          published_at: string
        }[]
      }
      get_similar_tracks: {
        Args: { p_id: string; p_limit?: number }
        Returns: {
          card: Json
        }[]
      }
      get_wander_pool: {
        Args: { p_exclude?: string[]; p_limit?: number }
        Returns: {
          artist_id: string
          card: Json
          is_exploration: boolean
          score: number
          track_kind: Database["public"]["Enums"]["track_kind"]
        }[]
      }
      grant_scout: {
        Args: { p_org_name: string; p_profile_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_following: { Args: { target: string }; Returns: boolean }
      is_reserved_handle: { Args: { h: string }; Returns: boolean }
      is_scout: { Args: never; Returns: boolean }
      piece_card_json: { Args: { p_id: string }; Returns: Json }
      record_engagement: {
        Args: { p_id: string; p_kind: string }
        Returns: undefined
      }
      record_listen_progress: {
        Args: { p_id: string; p_quartile: number }
        Returns: undefined
      }
      refresh_artist_signals: { Args: never; Returns: undefined }
      refresh_recommendations: { Args: never; Returns: undefined }
      resolve_report: {
        Args: {
          p_report_id: string
          p_status: Database["public"]["Enums"]["report_status"]
        }
        Returns: undefined
      }
      scout_artist_signals: { Args: { p_artist_id: string }; Returns: Json }
      scout_search_artists: {
        Args: {
          p_has_vocals?: boolean
          p_kinds?: Database["public"]["Enums"]["track_kind"][]
          p_limit?: number
          p_open_to?: string[]
          p_query?: string
          p_roles?: string[]
          p_sort?: string
          p_tags?: string[]
        }
        Returns: {
          artist: Json
          momentum: number
          score: number
        }[]
      }
      search_artists: {
        Args: {
          p_limit?: number
          p_open_to?: string[]
          p_query?: string
          p_roles?: string[]
          p_tags?: string[]
        }
        Returns: {
          artist: Json
          score: number
        }[]
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
      send_scout_contact: {
        Args: { p_body: string; p_target_id: string }
        Returns: Json
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
      brief_match_status:
        | "suggested"
        | "artist_notified"
        | "artist_approved"
        | "declined"
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
      scout_status: "pending" | "approved" | "revoked"
      search_status: "pending" | "partial" | "ready" | "error"
      sync_brief_status: "open" | "matched" | "closed"
      sync_usage_type: "ad" | "game" | "film" | "social" | "other"
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
      brief_match_status: [
        "suggested",
        "artist_notified",
        "artist_approved",
        "declined",
      ],
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
      scout_status: ["pending", "approved", "revoked"],
      search_status: ["pending", "partial", "ready", "error"],
      sync_brief_status: ["open", "matched", "closed"],
      sync_usage_type: ["ad", "game", "film", "social", "other"],
      track_kind: ["original", "cover", "beat", "freestyle"],
      user_role: ["artist", "admin"],
      visibility: ["public", "followers", "unlisted"],
    },
  },
} as const
