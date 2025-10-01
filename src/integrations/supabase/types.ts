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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      academic_records: {
        Row: {
          cgpa: number
          created_at: string | null
          id: string
          semester: number
          sgpa: number
          student_usn: string
          sub1_marks: number | null
          sub1_name: string | null
          sub2_marks: number | null
          sub2_name: string | null
          sub3_marks: number | null
          sub3_name: string | null
          sub4_marks: number | null
          sub4_name: string | null
          sub5_marks: number | null
          sub5_name: string | null
          updated_at: string | null
        }
        Insert: {
          cgpa: number
          created_at?: string | null
          id?: string
          semester: number
          sgpa: number
          student_usn: string
          sub1_marks?: number | null
          sub1_name?: string | null
          sub2_marks?: number | null
          sub2_name?: string | null
          sub3_marks?: number | null
          sub3_name?: string | null
          sub4_marks?: number | null
          sub4_name?: string | null
          sub5_marks?: number | null
          sub5_name?: string | null
          updated_at?: string | null
        }
        Update: {
          cgpa?: number
          created_at?: string | null
          id?: string
          semester?: number
          sgpa?: number
          student_usn?: string
          sub1_marks?: number | null
          sub1_name?: string | null
          sub2_marks?: number | null
          sub2_name?: string | null
          sub3_marks?: number | null
          sub3_name?: string | null
          sub4_marks?: number | null
          sub4_name?: string | null
          sub5_marks?: number | null
          sub5_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_records_student_usn_fkey"
            columns: ["student_usn"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["usn"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      certification_requests: {
        Row: {
          approval_date: string | null
          approved_by: string | null
          created_at: string | null
          id: string
          request_date: string
          signed_pdf_url: string | null
          status: Database["public"]["Enums"]["request_status"]
          student_usn: string
          updated_at: string | null
          verification_hash: string | null
        }
        Insert: {
          approval_date?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          request_date?: string
          signed_pdf_url?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          student_usn: string
          updated_at?: string | null
          verification_hash?: string | null
        }
        Update: {
          approval_date?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          request_date?: string
          signed_pdf_url?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          student_usn?: string
          updated_at?: string | null
          verification_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certification_requests_student_usn_fkey"
            columns: ["student_usn"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["usn"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          major: string | null
          name: string
          updated_at: string | null
          usn: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          major?: string | null
          name: string
          updated_at?: string | null
          usn?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          major?: string | null
          name?: string
          updated_at?: string | null
          usn?: string | null
        }
        Relationships: []
      }
      students: {
        Row: {
          created_at: string | null
          email: string
          major: string
          name: string
          updated_at: string | null
          user_id: string | null
          usn: string
        }
        Insert: {
          created_at?: string | null
          email: string
          major: string
          name: string
          updated_at?: string | null
          user_id?: string | null
          usn: string
        }
        Update: {
          created_at?: string | null
          email?: string
          major?: string
          name?: string
          updated_at?: string | null
          user_id?: string | null
          usn?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_usn: {
        Args: { _user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "student" | "coe"
      request_status: "Pending" | "Approved" | "Rejected"
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
      app_role: ["student", "coe"],
      request_status: ["Pending", "Approved", "Rejected"],
    },
  },
} as const
