import { z } from "zod/v4";

const cabinTypeInputSchema = z.object({
  label: z.string().min(1),
  baseCount: z.number().int().positive(),
  berthsPerCabin: z.number().int().positive(),
});

export const createVesselSchema = z.object({
  name: z.string().min(1),
  baseLaneMeters: z.number().positive(),
  baseM2: z.number().positive(),
  basePassengerCapacity: z.number().int().positive(),
  commissionedAt: z.string().datetime(),
  cabinTypes: z.array(cabinTypeInputSchema),
});

export type CreateVesselInput = z.infer<typeof createVesselSchema>;
