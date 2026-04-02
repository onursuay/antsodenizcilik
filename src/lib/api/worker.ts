import { jsonOk } from "./response";

export function workerOk(
  worker: string,
  result: Record<string, unknown>,
  startTime: number
) {
  return jsonOk({
    worker,
    status: "ok",
    result,
    durationMs: Date.now() - startTime,
  });
}

export function workerError(
  worker: string,
  error: string,
  startTime: number
) {
  return jsonOk({
    worker,
    status: "error",
    error,
    durationMs: Date.now() - startTime,
  });
}
