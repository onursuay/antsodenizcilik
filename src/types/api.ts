import type {
  CancellationScope,
  HoldItemType,
  PartialTargetType,
} from "./domain";

// --- Hold ---

export interface HoldItemInput {
  item_type: HoldItemType;
  quantity: number;
  lane_meters?: number;
  m2?: number;
  vehicle_type?: string;
  cabin_type_id?: string;
}

export interface CreateHoldRequest {
  voyageId: string;
  items: HoldItemInput[];
  ttlSeconds?: number;
}

export interface CreateHoldResponse {
  holdId: string;
  expiresAt: string;
}

// --- Payment ---

export interface StartPaymentRequest {
  amountKurus: number;
  currency: string;
  gateway: string;
  idempotencyKey: string;
}

export interface StartPaymentResponse {
  paymentId: string;
  status: string;
  isExisting: boolean;
}

// --- Booking ---

export interface PassengerInput {
  fullName: string;
  dateOfBirth: string;
  documentType: string;
  documentNumber: string;
  nationality: string;
}

export interface VehicleInput {
  plateNumber: string;
  vehicleType: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  laneMetersAllocated: number;
  m2Allocated: number;
}

export interface CabinInput {
  cabinTypeId: string;
  countAllocated: number;
}

export interface ConfirmBookingRequest {
  passengers: PassengerInput[];
  vehicles: VehicleInput[];
  cabins: CabinInput[];
}

export interface ConfirmBookingResponse {
  bookingId: string;
  confirmationLedgerEventId: string;
}

export interface CancelBookingRequest {
  scope: CancellationScope;
  initiatedBy: string;
  refundAmountKurus: number;
  partialTargetType?: PartialTargetType;
  partialTargetId?: string;
}

export interface CancelBookingResponse {
  cancellationRecordId: string;
  refundId: string;
}

// --- Voyage (Admin) ---

export interface CabinTypeInput {
  label: string;
  baseCount: number;
  berthsPerCabin: number;
}

export interface CreateVesselRequest {
  name: string;
  baseLaneMeters: number;
  baseM2: number;
  basePassengerCapacity: number;
  commissionedAt: string;
  cabinTypes: CabinTypeInput[];
}

export interface CreateVoyageRequest {
  vesselId: string;
  originPort: string;
  destinationPort: string;
  departureUtc: string;
  arrivalUtc: string;
  operationalLaneMeters: number;
  operationalM2: number;
  operationalPassengerCapacity: number;
  overbookingDelta?: number;
}

// --- Generic API Error ---

export interface ApiErrorResponse {
  error: string;
  code?: string;
  status: number;
}
