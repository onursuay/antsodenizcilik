import { ApiError } from "@/lib/errors/db-errors";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getIdempotencyKey(request: Request): string {
  const key = request.headers.get("X-Idempotency-Key");

  if (!key || !UUID_REGEX.test(key)) {
    throw new ApiError(
      "X-Idempotency-Key header is required and must be a valid UUID",
      400,
      "missing_idempotency_key"
    );
  }

  return key;
}
