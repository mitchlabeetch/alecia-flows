# 🔴 P0 — Critical Tasks (Security & Breaking Bugs)

## P0-1: Normalize Auto-Save Sentinel

**Current Implementation Grade: 3/10**

**Findings:**
- **Mismatch Confirmed**: The sentinel values are inconsistent across the codebase:
  - `app/api/workflows/current/route.ts:8`: Uses `"~~__CURRENT__~~"`
  - `app/workflows/page.tsx:15`: Filters for `"__current__"` (different format!)
  - `components/workflow/workflow-toolbar.tsx:1410-1411`: Also filters for `"__current__"`
- **Impact**: The auto-save workflow is NOT being properly hidden from the UI because the filter doesn't match the actual database value
- **No Centralized Constant**: The sentinel is hardcoded in multiple locations
- **Documentation**: No comments explaining the purpose of this sentinel value

**Security Risk**: Low
**Stability Risk**: High - Users will see the auto-save workflow in their workflow list
**Code Quality**: Poor - Magic strings scattered across files

**Detailed Guidance to Reach 10/10:**

1. **Create a shared constants file** (`lib/constants.ts`):
```typescript
/**
 * Sentinel value for the auto-save workflow
 * This workflow stores the current unsaved state and should be hidden from UI
 */
export const AUTOSAVE_WORKFLOW_SENTINEL = "~~__CURRENT__~~";
```

2. **Update all files to import and use this constant**:
   - `app/api/workflows/current/route.ts:8`: Replace hardcoded string
   - `app/workflows/page.tsx:15`: Import constant and use it
   - `components/workflow/workflow-toolbar.tsx:1410-1411`: Import constant and use it

3. **Update the API client** if there are any filters in `lib/api-client.ts`

4. **Database Migration**: Check if any existing data uses `"__current__"` and migrate it to `"~~__CURRENT__~~"`

5. **Add tests** to verify the sentinel is correctly filtered in all UI components

6. **Documentation**: Add JSDoc comments explaining why this sentinel exists and how it's used

---

## P0-2: Remove Dead Step Registry

**Current Implementation Grade: 4/10**

**Findings:**
- **File Location**: `lib/steps/index.ts` exists and contains a manual step registry
- **Bug Confirmed**: Line 47-50 shows "Find Issues" incorrectly routed to `createTicketStep` with a TODO comment
- **Auto-generated Alternative**: Based on `.gitignore` and memories, `lib/step-registry.ts` is auto-generated and supersedes this
- **Import Risk**: Unknown - need to check if anything still imports from `lib/steps/index.ts`

**Security Risk**: Low
**Stability Risk**: High - The routing bug could cause incorrect step execution
**Code Quality**: Poor - Dead code with known bugs

**Detailed Guidance to Reach 10/10:**

1. **Search for all imports** of `lib/steps/index.ts`:
```bash
grep -r "from.*lib/steps['\"]" --include="*.ts" --include="*.tsx"
grep -r "from.*@/lib/steps['\"]" --include="*.ts" --include="*.tsx"
```

2. **Update all imports** to use the auto-generated `lib/step-registry.ts` instead

3. **Verify the auto-generated registry**:
   - Run `pnpm discover-plugins`
   - Inspect `lib/step-registry.ts` to ensure it contains all necessary steps
   - Confirm it doesn't have the `findIssuesStep` bug

4. **Delete `lib/steps/index.ts` entirely**

5. **Add a check** in CI/CD to ensure `pnpm discover-plugins` runs before build (already mentioned in memories)

6. **Update documentation** to explain the plugin discovery system and why manual registries are deprecated

---

## P0-3: Fix CI/CD Build Pipeline

**Current Implementation Grade: 6/10**

**Findings:**
- **`.gitignore` Confirmation**: Lines 51-55 correctly exclude generated files:
  - `lib/types/integration.ts`
  - `lib/codegen-registry.ts`
  - `lib/step-registry.ts`
  - `lib/output-display-configs.ts`
- **`package.json` Analysis**:
  - `dev` script (line 8): ✅ Already includes `pnpm discover-plugins &&`
  - `build` script (line 9): ✅ Already includes `pnpm discover-plugins &&`
  - `type-check` script (line 11): ❌ Missing `pnpm discover-plugins`
  - No `lint` script exists (uses `check` and `fix` instead)
- **README Documentation**: Does NOT mention `pnpm discover-plugins` as a prerequisite

**Security Risk**: None
**Stability Risk**: Medium - CI type-check failures on fresh clones
**Code Quality**: Good but incomplete

**Detailed Guidance to Reach 10/10:**

