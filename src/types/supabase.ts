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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      connected_accounts: {
        Row: {
          access_token_encrypted: string | null
          created_at: string | null
          id: string
          provider: string
          provider_user_id: string
          provider_username: string | null
          refresh_token_encrypted: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token_encrypted?: string | null
          created_at?: string | null
          id?: string
          provider: string
          provider_user_id: string
          provider_username?: string | null
          refresh_token_encrypted?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token_encrypted?: string | null
          created_at?: string | null
          id?: string
          provider?: string
          provider_user_id?: string
          provider_username?: string | null
          refresh_token_encrypted?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          streamer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          streamer_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          streamer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: false
            referencedRelation: "streamers"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_deliveries: {
        Row: {
          body: string | null
          entity_id: string | null
          entity_type: string | null
          error_message: string | null
          id: string
          schedule_id: string | null
          sent_at: string | null
          status: string | null
          subscription_id: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          schedule_id?: string | null
          sent_at?: string | null
          status?: string | null
          subscription_id?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          schedule_id?: string | null
          sent_at?: string | null
          status?: string | null
          subscription_id?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_deliveries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "push_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          live_reminder_minutes: number
          notify_live_start: boolean | null
          notify_notice: boolean | null
          notify_schedule_change: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          live_reminder_minutes?: number
          notify_live_start?: boolean | null
          notify_notice?: boolean | null
          notify_schedule_change?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          live_reminder_minutes?: number
          notify_live_start?: boolean | null
          notify_notice?: boolean | null
          notify_schedule_change?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          app_origin: string | null
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          is_active: boolean | null
          last_seen_at: string | null
          p256dh: string
          platform: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          app_origin?: string | null
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          is_active?: boolean | null
          last_seen_at?: string | null
          p256dh: string
          platform?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          app_origin?: string | null
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean | null
          last_seen_at?: string | null
          p256dh?: string
          platform?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      schedules: {
        Row: {
          categories: string[]
          created_at: string
          deleted_at: string | null
          end_time: string | null
          id: string
          is_all_day: boolean | null
          is_deleted: boolean
          link: string
          memo: string | null
          start_time: string
          status: string
          streamer: string
          streamer_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          categories: string[]
          created_at?: string
          deleted_at?: string | null
          end_time?: string | null
          id?: string
          is_all_day?: boolean | null
          is_deleted?: boolean
          link: string
          memo?: string | null
          start_time: string
          status?: string
          streamer: string
          streamer_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          categories?: string[]
          created_at?: string
          deleted_at?: string | null
          end_time?: string | null
          id?: string
          is_all_day?: boolean | null
          is_deleted?: boolean
          link?: string
          memo?: string | null
          start_time?: string
          status?: string
          streamer?: string
          streamer_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: false
            referencedRelation: "streamers"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          author_nickname: string
          author_user_id: string | null
          content: string
          created_at: string
          id: string
          is_important: boolean
          is_pinned: boolean
          is_published: boolean
          published_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_nickname: string
          author_user_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_important?: boolean
          is_pinned?: boolean
          is_published?: boolean
          published_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_nickname?: string
          author_user_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_important?: boolean
          is_pinned?: boolean
          is_published?: boolean
          published_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      schedule_update_logs: {
        Row: {
          action_type: string
          actor_ip: string | null
          actor_ip_masked: string | null
          actor_nickname: string
          actor_role: string
          actor_user_id: string | null
          after_data: Json | null
          before_data: Json | null
          change_summary: string | null
          created_at: string
          id: string
          input_method: string
          logged_at: string
          schedule_id: string
          start_at_snapshot: string
          streamer_name_snapshot: string
          title_snapshot: string
        }
        Insert: {
          action_type: string
          actor_ip?: string | null
          actor_ip_masked?: string | null
          actor_nickname: string
          actor_role: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          change_summary?: string | null
          created_at?: string
          id?: string
          input_method: string
          logged_at?: string
          schedule_id: string
          start_at_snapshot: string
          streamer_name_snapshot: string
          title_snapshot: string
        }
        Update: {
          action_type?: string
          actor_ip?: string | null
          actor_ip_masked?: string | null
          actor_nickname?: string
          actor_role?: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          change_summary?: string | null
          created_at?: string
          id?: string
          input_method?: string
          logged_at?: string
          schedule_id?: string
          start_at_snapshot?: string
          streamer_name_snapshot?: string
          title_snapshot?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_update_logs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      streamers: {
        Row: {
          channel_id: string | null
          channel_url: string | null
          created_at: string
          follower_count: number | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          normalized_name: string
          source_type: string
          updated_at: string
          verified_mark: boolean
        }
        Insert: {
          channel_id?: string | null
          channel_url?: string | null
          created_at?: string
          follower_count?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          normalized_name: string
          source_type?: string
          updated_at?: string
          verified_mark?: boolean
        }
        Update: {
          channel_id?: string | null
          channel_url?: string | null
          created_at?: string
          follower_count?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          normalized_name?: string
          source_type?: string
          updated_at?: string
          verified_mark?: boolean
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      normalize_streamer_name: { Args: { input: string }; Returns: string }
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
    Enums: {},
  },
} as const
