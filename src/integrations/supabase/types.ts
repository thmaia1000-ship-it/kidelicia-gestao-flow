export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      audit_events: {
        Row: {
          action: string;
          actor: string | null;
          after_state: Json | null;
          before_state: Json | null;
          created_at: string;
          entity: string;
          entity_id: string | null;
          id: string;
          organization_id: string;
          reason: string | null;
          source: string | null;
        };
        Insert: {
          action: string;
          actor?: string | null;
          after_state?: Json | null;
          before_state?: Json | null;
          created_at?: string;
          entity: string;
          entity_id?: string | null;
          id?: string;
          organization_id: string;
          reason?: string | null;
          source?: string | null;
        };
        Update: {
          action?: string;
          actor?: string | null;
          after_state?: Json | null;
          before_state?: Json | null;
          created_at?: string;
          entity?: string;
          entity_id?: string | null;
          id?: string;
          organization_id?: string;
          reason?: string | null;
          source?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_events_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_locations: {
        Row: {
          active: boolean;
          address: Json;
          created_at: string;
          customer_id: string;
          document: string | null;
          id: string;
          name: string;
          organization_id: string;
          phone: string | null;
          state_registration: string | null;
        };
        Insert: {
          active?: boolean;
          address?: Json;
          created_at?: string;
          customer_id: string;
          document?: string | null;
          id?: string;
          name: string;
          organization_id: string;
          phone?: string | null;
          state_registration?: string | null;
        };
        Update: {
          active?: boolean;
          address?: Json;
          created_at?: string;
          customer_id?: string;
          document?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
          phone?: string | null;
          state_registration?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customer_locations_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_locations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          active: boolean;
          address: Json;
          commercial_group: string | null;
          created_at: string;
          document: string | null;
          document_normalized: string | null;
          email: string | null;
          id: string;
          legal_name: string;
          notes: string | null;
          organization_id: string;
          payment_terms: string | null;
          phone: string | null;
          price_list_id: string | null;
          salesperson_id: string | null;
          state_registration: string | null;
          trade_name: string | null;
        };
        Insert: {
          active?: boolean;
          address?: Json;
          commercial_group?: string | null;
          created_at?: string;
          document?: string | null;
          document_normalized?: string | null;
          email?: string | null;
          id?: string;
          legal_name: string;
          notes?: string | null;
          organization_id: string;
          payment_terms?: string | null;
          phone?: string | null;
          price_list_id?: string | null;
          salesperson_id?: string | null;
          state_registration?: string | null;
          trade_name?: string | null;
        };
        Update: {
          active?: boolean;
          address?: Json;
          commercial_group?: string | null;
          created_at?: string;
          document?: string | null;
          document_normalized?: string | null;
          email?: string | null;
          id?: string;
          legal_name?: string;
          notes?: string | null;
          organization_id?: string;
          payment_terms?: string | null;
          phone?: string | null;
          price_list_id?: string | null;
          salesperson_id?: string | null;
          state_registration?: string | null;
          trade_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customers_price_list_id_fkey";
            columns: ["price_list_id"];
            isOneToOne: false;
            referencedRelation: "price_lists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customers_price_list_org_fk";
            columns: ["price_list_id"];
            isOneToOne: false;
            referencedRelation: "price_lists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customers_salesperson_id_fkey";
            columns: ["salesperson_id"];
            isOneToOne: false;
            referencedRelation: "salespeople";
            referencedColumns: ["id"];
          },
        ];
      };
      doc_counters: {
        Row: {
          doc_type: string;
          last_number: number;
          organization_id: string;
        };
        Insert: {
          doc_type: string;
          last_number?: number;
          organization_id: string;
        };
        Update: {
          doc_type?: string;
          last_number?: number;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "doc_counters_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      followups: {
        Row: {
          channel: string | null;
          created_by: string;
          happened_at: string;
          id: string;
          notes: string;
          organization_id: string;
          presale_id: string;
        };
        Insert: {
          channel?: string | null;
          created_by?: string;
          happened_at?: string;
          id?: string;
          notes: string;
          organization_id: string;
          presale_id: string;
        };
        Update: {
          channel?: string | null;
          created_by?: string;
          happened_at?: string;
          id?: string;
          notes?: string;
          organization_id?: string;
          presale_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "followups_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "followups_presale_id_fkey";
            columns: ["presale_id"];
            isOneToOne: false;
            referencedRelation: "presales";
            referencedColumns: ["id"];
          },
        ];
      };
      issuers: {
        Row: {
          active: boolean;
          address: Json;
          created_at: string;
          document: string | null;
          email: string | null;
          id: string;
          legal_name: string;
          notes: string | null;
          organization_id: string;
          phone: string | null;
          state_registration: string | null;
          trade_name: string | null;
        };
        Insert: {
          active?: boolean;
          address?: Json;
          created_at?: string;
          document?: string | null;
          email?: string | null;
          id?: string;
          legal_name: string;
          notes?: string | null;
          organization_id: string;
          phone?: string | null;
          state_registration?: string | null;
          trade_name?: string | null;
        };
        Update: {
          active?: boolean;
          address?: Json;
          created_at?: string;
          document?: string | null;
          email?: string | null;
          id?: string;
          legal_name?: string;
          notes?: string | null;
          organization_id?: string;
          phone?: string | null;
          state_registration?: string | null;
          trade_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "issuers_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_members: {
        Row: {
          created_at: string;
          id: string;
          organization_id: string;
          status: Database["public"]["Enums"]["member_status"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          organization_id: string;
          status?: Database["public"]["Enums"]["member_status"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          organization_id?: string;
          status?: Database["public"]["Enums"]["member_status"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          address: Json;
          created_at: string;
          created_by: string;
          document: string | null;
          email: string | null;
          id: string;
          legal_name: string | null;
          logo_url: string | null;
          name: string;
          phone: string | null;
          timezone: string;
          trade_name: string | null;
        };
        Insert: {
          address?: Json;
          created_at?: string;
          created_by?: string;
          document?: string | null;
          email?: string | null;
          id?: string;
          legal_name?: string | null;
          logo_url?: string | null;
          name?: string;
          phone?: string | null;
          timezone?: string;
          trade_name?: string | null;
        };
        Update: {
          address?: Json;
          created_at?: string;
          created_by?: string;
          document?: string | null;
          email?: string | null;
          id?: string;
          legal_name?: string | null;
          logo_url?: string | null;
          name?: string;
          phone?: string | null;
          timezone?: string;
          trade_name?: string | null;
        };
        Relationships: [];
      };
      pending_issues: {
        Row: {
          created_at: string;
          details: string | null;
          entity: string | null;
          entity_id: string | null;
          id: string;
          kind: string;
          organization_id: string;
          resolution: string | null;
          resolved_at: string | null;
          severity: string;
          source: string | null;
          status: Database["public"]["Enums"]["issue_status"];
          title: string;
        };
        Insert: {
          created_at?: string;
          details?: string | null;
          entity?: string | null;
          entity_id?: string | null;
          id?: string;
          kind: string;
          organization_id: string;
          resolution?: string | null;
          resolved_at?: string | null;
          severity?: string;
          source?: string | null;
          status?: Database["public"]["Enums"]["issue_status"];
          title: string;
        };
        Update: {
          created_at?: string;
          details?: string | null;
          entity?: string | null;
          entity_id?: string | null;
          id?: string;
          kind?: string;
          organization_id?: string;
          resolution?: string | null;
          resolved_at?: string | null;
          severity?: string;
          source?: string | null;
          status?: Database["public"]["Enums"]["issue_status"];
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pending_issues_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      presale_items: {
        Row: {
          commercial_unit: string;
          created_at: string;
          description_snapshot: string;
          discount: number;
          factor_to_base: number;
          id: string;
          notes: string | null;
          organization_id: string;
          presale_id: string;
          presentation_id: string | null;
          product_id: string;
          qty_base: number;
          qty_commercial: number;
          subtotal: number;
          unit_price: number;
        };
        Insert: {
          commercial_unit?: string;
          created_at?: string;
          description_snapshot?: string;
          discount?: number;
          factor_to_base?: number;
          id?: string;
          notes?: string | null;
          organization_id: string;
          presale_id: string;
          presentation_id?: string | null;
          product_id: string;
          qty_base: number;
          qty_commercial: number;
          subtotal?: number;
          unit_price?: number;
        };
        Update: {
          commercial_unit?: string;
          created_at?: string;
          description_snapshot?: string;
          discount?: number;
          factor_to_base?: number;
          id?: string;
          notes?: string | null;
          organization_id?: string;
          presale_id?: string;
          presentation_id?: string | null;
          product_id?: string;
          qty_base?: number;
          qty_commercial?: number;
          subtotal?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "presale_items_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "presale_items_presale_id_fkey";
            columns: ["presale_id"];
            isOneToOne: false;
            referencedRelation: "presales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "presale_items_presentation_id_fkey";
            columns: ["presentation_id"];
            isOneToOne: false;
            referencedRelation: "product_presentations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "presale_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      presales: {
        Row: {
          created_at: string;
          created_by: string;
          customer_id: string | null;
          date: string;
          duplicated_from: string | null;
          expected_delivery: string | null;
          id: string;
          location_id: string | null;
          loss_reason: string | null;
          next_action: string | null;
          notes: string | null;
          number: number;
          organization_id: string;
          origin: string | null;
          prospect_name: string | null;
          salesperson_id: string | null;
          status: Database["public"]["Enums"]["presale_status"];
          total: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string;
          customer_id?: string | null;
          date?: string;
          duplicated_from?: string | null;
          expected_delivery?: string | null;
          id?: string;
          location_id?: string | null;
          loss_reason?: string | null;
          next_action?: string | null;
          notes?: string | null;
          number: number;
          organization_id: string;
          origin?: string | null;
          prospect_name?: string | null;
          salesperson_id?: string | null;
          status?: Database["public"]["Enums"]["presale_status"];
          total?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          customer_id?: string | null;
          date?: string;
          duplicated_from?: string | null;
          expected_delivery?: string | null;
          id?: string;
          location_id?: string | null;
          loss_reason?: string | null;
          next_action?: string | null;
          notes?: string | null;
          number?: number;
          organization_id?: string;
          origin?: string | null;
          prospect_name?: string | null;
          salesperson_id?: string | null;
          status?: Database["public"]["Enums"]["presale_status"];
          total?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "presales_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "presales_duplicated_from_fkey";
            columns: ["duplicated_from"];
            isOneToOne: false;
            referencedRelation: "presales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "presales_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "customer_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "presales_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "presales_salesperson_id_fkey";
            columns: ["salesperson_id"];
            isOneToOne: false;
            referencedRelation: "salespeople";
            referencedColumns: ["id"];
          },
        ];
      };
      price_list_items: {
        Row: {
          created_at: string;
          id: string;
          organization_id: string;
          presentation_id: string | null;
          price_list_id: string;
          price_unit: string;
          product_id: string;
          unit_price: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          organization_id: string;
          presentation_id?: string | null;
          price_list_id: string;
          price_unit?: string;
          product_id: string;
          unit_price: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          organization_id?: string;
          presentation_id?: string | null;
          price_list_id?: string;
          price_unit?: string;
          product_id?: string;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "price_list_items_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "price_list_items_presentation_id_fkey";
            columns: ["presentation_id"];
            isOneToOne: false;
            referencedRelation: "product_presentations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "price_list_items_price_list_id_fkey";
            columns: ["price_list_id"];
            isOneToOne: false;
            referencedRelation: "price_lists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "price_list_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      price_lists: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          kind: string;
          name: string;
          notes: string | null;
          organization_id: string;
          valid_from: string | null;
          valid_to: string | null;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          kind?: string;
          name: string;
          notes?: string | null;
          organization_id: string;
          valid_from?: string | null;
          valid_to?: string | null;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          kind?: string;
          name?: string;
          notes?: string | null;
          organization_id?: string;
          valid_from?: string | null;
          valid_to?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "price_lists_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      product_presentations: {
        Row: {
          approved: boolean;
          commercial_unit: string;
          created_at: string;
          divisible: boolean;
          ean: string | null;
          factor_to_base: number;
          id: string;
          label: string;
          organization_id: string;
          product_id: string;
          raw_text: string | null;
        };
        Insert: {
          approved?: boolean;
          commercial_unit?: string;
          created_at?: string;
          divisible?: boolean;
          ean?: string | null;
          factor_to_base: number;
          id?: string;
          label: string;
          organization_id: string;
          product_id: string;
          raw_text?: string | null;
        };
        Update: {
          approved?: boolean;
          commercial_unit?: string;
          created_at?: string;
          divisible?: boolean;
          ean?: string | null;
          factor_to_base?: number;
          id?: string;
          label?: string;
          organization_id?: string;
          product_id?: string;
          raw_text?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_presentations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_presentations_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          active: boolean;
          base_unit: string;
          brand: string | null;
          category: string | null;
          commercial_unit: string;
          created_at: string;
          description: string;
          divisible: boolean;
          ean: string | null;
          flavor: string | null;
          id: string;
          kind: Database["public"]["Enums"]["product_kind"];
          legacy_code: string | null;
          min_stock: number;
          ncm: string | null;
          net_weight: number | null;
          notes: string | null;
          organization_id: string;
          presentation_raw: string | null;
          raw_description: string | null;
          sku: string;
          track_lot: boolean;
          units_per_package: number;
          weight_unit: string | null;
        };
        Insert: {
          active?: boolean;
          base_unit?: string;
          brand?: string | null;
          category?: string | null;
          commercial_unit?: string;
          created_at?: string;
          description: string;
          divisible?: boolean;
          ean?: string | null;
          flavor?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["product_kind"];
          legacy_code?: string | null;
          min_stock?: number;
          ncm?: string | null;
          net_weight?: number | null;
          notes?: string | null;
          organization_id: string;
          presentation_raw?: string | null;
          raw_description?: string | null;
          sku: string;
          track_lot?: boolean;
          units_per_package?: number;
          weight_unit?: string | null;
        };
        Update: {
          active?: boolean;
          base_unit?: string;
          brand?: string | null;
          category?: string | null;
          commercial_unit?: string;
          created_at?: string;
          description?: string;
          divisible?: boolean;
          ean?: string | null;
          flavor?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["product_kind"];
          legacy_code?: string | null;
          min_stock?: number;
          ncm?: string | null;
          net_weight?: number | null;
          notes?: string | null;
          organization_id?: string;
          presentation_raw?: string | null;
          raw_description?: string | null;
          sku?: string;
          track_lot?: boolean;
          units_per_package?: number;
          weight_unit?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "products_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
        };
        Relationships: [];
      };
      quote_items: {
        Row: {
          commercial_unit: string;
          created_at: string;
          description_snapshot: string;
          discount: number;
          factor_to_base: number;
          id: string;
          notes: string | null;
          organization_id: string;
          presentation_id: string | null;
          price_source: string;
          product_id: string;
          qty_base: number;
          qty_commercial: number;
          quote_id: string;
          subtotal: number;
          unit_price: number;
        };
        Insert: {
          commercial_unit?: string;
          created_at?: string;
          description_snapshot?: string;
          discount?: number;
          factor_to_base?: number;
          id?: string;
          notes?: string | null;
          organization_id: string;
          presentation_id?: string | null;
          price_source?: string;
          product_id: string;
          qty_base: number;
          qty_commercial: number;
          quote_id: string;
          subtotal?: number;
          unit_price: number;
        };
        Update: {
          commercial_unit?: string;
          created_at?: string;
          description_snapshot?: string;
          discount?: number;
          factor_to_base?: number;
          id?: string;
          notes?: string | null;
          organization_id?: string;
          presentation_id?: string | null;
          price_source?: string;
          product_id?: string;
          qty_base?: number;
          qty_commercial?: number;
          quote_id?: string;
          subtotal?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "quote_items_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_items_presentation_id_fkey";
            columns: ["presentation_id"];
            isOneToOne: false;
            referencedRelation: "product_presentations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
        ];
      };
      quote_versions: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          organization_id: string;
          quote_id: string;
          revision: number;
          snapshot: Json;
        };
        Insert: {
          created_at?: string;
          created_by?: string;
          id?: string;
          organization_id: string;
          quote_id: string;
          revision: number;
          snapshot: Json;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          organization_id?: string;
          quote_id?: string;
          revision?: number;
          snapshot?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "quote_versions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_versions_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
        ];
      };
      quotes: {
        Row: {
          additions: number;
          approved_at: string | null;
          created_at: string;
          created_by: string;
          customer_id: string;
          date: string;
          delivery_days: number | null;
          delivery_terms: string | null;
          discount: number;
          freight: number;
          id: string;
          issuer_id: string | null;
          items_total: number;
          location_id: string | null;
          notes: string | null;
          number: number;
          organization_id: string;
          payment_terms: string | null;
          presale_id: string | null;
          refused_reason: string | null;
          revision: number;
          salesperson_id: string | null;
          sent_at: string | null;
          status: Database["public"]["Enums"]["quote_status"];
          total: number;
          updated_at: string;
          valid_until: string | null;
          version: number;
        };
        Insert: {
          additions?: number;
          approved_at?: string | null;
          created_at?: string;
          created_by?: string;
          customer_id: string;
          date?: string;
          delivery_days?: number | null;
          delivery_terms?: string | null;
          discount?: number;
          freight?: number;
          id?: string;
          issuer_id?: string | null;
          items_total?: number;
          location_id?: string | null;
          notes?: string | null;
          number: number;
          organization_id: string;
          payment_terms?: string | null;
          presale_id?: string | null;
          refused_reason?: string | null;
          revision?: number;
          salesperson_id?: string | null;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["quote_status"];
          total?: number;
          updated_at?: string;
          valid_until?: string | null;
          version?: number;
        };
        Update: {
          additions?: number;
          approved_at?: string | null;
          created_at?: string;
          created_by?: string;
          customer_id?: string;
          date?: string;
          delivery_days?: number | null;
          delivery_terms?: string | null;
          discount?: number;
          freight?: number;
          id?: string;
          issuer_id?: string | null;
          items_total?: number;
          location_id?: string | null;
          notes?: string | null;
          number?: number;
          organization_id?: string;
          payment_terms?: string | null;
          presale_id?: string | null;
          refused_reason?: string | null;
          revision?: number;
          salesperson_id?: string | null;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["quote_status"];
          total?: number;
          updated_at?: string;
          valid_until?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_issuer_id_fkey";
            columns: ["issuer_id"];
            isOneToOne: false;
            referencedRelation: "issuers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "customer_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_presale_id_fkey";
            columns: ["presale_id"];
            isOneToOne: false;
            referencedRelation: "presales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_salesperson_id_fkey";
            columns: ["salesperson_id"];
            isOneToOne: false;
            referencedRelation: "salespeople";
            referencedColumns: ["id"];
          },
        ];
      };
      sales_channels: {
        Row: {
          active: boolean;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          organization_id: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          organization_id: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sales_channels_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      sales_order_items: {
        Row: {
          commercial_unit: string;
          created_at: string;
          description_snapshot: string;
          discount: number;
          factor_to_base: number;
          id: string;
          notes: string | null;
          organization_id: string;
          presentation_id: string | null;
          price_source: string;
          product_id: string;
          qty_base: number;
          qty_commercial: number;
          sales_order_id: string;
          subtotal: number;
          unit_price: number;
        };
        Insert: {
          commercial_unit?: string;
          created_at?: string;
          description_snapshot?: string;
          discount?: number;
          factor_to_base?: number;
          id?: string;
          notes?: string | null;
          organization_id: string;
          presentation_id?: string | null;
          price_source?: string;
          product_id: string;
          qty_base: number;
          qty_commercial: number;
          sales_order_id: string;
          subtotal?: number;
          unit_price: number;
        };
        Update: {
          commercial_unit?: string;
          created_at?: string;
          description_snapshot?: string;
          discount?: number;
          factor_to_base?: number;
          id?: string;
          notes?: string | null;
          organization_id?: string;
          presentation_id?: string | null;
          price_source?: string;
          product_id?: string;
          qty_base?: number;
          qty_commercial?: number;
          sales_order_id?: string;
          subtotal?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "sales_order_items_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_order_items_presentation_id_fkey";
            columns: ["presentation_id"];
            isOneToOne: false;
            referencedRelation: "product_presentations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey";
            columns: ["sales_order_id"];
            isOneToOne: false;
            referencedRelation: "sales_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      sales_orders: {
        Row: {
          additions: number;
          cancel_reason: string | null;
          cancelled_at: string | null;
          confirmed_at: string | null;
          created_at: string;
          created_by: string;
          customer_id: string;
          customer_snapshot: Json;
          delivery_date: string | null;
          discount: number;
          due_date: string | null;
          financial_status: string;
          freight: number;
          id: string;
          issuer_id: string | null;
          items_total: number;
          legacy_order_ref: string | null;
          legacy_refs_conflict: boolean;
          legacy_sale_ref: string | null;
          location_id: string | null;
          notes: string | null;
          number: number;
          order_date: string;
          organization_id: string;
          origin: string;
          payment_terms: string | null;
          presale_id: string | null;
          production_status: Database["public"]["Enums"]["op_status"];
          quote_id: string | null;
          salesperson_id: string | null;
          shipping_status: Database["public"]["Enums"]["op_status"];
          status: Database["public"]["Enums"]["order_status"];
          total: number;
          updated_at: string;
          version: number;
        };
        Insert: {
          additions?: number;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
          created_by?: string;
          customer_id: string;
          customer_snapshot?: Json;
          delivery_date?: string | null;
          discount?: number;
          due_date?: string | null;
          financial_status?: string;
          freight?: number;
          id?: string;
          issuer_id?: string | null;
          items_total?: number;
          legacy_order_ref?: string | null;
          legacy_refs_conflict?: boolean;
          legacy_sale_ref?: string | null;
          location_id?: string | null;
          notes?: string | null;
          number: number;
          order_date?: string;
          organization_id: string;
          origin?: string;
          payment_terms?: string | null;
          presale_id?: string | null;
          production_status?: Database["public"]["Enums"]["op_status"];
          quote_id?: string | null;
          salesperson_id?: string | null;
          shipping_status?: Database["public"]["Enums"]["op_status"];
          status?: Database["public"]["Enums"]["order_status"];
          total?: number;
          updated_at?: string;
          version?: number;
        };
        Update: {
          additions?: number;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
          created_by?: string;
          customer_id?: string;
          customer_snapshot?: Json;
          delivery_date?: string | null;
          discount?: number;
          due_date?: string | null;
          financial_status?: string;
          freight?: number;
          id?: string;
          issuer_id?: string | null;
          items_total?: number;
          legacy_order_ref?: string | null;
          legacy_refs_conflict?: boolean;
          legacy_sale_ref?: string | null;
          location_id?: string | null;
          notes?: string | null;
          number?: number;
          order_date?: string;
          organization_id?: string;
          origin?: string;
          payment_terms?: string | null;
          presale_id?: string | null;
          production_status?: Database["public"]["Enums"]["op_status"];
          quote_id?: string | null;
          salesperson_id?: string | null;
          shipping_status?: Database["public"]["Enums"]["op_status"];
          status?: Database["public"]["Enums"]["order_status"];
          total?: number;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_orders_issuer_id_fkey";
            columns: ["issuer_id"];
            isOneToOne: false;
            referencedRelation: "issuers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_orders_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "customer_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_orders_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_orders_presale_id_fkey";
            columns: ["presale_id"];
            isOneToOne: false;
            referencedRelation: "presales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_orders_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_orders_salesperson_id_fkey";
            columns: ["salesperson_id"];
            isOneToOne: false;
            referencedRelation: "salespeople";
            referencedColumns: ["id"];
          },
        ];
      };
      salespeople: {
        Row: {
          active: boolean;
          aliases: string[];
          created_at: string;
          id: string;
          kind: string;
          name: string;
          notes: string | null;
          organization_id: string;
          user_id: string | null;
        };
        Insert: {
          active?: boolean;
          aliases?: string[];
          created_at?: string;
          id?: string;
          kind?: string;
          name: string;
          notes?: string | null;
          organization_id: string;
          user_id?: string | null;
        };
        Update: {
          active?: boolean;
          aliases?: string[];
          created_at?: string;
          id?: string;
          kind?: string;
          name?: string;
          notes?: string | null;
          organization_id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "salespeople_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          organization_id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          organization_id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          organization_id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      can_admin: { Args: { _org: string }; Returns: boolean };
      can_write_commercial: { Args: { _org: string }; Returns: boolean };
      convert_quote_to_order: { Args: { _quote_id: string }; Returns: string };
      create_organization: { Args: { _name: string }; Returns: string };
      has_any_role: {
        Args: {
          _org: string;
          _roles: Database["public"]["Enums"]["app_role"][];
        };
        Returns: boolean;
      };
      has_role: {
        Args: { _org: string; _role: Database["public"]["Enums"]["app_role"] };
        Returns: boolean;
      };
      is_org_member: { Args: { _org: string }; Returns: boolean };
      next_doc_number: {
        Args: { _org: string; _type: string };
        Returns: number;
      };
      request_access: { Args: { _org: string }; Returns: undefined };
    };
    Enums: {
      app_role: "administrador" | "gestor" | "comercial" | "financeiro" | "producao" | "consulta";
      issue_status: "aberta" | "em_revisao" | "resolvida" | "ignorada";
      member_status: "pendente" | "ativo" | "inativo";
      op_status: "nao_iniciado" | "parcial" | "concluido" | "nao_aplicavel";
      order_status: "rascunho" | "confirmado" | "cancelado";
      presale_status: "rascunho" | "em_contato" | "proposta" | "convertida" | "perdida";
      product_kind: "fabricado" | "revendido" | "material";
      quote_status: "rascunho" | "enviado" | "aprovado" | "recusado" | "expirado";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["administrador", "gestor", "comercial", "financeiro", "producao", "consulta"],
      issue_status: ["aberta", "em_revisao", "resolvida", "ignorada"],
      member_status: ["pendente", "ativo", "inativo"],
      op_status: ["nao_iniciado", "parcial", "concluido", "nao_aplicavel"],
      order_status: ["rascunho", "confirmado", "cancelado"],
      presale_status: ["rascunho", "em_contato", "proposta", "convertida", "perdida"],
      product_kind: ["fabricado", "revendido", "material"],
      quote_status: ["rascunho", "enviado", "aprovado", "recusado", "expirado"],
    },
  },
} as const;
