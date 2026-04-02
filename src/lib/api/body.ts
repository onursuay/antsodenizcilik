import type { ZodType } from "zod/v4";
import { ApiError } from "@/lib/errors/db-errors";

export async function parseBody<T>(
  request: Request,
  schema: ZodType<T>
): Promise<T> {
  let raw: unknown;

  try {
    raw = await request.json();
  } catch {
    throw new ApiError("Invalid JSON body", 400, "invalid_json");
  }

  return schema.parse(raw);
}
