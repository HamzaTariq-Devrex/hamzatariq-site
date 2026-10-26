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
          budget: string | null
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          notified_at: string | null
          page: string | null
          project_type: string | null
          session_id: string | null
          source: string
          status: string
        }
        Insert: {
          budget?: string | null
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          notified_at?: string | null
          page?: string | null
          project_type?: string | null
          session_id?: string | null
          source: string
          status?: string
        }
        Update: {
          budget?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          notified_at?: string | null
          page?: string | null
          project_type?: string | null
          session_id?: string | null
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
          p_budget: string
          p_email: string
          p_message: string
          p_name: string
          p_page: string
          p_project_type: string
          p_secret: string
          p_session: string
          p_source: string
        }
        Returns: string
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