1. **Update `package.json` scripts**:
```json
{
  "type-check": "pnpm discover-plugins && tsc --noEmit",
  "check": "pnpm discover-plugins && npx ultracite@latest check",
  "fix": "pnpm discover-plugins && npx ultracite@latest fix"
}
```

2. **Update README.md** - Add a "Prerequisites" or "First-Time Setup" section:
```markdown
### First-Time Setup

After cloning the repository, run:

```bash
# Generate plugin registry files (required before type-checking or building)
pnpm discover-plugins

# Install dependencies
pnpm install

# Push database schema
pnpm db:push
```

**Note**: Plugin registry files are auto-generated and not committed to git. The `dev` and `build` scripts automatically run `discover-plugins`, but if you run `type-check` or linting commands directly, you must run `discover-plugins` first.
```

3. **Add a `postinstall` script** to `package.json` (optional but recommended):
```json
{
  "postinstall": "pnpm discover-plugins"
}
```

4. **CI/CD Configuration**: Verify `.github/workflows/` includes plugin discovery step (based on memories, this should already exist)

5. **Add error handling** to `scripts/discover-plugins.ts` to provide clear error messages if it fails

---

## P0-4: Secure Anonymous Auth Logic

**Current Implementation Grade: 2/10**

**Findings:**
- **File**: `app/api/api-keys/route.ts:62-64`
- **Current Logic**: Uses TWO fragile string checks:
  ```typescript
  const isAnonymous =
    session.user.name === "Anonymous" ||
    session.user.email?.startsWith("temp-");
  ```
- **Database Schema**: `lib/db/schema.ts:16` shows `isAnonymous: boolean("is_anonymous").default(false)` exists!
- **Better Auth Integration**: Uses anonymous plugin in `lib/auth.ts:57`
- **Security Flaw**: String matching can be bypassed by users setting their name or email to specific values

**Security Risk**: HIGH - Authentication bypass potential
**Stability Risk**: Medium - Fragile logic prone to false positives/negatives
**Code Quality**: Very poor - Ignores database field designed for this purpose

**Detailed Guidance to Reach 10/10:**

1. **Update `app/api/api-keys/route.ts`** to use the database field:
```typescript
// Remove lines 62-64, replace with:
const isAnonymous = session.user.isAnonymous === true;

if (isAnonymous) {
  return NextResponse.json(
    { error: "Anonymous users cannot create API keys" },
    { status: 403 }
  );
}
```

2. **Verify Better Auth session metadata** includes `isAnonymous`:
   - Check if `session.user.isAnonymous` is available from Better Auth
   - If not, query the database directly:
   ```typescript
   const [user] = await db
     .select({ isAnonymous: users.isAnonymous })
     .from(users)
     .where(eq(users.id, session.user.id))
     .limit(1);

   if (user?.isAnonymous) {
     return NextResponse.json(...);
   }
   ```

3. **Search for other instances** of string-based anonymous detection:
```bash
grep -r "name === \"Anonymous\"" --include="*.ts" --include="*.tsx"
grep -r "email?.startsWith(\"temp-\")" --include="*.ts" --include="*.tsx"
```

4. **Update all occurrences** to use the database field

5. **Add database constraint** to prevent anonymous users from having API keys at the schema level (optional but recommended)

6. **Add integration tests** to verify anonymous users cannot create API keys

7. **Security audit**: Review what other operations should be restricted for anonymous users

---

## P0-5: Secure Admin Route

**Current Implementation Grade: 3/10**

**Findings:**
- **File**: `app/admin/page.tsx`
- **Current Implementation**: Client Component with `useEffect` auth check (lines 31-35)
- **Security Flaw**: During hydration, the entire UI renders before the redirect happens
- **Data Leakage**: Lines 40-42 show "Chargement..." text in French, and lines 58-257 show full admin UI is sent to client
- **No Server-Side Protection**: Anyone can view page source and see admin UI structure

**Security Risk**: CRITICAL - Information disclosure, no actual access control
**Stability Risk**: Low
**UI/UX**: Poor - Flash of unauthorized content
**Code Quality**: Very poor for security-sensitive page

**Detailed Guidance to Reach 10/10:**

**Option A: Convert to Server Component (Recommended)**

1. **Create new Server Component** `app/admin/page.tsx`:
```typescript
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AdminPageClient } from "./admin-client";

export default async function AdminPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/");
  }

  return <AdminPageClient />;
}
```

2. **Move all client logic** to `app/admin/admin-client.tsx`:
```typescript
"use client";

import { useState } from "react";
// ... rest of current implementation
```

**Option B: Use Next.js Middleware (Alternative)**

