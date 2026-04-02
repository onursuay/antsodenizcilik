/**
 * Supabase Database Types
 *
 * IMPORTANT: This file should be regenerated after deploying migrations.
 * Run: npx supabase gen types typescript --project-id $PROJECT_REF > src/types/database.ts
 *
 * The types below are manually written to match migrations 001–006
 * and will be overwritten by the generated version.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      vessels: {
        Row: {
          vessel_id: string;
          name: string;
          base_lane_meters: number;
          base_m2: number;
          base_passenger_capacity: number;
          commissioned_at: string;
          decommissioned_at: string | null;
        };
        Insert: {
          vessel_id?: string;
          name: string;
          base_lane_meters: number;
          base_m2: number;
          base_passenger_capacity: number;
          commissioned_at: string;
          decommissioned_at?: string | null;
        };
        Update: {
          vessel_id?: string;
          name?: string;
          base_lane_meters?: number;
          base_m2?: number;
          base_passenger_capacity?: number;
          commissioned_at?: string;
          decommissioned_at?: string | null;
        };
      };
      vessel_cabin_types: {
        Row: {
          cabin_type_id: string;
          vessel_id: string;
          label: string;
          base_count: number;
          berths_per_cabin: number;
        };
        Insert: {
          cabin_type_id?: string;
          vessel_id: string;
          label: string;
          base_count: number;
          berths_per_cabin: number;
        };
        Update: {
          cabin_type_id?: string;
          vessel_id?: string;
          label?: string;
          base_count?: number;
          berths_per_cabin?: number;
        };
      };
      voyages: {
        Row: {
          voyage_id: string;
          vessel_id: string;
          origin_port: string;
          destination_port: string;
          departure_utc: string;
          arrival_utc: string;
          operational_lane_meters: number;
          operational_m2: number;
          operational_passenger_capacity: number;
          overbooking_delta: number;
          status: Database["public"]["Enums"]["voyage_status"];
          bookings_frozen_at: string | null;
        };
        Insert: {
          voyage_id?: string;
          vessel_id: string;
          origin_port: string;
          destination_port: string;
          departure_utc: string;
          arrival_utc: string;
          operational_lane_meters: number;
          operational_m2: number;
          operational_passenger_capacity: number;
          overbooking_delta?: number;
          status?: Database["public"]["Enums"]["voyage_status"];
          bookings_frozen_at?: string | null;
        };
        Update: {
          voyage_id?: string;
          vessel_id?: string;
          origin_port?: string;
          destination_port?: string;
          departure_utc?: string;
          arrival_utc?: string;
          operational_lane_meters?: number;
          operational_m2?: number;
          operational_passenger_capacity?: number;
          overbooking_delta?: number;
          status?: Database["public"]["Enums"]["voyage_status"];
          bookings_frozen_at?: string | null;
        };
      };
      voyage_cabin_inventory: {
        Row: {
          voyage_id: string;
          cabin_type_id: string;
          total_count: number;
          reserved_count: number;
          confirmed_count: number;
        };
        Insert: {
          voyage_id: string;
          cabin_type_id: string;
          total_count: number;
          reserved_count?: number;
          confirmed_count?: number;
        };
        Update: {
          voyage_id?: string;
          cabin_type_id?: string;
          total_count?: number;
          reserved_count?: number;
          confirmed_count?: number;
        };
      };
      voyage_capacity_counters: {
        Row: {
          voyage_id: string;
          lane_meters_reserved: number;
          lane_meters_confirmed: number;
          m2_reserved: number;
          m2_confirmed: number;
          passengers_reserved: number;
          passengers_confirmed: number;
          last_ledger_seq: number;
        };
        Insert: {
          voyage_id: string;
          lane_meters_reserved?: number;
          lane_meters_confirmed?: number;
          m2_reserved?: number;
          m2_confirmed?: number;
          passengers_reserved?: number;
          passengers_confirmed?: number;
          last_ledger_seq?: number;
        };
        Update: {
          voyage_id?: string;
          lane_meters_reserved?: number;
          lane_meters_confirmed?: number;
          m2_reserved?: number;
          m2_confirmed?: number;
          passengers_reserved?: number;
          passengers_confirmed?: number;
          last_ledger_seq?: number;
        };
      };
      capacity_allocation_ledger: {
        Row: {
          event_id: string;
          ledger_seq: number;
          voyage_id: string;
          event_type: Database["public"]["Enums"]["allocation_event_type"];
          hold_id: string | null;
          booking_id: string | null;
          delta_lane_meters: number;
          delta_m2: number;
          delta_passengers: number;
          actor: string;
          idempotency_key: string;
          created_at: string;
        };
        Insert: {
          event_id: string;
          ledger_seq: number;
          voyage_id: string;
          event_type: Database["public"]["Enums"]["allocation_event_type"];
          hold_id?: string | null;
          booking_id?: string | null;
          delta_lane_meters: number;
          delta_m2: number;
          delta_passengers: number;
          actor: string;
          idempotency_key: string;
          created_at?: string;
        };
        Update: never;
      };
      ledger_cabin_deltas: {
        Row: {
          event_id: string;
          cabin_type_id: string;
          delta_count: number;
        };
        Insert: {
          event_id: string;
          cabin_type_id: string;
          delta_count: number;
        };
        Update: never;
      };
      holds: {
        Row: {
          hold_id: string;
          voyage_id: string;
          user_id: string;
          session_id: string;
          status: Database["public"]["Enums"]["hold_status"];
          created_at: string;
          expires_at: string;
          confirmation_ledger_event_id: string | null;
          idempotency_key: string;
        };
        Insert: {
          hold_id?: string;
          voyage_id: string;
          user_id: string;
          session_id: string;
          status?: Database["public"]["Enums"]["hold_status"];
          created_at?: string;
          expires_at: string;
          confirmation_ledger_event_id?: string | null;
          idempotency_key: string;
        };
        Update: {
          hold_id?: string;
          voyage_id?: string;
          user_id?: string;
          session_id?: string;
          status?: Database["public"]["Enums"]["hold_status"];
          created_at?: string;
          expires_at?: string;
          confirmation_ledger_event_id?: string | null;
          idempotency_key?: string;
        };
      };
      hold_items: {
        Row: {
          hold_item_id: string;
          hold_id: string;
          item_type: Database["public"]["Enums"]["hold_item_type"];
          quantity: number;
          lane_meters_claimed: number | null;
          m2_claimed: number | null;
          cabin_type_id: string | null;
          vehicle_type: string | null;
        };
        Insert: {
          hold_item_id?: string;
          hold_id: string;
          item_type: Database["public"]["Enums"]["hold_item_type"];
          quantity: number;
          lane_meters_claimed?: number | null;
          m2_claimed?: number | null;
          cabin_type_id?: string | null;
          vehicle_type?: string | null;
        };
        Update: never;
      };
      bookings: {
        Row: {
          booking_id: string;
          voyage_id: string;
          hold_id: string;
          user_id: string;
          status: Database["public"]["Enums"]["booking_status"];
          confirmation_ledger_event_id: string;
          confirmed_at: string;
          cancelled_at: string | null;
          checked_in_at: string | null;
          created_at: string;
        };
        Insert: {
          booking_id?: string;
          voyage_id: string;
          hold_id: string;
          user_id: string;
          status?: Database["public"]["Enums"]["booking_status"];
          confirmation_ledger_event_id: string;
          confirmed_at?: string;
          cancelled_at?: string | null;
          checked_in_at?: string | null;
          created_at?: string;
        };
        Update: {
          status?: Database["public"]["Enums"]["booking_status"];
          cancelled_at?: string | null;
          checked_in_at?: string | null;
        };
      };
      booking_passengers: {
        Row: {
          booking_passenger_id: string;
          booking_id: string;
          full_name: string;
          date_of_birth: string;
          document_type: string;
          document_number: string;
          nationality: string;
          cancelled_at: string | null;
        };
        Insert: {
          booking_passenger_id?: string;
          booking_id: string;
          full_name: string;
          date_of_birth: string;
          document_type: string;
          document_number: string;
          nationality: string;
          cancelled_at?: string | null;
        };
        Update: {
          cancelled_at?: string | null;
        };
      };
      booking_vehicles: {
        Row: {
          booking_vehicle_id: string;
          booking_id: string;
          plate_number: string;
          vehicle_type: string;
          length_cm: number;
          width_cm: number;
          height_cm: number;
          weight_kg: number;
          lane_meters_allocated: number;
          m2_allocated: number;
          cancelled_at: string | null;
        };
        Insert: {
          booking_vehicle_id?: string;
          booking_id: string;
          plate_number: string;
          vehicle_type: string;
          length_cm: number;
          width_cm: number;
          height_cm: number;
          weight_kg: number;
          lane_meters_allocated: number;
          m2_allocated: number;
          cancelled_at?: string | null;
        };
        Update: {
          cancelled_at?: string | null;
        };
      };
      booking_cabins: {
        Row: {
          booking_cabin_id: string;
          booking_id: string;
          cabin_type_id: string;
          count_allocated: number;
          cancelled_at: string | null;
        };
        Insert: {
          booking_cabin_id?: string;
          booking_id: string;
          cabin_type_id: string;
          count_allocated: number;
          cancelled_at?: string | null;
        };
        Update: {
          cancelled_at?: string | null;
        };
      };
      payments: {
        Row: {
          payment_id: string;
          hold_id: string;
          booking_id: string | null;
          status: Database["public"]["Enums"]["payment_status"];
          amount_kurus: number;
          currency: string;
          gateway: string;
          idempotency_key: string;
          gateway_reference_id: string | null;
          created_at: string;
          settled_at: string | null;
        };
        Insert: {
          payment_id?: string;
          hold_id: string;
          booking_id?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          amount_kurus: number;
          currency: string;
          gateway: string;
          idempotency_key: string;
          gateway_reference_id?: string | null;
          created_at?: string;
          settled_at?: string | null;
        };
        Update: {
          status?: Database["public"]["Enums"]["payment_status"];
          booking_id?: string | null;
          gateway_reference_id?: string | null;
          settled_at?: string | null;
        };
      };
      payment_attempts: {
        Row: {
          attempt_id: string;
          payment_id: string;
          attempt_number: number;
          gateway_request_id: string;
          raw_status: string;
          response_code: string | null;
          attempted_at: string;
        };
        Insert: {
          attempt_id?: string;
          payment_id: string;
          attempt_number: number;
          gateway_request_id: string;
          raw_status: string;
          response_code?: string | null;
          attempted_at?: string;
        };
        Update: never;
      };
      cancellation_records: {
        Row: {
          cancellation_record_id: string;
          booking_id: string;
          scope: Database["public"]["Enums"]["cancellation_scope"];
          partial_target_type: Database["public"]["Enums"]["partial_target_type"] | null;
          partial_target_id: string | null;
          initiated_by: string;
          initiated_at: string;
          effective_at: string;
          cancellation_ledger_event_id: string;
        };
        Insert: {
          cancellation_record_id?: string;
          booking_id: string;
          scope: Database["public"]["Enums"]["cancellation_scope"];
          partial_target_type?: Database["public"]["Enums"]["partial_target_type"] | null;
          partial_target_id?: string | null;
          initiated_by: string;
          initiated_at: string;
          effective_at: string;
          cancellation_ledger_event_id: string;
        };
        Update: never;
      };
      refund_records: {
        Row: {
          refund_id: string;
          payment_id: string;
          cancellation_record_id: string;
          booking_id: string;
          status: Database["public"]["Enums"]["refund_status"];
          amount_kurus: number;
          currency: string;
          gateway_refund_reference: string | null;
          queued_at: string;
          confirmed_at: string | null;
        };
        Insert: {
          refund_id?: string;
          payment_id: string;
          cancellation_record_id: string;
          booking_id: string;
          status?: Database["public"]["Enums"]["refund_status"];
          amount_kurus: number;
          currency: string;
          gateway_refund_reference?: string | null;
          queued_at?: string;
          confirmed_at?: string | null;
        };
        Update: {
          status?: Database["public"]["Enums"]["refund_status"];
          gateway_refund_reference?: string | null;
          confirmed_at?: string | null;
        };
      };
      check_in_records: {
        Row: {
          check_in_record_id: string;
          booking_id: string;
          outcome: Database["public"]["Enums"]["check_in_outcome"];
          operator_id: string;
          document_verified: boolean;
          denial_reason: string | null;
          attempted_at: string;
        };
        Insert: {
          check_in_record_id?: string;
          booking_id: string;
          outcome: Database["public"]["Enums"]["check_in_outcome"];
          operator_id: string;
          document_verified: boolean;
          denial_reason?: string | null;
          attempted_at?: string;
        };
        Update: never;
      };
      ops_review_queue: {
        Row: {
          review_id: string;
          created_at: string;
          resolved_at: string | null;
          status: Database["public"]["Enums"]["ops_review_status"];
          issue_type: Database["public"]["Enums"]["ops_issue_type"];
          voyage_id: string | null;
          hold_id: string | null;
          booking_id: string | null;
          payment_id: string | null;
          refund_id: string | null;
          detected_by: string;
          description: string;
          resolution_action: string | null;
          resolved_by: string | null;
        };
        Insert: {
          review_id?: string;
          created_at?: string;
          resolved_at?: string | null;
          status?: Database["public"]["Enums"]["ops_review_status"];
          issue_type: Database["public"]["Enums"]["ops_issue_type"];
          voyage_id?: string | null;
          hold_id?: string | null;
          booking_id?: string | null;
          payment_id?: string | null;
          refund_id?: string | null;
          detected_by: string;
          description: string;
          resolution_action?: string | null;
          resolved_by?: string | null;
        };
        Update: {
          status?: Database["public"]["Enums"]["ops_review_status"];
          resolved_at?: string | null;
          resolution_action?: string | null;
          resolved_by?: string | null;
        };
      };
    };
    Enums: {
      voyage_status: "DRAFT" | "OPEN" | "CLOSED" | "DEPARTED" | "CANCELLED";
      hold_status: "ACTIVE" | "CONFIRMED" | "EXPIRED" | "RELEASED";
      booking_status: "CONFIRMED" | "CHECKED_IN" | "CANCELLED";
      payment_status: "PENDING" | "SETTLED" | "FAILED" | "UNKNOWN";
      refund_status: "QUEUED" | "SUBMITTED" | "CONFIRMED" | "FAILED" | "MANUAL_REVIEW";
      check_in_outcome: "APPROVED" | "DENIED";
      allocation_event_type:
        | "HOLD_CREATED"
        | "HOLD_EXPIRED"
        | "HOLD_RELEASED"
        | "BOOKING_CONFIRMED"
        | "BOOKING_CANCELLED"
        | "PAYMENT_RECONCILED";
      cancellation_scope: "FULL" | "PARTIAL";
      partial_target_type: "PASSENGER" | "VEHICLE" | "CABIN";
      hold_item_type: "PASSENGER" | "VEHICLE" | "CABIN";
      ops_issue_type:
        | "COUNTER_DRIFT"
        | "PAYMENT_UNKNOWN"
        | "LATE_WEBHOOK"
        | "REFUND_MISMATCH"
        | "ORPHAN_BOOKING"
        | "HOLD_CAPACITY_LEAK"
        | "RECONCILIATION_FAILURE";
      ops_review_status: "OPEN" | "RESOLVED" | "ESCALATED";
    };
  };
};
