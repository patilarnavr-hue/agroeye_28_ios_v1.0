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
      achievements: {
        Row: {
          achievement_key: string
          achievement_name: string
          description: string | null
          earned_at: string
          icon: string | null
          id: string
          user_id: string
          xp_reward: number
        }
        Insert: {
          achievement_key: string
          achievement_name: string
          description?: string | null
          earned_at?: string
          icon?: string | null
          id?: string
          user_id: string
          xp_reward?: number
        }
        Update: {
          achievement_key?: string
          achievement_name?: string
          description?: string | null
          earned_at?: string
          icon?: string | null
          id?: string
          user_id?: string
          xp_reward?: number
        }
        Relationships: []
      }
      alerts: {
        Row: {
          alert_type: string
          created_at: string
          crop_id: string | null
          id: string
          is_read: boolean | null
          message: string
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          crop_id?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          severity: string
          title: string
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          crop_id?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          severity?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      crops: {
        Row: {
          created_at: string
          crop_type: string
          expected_harvest_date: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          location: string | null
          name: string
          notes: string | null
          planting_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          crop_type: string
          expected_harvest_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          location?: string | null
          name: string
          notes?: string | null
          planting_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          crop_type?: string
          expected_harvest_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          location?: string | null
          name?: string
          notes?: string | null
          planting_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      farmer_xp: {
        Row: {
          created_at: string
          id: string
          last_activity_date: string | null
          level: number
          streak_days: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_activity_date?: string | null
          level?: number
          streak_days?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_activity_date?: string | null
          level?: number
          streak_days?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      farmland_plots: {
        Row: {
          area_sqm: number | null
          color: string | null
          coordinates: Json
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area_sqm?: number | null
          color?: string | null
          coordinates: Json
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area_sqm?: number | null
          color?: string | null
          coordinates?: Json
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fertility_readings: {
        Row: {
          created_at: string | null
          crop_id: string | null
          id: string
          nitrogen_level: number | null
          notes: string | null
          overall_fertility: number | null
          phosphorus_level: number | null
          potassium_level: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          crop_id?: string | null
          id?: string
          nitrogen_level?: number | null
          notes?: string | null
          overall_fertility?: number | null
          phosphorus_level?: number | null
          potassium_level?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          crop_id?: string | null
          id?: string
          nitrogen_level?: number | null
          notes?: string | null
          overall_fertility?: number | null
          phosphorus_level?: number | null
          potassium_level?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fertility_readings_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fertility_readings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      health_scores: {
        Row: {
          created_at: string
          crop_id: string | null
          fertility_score: number
          id: string
          moisture_score: number
          notes: string | null
          overall_score: number
          user_id: string
          weather_score: number | null
        }
        Insert: {
          created_at?: string
          crop_id?: string | null
          fertility_score: number
          id?: string
          moisture_score: number
          notes?: string | null
          overall_score: number
          user_id: string
          weather_score?: number | null
        }
        Update: {
          created_at?: string
          crop_id?: string | null
          fertility_score?: number
          id?: string
          moisture_score?: number
          notes?: string | null
          overall_score?: number
          user_id?: string
          weather_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "health_scores_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
        ]
      }
      irrigation_events: {
        Row: {
          created_at: string
          crop_id: string | null
          duration_minutes: number
          id: string
          moisture_after: number | null
          moisture_before: number | null
          sensor_id: string | null
          status: string
          trigger_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          crop_id?: string | null
          duration_minutes: number
          id?: string
          moisture_after?: number | null
          moisture_before?: number | null
          sensor_id?: string | null
          status?: string
          trigger_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          crop_id?: string | null
          duration_minutes?: number
          id?: string
          moisture_after?: number | null
          moisture_before?: number | null
          sensor_id?: string | null
          status?: string
          trigger_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "irrigation_events_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "irrigation_events_sensor_id_fkey"
            columns: ["sensor_id"]
            isOneToOne: false
            referencedRelation: "sensors"
            referencedColumns: ["id"]
          },
        ]
      }
      map_markers: {
        Row: {
          created_at: string
          id: string
          label: string
          latitude: number
          longitude: number
          marker_type: string
          metadata: Json | null
          plot_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          latitude: number
          longitude: number
          marker_type?: string
          metadata?: Json | null
          plot_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          latitude?: number
          longitude?: number
          marker_type?: string
          metadata?: Json | null
          plot_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "map_markers_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "farmland_plots"
            referencedColumns: ["id"]
          },
        ]
      }
      moisture_readings: {
        Row: {
          created_at: string | null
          crop_id: string | null
          id: string
          moisture_level: number
          notes: string | null
          sensor_id: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          crop_id?: string | null
          id?: string
          moisture_level: number
          notes?: string | null
          sensor_id?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          crop_id?: string | null
          id?: string
          moisture_level?: number
          notes?: string | null
          sensor_id?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moisture_readings_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moisture_readings_sensor_id_fkey"
            columns: ["sensor_id"]
            isOneToOne: false
            referencedRelation: "sensors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moisture_readings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pest_detections: {
        Row: {
          confidence: string | null
          created_at: string
          crop_id: string | null
          description: string | null
          disease_name: string
          id: string
          image_url: string | null
          is_plant: boolean | null
          prevention: string[] | null
          severity: string | null
          treatment: string[] | null
          user_id: string
        }
        Insert: {
          confidence?: string | null
          created_at?: string
          crop_id?: string | null
          description?: string | null
          disease_name: string
          id?: string
          image_url?: string | null
          is_plant?: boolean | null
          prevention?: string[] | null
          severity?: string | null
          treatment?: string[] | null
          user_id: string
        }
        Update: {
          confidence?: string | null
          created_at?: string
          crop_id?: string | null
          description?: string | null
          disease_name?: string
          id?: string
          image_url?: string | null
          is_plant?: boolean | null
          prevention?: string[] | null
          severity?: string | null
          treatment?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pest_detections_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          location: string | null
          phone_number: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          location?: string | null
          phone_number?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          location?: string | null
          phone_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sensors: {
        Row: {
          created_at: string | null
          gateway_id: string | null
          id: string
          is_active: boolean | null
          last_reading: number | null
          last_reading_at: string | null
          latitude: number | null
          longitude: number | null
          mqtt_topic: string | null
          protocol: string | null
          sensor_code: string
          sensor_name: string
          sensor_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          gateway_id?: string | null
          id?: string
          is_active?: boolean | null
          last_reading?: number | null
          last_reading_at?: string | null
          latitude?: number | null
          longitude?: number | null
          mqtt_topic?: string | null
          protocol?: string | null
          sensor_code: string
          sensor_name: string
          sensor_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          gateway_id?: string | null
          id?: string
          is_active?: boolean | null
          last_reading?: number | null
          last_reading_at?: string | null
          latitude?: number | null
          longitude?: number | null
          mqtt_topic?: string | null
          protocol?: string | null
          sensor_code?: string
          sensor_name?: string
          sensor_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      storage_requests: {
        Row: {
          created_at: string
          crop_type: string
          harvest_date: string
          id: string
          quantity_kg: number
          status: string
          suitability_notes: string | null
          suitability_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          crop_type: string
          harvest_date: string
          id?: string
          quantity_kg: number
          status?: string
          suitability_notes?: string | null
          suitability_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          crop_type?: string
          harvest_date?: string
          id?: string
          quantity_kg?: number
          status?: string
          suitability_notes?: string | null
          suitability_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string | null
          id: string
          notification_alerts: boolean | null
          notification_moisture: boolean | null
          notification_schedule: boolean | null
          notifications_enabled: boolean | null
          onboarding_completed: boolean | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notification_alerts?: boolean | null
          notification_moisture?: boolean | null
          notification_schedule?: boolean | null
          notifications_enabled?: boolean | null
          onboarding_completed?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notification_alerts?: boolean | null
          notification_moisture?: boolean | null
          notification_schedule?: boolean | null
          notifications_enabled?: boolean | null
          onboarding_completed?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      watering_schedules: {
        Row: {
          created_at: string | null
          days_of_week: string[]
          id: string
          is_enabled: boolean | null
          time_of_day: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          days_of_week: string[]
          id?: string
          is_enabled?: boolean | null
          time_of_day: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          days_of_week?: string[]
          id?: string
          is_enabled?: boolean | null
          time_of_day?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watering_schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_data: {
        Row: {
          created_at: string
          forecast_data: Json | null
          humidity: number | null
          id: string
          location: string
          precipitation: number | null
          temperature: number | null
          user_id: string
          weather_condition: string | null
          wind_speed: number | null
        }
        Insert: {
          created_at?: string
          forecast_data?: Json | null
          humidity?: number | null
          id?: string
          location: string
          precipitation?: number | null
          temperature?: number | null
          user_id: string
          weather_condition?: string | null
          wind_speed?: number | null
        }
        Update: {
          created_at?: string
          forecast_data?: Json | null
          humidity?: number | null
          id?: string
          location?: string
          precipitation?: number | null
          temperature?: number | null
          user_id?: string
          weather_condition?: string | null
          wind_speed?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_leaderboard: {
        Args: { _limit?: number }
        Returns: {
          display_name: string
          level: number
          streak_days: number
          total_xp: number
          user_id: string
        }[]
      }
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