1. **Create/update** `middleware.ts`:
```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "./lib/auth";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};
```

2. **Keep current page** but add server-side enforcement

3. **Add authorization check** (not just authentication) - verify user has admin privileges

4. **Implement proper RBAC** if multiple user roles exist

5. **Add audit logging** for admin page access

6. **Security headers**: Add CSP, X-Frame-Options for admin pages

---

## P0-6: Sanitize 500 Error Responses

**Current Implementation Grade: 4/10**

**Findings:**
- **Scope**: Need to audit all 24 API route files
- **Sample Issue** (`app/api/workflows/current/route.ts:46-54`):
  ```typescript
  error instanceof Error ? error.message : "Failed to get current workflow"
  ```
  This returns `error.message` which could contain sensitive stack traces, database info, or internal paths

**Security Risk**: HIGH - Information disclosure in production
**Stability Risk**: Low
**Code Quality**: Poor - Inconsistent error handling

**Detailed Guidance to Reach 10/10:**

1. **Create centralized error handler** (`lib/api/error-handler.ts`):
```typescript
import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public internalMessage?: string
  ) {
    super(message);
  }
}

export function handleApiError(error: unknown, context?: string) {
  // Log full error server-side
  console.error(`[API Error ${context || ""}]:`, error);

  // Log to external service (Sentry, etc.)
  // logToMonitoring(error, context);

  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    );
  }

  // Never expose internal errors to client
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
```

2. **Update all catch blocks** in API routes:
```typescript
} catch (error) {
  return handleApiError(error, "GET /api/workflows/current");
}
```

3. **Whitelist safe error messages**:
```typescript
const SAFE_ERROR_MESSAGES = new Set([
  "Unauthorized",
  "Not found",
  "Invalid request",
  "Rate limit exceeded",
]);

export function isSafeErrorMessage(message: string): boolean {
  return SAFE_ERROR_MESSAGES.has(message);
}
```

4. **Update all 24 API routes** - systematic approach:
   - Create a script to identify all `catch` blocks
   - Update each one to use `handleApiError`
   - Review each for proper error context

5. **Add structured logging**:
   - Include request ID
   - Include user ID (if authenticated)
   - Include endpoint path
   - Include timestamp
   - Include error stack trace

6. **Environment-specific behavior**:
```typescript
if (process.env.NODE_ENV === "development") {
  // In dev, can include more details
  return NextResponse.json({
    error: "Internal server error",
    details: error instanceof Error ? error.message : String(error),
  }, { status: 500 });
}
```

7. **Add monitoring/alerting** for 500 errors in production

---

## P0-7: Implement API Rate Limiting

**Current Implementation Grade: 0/10**

**Findings:**
- **No Rate Limiting**: Examined the three critical endpoints, none have rate limiting:
  - `app/api/ai/generate/route.ts`
  - `app/api/workflow/[workflowId]/execute/route.ts`
  - `app/api/workflows/[workflowId]/webhook/route.ts`
- **Dependencies**: `package.json` does NOT include `@upstash/ratelimit`
- **Vulnerability**: These endpoints can be abused for DoS or resource exhaustion

**Security Risk**: CRITICAL - DoS, abuse, cost explosion
**Stability Risk**: CRITICAL - Service degradation under attack
**Code Quality**: N/A - Not implemented

**Detailed Guidance to Reach 10/10:**

1. **Install dependencies**:
```bash
pnpm add @upstash/ratelimit @upstash/redis
```

2. **Set up Upstash Redis** (or alternative):
   - Create account at upstash.com
   - Create Redis database
   - Get `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
   - Add to `.env.local`

3. **Create rate limit middleware** (`lib/api/rate-limit.ts`):
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Different rate limits for different endpoint types
export const aiGenerationLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"), // 5 requests per minute
  prefix: "ratelimit:ai-generation",
});

export const workflowExecutionLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"), // 10 per minute
  prefix: "ratelimit:workflow-execution",
});

export const webhookLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "60 s"), // 100 per minute
  prefix: "ratelimit:webhook",
});

export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<NextResponse | null> {
  const { success, limit, reset, remaining } = await limiter.limit(identifier);

  if (!success) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        limit,
        reset: new Date(reset),
        remaining,
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      }
    );
  }

  return null;
}
```

4. **Apply to AI generation endpoint** (`app/api/ai/generate/route.ts`):
```typescript
import { aiGenerationLimit, checkRateLimit } from "@/lib/api/rate-limit";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });

  // Rate limit by user ID (or IP for anonymous)
  const identifier = session?.user?.id || request.headers.get("x-forwarded-for") || "anonymous";
  const rateLimitResponse = await checkRateLimit(aiGenerationLimit, identifier);
  if (rateLimitResponse) return rateLimitResponse;

  // ... rest of implementation
}
```

