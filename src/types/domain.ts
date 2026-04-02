import type { Database } from "./database";

// Table row type aliases
export type Vessel = Database["public"]["Tables"]["vessels"]["Row"];
export type VesselCabinType = Database["public"]["Tables"]["vessel_cabin_types"]["Row"];
export type Voyage = Database["public"]["Tables"]["voyages"]["Row"];
export type VoyageCabinInventory = Database["public"]["Tables"]["voyage_cabin_inventory"]["Row"];
export type VoyageCapacityCounters = Database["public"]["Tables"]["voyage_capacity_counters"]["Row"];
export type Hold = Database["public"]["Tables"]["holds"]["Row"];
export type HoldItem = Database["public"]["Tables"]["hold_items"]["Row"];
export type Booking = Database["public"]["Tables"]["bookings"]["Row"];
export type BookingPassenger = Database["public"]["Tables"]["booking_passengers"]["Row"];
export type BookingVehicle = Database["public"]["Tables"]["booking_vehicles"]["Row"];
export type BookingCabin = Database["public"]["Tables"]["booking_cabins"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type PaymentAttempt = Database["public"]["Tables"]["payment_attempts"]["Row"];
export type CancellationRecord = Database["public"]["Tables"]["cancellation_records"]["Row"];
export type RefundRecord = Database["public"]["Tables"]["refund_records"]["Row"];
export type CheckInRecord = Database["public"]["Tables"]["check_in_records"]["Row"];
export type OpsReviewEntry = Database["public"]["Tables"]["ops_review_queue"]["Row"];

// Enum type aliases
export type VoyageStatus = Database["public"]["Enums"]["voyage_status"];
export type HoldStatus = Database["public"]["Enums"]["hold_status"];
export type BookingStatus = Database["public"]["Enums"]["booking_status"];
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];
export type RefundStatus = Database["public"]["Enums"]["refund_status"];
export type CheckInOutcome = Database["public"]["Enums"]["check_in_outcome"];
export type AllocationEventType = Database["public"]["Enums"]["allocation_event_type"];
export type CancellationScope = Database["public"]["Enums"]["cancellation_scope"];
export type PartialTargetType = Database["public"]["Enums"]["partial_target_type"];
export type HoldItemType = Database["public"]["Enums"]["hold_item_type"];
export type OpsIssueType = Database["public"]["Enums"]["ops_issue_type"];
export type OpsReviewStatus = Database["public"]["Enums"]["ops_review_status"];
