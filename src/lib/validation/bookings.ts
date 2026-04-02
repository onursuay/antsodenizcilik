import { z } from "zod/v4";

const passengerInputSchema = z.object({
  fullName: z.string().min(1),
  dateOfBirth: z.string().date(),
  documentType: z.string().min(1),
  documentNumber: z.string().min(1),
  nationality: z.string().min(1),
});

const vehicleInputSchema = z.object({
  plateNumber: z.string().min(1),
  vehicleType: z.string().min(1),
  lengthCm: z.number().int().positive(),
  widthCm: z.number().int().positive(),
  heightCm: z.number().int().positive(),
  weightKg: z.number().int().positive(),
  laneMetersAllocated: z.number().positive(),
  m2Allocated: z.number().positive(),
});

const cabinInputSchema = z.object({
  cabinTypeId: z.string().uuid(),
  countAllocated: z.number().int().positive(),
});

export const confirmBookingSchema = z.object({
  passengers: z.array(passengerInputSchema),
  vehicles: z.array(vehicleInputSchema),
  cabins: z.array(cabinInputSchema),
});

export const cancelBookingSchema = z.object({
  scope: z.enum(["FULL", "PARTIAL"]),
  initiatedBy: z.string().min(1),
  refundAmountKurus: z.number().int().nonnegative(),
  partialTargetType: z.enum(["PASSENGER", "VEHICLE", "CABIN"]).optional(),
  partialTargetId: z.string().uuid().optional(),
}).refine(
  (data) => {
    if (data.scope === "PARTIAL") {
      return data.partialTargetType != null && data.partialTargetId != null;
    }
    return true;
  },
  { message: "PARTIAL scope requires partialTargetType and partialTargetId" }
);

export type ConfirmBookingInput = z.infer<typeof confirmBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