5. **Apply to workflow execution endpoint**

6. **Apply to webhook endpoint** with special considerations:
   - May need per-workflow rate limits
   - May need to allow higher limits for verified webhooks

7. **Add configuration**:
   - Make rate limits configurable per environment
   - Add admin UI to adjust limits
   - Add per-user custom limits for paid tiers

8. **Monitoring**:
   - Log rate limit violations
   - Alert on unusual patterns
   - Dashboard for rate limit metrics

9. **Graceful fallback**:
   - If Upstash is down, allow requests but log warning
   - Don't let rate limiting break the entire service

10. **Documentation**:
    - Document rate limits in API docs
    - Add headers to responses showing limits
    - Add user-facing error messages

---

## P0-8: Secure Webhook Endpoint

**Current Implementation Grade: 1/10**

**Findings:**
- **No Signature Verification**: Webhooks are completely unsecured
- **File**: `app/api/workflows/[workflowId]/webhook/route.ts`
- **Current Auth**: Only checks if workflow exists, no verification of webhook sender
- **Attack Vector**: Anyone can trigger any workflow by guessing the workflow ID

**Security Risk**: CRITICAL - Unauthorized workflow execution, data injection
**Stability Risk**: Medium - Malicious payloads could crash workflows
**Code Quality**: Very poor for security-critical endpoint

**Detailed Guidance to Reach 10/10:**

1. **Implement HMAC SHA-256 signature verification**:

```typescript
// lib/webhook/signature.ts
import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = createHmac("sha256", secret);
  const expectedSignature = `sha256=${hmac.update(payload).digest("hex")}`;

  // Use timing-safe comparison to prevent timing attacks
  return timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export function generateWebhookSignature(
  payload: string,
  secret: string
): string {
  const hmac = createHmac("sha256", secret);
  return `sha256=${hmac.update(payload).digest("hex")}`;
}
```

2. **Update webhook endpoint** (`app/api/workflows/[workflowId]/webhook/route.ts`):
```typescript
import { verifyWebhookSignature } from "@/lib/webhook/signature";

export async function POST(
  request: Request,
  { params }: { params: { workflowId: string } }
) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get("x-webhook-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing webhook signature" },
        { status: 401 }
      );
    }

    // Get workflow to retrieve webhook secret
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, params.workflowId))
      .limit(1);

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Use API key as webhook secret (temporary solution as documented)
    // TODO: Implement dedicated per-webhook secret system
    const [apiKey] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.userId, workflow.userId))
      .limit(1);

    if (!apiKey) {
      return NextResponse.json(
        { error: "No API key found for webhook authentication" },
        { status: 401 }
      );
    }

    // Verify signature
    const isValid = verifyWebhookSignature(rawBody, signature, apiKey.keyHash);

    if (!isValid) {
      console.error(`[Webhook] Invalid signature for workflow ${params.workflowId}`);
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    // Parse body after verification
    const payload = JSON.parse(rawBody);

    // ... rest of implementation
  } catch (error) {
    return handleApiError(error, "POST /api/workflows/webhook");
  }
}
```

3. **Add webhook secret management**:
   - Short-term: Use API key as secret (as documented in requirement)
   - Long-term: Add `webhookSecret` column to workflows table
   - Generate unique secret per workflow
   - Provide UI to regenerate secrets

4. **Add webhook security headers**:
   - Include timestamp to prevent replay attacks
   - Add nonce to prevent duplicate processing
   - Add event type to validate expected events

5. **Implement replay attack prevention**:
```typescript
// Check timestamp header
const timestamp = request.headers.get("x-webhook-timestamp");
const now = Date.now();
const maxAge = 5 * 60 * 1000; // 5 minutes

if (!timestamp || Math.abs(now - Number.parseInt(timestamp)) > maxAge) {
  return NextResponse.json(
    { error: "Webhook timestamp too old or invalid" },
    { status: 401 }
  );
}
```

6. **Add IP allowlisting** (optional):
   - Allow webhooks only from trusted IPs
   - Configurable per workflow

7. **Comprehensive logging**:
   - Log all webhook attempts (success and failure)
   - Include signature, timestamp, IP address
   - Alert on repeated failures

8. **Documentation**:
   - Create webhook integration guide
   - Provide code examples for generating signatures
   - Document security best practices

9. **Rate limiting** (see P0-7):
   - Apply webhook-specific rate limits
   - Per-workflow limits
   - Global limits

---

