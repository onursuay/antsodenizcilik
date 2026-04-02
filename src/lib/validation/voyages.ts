import { z } from "zod/v4";

export const createVoyageSchema = z.object({
  vesselId: z.string().uuid(),
  originPort: z.string().min(1),
  destinationPort: z.string().min(1),
  departureUtc: z.string().datetime(),
  arrivalUtc: z.string().datetime(),
  operationalLaneMeters: z.number().positive(),
  operationalM2: z.number().positive(),
  operationalPassengerCapacity: z.number().int().positive(),
  overbookingDelta: z.number().int().nonnegative().optional(),
});

export const updateVoyageSchema = createVoyageSchema.partial();

export type CreateVoyageInput = z.infer<typeof createVoyageSchema>;
export type UpdateVoyageInput = z.infer<typeof updateVoyageSchema>;
