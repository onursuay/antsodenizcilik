import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/db-errors";
import type { BookingStatus } from "@/types/domain";

interface PassengerManifestRow {
  booking_id: string;
  user_id: string;
  booking_status: BookingStatus;
  confirmed_at: string;
  checked_in_at: string | null;
  booking_passenger_id: string;
  full_name: string;
  date_of_birth: string;
  document_type: string;
  document_number: string;
  nationality: string;
  is_line_cancelled: boolean;
  is_booking_cancelled: boolean;
}

export async function passengerManifest(
  supabase: SupabaseClient,
  voyageId: string
): Promise<PassengerManifestRow[]> {
  const { data, error } = await supabase.rpc("fn_passenger_manifest", {
    p_voyage_id: voyageId,
  });
  if (error) throw mapDbError(error);
  return data as PassengerManifestRow[];
}

interface VehicleManifestRow {
  booking_id: string;
  user_id: string;
  booking_status: BookingStatus;
  confirmed_at: string;
  checked_in_at: string | null;
  booking_vehicle_id: string;
  plate_number: string;
  vehicle_type: string;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  weight_kg: number;
  lane_meters_allocated: number;
  m2_allocated: number;
  is_line_cancelled: boolean;
}

export async function vehicleManifest(
  supabase: SupabaseClient,
  voyageId: string
): Promise<VehicleManifestRow[]> {
  const { data, error } = await supabase.rpc("fn_vehicle_manifest", {
    p_voyage_id: voyageId,
  });
  if (error) throw mapDbError(error);
  return data as VehicleManifestRow[];
}
