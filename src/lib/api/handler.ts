import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth/guards";
import { ApiError } from "@/lib/errors/db-errors";
import { jsonError } from "./response";

type RouteContext = { params: Promise<Record<string, string>> };

type RouteHandler = (
  request: Request,
  context: RouteContext
) => Promise<NextResponse>;

export function withApiHandler(fn: RouteHandler): RouteHandler {
  return async (request, context) => {
    try {
      return await fn(request, context);
    } catch (error) {
      if (error instanceof AuthError) {
        return jsonError(error.message, error.status, "unauthorized");
      }

      if (error instanceof ApiError) {
        return jsonError(error.message, error.status, error.code);
      }

      // Zod v4 errors
      if (
        error instanceof Error &&
        error.constructor.name === "ZodError" &&
        "issues" in error
      ) {
        const issues = (error as { issues: Array<{ message: string; path: (string | number)[] }> }).issues;
        const message = issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ");
        return jsonError(message, 400, "validation_error");
      }

      console.error("Unhandled API error:", error);
      return jsonError("Internal server error", 500, "internal_error");
    }
  };
}
