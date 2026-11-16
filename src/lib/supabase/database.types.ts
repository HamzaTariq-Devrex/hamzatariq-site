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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: number
          page: string | null
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: never
          page?: string | null
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: never
          page?: string | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          first_page: string | null
          id: string
          ip_hash: string | null
          last_message_at: string
          message_count: number
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          first_page?: string | null
          id: string
          ip_hash?: string | null
          last_message_at?: string
          message_count?: number
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          first_page?: string | null
          id?: string
          ip_hash?: string | null
          last_message_at?: string
          message_count?: number
          user_agent?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          data: Json
          id: number
          name: string
          page: string | null
          session_id: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: never
          name: string
          page?: string | null
          session_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          id?: never
          name?: string
          page?: string | null
          session_id?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          audit_id: string | null
          budget: string | null
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          notes: string | null
          notified_at: string | null
          page: string | null
          phone: string | null
          project_type: string | null
          session_id: string | null
          source: string
          status: string
        }
        Insert: {
          audit_id?: string | null
          budget?: string | null
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          notes?: string | null
          notified_at?: string | null
          page?: string | null
          phone?: string | null
          project_type?: string | null
          session_id?: string | null
          source: string
          status?: string
        }
        Update: {
          audit_id?: string | null
          budget?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          notes?: string | null
          notified_at?: string | null
          page?: string | null
          phone?: string | null
          project_type?: string | null
          session_id?: string | null
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "seo_audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_cache: {
        Row: {
          created_at: string
          key: string
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          value: Json
        }
        Update: {
          created_at?: string
          key?: string
          value?: Json
        }
        Relationships: []
      }
      outreach_coverage: {
        Row: {
          attempts: number
          business_type: string
          city: string
          country: string
          done_at: string | null
          error: string | null
          found: number
          region: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          business_type: string
          city: string
          country: string
          done_at?: string | null
          error?: string | null
          found?: number
          region: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          business_type?: string
          city?: string
          country?: string
          done_at?: string | null
          error?: string | null
          found?: number
          region?: string
          updated_at?: string
        }
        Relationships: []
      }
      outreach_messages: {
        Row: {
          approved_at: string | null
          body: string
          created_at: string
          direction: string
          error: string | null
          id: string
          in_reply_to: string | null
          kind: string
          message_id: string | null
          prospect_id: string
          review_reason: string | null
          sent_at: string | null
          status: string
          step: number | null
          subject: string
          variant: string | null
        }
        Insert: {
          approved_at?: string | null
          body: string
          created_at?: string
          direction?: string
          error?: string | null
          id?: string
          in_reply_to?: string | null
          kind?: string
          message_id?: string | null
          prospect_id: string
          review_reason?: string | null
          sent_at?: string | null
          status?: string
          step?: number | null
          subject: string
          variant?: string | null
        }
        Update: {
          approved_at?: string | null
          body?: string
          created_at?: string
          direction?: string
          error?: string | null
          id?: string
          in_reply_to?: string | null
          kind?: string
          message_id?: string | null
          prospect_id?: string
          review_reason?: string | null
          sent_at?: string | null
          status?: string
          step?: number | null
          subject?: string
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_messages_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_searches: {
        Row: {
          active: boolean
          business_type: string
          city: string
          country: string
          created_at: string
          id: string
          last_found: number
          last_run_at: string | null
          lat: number | null
          lon: number | null
          osm_area: number | null
          timezone: string | null
        }
        Insert: {
          active?: boolean
          business_type: string
          city: string
          country: string
          created_at?: string
          id?: string
          last_found?: number
          last_run_at?: string | null
          lat?: number | null
          lon?: number | null
          osm_area?: number | null
          timezone?: string | null
        }
        Update: {
          active?: boolean
          business_type?: string
          city?: string
          country?: string
          created_at?: string
          id?: string
          last_found?: number
          last_run_at?: string | null
          lat?: number | null
          lon?: number | null
          osm_area?: number | null
          timezone?: string | null
        }
        Relationships: []
      }
      outreach_settings: {
        Row: {
          approve_first: boolean
          id: number
          last_imap_at: string | null
          last_imap_uid: number | null
          last_tick_at: string | null
          next_send_at: string | null
          pause_reason: string | null
          paused: boolean
          resumed_at: string | null
          started_at: string | null
          updated_at: string
        }
        Insert: {
          approve_first?: boolean
          id?: number
          last_imap_at?: string | null
          last_imap_uid?: number | null
          last_tick_at?: string | null
          next_send_at?: string | null
          pause_reason?: string | null
          paused?: boolean
          resumed_at?: string | null
          started_at?: string | null
          updated_at?: string
        }
        Update: {
          approve_first?: boolean
          id?: number
          last_imap_at?: string | null
          last_imap_uid?: number | null
          last_tick_at?: string | null
          next_send_at?: string | null
          pause_reason?: string | null
          paused?: boolean
          resumed_at?: string | null
          started_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      prospect_audits: {
        Row: {
          created_at: string
          expires_at: string
          final_url: string | null
          id: string
          prospect_id: string
          report_id: string
          result: Json | null
          score: number | null
          url: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          final_url?: string | null
          id?: string
          prospect_id: string
          report_id?: string
          result?: Json | null
          score?: number | null
          url: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          final_url?: string | null
          id?: string
          prospect_id?: string
          report_id?: string
          result?: Json | null
          score?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_audits_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_previews: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          prospect_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          prospect_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          prospect_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_previews_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: true
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          audit_score: number | null
          business_type: string
          city: string | null
          country: string
          created_at: string
          domain: string | null
          email: string | null
          email_source: string | null
          flags: Json
          id: string
          instagram: string | null
          last_contacted_at: string | null
          lead_id: string | null
          lead_score: number | null
          name: string
          next_followup_at: string | null
          notes: string | null
          osm_id: string
          osm_tags: Json
          phone: string | null
          preview_id: string | null
          qualified_at: string | null
          region: string | null
          reply_class: string | null
          search_id: string | null
          skip_reason: string | null
          snooze_until: string | null
          status: string
          timezone: string
          unsubscribe_token: string
          updated_at: string
          website: string | null
        }
        Insert: {
          audit_score?: number | null
          business_type: string
          city?: string | null
          country: string
          created_at?: string
          domain?: string | null
          email?: string | null
          email_source?: string | null
          flags?: Json
          id?: string
          instagram?: string | null
          last_contacted_at?: string | null
          lead_id?: string | null
          lead_score?: number | null
          name: string
          next_followup_at?: string | null
          notes?: string | null
          osm_id: string
          osm_tags?: Json
          phone?: string | null
          preview_id?: string | null
          qualified_at?: string | null
          region?: string | null
          reply_class?: string | null
          search_id?: string | null
          skip_reason?: string | null
          snooze_until?: string | null
          status?: string
          timezone: string
          unsubscribe_token?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          audit_score?: number | null
          business_type?: string
          city?: string | null
          country?: string
          created_at?: string
          domain?: string | null
          email?: string | null
          email_source?: string | null
          flags?: Json
          id?: string
          instagram?: string | null
          last_contacted_at?: string | null
          lead_id?: string | null
          lead_score?: number | null
          name?: string
          next_followup_at?: string | null
          notes?: string | null
          osm_id?: string
          osm_tags?: Json
          phone?: string | null
          preview_id?: string | null
          qualified_at?: string | null
          region?: string | null
          reply_class?: string | null
          search_id?: string | null
          skip_reason?: string | null
          snooze_until?: string | null
          status?: string
          timezone?: string
          unsubscribe_token?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "outreach_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_audits: {
        Row: {
          created_at: string
          final_url: string | null
          id: string
          ip_hash: string | null
          result: Json
          score: number
          url: string
        }
        Insert: {
          created_at?: string
          final_url?: string | null
          id?: string
          ip_hash?: string | null
          result: Json
          score: number
          url: string
        }
        Update: {
          created_at?: string
          final_url?: string | null
          id?: string
          ip_hash?: string | null
          result?: Json
          score?: number
          url?: string
        }
        Relationships: []
      }
      seo_cwv: {
        Row: {
          day: string
          field_category: string | null
          field_cls: number | null
          field_inp_ms: number | null
          field_lcp_ms: number | null
          field_source: string | null
          lab_cls: number | null
          lab_lcp_ms: number | null
          lab_tbt_ms: number | null
          performance: number | null
          template: string
          url: string
        }
        Insert: {
          day: string
          field_category?: string | null
          field_cls?: number | null
          field_inp_ms?: number | null
          field_lcp_ms?: number | null
          field_source?: string | null
          lab_cls?: number | null
          lab_lcp_ms?: number | null
          lab_tbt_ms?: number | null
          performance?: number | null
          template: string
          url: string
        }
        Update: {
          day?: string
          field_category?: string | null
          field_cls?: number | null
          field_inp_ms?: number | null
          field_lcp_ms?: number | null
          field_source?: string | null
          lab_cls?: number | null
          lab_lcp_ms?: number | null
          lab_tbt_ms?: number | null
          performance?: number | null
          template?: string
          url?: string
        }
        Relationships: []
      }
      seo_fixes: {
        Row: {
          after: Json | null
          approved_at: string | null
          attempts: number
          baseline: Json | null
          change: string
          commit: string | null
          created_at: string
          data: Json
          done_at: string | null
          id: string
          key: string
          note: string | null
          page: string | null
          reason: string
          risk: string
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          after?: Json | null
          approved_at?: string | null
          attempts?: number
          baseline?: Json | null
          change: string
          commit?: string | null
          created_at?: string
          data?: Json
          done_at?: string | null
          id?: string
          key: string
          note?: string | null
          page?: string | null
          reason: string
          risk: string
          status: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          after?: Json | null
          approved_at?: string | null
          attempts?: number
          baseline?: Json | null
          change?: string
          commit?: string | null
          created_at?: string
          data?: Json
          done_at?: string | null
          id?: string
          key?: string
          note?: string | null
          page?: string | null
          reason?: string
          risk?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_issues: {
        Row: {
          detail: string
          first_seen: string
          fix_key: string | null
          last_seen: string
          path: string
          resolved_at: string | null
          severity: string
          type: string
        }
        Insert: {
          detail: string
          first_seen?: string
          fix_key?: string | null
          last_seen?: string
          path: string
          resolved_at?: string | null
          severity: string
          type: string
        }
        Update: {
          detail?: string
          first_seen?: string
          fix_key?: string | null
          last_seen?: string
          path?: string
          resolved_at?: string | null
          severity?: string
          type?: string
        }
        Relationships: []
      }
      seo_keywords: {
        Row: {
          clicks: number
          cluster: string | null
          data: Json
          first_seen: string
          has_page: boolean
          impressions: number
          intent: string | null
          keyword: string
          page: string | null
          position: number | null
          sources: string[]
          status: string
          updated_at: string
        }
        Insert: {
          clicks?: number
          cluster?: string | null
          data?: Json
          first_seen?: string
          has_page?: boolean
          impressions?: number
          intent?: string | null
          keyword: string
          page?: string | null
          position?: number | null
          sources?: string[]
          status?: string
          updated_at?: string
        }
        Update: {
          clicks?: number
          cluster?: string | null
          data?: Json
          first_seen?: string
          has_page?: boolean
          impressions?: number
          intent?: string | null
          keyword?: string
          page?: string | null
          position?: number | null
          sources?: string[]
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_links: {
        Row: {
          checked_at: string | null
          error: string | null
          fail_count: number
          found_on: string[]
          status: number | null
          url: string
        }
        Insert: {
          checked_at?: string | null
          error?: string | null
          fail_count?: number
          found_on?: string[]
          status?: number | null
          url: string
        }
        Update: {
          checked_at?: string | null
          error?: string | null
          fail_count?: number
          found_on?: string[]
          status?: number | null
          url?: string
        }
        Relationships: []
      }
      seo_opportunities: {
        Row: {
          computed_at: string
          data: Json
          fix_key: string | null
          id: number
          kind: string
          page: string | null
          query: string | null
          score: number
        }
        Insert: {
          computed_at?: string
          data?: Json
          fix_key?: string | null
          id?: never
          kind: string
          page?: string | null
          query?: string | null
          score?: number
        }
        Update: {
          computed_at?: string
          data?: Json
          fix_key?: string | null
          id?: never
          kind?: string
          page?: string | null
          query?: string | null
          score?: number
        }
        Relationships: []
      }
      seo_pages: {
        Row: {
          canonical: string | null
          coverage_state: string | null
          crawled_at: string | null
          description: string | null
          external_links: string[]
          google_canonical: string | null
          h1_count: number | null
          has_jsonld: boolean | null
          has_og: boolean | null
          images_missing_alt: number | null
          in_sitemap: boolean
          index_verdict: string | null
          indexing_state: string | null
          inspected_at: string | null
          last_google_crawl: string | null
          links_out: string[]
          noindex: boolean | null
          page_fetch_state: string | null
          path: string
          redirect_to: string | null
          response_ms: number | null
          robots_state: string | null
          status: number | null
          template: string
          title: string | null
          words: number | null
        }
        Insert: {
          canonical?: string | null
          coverage_state?: string | null
          crawled_at?: string | null
          description?: string | null
          external_links?: string[]
          google_canonical?: string | null
          h1_count?: number | null
          has_jsonld?: boolean | null
          has_og?: boolean | null
          images_missing_alt?: number | null
          in_sitemap?: boolean
          index_verdict?: string | null
          indexing_state?: string | null
          inspected_at?: string | null
          last_google_crawl?: string | null
          links_out?: string[]
          noindex?: boolean | null
          page_fetch_state?: string | null
          path: string
          redirect_to?: string | null
          response_ms?: number | null
          robots_state?: string | null
          status?: number | null
          template: string
          title?: string | null
          words?: number | null
        }
        Update: {
          canonical?: string | null
          coverage_state?: string | null
          crawled_at?: string | null
          description?: string | null
          external_links?: string[]
          google_canonical?: string | null
          h1_count?: number | null
          has_jsonld?: boolean | null
          has_og?: boolean | null
          images_missing_alt?: number | null
          in_sitemap?: boolean
          index_verdict?: string | null
          indexing_state?: string | null
          inspected_at?: string | null
          last_google_crawl?: string | null
          links_out?: string[]
          noindex?: boolean | null
          page_fetch_state?: string | null
          path?: string
          redirect_to?: string | null
          response_ms?: number | null
          robots_state?: string | null
          status?: number | null
          template?: string
          title?: string | null
          words?: number | null
        }
        Relationships: []
      }
      seo_search: {
        Row: {
          clicks: number
          day: string
          engine: string
          impressions: number
          page: string
          position: number | null
          query: string
        }
        Insert: {
          clicks?: number
          day: string
          engine: string
          impressions?: number
          page?: string
          position?: number | null
          query?: string
        }
        Update: {
          clicks?: number
          day?: string
          engine?: string
          impressions?: number
          page?: string
          position?: number | null
          query?: string
        }
        Relationships: []
      }
      seo_sitemaps: {
        Row: {
          errors: number | null
          indexed: number | null
          is_pending: boolean | null
          last_downloaded: string | null
          last_submitted: string | null
          path: string
          submitted: number | null
          synced_at: string
          warnings: number | null
        }
        Insert: {
          errors?: number | null
          indexed?: number | null
          is_pending?: boolean | null
          last_downloaded?: string | null
          last_submitted?: string | null
          path: string
          submitted?: number | null
          synced_at?: string
          warnings?: number | null
        }
        Update: {
          errors?: number | null
          indexed?: number | null
          is_pending?: boolean | null
          last_downloaded?: string | null
          last_submitted?: string | null
          path?: string
          submitted?: number | null
          synced_at?: string
          warnings?: number | null
        }
        Relationships: []
      }
      seo_state: {
        Row: {
          analysed_at: string | null
          bing_synced_at: string | null
          crawl_list_at: string | null
          cwv_synced_at: string | null
          gsc_backfill_before: string | null
          gsc_backfill_done: boolean
          gsc_synced_at: string | null
          id: number
          last_run: Json | null
          last_run_at: string | null
          sitemaps_synced_at: string | null
          weekly_sent_on: string | null
        }
        Insert: {
          analysed_at?: string | null
          bing_synced_at?: string | null
          crawl_list_at?: string | null
          cwv_synced_at?: string | null
          gsc_backfill_before?: string | null
          gsc_backfill_done?: boolean
          gsc_synced_at?: string | null
          id?: number
          last_run?: Json | null
          last_run_at?: string | null
          sitemaps_synced_at?: string | null
          weekly_sent_on?: string | null
        }
        Update: {
          analysed_at?: string | null
          bing_synced_at?: string | null
          crawl_list_at?: string | null
          cwv_synced_at?: string | null
          gsc_backfill_before?: string | null
          gsc_backfill_done?: boolean
          gsc_synced_at?: string | null
          id?: number
          last_run?: Json | null
          last_run_at?: string | null
          sitemaps_synced_at?: string | null
          weekly_sent_on?: string | null
        }
        Relationships: []
      }
      site_chunks: {
        Row: {
          chunk_index: number
          content: string
          content_hash: string
          embedding: string
          id: number
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          chunk_index: number
          content: string
          content_hash: string
          embedding: string
          id?: never
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          chunk_index?: number
          content?: string
          content_hash?: string
          embedding?: string
          id?: never
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      suppression_list: {
        Row: {
          created_at: string
          email: string
          prospect_id: string | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          prospect_id?: string | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          prospect_id?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppression_list_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      app_admin_chat_sessions: {
        Args: { p_limit: number; p_offset: number; p_secret: string }
        Returns: Json
      }
      app_admin_chats: {
        Args: {
          p_days: number
          p_off_topic: string
          p_secret: string
          p_small_talk: string
        }
        Returns: Json
      }
      app_admin_outreach_stats: { Args: { p_secret: string }; Returns: Json }
      app_admin_overview: { Args: { p_secret: string }; Returns: Json }
      app_admin_prospect_stats: {
        Args: { p_days: number; p_secret: string }
        Returns: Json
      }
      app_admin_seo_overview: { Args: { p_secret: string }; Returns: Json }
      app_admin_seo_pages: {
        Args: {
          p_limit: number
          p_offset: number
          p_search: string
          p_secret: string
          p_sort: string
        }
        Returns: Json
      }
      app_admin_seo_queries: {
        Args: {
          p_limit: number
          p_offset: number
          p_search: string
          p_secret: string
          p_sort: string
        }
        Returns: Json
      }
      app_audit_recent_count: {
        Args: { p_ip_hash: string; p_minutes?: number; p_secret: string }
        Returns: number
      }
      app_audit_stats: { Args: { p_secret: string }; Returns: Json }
      app_cached_audit: {
        Args: { p_hours?: number; p_secret: string; p_url: string }
        Returns: {
          created_at: string
          final_url: string
          id: string
          result: Json
          score: number
          url: string
        }[]
      }
      app_chat_recent_count: {
        Args: { p_ip_hash: string; p_minutes?: number; p_secret: string }
        Returns: number
      }
      app_chunk_hashes: {
        Args: { p_secret: string }
        Returns: {
          hashes: string
          url: string
        }[]
      }
      app_create_lead: {
        Args: {
          p_audit?: string
          p_budget: string
          p_email: string
          p_message: string
          p_name: string
          p_page: string
          p_phone?: string
          p_project_type: string
          p_secret: string
          p_session: string
          p_source: string
        }
        Returns: string
      }
      app_get_audit: {
        Args: { p_id: string; p_secret: string }
        Returns: {
          created_at: string
          final_url: string
          id: string
          result: Json
          score: number
          url: string
        }[]
      }
      app_leads_by_source: {
        Args: { p_from: string; p_secret: string; p_to: string }
        Returns: {
          leads: number
          source: string
        }[]
      }
      app_log_chat: {
        Args: {
          p_assistant_message: string
          p_ip_hash: string
          p_page: string
          p_secret: string
          p_session: string
          p_user_agent: string
          p_user_message: string
        }
        Returns: number
      }
      app_log_event: {
        Args: {
          p_data?: Json
          p_name: string
          p_page: string
          p_secret: string
          p_session: string
        }
        Returns: undefined
      }
      app_mark_lead_notified: {
        Args: { p_lead: string; p_secret: string }
        Returns: undefined
      }
      app_match_chunks: {
        Args: { p_count?: number; p_embedding: string; p_secret: string }
        Returns: {
          content: string
          similarity: number
          title: string
          url: string
        }[]
      }
      app_ox_add_message: {
        Args: { p_row: Json; p_secret: string }
        Returns: string
      }
      app_ox_add_prospect: {
        Args: { p_row: Json; p_secret: string }
        Returns: string
      }
      app_ox_cache_get: {
        Args: { p_hours: number; p_key: string; p_secret: string }
        Returns: Json
      }
      app_ox_cache_put: {
        Args: { p_key: string; p_secret: string; p_value: Json }
        Returns: undefined
      }
      app_ox_coverage: { Args: { p_secret: string }; Returns: Json }
      app_ox_coverage_mark: {
        Args: {
          p_city: string
          p_country: string
          p_error: string
          p_found: number
          p_region: string
          p_secret: string
          p_type: string
        }
        Returns: undefined
      }
      app_ox_cron_status: { Args: { p_secret: string }; Returns: Json }
      app_ox_daily_summary: {
        Args: { p_from: string; p_secret: string; p_to: string }
        Returns: Json
      }
      app_ox_delete_draft: {
        Args: { p_id: string; p_secret: string }
        Returns: string
      }
      app_ox_domain_emailed: {
        Args: { p_email: string; p_exclude: string; p_secret: string }
        Returns: boolean
      }
      app_ox_expire_reviews: { Args: { p_secret: string }; Returns: number }
      app_ox_is_suppressed: {
        Args: { p_email: string; p_exclude?: string; p_secret: string }
        Returns: boolean
      }
      app_ox_list: {
        Args: { p_kind: string; p_limit?: number; p_secret: string }
        Returns: Json
      }
      app_ox_message_for_test: {
        Args: { p_id: string; p_secret: string }
        Returns: Json
      }
      app_ox_name_count: {
        Args: { p_name: string; p_secret: string }
        Returns: number
      }
      app_ox_niche_stats: { Args: { p_secret: string }; Returns: Json }
      app_ox_preview: {
        Args: { p_id: string; p_secret: string }
        Returns: Json
      }
      app_ox_preview_create: {
        Args: { p_prospect: string; p_secret: string }
        Returns: string
      }
      app_ox_prospect: {
        Args: { p_id: string; p_secret: string }
        Returns: Json
      }
      app_ox_recheck_list: { Args: { p_secret: string }; Returns: Json }
      app_ox_release_waiting: { Args: { p_secret: string }; Returns: number }
      app_ox_report: {
        Args: { p_report: string; p_secret: string }
        Returns: Json
      }
      app_ox_save_audit: {
        Args: {
          p_final_url: string
          p_prospect: string
          p_result: Json
          p_score: number
          p_secret: string
          p_url: string
        }
        Returns: string
      }
      app_ox_search: { Args: { p_id: string; p_secret: string }; Returns: Json }
      app_ox_search_ran: {
        Args: { p_id: string; p_patch: Json; p_secret: string }
        Returns: undefined
      }
      app_ox_set: {
        Args: { p_patch: Json; p_secret: string }
        Returns: undefined
      }
      app_ox_set_cron_secret: {
        Args: { p_secret: string; p_value: string }
        Returns: undefined
      }
      app_ox_skip: {
        Args: { p_id: string; p_reason: string; p_secret: string }
        Returns: undefined
      }
      app_ox_state: { Args: { p_secret: string }; Returns: Json }
      app_ox_stop: {
        Args: {
          p_email: string
          p_prospect?: string
          p_reason: string
          p_secret: string
        }
        Returns: undefined
      }
      app_ox_unsubscribe: {
        Args: { p_confirm: boolean; p_secret: string; p_token: string }
        Returns: Json
      }
      app_ox_update_message: {
        Args: { p_id: string; p_patch: Json; p_secret: string }
        Returns: undefined
      }
      app_ox_update_prospect: {
        Args: { p_id: string; p_patch: Json; p_secret: string }
        Returns: undefined
      }
      app_prune_chunks: {
        Args: { p_keep_urls: string[]; p_secret: string }
        Returns: number
      }
      app_replace_chunks: {
        Args: {
          p_chunks: Json
          p_secret: string
          p_title: string
          p_url: string
        }
        Returns: number
      }
      app_save_audit: {
        Args: {
          p_final_url: string
          p_ip_hash: string
          p_result: Json
          p_score: number
          p_secret: string
          p_url: string
        }
        Returns: string
      }
      app_seo_add_fixes: {
        Args: { p_rows: Json; p_secret: string }
        Returns: number
      }
      app_seo_agg: {
        Args: {
          p_engine: string
          p_from: string
          p_kind: string
          p_secret: string
          p_to: string
        }
        Returns: Json
      }
      app_seo_all_links: {
        Args: { p_secret: string }
        Returns: {
          checked_at: string | null
          error: string | null
          fail_count: number
          found_on: string[]
          status: number | null
          url: string
        }[]
        SetofOptions: {
          from: "*"
          to: "seo_links"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      app_seo_all_pages: {
        Args: { p_secret: string }
        Returns: {
          canonical: string | null
          coverage_state: string | null
          crawled_at: string | null
          description: string | null
          external_links: string[]
          google_canonical: string | null
          h1_count: number | null
          has_jsonld: boolean | null
          has_og: boolean | null
          images_missing_alt: number | null
          in_sitemap: boolean
          index_verdict: string | null
          indexing_state: string | null
          inspected_at: string | null
          last_google_crawl: string | null
          links_out: string[]
          noindex: boolean | null
          page_fetch_state: string | null
          path: string
          redirect_to: string | null
          response_ms: number | null
          robots_state: string | null
          status: number | null
          template: string
          title: string | null
          words: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "seo_pages"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      app_seo_cwv_latest: {
        Args: { p_secret: string }
        Returns: {
          day: string
          field_category: string | null
          field_cls: number | null
          field_inp_ms: number | null
          field_lcp_ms: number | null
          field_source: string | null
          lab_cls: number | null
          lab_lcp_ms: number | null
          lab_tbt_ms: number | null
          performance: number | null
          template: string
          url: string
        }[]
        SetofOptions: {
          from: "*"
          to: "seo_cwv"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      app_seo_cwv_measured_today: {
        Args: { p_secret: string }
        Returns: string[]
      }
      app_seo_fix_decide: {
        Args: { p_decision: string; p_id: string; p_secret: string }
        Returns: undefined
      }
      app_seo_fix_mark: {
        Args: {
          p_commit: string
          p_id: string
          p_note: string
          p_secret: string
          p_status: string
        }
        Returns: Json
      }
      app_seo_fix_queue: {
        Args: { p_limit: number; p_secret: string }
        Returns: Json
      }
      app_seo_keyword_decide: {
        Args: { p_decision: string; p_keyword: string; p_secret: string }
        Returns: undefined
      }
      app_seo_latest_day: {
        Args: { p_engine: string; p_secret: string }
        Returns: string
      }
      app_seo_links_due: {
        Args: { p_limit: number; p_secret: string }
        Returns: string[]
      }
      app_seo_monthly: {
        Args: { p_from: string; p_secret: string; p_to: string }
        Returns: Json
      }
      app_seo_pages_due: {
        Args: {
          p_kind: string
          p_limit: number
          p_older_than_hours: number
          p_secret: string
        }
        Returns: string[]
      }
      app_seo_register_links: {
        Args: { p_rows: Json; p_secret: string }
        Returns: undefined
      }
      app_seo_replace_issues: {
        Args: { p_rows: Json; p_secret: string }
        Returns: undefined
      }
      app_seo_replace_opportunities: {
        Args: { p_rows: Json; p_secret: string }
        Returns: undefined
      }
      app_seo_save_crawl: {
        Args: { p_rows: Json; p_secret: string }
        Returns: undefined
      }
      app_seo_save_cwv: {
        Args: { p_row: Json; p_secret: string }
        Returns: undefined
      }
      app_seo_save_inspection: {
        Args: { p_rows: Json; p_secret: string }
        Returns: undefined
      }
      app_seo_save_links: {
        Args: { p_rows: Json; p_secret: string }
        Returns: undefined
      }
      app_seo_save_sitemaps: {
        Args: { p_rows: Json; p_secret: string }
        Returns: undefined
      }
      app_seo_set_sitemap_paths: {
        Args: { p_rows: Json; p_secret: string }
        Returns: undefined
      }
      app_seo_set_state: {
        Args: { p_patch: Json; p_secret: string }
        Returns: undefined
      }
      app_seo_state: { Args: { p_secret: string }; Returns: Json }
      app_seo_track_fixes: { Args: { p_secret: string }; Returns: number }
      app_seo_upsert_keywords: {
        Args: { p_rows: Json; p_secret: string }
        Returns: undefined
      }
      app_seo_upsert_search: {
        Args: { p_rows: Json; p_secret: string }
        Returns: number
      }
      app_seo_weekly: { Args: { p_secret: string }; Returns: Json }
      app_top_questions: {
        Args: { p_days?: number; p_limit?: number; p_secret: string }
        Returns: {
          asked: number
          question: string
        }[]
      }
      is_owner: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
