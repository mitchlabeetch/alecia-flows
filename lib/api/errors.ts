import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const INTERNAL_SERVER_ERROR_MESSAGE = "Internal server error";

export function logApiError(context: string, error: unknown) {
  logger.error(context, error);
}

export function internalServerError(
  context: string,
  error: unknown,
  message = INTERNAL_SERVER_ERROR_MESSAGE
) {
  logApiError(context, error);
  return NextResponse.json({ error: message }, { status: 500 });
}
