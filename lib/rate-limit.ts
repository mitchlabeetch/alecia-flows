import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

type RateLimitOptions = {
  key: string;
  prefix: string;
  limit: number;
  windowMs: number;
  message?: string;
};

type RateLimitSuccess = {
  success: true;
  headers: Headers;
};

type RateLimitFailure = {
  success: false;
  response: NextResponse;
};

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

const ratelimiters = new Map<string, Ratelimit>();
const memoryStore = new Map<string, { count: number; resetAt: number }>();

function formatSlidingWindowDuration(windowMs: number) {
  return `${Math.ceil(windowMs / 1000)} s` as Parameters<
    typeof Ratelimit.slidingWindow
  >[1];
}

function buildHeaders(limit: number, remaining: number, resetAt: number) {
  const resetSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  const headers = new Headers();
  headers.set("X-RateLimit-Limit", String(limit));
  headers.set("X-RateLimit-Remaining", String(Math.max(remaining, 0)));
  headers.set(
    "X-RateLimit-Reset",
    String(Math.max(Math.floor(resetAt / 1000), 0))
  );
  headers.set("Retry-After", String(resetSeconds));
  return headers;
}

function getRatelimiter(prefix: string, limit: number, windowMs: number) {
  if (!redis) {
    throw new Error("Upstash Redis is not configured");
  }

  const cacheKey = `${prefix}:${limit}:${windowMs}`;
  const existing = ratelimiters.get(cacheKey);

  if (existing) {
    return existing;
  }

  const ratelimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(
      limit,
      formatSlidingWindowDuration(windowMs)
    ),
    prefix,
    analytics: true,
  });

  ratelimiters.set(cacheKey, ratelimiter);

  return ratelimiter;
}

export async function enforceRateLimit(
  options: RateLimitOptions
): Promise<RateLimitSuccess | RateLimitFailure> {
  if (redis) {
    const ratelimiter = getRatelimiter(
      options.prefix,
      options.limit,
      options.windowMs
    );
    const result = await ratelimiter.limit(options.key);
    const headers = buildHeaders(
      options.limit,
      result.remaining,
      Number(result.reset)
    );

    if (!result.success) {
      return {
        success: false,
        response: NextResponse.json(
          { error: options.message ?? "Too many requests" },
          { status: 429, headers }
        ),
      };
    }

    return { success: true, headers };
  }

  const cacheKey = `${options.prefix}:${options.key}`;
  const now = Date.now();
  const existing = memoryStore.get(cacheKey);

  if (!existing || existing.resetAt <= now) {
    memoryStore.set(cacheKey, { count: 1, resetAt: now + options.windowMs });
    return {
      success: true,
      headers: buildHeaders(
        options.limit,
        options.limit - 1,
        now + options.windowMs
      ),
    };
  }

  existing.count += 1;
  memoryStore.set(cacheKey, existing);

  const remaining = options.limit - existing.count;
  const headers = buildHeaders(options.limit, remaining, existing.resetAt);

  if (existing.count > options.limit) {
    return {
      success: false,
      response: NextResponse.json(
        { error: options.message ?? "Too many requests" },
        { status: 429, headers }
      ),
    };
  }

  return {
    success: true,
    headers,
  };
}

export function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
