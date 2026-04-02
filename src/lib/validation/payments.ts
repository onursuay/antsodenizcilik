import { z } from "zod/v4";

export const startPaymentSchema = z.object({
  amountKurus: z.number().int().positive(),
  currency: z.string().length(3),
  gateway: z.string().min(1),
  idempotencyKey: z.string().uuid(),
});

export type StartPaymentInput = z.infer<typeof startPaymentSchema>;
