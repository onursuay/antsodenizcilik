import { NextResponse } from "next/server";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(error: string, status: number, code?: string) {
  return NextResponse.json({ error, code, status }, { status });
}
