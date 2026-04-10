import { createHmac, timingSafeEqual } from "node:crypto";

export const WEBHOOK_SIGNATURE_HEADER = "x-webhook-signature";
export const WEBHOOK_TIMESTAMP_HEADER = "x-webhook-timestamp";
export const WEBHOOK_SIGNATURE_PREFIX = "sha256=";
export const DEFAULT_WEBHOOK_TIMESTAMP_TOLERANCE_MS = 5 * 60_000;

function getSignedPayload(payload: string, timestamp: string) {
  return `${timestamp}.${payload}`;
}

export function generateWebhookSignature(
  payload: string,
  timestamp: string,
  secret: string
) {
  return `${WEBHOOK_SIGNATURE_PREFIX}${createHmac("sha256", secret)
    .update(getSignedPayload(payload, timestamp))
    .digest("hex")}`;
}

export function isWebhookTimestampFresh(
  timestamp: string,
  toleranceMs = DEFAULT_WEBHOOK_TIMESTAMP_TOLERANCE_MS
) {
  const parsedTimestamp = Number(timestamp);

  if (!Number.isFinite(parsedTimestamp)) {
    return false;
  }

  return Math.abs(Date.now() - parsedTimestamp) <= toleranceMs;
}

export function verifyWebhookSignature(
  payload: string,
  timestamp: string,
  signature: string,
  secret: string
) {
  const expectedSignature = generateWebhookSignature(
    payload,
    timestamp,
    secret
  );

  if (
    !signature.startsWith(WEBHOOK_SIGNATURE_PREFIX) ||
    signature.length !== expectedSignature.length
  ) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