## Summary: Critical P0 Items

**Immediate Action Required (Security Critical):**
1. **P0-5**: Secure Admin Route - CRITICAL information disclosure
2. **P0-8**: Secure Webhook Endpoint - CRITICAL unauthorized access
3. **P0-7**: Implement API Rate Limiting - CRITICAL DoS protection
4. **P0-4**: Secure Anonymous Auth Logic - HIGH authentication bypass
5. **P0-6**: Sanitize 500 Error Responses - HIGH information disclosure

**High Priority (Visible Bugs):**
6. **P0-1**: Normalize Auto-Save Sentinel - Users seeing internal workflow
7. **P0-2**: Remove Dead Step Registry - Known routing bug

**Important (Developer Experience):**
8. **P0-3**: Fix CI/CD Build Pipeline - Build failures on fresh clones

All P0 items should be addressed before considering P1-P3 items.

---

## Implementation Progress Log

### 2026-04-10

- Audited every P0 item against the current repository state before changing code.
- Baseline validation before edits:
  - `pnpm type-check`: passed after enabling `pnpm` with `corepack`
  - `pnpm fix`: failed on pre-existing Ultracite violations outside this task
  - `pnpm build`: failed in this sandbox because `next/font/google` could not fetch Geist fonts
  - `pnpm test:e2e`: failed in this sandbox because Playwright browsers were not installed

#### Completed fixes and improvements

1. **P0-1 Auto-save sentinel**
   - Kept the shared sentinel centralized in `lib/workflows/constants.ts`.
   - Added explicit documentation for the internal auto-save workflow sentinel.
   - Added legacy compatibility for `"__current__"` so older records are still hidden safely without depending on a one-off database migration.

2. **P0-2 Dead step registry**
   - Re-verified that the repository does not contain the old manual `lib/steps/index.ts` registry.
   - Confirmed the generated `lib/step-registry.ts` is the active registry source.
   - Added README guidance that generated registries in `lib/` should not be maintained manually.

3. **P0-3 CI/CD build pipeline**
   - Updated `package.json` so `pnpm type-check`, `pnpm check`, and `pnpm fix` all run `pnpm discover-plugins` first.
   - This closes the fresh-clone mismatch between generated plugin files and direct developer scripts.

4. **P0-4 Anonymous auth hardening**
   - Confirmed the API key route was already using the persisted `users.isAnonymous` flag.
   - Removed the remaining fragile UI checks based on `"Anonymous"` and `temp-` email prefixes from `components/workflows/user-menu.tsx`.
   - The user menu now uses persisted user metadata from `/api/user` instead of string matching.

5. **P0-5 Admin route**
   - Confirmed the admin page is already protected server-side in `app/admin/page.tsx`.
   - No additional code change was required for this item during this pass.

6. **P0-6 500-response sanitization**
   - Replaced remaining client-facing `error.message` leaks in API routes that still exposed internal exception text.
   - Sanitized both the live workflow download route and the generated download template API route so internal failures no longer leak raw exception messages to clients.

7. **P0-7 Rate limiting**
   - Confirmed rate limiting already exists for AI generation, workflow execution, and webhook execution through `lib/rate-limit.ts`.
   - No additional code change was required for this item during this pass.

8. **P0-8 Webhook security**
   - Added centralized webhook signing helpers in `lib/webhook/signature.ts`.
   - Hardened `app/api/workflows/[workflowId]/webhook/route.ts` to require:
     - `Authorization: Bearer <api-key>`
     - `X-Webhook-Timestamp`
     - `X-Webhook-Signature`
   - Added HMAC SHA-256 verification over `timestamp.body`.
   - Added timing-safe comparison for signature checks.
   - Added timestamp freshness validation to reduce replay risk.
   - Updated README webhook documentation to describe the required headers and signing format.

#### Post-change validation

- `pnpm type-check`: passed
- Targeted `pnpm exec ultracite check ...changed files...`: passed
- `pnpm fix`: still fails because of pre-existing repository-wide Ultracite issues outside this task
- `pnpm check`: still fails because of the same pre-existing repository-wide Ultracite issues outside this task
- `pnpm build`: still fails in this sandbox because `next/font/google` cannot fetch Geist fonts during production build
- `pnpm exec playwright install chromium`: passed
- `pnpm test:e2e`: passed (`7 passed`)

#### Notes on outdated guidance discovered during implementation

- `app/api/workflows/current/route.ts` no longer exists in the current codebase.
- The old manual step registry described in P0-2 is already gone in the current codebase.
- The anonymous-user API key protection, admin server-side guard, and rate limiting work were already partially or fully completed before this task started.
