import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/errors/db-errors";

interface HoldItemRow {
  item_type: string;
  quantity: number;
  lane_meters_claimed: number | null;
  m2_claimed: number | null;
  cabin_type_id: string | null;
}

/**
 * Server-side pricing for a hold.
 * Computes total amount in kurus from hold_items.
 *
 * Pricing rules:
 *   PASSENGER: 15000 kurus (150 TL) per person
 *   VEHICLE:   30000 kurus (300 TL) per vehicle
 *   CABIN:     50000 kurus (500 TL) per cabin unit
 *
 * These are base prices. In production, prices should come from
 * a voyage_pricing table or external pricing service. This function
 * is the single authoritative pricing source — clients must never
 * supply their own amount.
 */
const PRICE_PER_PASSENGER_KURUS = 15000;
const PRICE_PER_VEHICLE_KURUS = 30000;
const PRICE_PER_CABIN_KURUS = 50000;

export async function computeHoldPrice(
  supabase: SupabaseClient,
  holdId: string
): Promise<{ amountKurus: number; currency: string }> {
  const { data: items, error } = await supabase
    .from("hold_items")
    .select("item_type, quantity, lane_meters_claimed, m2_claimed, cabin_type_id")
    .eq("hold_id", holdId);

  if (error) {
    throw new ApiError(
      "Failed to load hold items for pricing",
      500,
      "internal_error"
    );
  }

  if (!items || items.length === 0) {
    throw new ApiError(
      "Hold has no items — cannot compute price",
      422,
      "business_rule_violation"
    );
  }

  let totalKurus = 0;

  for (const item of items as HoldItemRow[]) {
    switch (item.item_type) {
      case "PASSENGER":
        totalKurus += item.quantity * PRICE_PER_PASSENGER_KURUS;
        break;
      case "VEHICLE":
        totalKurus += item.quantity * PRICE_PER_VEHICLE_KURUS;
        break;
      case "CABIN":
        totalKurus += item.quantity * PRICE_PER_CABIN_KURUS;
        break;
    }
  }

  if (totalKurus <= 0) {
    throw new ApiError(
      "Computed price is zero — pricing misconfiguration",
      500,
      "internal_error"
    );
  }

  return { amountKurus: totalKurus, currency: "TRY" };
}
