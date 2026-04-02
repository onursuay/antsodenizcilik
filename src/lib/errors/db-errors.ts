export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string
  ) {
    super(message);
    this.name = "ApiError";
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      status: this.status,
    };
  }
}

interface PostgrestError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

const SQLSTATE_MAP: Record<string, { status: number; label: string }> = {
  "55P03": { status: 409, label: "lock_contention" },
  P0001: { status: 422, label: "business_rule_violation" },
  P0002: { status: 404, label: "not_found" },
  "23505": { status: 409, label: "duplicate" },
};

export function mapDbError(error: PostgrestError): ApiError {
  const code = error.code ?? "";
  const mapped = SQLSTATE_MAP[code];

  if (mapped) {
    return new ApiError(error.message, mapped.status, mapped.label);
  }

  return new ApiError(
    error.message || "Internal server error",
    500,
    "internal_error"
  );
}
