import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const INTERNAL_SERVER_ERROR_MESSAGE = "Internal server error";

export function logApiError(context: string, error: unknown) {
  logger.error(context, error);
}

// 4xx typed helpers — use these instead of inline NextResponse.json calls
export function badRequest(message = "Bad request") {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function conflict(message = "Conflict") {
  return NextResponse.json({ error: message }, { status: 409 });
}

export function unprocessableEntity(message = "Unprocessable entity") {
  return NextResponse.json({ error: message }, { status: 422 });
}

export function tooManyRequests(message = "Too many requests") {
  return NextResponse.json({ error: message }, { status: 429 });
}

// 5xx
export function internalServerError(
  context: string,
  error: unknown,
  message = INTERNAL_SERVER_ERROR_MESSAGE
) {
  logApiError(context, error);
  return NextResponse.json({ error: message }, { status: 500 });
}
