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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          bank_account_no: string | null
          bank_branch: string | null
          bank_ifsc: string | null
          bank_name: string | null
          city: string | null
          created_at: string
          email: string | null
          financial_year_start: number
          gstin: string | null
          id: string
          invoice_prefix: string | null
          is_active: boolean
          legal_name: string | null
          logo_url: string | null
          mobile: string | null
          name: string
          pan: string | null
          pincode: string | null
          signatory_name: string | null
          state_code: string
          state_name: string
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          bank_account_no?: string | null
          bank_branch?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          financial_year_start?: number
          gstin?: string | null
          id?: string
          invoice_prefix?: string | null
          is_active?: boolean
          legal_name?: string | null
          logo_url?: string | null
          mobile?: string | null
          name: string
          pan?: string | null
          pincode?: string | null
          signatory_name?: string | null
          state_code: string
          state_name: string
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          bank_account_no?: string | null
          bank_branch?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          financial_year_start?: number
          gstin?: string | null
          id?: string
          invoice_prefix?: string | null
          is_active?: boolean
          legal_name?: string | null
          logo_url?: string | null
          mobile?: string | null
          name?: string
          pan?: string | null
          pincode?: string | null
          signatory_name?: string | null
          state_code?: string
          state_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          billing_address_line1: string | null
          billing_address_line2: string | null
          billing_city: string | null
          billing_pincode: string | null
          billing_state_code: string | null
          billing_state_name: string | null
          company_id: string
          contact_person: string | null
          created_at: string
          customer_type: Database["public"]["Enums"]["customer_type"]
          email: string | null
          gstin: string | null
          id: string
          is_active: boolean
          legal_name: string | null
          mobile: string | null
          shipping_address_line1: string | null
          shipping_address_line2: string | null
          shipping_city: string | null
          shipping_pincode: string | null
          shipping_state_code: string | null
          shipping_state_name: string | null
          trade_name: string
          updated_at: string
        }
        Insert: {
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_pincode?: string | null
          billing_state_code?: string | null
          billing_state_name?: string | null
          company_id: string
          contact_person?: string | null
          created_at?: string
          customer_type?: Database["public"]["Enums"]["customer_type"]
          email?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean
          legal_name?: string | null
          mobile?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_pincode?: string | null
          shipping_state_code?: string | null
          shipping_state_name?: string | null
          trade_name: string
          updated_at?: string
        }
        Update: {
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_pincode?: string | null
          billing_state_code?: string | null
          billing_state_name?: string | null
          company_id?: string
          contact_person?: string | null
          created_at?: string
          customer_type?: Database["public"]["Enums"]["customer_type"]
          email?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean
          legal_name?: string | null
          mobile?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_pincode?: string | null
          shipping_state_code?: string | null
          shipping_state_name?: string | null
          trade_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          cgst_amount: number
          created_at: string
          description: string
          discount_amount: number
          discount_percent: number
          gst_rate: number
          hsn_sac: string | null
          id: string
          igst_amount: number
          invoice_id: string
          item_id: string | null
          quantity: number
          rate: number
          sgst_amount: number
          sort_order: number
          taxable_value: number
          total_amount: number
          unit: string
        }
        Insert: {
          cgst_amount?: number
          created_at?: string
          description: string
          discount_amount?: number
          discount_percent?: number
          gst_rate?: number
          hsn_sac?: string | null
          id?: string
          igst_amount?: number
          invoice_id: string
          item_id?: string | null
          quantity?: number
          rate?: number
          sgst_amount?: number
          sort_order?: number
          taxable_value?: number
          total_amount?: number
          unit?: string
        }
        Update: {
          cgst_amount?: number
          created_at?: string
          description?: string
          discount_amount?: number
          discount_percent?: number
          gst_rate?: number
          hsn_sac?: string | null
          id?: string
          igst_amount?: number
          invoice_id?: string
          item_id?: string | null
          quantity?: number
          rate?: number
          sgst_amount?: number
          sort_order?: number
          taxable_value?: number
          total_amount?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_tax_summary: {
        Row: {
          cgst_amount: number
          created_at: string
          gst_rate: number
          id: string
          igst_amount: number
          invoice_id: string
          sgst_amount: number
          taxable_value: number
          total_tax: number
        }
        Insert: {
          cgst_amount?: number
          created_at?: string
          gst_rate: number
          id?: string
          igst_amount?: number
          invoice_id: string
          sgst_amount?: number
          taxable_value?: number
          total_tax?: number
        }
        Update: {
          cgst_amount?: number
          created_at?: string
          gst_rate?: number
          id?: string
          igst_amount?: number
          invoice_id?: string
          sgst_amount?: number
          taxable_value?: number
          total_tax?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_tax_summary_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_in_words: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          company_id: string
          created_at: string
          created_by: string
          customer_id: string
          discount_amount: number
          due_date: string | null
          eway_bill_number: string | null
          financial_year: string | null
          id: string
          invoice_date: string
          invoice_number: string
          is_reverse_charge: boolean
          lr_number: string | null
          notes: string | null
          payment_terms: string | null
          place_of_supply_code: string
          place_of_supply_state: string
          round_off: number
          status: Database["public"]["Enums"]["invoice_status"]
          total_amount: number
          total_cgst: number
          total_igst: number
          total_sgst: number
          total_tax: number
          total_taxable_value: number
          updated_at: string
          vehicle_number: string | null
        }
        Insert: {
          amount_in_words?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          company_id: string
          created_at?: string
          created_by: string
          customer_id: string
          discount_amount?: number
          due_date?: string | null
          eway_bill_number?: string | null
          financial_year?: string | null
          id?: string
          invoice_date?: string
          invoice_number: string
          is_reverse_charge?: boolean
          lr_number?: string | null
          notes?: string | null
          payment_terms?: string | null
          place_of_supply_code: string
          place_of_supply_state: string
          round_off?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          total_amount?: number
          total_cgst?: number
          total_igst?: number
          total_sgst?: number
          total_tax?: number
          total_taxable_value?: number
          updated_at?: string
          vehicle_number?: string | null
        }
        Update: {
          amount_in_words?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          customer_id?: string
          discount_amount?: number
          due_date?: string | null
          eway_bill_number?: string | null
          financial_year?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          is_reverse_charge?: boolean
          lr_number?: string | null
          notes?: string | null
          payment_terms?: string | null
          place_of_supply_code?: string
          place_of_supply_state?: string
          round_off?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          total_amount?: number
          total_cgst?: number
          total_igst?: number
          total_sgst?: number
          total_tax?: number
          total_taxable_value?: number
          updated_at?: string
          vehicle_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          company_id: string
          created_at: string
          default_price: number | null
          description: string | null
          gst_rate: number
          hsn_sac: string | null
          id: string
          is_active: boolean
          item_type: Database["public"]["Enums"]["item_type"]
          name: string
          unit: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          default_price?: number | null
          description?: string | null
          gst_rate?: number
          hsn_sac?: string | null
          id?: string
          is_active?: boolean
          item_type?: Database["public"]["Enums"]["item_type"]
          name: string
          unit?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          default_price?: number | null
          description?: string | null
          gst_rate?: number
          hsn_sac?: string | null
          id?: string
          is_active?: boolean
          item_type?: Database["public"]["Enums"]["item_type"]
          name?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_company_access: {
        Row: {
          can_cancel_invoice: boolean
          can_create_invoice: boolean
          can_edit_invoice: boolean
          can_export: boolean
          can_view_reports: boolean
          company_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          can_cancel_invoice?: boolean
          can_create_invoice?: boolean
          can_edit_invoice?: boolean
          can_export?: boolean
          can_view_reports?: boolean
          company_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          can_cancel_invoice?: boolean
          can_create_invoice?: boolean
          can_edit_invoice?: boolean
          can_export?: boolean
          can_view_reports?: boolean
          company_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_company_access_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_company_access: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "user"
      customer_type: "registered" | "unregistered" | "export" | "sez"
      invoice_status: "draft" | "final" | "cancelled"
      item_type: "goods" | "services"
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
      app_role: ["super_admin", "admin", "user"],
      customer_type: ["registered", "unregistered", "export", "sez"],
      invoice_status: ["draft", "final", "cancelled"],
      item_type: ["goods", "services"],
    },
  },
} as const
