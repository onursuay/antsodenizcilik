import { z } from "zod/v4";

const passengerItemSchema = z.object({
  item_type: z.literal("PASSENGER"),
  quantity: z.number().int().positive(),
});

const vehicleItemSchema = z.object({
  item_type: z.literal("VEHICLE"),
  quantity: z.number().int().positive(),
  lane_meters: z.number().positive(),
  m2: z.number().positive(),
  vehicle_type: z.string().min(1),
});

const cabinItemSchema = z.object({
  item_type: z.literal("CABIN"),
  quantity: z.number().int().positive(),
  cabin_type_id: z.string().uuid(),
});

export const holdItemSchema = z.discriminatedUnion("item_type", [
  passengerItemSchema,
  vehicleItemSchema,
  cabinItemSchema,
]);

export const createHoldSchema = z.object({
  voyageId: z.string().uuid(),
  items: z.array(holdItemSchema).min(1),
  ttlSeconds: z.number().int().min(60).max(1800).optional(),
});

export type CreateHoldInput = z.infer<typeof createHoldSchema>;
