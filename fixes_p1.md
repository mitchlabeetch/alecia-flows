# 🟠 P1 — High Priority (Architecture, Schema, Performance)

## P1-1: Remove V0 SDK Dependency

**Current Implementation Grade: 2/10**

**Findings:**
- **Package Dependency**: `package.json:63` shows `"v0-sdk": "^0.15.1"` is installed
- **Plugin Files**: Need to check `plugins/v0/steps/create-chat.ts` and `plugins/v0/steps/send-message.ts`
- **Policy Violation**: The strict "no SDK dependencies" plugin policy exists to reduce supply chain attack surface
- **Architecture Issue**: Using SDK client libraries in plugins violates the documented architecture

**Security Risk**: MEDIUM - Supply chain vulnerability through transitive dependencies
**Stability Risk**: LOW
**Code Quality**: Poor - Policy violation
**Architecture Compliance**: Very poor - Violates core plugin principle

**Detailed Guidance to Reach 10/10:**

1. **Audit current v0 SDK usage**:
   - Read `plugins/v0/steps/create-chat.ts`
   - Read `plugins/v0/steps/send-message.ts`
   - Document what SDK methods are being used

2. **Research v0 API documentation**:
   - Find official v0 API endpoints
   - Document request/response formats
   - Identify authentication method

3. **Rewrite using native fetch()**:
```typescript
// Example pattern for create-chat.ts
"use step";
import "server-only";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { withStepLogging } from "@/lib/steps/step-handler";

export const _integrationType = "v0";

async function createChatStepFn(input: StepInput) {
  const credentials = await fetchCredentials(input.integrationId, "v0");

  const response = await fetch("https://api.v0.dev/v1/chats", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${credentials.apiKey}`,
    },
    body: JSON.stringify({
      // Map input to v0 API format
      message: input.message,
      model: input.model || "default",
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    return {
      success: false,
      error: { message: error.message || "Failed to create chat" },
    };
  }

  const data = await response.json();
  return { success: true, data };
}

export const createChatStep = withStepLogging(createChatStepFn);
createChatStep.maxRetries = 0;
```

4. **Update plugin index.ts**:
   - Ensure outputFields match the new response structure
   - Update any field mappings

5. **Remove SDK from package.json**:
```bash
pnpm remove v0-sdk
```

6. **Test the changes**:
   - Create test workflow using v0 steps
   - Verify API calls work correctly
   - Check error handling

7. **Update documentation**:
   - Document the v0 API endpoints used
   - Add comments explaining the fetch() approach
   - Update any integration guides

8. **Run plugin discovery**:
```bash
pnpm discover-plugins
```

---

## P1-2: Consolidate Visibility Types

**Current Implementation Grade: 5/10**

**Findings:**
- **Duplication Confirmed**: `WorkflowVisibility` type is defined in multiple locations:
  - `lib/db/schema.ts:60`: `export type WorkflowVisibility = "private" | "public";`
  - `lib/api-client.ts:10`: `export type WorkflowVisibility = "private" | "public";`
  - `lib/workflow-store.ts`: Need to check for additional definitions
- **Architecture Issue**: Type definitions should have a single source of truth
- **Risk**: If definitions diverge, type safety breaks

**Security Risk**: None
**Stability Risk**: LOW - Could lead to type mismatches
**Code Quality**: Poor - Violates DRY principle
**Maintainability**: Poor - Changes need to be synchronized

**Detailed Guidance to Reach 10/10:**

1. **Audit all type definitions**:
```bash
grep -r "type WorkflowVisibility" --include="*.ts" --include="*.tsx"
grep -r "WorkflowVisibility.*=" --include="*.ts" --include="*.tsx"
```

2. **Keep definition in schema.ts** as source of truth:
   - Database schema is the canonical source
   - Already exported from `lib/db/schema.ts:60`

3. **Update lib/api-client.ts**:
```typescript
// Remove line 10
// export type WorkflowVisibility = "private" | "public";

// Add import at top
import type { WorkflowVisibility } from "./db/schema";
```

4. **Update lib/workflow-store.ts**:
   - Check if it has its own definition
   - Replace with import from schema

5. **Search for any other duplications**:
```bash
grep -r "private.*public" --include="*.ts" | grep -i visibility
```

6. **Update all imports**:
   - Ensure all files import from `./db/schema` or `@/lib/db/schema`
   - Use IDE refactoring tools to update import paths

7. **Add JSDoc comment** to the canonical type:
```typescript
/**
 * Workflow visibility levels
 * - private: Only visible to the owner
 * - public: Visible to anyone with the link
 */
export type WorkflowVisibility = "private" | "public";
```

8. **Run type checking**:
```bash
pnpm type-check
```

---

## P1-3: Enforce API Client Typings

**Current Implementation Grade: 6/10**

**Findings:**
- **File**: `components/overlays/api-keys-overlay.tsx`
- **Issue**: Uses raw `fetch()` calls instead of the type-safe API client
- **Pattern Inconsistency**: Other components use `lib/api-client.ts` properly
- **Missing Namespace**: No `apiKeysApi` namespace exists in `lib/api-client.ts`

**Security Risk**: LOW
**Stability Risk**: MEDIUM - No type safety on API calls
**Code Quality**: Poor - Inconsistent patterns
**Maintainability**: Poor - Direct fetch calls harder to maintain

**Detailed Guidance to Reach 10/10:**

1. **Read the overlay file**:
   - Identify all fetch() calls
   - Document the API endpoints being called
   - Note request/response formats

2. **Create apiKeysApi namespace** in `lib/api-client.ts`:
```typescript
// Add API key types
export type ApiKey = {
  id: string;
  name: string | null;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  key?: string; // Only present on creation
};

export type CreateApiKeyRequest = {
  name?: string;
};

// Add apiKeysApi namespace
export const apiKeysApi = {
  // List all API keys
  async getAll(): Promise<ApiKey[]> {
    return apiCall<ApiKey[]>("/api/api-keys", {
      method: "GET",
    });
  },

  // Create new API key
  async create(data: CreateApiKeyRequest): Promise<ApiKey> {
    return apiCall<ApiKey>("/api/api-keys", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Delete API key
  async delete(keyId: string): Promise<void> {
    return apiCall<void>(`/api/api-keys/${keyId}`, {
      method: "DELETE",
    });
  },
};
```

3. **Update api object export**:
```typescript
export const api = {
  ai: aiApi,
  integration: integrationApi,
  user: userApi,
  vercelProject: vercelProjectApi,
  workflow: workflowApi,
  apiKeys: apiKeysApi, // Add this
};
```

4. **Refactor api-keys-overlay.tsx**:
```typescript
// Replace raw fetch calls with:
import { api } from "@/lib/api-client";

// Example usage:
const keys = await api.apiKeys.getAll();
const newKey = await api.apiKeys.create({ name: "My API Key" });
await api.apiKeys.delete(keyId);
```

5. **Update error handling**:
   - Use the `ApiError` class from api-client
   - Remove custom error handling code
   - Leverage consistent error patterns

6. **Test the changes**:
   - Open API keys overlay
   - Test creating a key
   - Test deleting a key
   - Verify error handling

7. **Search for other raw fetch calls**:
```bash
grep -r "fetch\(" --include="*.tsx" --include="*.ts" | grep -v "lib/api-client"
```

8. **Document the pattern**:
   - Add comment in api-client.ts explaining namespace pattern
   - Update component guidelines to always use api-client

---

## P1-4: Fix Serverless State Bug

**Current Implementation Grade: 3/10**

**Findings:**
- **File**: `lib/api-client.ts`
- **Issue**: Module-level `autosaveTimeout` variable (need to verify exact line)
- **Serverless Problem**: Each serverless invocation gets a fresh module instance in Vercel
- **Bug Impact**: Debounce state won't persist across invocations, defeating the purpose

**Security Risk**: None
**Stability Risk**: HIGH - Autosave won't work correctly in production
**Code Quality**: Poor - Misunderstands serverless execution model
**Architecture**: Poor - Wrong state management approach

**Detailed Guidance to Reach 10/10:**

1. **Locate the problematic code** in `lib/api-client.ts`:
```bash
grep -n "autosaveTimeout" lib/api-client.ts
```

2. **Read the full autosave implementation**:
   - Understand current debounce logic
   - Identify where state is stored
   - Note which components call autosave

3. **Move state to React component**:

Option A: Use Jotai atom (recommended):
```typescript
// In lib/workflow-store.ts
export const autosaveTimeoutAtom = atom<NodeJS.Timeout | null>(null);
```

Then in the component:
```typescript
const [autosaveTimeout, setAutosaveTimeout] = useAtom(autosaveTimeoutAtom);

// In autosave function
if (autosaveTimeout) {
  clearTimeout(autosaveTimeout);
}
const newTimeout = setTimeout(() => {
  // autosave logic
}, DEBOUNCE_DELAY);
setAutosaveTimeout(newTimeout);
```

Option B: Use React state in calling component:
```typescript
// In component that calls autosave
const timeoutRef = useRef<NodeJS.Timeout | null>(null);

// Pass timeout ref to autosave function
```

4. **Update api-client.ts**:
```typescript
// Remove module-level variable
// let autosaveTimeout: NodeJS.Timeout | null = null; // DELETE THIS

// Update function signature to accept timeout management
export async function autoSaveWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  getCurrentTimeout: () => NodeJS.Timeout | null,
  setCurrentTimeout: (timeout: NodeJS.Timeout | null) => void
) {
  const currentTimeout = getCurrentTimeout();
  if (currentTimeout) {
    clearTimeout(currentTimeout);
  }

  const newTimeout = setTimeout(async () => {
    // ... autosave logic
    setCurrentTimeout(null);
  }, DEBOUNCE_DELAY);

  setCurrentTimeout(newTimeout);
}
```

5. **Update all callers**:
   - Find all components calling autoSaveWorkflow
   - Pass appropriate state management functions
   - Test autosave functionality

6. **Add cleanup**:
```typescript
// In component
useEffect(() => {
  return () => {
    if (autosaveTimeout) {
      clearTimeout(autosaveTimeout);
    }
  };
}, [autosaveTimeout]);
```

7. **Consider alternative architecture**:
   - Client-side debounce + server-side upsert is fine
   - Could also use a queue-based approach
   - Document the chosen pattern

8. **Test in serverless environment**:
   - Deploy to Vercel preview
   - Test autosave functionality
   - Verify debouncing works correctly

---

## P1-5: Fix Drizzle Adapter Schema

**Current Implementation Grade: 4/10**

**Findings:**
- **File**: `lib/auth.ts:19-29`
- **Issue**: Schema object passed to `drizzleAdapter` includes application tables:
  - `workflows`
  - `workflowExecutions`
  - `workflowExecutionLogs`
  - `workflowExecutionsRelations`
- **Problem**: Drizzle adapter should only know about Better Auth core tables
- **Risk**: ORM initialization issues, potential conflicts

**Security Risk**: None
**Stability Risk**: MEDIUM - Could cause ORM errors
**Code Quality**: Poor - Mixing concerns
**Architecture**: Poor - Adapter pollution

**Detailed Guidance to Reach 10/10:**

1. **Read the current schema definition** in `lib/auth.ts:19-29`

2. **Understand Better Auth adapter requirements**:
   - Check Better Auth documentation
   - Identify which tables are required
   - Confirm optional tables

3. **Create clean schema for adapter**:
```typescript
// lib/auth.ts
// Remove application tables from adapter schema
const authSchema = {
  user: users,
  session: sessions,
  account: accounts,
  verification: verifications,
  // Remove these:
  // workflows,
  // workflowExecutions,
  // workflowExecutionLogs,
  // workflowExecutionsRelations,
};

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema, // Use clean schema
  }),
  // ... rest of config
});
```

4. **Verify no breaking changes**:
   - Better Auth should still work normally
   - Check authentication flows
   - Test anonymous user creation
   - Test account linking

5. **Remove unnecessary imports**:
```typescript
// In lib/auth.ts, check if these imports can be removed:
// import { workflows, workflowExecutions, workflowExecutionLogs } from "./db/schema";
```

6. **Keep the imports only if needed** for the `onLinkAccount` callback:
```typescript
// These are needed for the migration logic
import { workflows, workflowExecutions, integrations } from "./db/schema";
```

7. **Test thoroughly**:
   - Test user registration
   - Test login/logout
   - Test anonymous user flow
   - Test account linking with data migration
   - Verify no ORM errors in logs

8. **Add documentation**:
```typescript
/**
 * Auth schema for Better Auth adapter
 * Only includes core authentication tables
 * Application tables (workflows, executions) are managed separately
 */
const authSchema = { ... };
```

---

## P1-6: Fix Account Link Migration

**Current Implementation Grade: 7/10**

**Findings:**
- **File**: `lib/auth.ts:58-96`
- **Current Migration**: `onLinkAccount` callback migrates:
  - ✅ workflows (line 69-72)
  - ✅ workflowExecutions (line 74-77)
  - ✅ integrations (line 80-83)
  - ❌ apiKeys (missing!)
- **Impact**: When anonymous user links account, their API keys are orphaned
- **Data Loss**: API keys remain associated with anonymous user who will be deleted

**Security Risk**: LOW - Orphaned data
**Stability Risk**: MEDIUM - User loses API keys
**Code Quality**: Good but incomplete
**Data Integrity**: Poor - Incomplete migration

**Detailed Guidance to Reach 10/10:**

1. **Import apiKeys table** (if not already imported):
```typescript
import {
  accounts,
  integrations,
  apiKeys, // Add this
  sessions,
  users,
  verifications,
  workflowExecutionLogs,
  workflowExecutions,
  workflowExecutionsRelations,
  workflows,
} from "./db/schema";
```

2. **Add API key migration** to `onLinkAccount`:
```typescript
anonymous({
  async onLinkAccount(data) {
    const fromUserId = data.anonymousUser.user.id;
    const toUserId = data.newUser.user.id;

    console.log(
      `[Anonymous Migration] Migrating from user ${fromUserId} to ${toUserId}`
    );

    try {
      // Migrate workflows
      await db
        .update(workflows)
        .set({ userId: toUserId })
        .where(eq(workflows.userId, fromUserId));

      // Migrate workflow executions
      await db
        .update(workflowExecutions)
        .set({ userId: toUserId })
        .where(eq(workflowExecutions.userId, fromUserId));

      // Migrate integrations
      await db
        .update(integrations)
        .set({ userId: toUserId })
        .where(eq(integrations.userId, fromUserId));

      // Migrate API keys - ADD THIS
      await db
        .update(apiKeys)
        .set({ userId: toUserId })
        .where(eq(apiKeys.userId, fromUserId));

      console.log(
        `[Anonymous Migration] Successfully migrated data from ${fromUserId} to ${toUserId}`
      );
    } catch (error) {
      console.error(
        "[Anonymous Migration] Error migrating user data:",
        error
      );
      throw error;
    }
  },
})
```

3. **Add transaction wrapper** for atomicity:
```typescript
try {
  await db.transaction(async (tx) => {
    // Migrate workflows
    await tx
      .update(workflows)
      .set({ userId: toUserId })
      .where(eq(workflows.userId, fromUserId));

    // ... other migrations

    // Migrate API keys
    await tx
      .update(apiKeys)
      .set({ userId: toUserId })
      .where(eq(apiKeys.userId, fromUserId));
  });

  console.log(
    `[Anonymous Migration] Successfully migrated data from ${fromUserId} to ${toUserId}`
  );
} catch (error) {
  console.error(
    "[Anonymous Migration] Error migrating user data:",
    error
  );
  throw error;
}
```

4. **Add migration logging**:
```typescript
// Before migration, log counts
const [workflowCount, executionCount, integrationCount, apiKeyCount] = await Promise.all([
  db.select({ count: count() }).from(workflows).where(eq(workflows.userId, fromUserId)),
  db.select({ count: count() }).from(workflowExecutions).where(eq(workflowExecutions.userId, fromUserId)),
  db.select({ count: count() }).from(integrations).where(eq(integrations.userId, fromUserId)),
  db.select({ count: count() }).from(apiKeys).where(eq(apiKeys.userId, fromUserId)),
]);

console.log(`[Anonymous Migration] Migrating ${workflowCount} workflows, ${executionCount} executions, ${integrationCount} integrations, ${apiKeyCount} API keys`);
```

5. **Test the migration**:
   - Create anonymous user
   - Create workflows, integrations, and API keys
   - Link to real account (Google/GitHub OAuth)
   - Verify all data migrated correctly
   - Check database to confirm userId updated

6. **Add error recovery**:
   - If migration fails, log which step failed
   - Consider partial rollback strategy
   - Add monitoring for failed migrations

7. **Consider other tables**:
   - Check if there are other user-associated tables
   - Verify all foreign keys to users table
   - Add migration for any missing tables

---

## P1-7: Update DB Schema Duration Types

**Current Implementation Grade: 5/10**

**Findings:**
- **Need to Verify**: Check current type of `duration` column in:
  - `workflowExecutions` table
  - `workflowExecutionLogs` table
- **Expected Issue**: Currently using `text` type to store duration
- **Better Approach**: Use `integer` type to store milliseconds
- **Benefits**: Easier filtering, sorting, and aggregation

**Security Risk**: None
**Stability Risk**: LOW
**Code Quality**: Poor - Wrong data type for numeric data
**Performance**: Poor - Can't efficiently query by duration

**Detailed Guidance to Reach 10/10:**

1. **Read current schema**:
```bash
grep -A 5 "duration" lib/db/schema.ts
```

2. **Verify current implementation**:
```typescript
// Check what the current type is
// Likely something like:
// duration: text("duration"),
```

3. **Update schema definition**:
```typescript
// Change from:
duration: text("duration"),

// To:
duration: integer("duration"), // Duration in milliseconds
```

4. **Add JSDoc comment**:
```typescript
/**
 * Duration of execution in milliseconds
 */
duration: integer("duration"),
```

5. **Generate Drizzle migration**:
```bash
pnpm db:generate
```

6. **Review generated migration**:
   - Check SQL in `drizzle/` directory
   - Verify it includes data migration if needed
   - May need to manually edit migration to convert existing data

7. **Create data migration script** if there's existing data:
```sql
-- In the migration file
-- Convert text durations to integers
UPDATE workflow_executions
SET duration = CAST(REGEXP_REPLACE(duration, '[^0-9]', '', 'g') AS INTEGER)
WHERE duration IS NOT NULL;

UPDATE workflow_execution_logs
SET duration = CAST(REGEXP_REPLACE(duration, '[^0-9]', '', 'g') AS INTEGER)
WHERE duration IS NOT NULL;
```

8. **Update application code** that writes duration:
```typescript
// Ensure duration is stored as milliseconds (integer)
const duration = endTime - startTime; // This should already be a number

await db.insert(workflowExecutions).values({
  duration, // No need to convert to string
});
```

9. **Update application code** that reads duration:
```typescript
// Remove any string parsing
const duration = execution.duration; // Already a number

// Can now do queries like:
const slowExecutions = await db
  .select()
  .from(workflowExecutions)
  .where(gt(workflowExecutions.duration, 5000)); // > 5 seconds
```

10. **Test migration**:
    - Run migration on test database
    - Verify existing data converted correctly
    - Test new executions
    - Verify queries work as expected

11. **Run the migration**:
```bash
pnpm db:push
```

---

## P1-8: Add API Key Expiration

**Current Implementation Grade: 0/10**

**Findings:**
- **Feature**: Not implemented
- **Schema**: `lib/db/schema.ts` - apiKeys table has no `expiresAt` column
- **Security Best Practice**: API keys should have optional expiration
- **Use Cases**: Temporary keys, time-limited access, security policies

**Security Risk**: LOW - Missing security feature
**Stability Risk**: None
**Code Quality**: N/A - Feature not implemented
**Security Best Practice**: Should be implemented

**Detailed Guidance to Reach 10/10:**

1. **Update schema** in `lib/db/schema.ts`:
```typescript
export const apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey().$defaultFn(() => generateId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name"),
  keyHash: text("key_hash").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"), // Add this - optional expiration
});
```

2. **Generate migration**:
```bash
pnpm db:generate
```

3. **Review and apply migration**:
```bash
pnpm db:push
```

4. **Update API key creation** endpoint (`app/api/api-keys/route.ts`):
```typescript
export async function POST(request: Request) {
  // ... existing code

  const body = await request.json().catch(() => ({}));
  const name = body.name || null;
  const expiresInDays = body.expiresInDays; // Optional

  // Calculate expiration if requested
  let expiresAt: Date | null = null;
  if (expiresInDays && typeof expiresInDays === "number") {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  }

  // Generate new API key
  const { key, hash, prefix } = generateApiKey();

  // Save to database
  const [newKey] = await db
    .insert(apiKeys)
    .values({
      userId: session.user.id,
      name,
      keyHash: hash,
      keyPrefix: prefix,
      expiresAt, // Add this
    })
    .returning({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      createdAt: apiKeys.createdAt,
      expiresAt: apiKeys.expiresAt, // Include in response
    });

  return NextResponse.json({
    ...newKey,
    key, // Full key - only returned once!
  });
}
```

5. **Update API key validation** middleware:
```typescript
// In wherever API keys are validated
async function validateApiKey(keyHash: string) {
  const [apiKey] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);

  if (!apiKey) {
    return { valid: false, reason: "Invalid API key" };
  }

  // Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { valid: false, reason: "API key has expired" };
  }

  // Update last used timestamp
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKey.id));

  return { valid: true, userId: apiKey.userId };
}
```

6. **Add cleanup job** for expired keys:
```typescript
// lib/jobs/cleanup-expired-keys.ts
export async function cleanupExpiredKeys() {
  const deleted = await db
    .delete(apiKeys)
    .where(lt(apiKeys.expiresAt, new Date()))
    .returning({ id: apiKeys.id });

  console.log(`Cleaned up ${deleted.length} expired API keys`);
  return deleted.length;
}
```

7. **Update UI** to support expiration:
   - Add expiration field to create form
   - Show expiration date in API key list
   - Add warning for soon-to-expire keys
   - Allow extending expiration (regenerate key)

8. **Add API endpoint** to check key expiration:
```typescript
// GET /api/api-keys/:id/status
export async function GET(
  request: Request,
  { params }: { params: { keyId: string } }
) {
  // ... auth check

  const [key] = await db
    .select({
      id: apiKeys.id,
      expiresAt: apiKeys.expiresAt,
      isExpired: sql<boolean>`${apiKeys.expiresAt} < NOW()`,
    })
    .from(apiKeys)
    .where(eq(apiKeys.id, params.keyId))
    .limit(1);

  return NextResponse.json(key);
}
```

9. **Documentation**:
   - Update API docs
   - Add examples of creating keys with expiration
   - Document cleanup process

---

## P1-9: Add Cascade Deletion

**Current Implementation Grade: 5/10**

**Findings:**
- **Schema Issue**: `workflowExecutionLogs` table references `executionId` but lacks cascade deletion
- **Current Workaround**: `app/api/workflows/[workflowId]/executions/route.ts` has manual deletion logic
- **Better Approach**: Use database-level cascade deletion
- **Benefits**: Simpler code, guaranteed consistency, better performance

**Security Risk**: None
**Stability Risk**: LOW - Manual deletion could have bugs
**Code Quality**: Poor - Database should enforce referential integrity
**Performance**: Poor - Two separate delete operations

**Detailed Guidance to Reach 10/10:**

1. **Read current schema**:
```bash
grep -A 10 "workflowExecutionLogs" lib/db/schema.ts
```

2. **Find the foreign key definition**:
```typescript
// Current definition likely:
executionId: text("execution_id")
  .notNull()
  .references(() => workflowExecutions.id),
```

3. **Add cascade deletion**:
```typescript
executionId: text("execution_id")
  .notNull()
  .references(() => workflowExecutions.id, { onDelete: "cascade" }),
```

4. **Generate migration**:
```bash
pnpm db:generate
```

5. **Review generated migration**:
   - Should include ALTER TABLE to add ON DELETE CASCADE
   - Verify SQL syntax is correct

6. **Apply migration**:
```bash
pnpm db:push
```

7. **Simplify manual deletion logic** in route handler:
```typescript
// In app/api/workflows/[workflowId]/executions/route.ts
// Find the DELETE endpoint

// Before (manual deletion):
await db.delete(workflowExecutionLogs)
  .where(eq(workflowExecutionLogs.executionId, executionId));
await db.delete(workflowExecutions)
  .where(eq(workflowExecutions.id, executionId));

// After (automatic cascade):
await db.delete(workflowExecutions)
  .where(eq(workflowExecutions.id, executionId));
// Logs are automatically deleted by cascade
```

8. **Test cascade deletion**:
   - Create a workflow execution with logs
   - Delete the execution
   - Verify logs are automatically deleted
   - Check database to confirm

9. **Consider other cascade relationships**:
   - Check `workflows` → `workflowExecutions` relationship
   - Check `users` → `workflows` relationship
   - Decide if cascade is appropriate for each
   - Document the cascade behavior

10. **Add comment in schema**:
```typescript
/**
 * Execution ID - automatically deletes logs when execution is deleted
 */
executionId: text("execution_id")
  .notNull()
  .references(() => workflowExecutions.id, { onDelete: "cascade" }),
```

---

## P1-10: Enforce DB Timestamps

**Current Implementation Grade: 6/10**

**Findings:**
- **File**: `lib/db/schema.ts` - `verifications` table
- **Issue**: `createdAt` and `updatedAt` columns are optional (nullable)
- **Problem**: Timestamps should always be set
- **Current Definition** (lines 55-56):
  ```typescript
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  ```
- **Should Have**: `.notNull().defaultNow()`

**Security Risk**: None
**Stability Risk**: LOW - Could cause issues with queries expecting timestamps
**Code Quality**: Poor - Inconsistent with other tables
**Data Integrity**: Poor - Timestamps should be mandatory

**Detailed Guidance to Reach 10/10:**

1. **Update schema definition**:
```typescript
// In lib/db/schema.ts
export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  // Change from:
  // createdAt: timestamp("created_at"),
  // updatedAt: timestamp("updated_at"),
  // To:
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

2. **Generate migration**:
```bash
pnpm db:generate
```

3. **Review migration**:
   - Migration should set NOT NULL constraint
   - Should set DEFAULT NOW() for new rows
   - May need to update existing NULL values first

4. **Handle existing NULL values**:
```sql
-- If migration fails due to existing NULL values, add this first:
UPDATE verifications
SET created_at = NOW()
WHERE created_at IS NULL;

UPDATE verifications
SET updated_at = NOW()
WHERE updated_at IS NULL;
```

5. **Apply migration**:
```bash
pnpm db:push
```

6. **Verify consistency** with other tables:
```bash
grep -A 2 "createdAt:" lib/db/schema.ts
grep -A 2 "updatedAt:" lib/db/schema.ts
```

7. **Ensure all tables have consistent timestamp handling**:
   - All `createdAt` should be `.notNull().defaultNow()`
   - All `updatedAt` should be `.notNull().defaultNow()`
   - Consider adding update triggers for `updatedAt`

8. **Add update trigger** (optional but recommended):
```sql
-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to verifications table
CREATE TRIGGER update_verifications_updated_at
  BEFORE UPDATE ON verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## P1-11: Fix Synchronous Polling

**Current Implementation Grade: 5/10**

**Findings:**
- **Files**: `plugins/fal/steps/*.ts` - all fal plugin steps
- **Issue**: `MAX_POLL_ATTEMPTS` may be too high for Vercel serverless timeouts
- **Vercel Limits**:
  - Hobby/Pro: 60 seconds
  - Enterprise: 300 seconds
- **Risk**: Long-running API calls could timeout
- **Need to Verify**: Current `MAX_POLL_ATTEMPTS` and poll interval values

**Security Risk**: None
**Stability Risk**: HIGH - Function timeouts in production
**Code Quality**: Poor if not accounting for platform limits
**Performance**: Poor - Could cause cascading failures

**Detailed Guidance to Reach 10/10:**

1. **Audit all fal step files**:
```bash
find plugins/fal/steps -name "*.ts" -exec grep -H "MAX_POLL_ATTEMPTS\|pollInterval\|setTimeout" {} \;
```

2. **Read each step file**:
   - Check `MAX_POLL_ATTEMPTS` value
   - Check poll interval (delay between attempts)
   - Calculate total potential duration
   - Example: 120 attempts × 2 seconds = 240 seconds (too high!)

3. **Calculate safe limits**:
```typescript
// For 60-second timeout (with buffer):
// Max execution time: 50 seconds
// Poll interval: 2 seconds
// Safe max attempts: 25

// For 300-second timeout (with buffer):
// Max execution time: 270 seconds
// Poll interval: 2 seconds
// Safe max attempts: 135
```

4. **Update fal step files**:
```typescript
// Example: plugins/fal/steps/generate-image.ts
const MAX_POLL_ATTEMPTS = 25; // Reduced from 120
const POLL_INTERVAL = 2000; // 2 seconds

// Add timeout calculation
const MAX_DURATION = MAX_POLL_ATTEMPTS * POLL_INTERVAL / 1000; // seconds
console.log(`[fal] Max polling duration: ${MAX_DURATION}s`);
```

5. **Add early timeout detection**:
```typescript
const startTime = Date.now();
const TIMEOUT_BUFFER = 10000; // 10 seconds before hard limit

for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
  // Check if we're approaching timeout
  const elapsed = Date.now() - startTime;
  if (elapsed > (50000 - TIMEOUT_BUFFER)) { // 50s with 10s buffer
    return {
      success: false,
      error: {
        message: "Operation timed out. The image generation is taking longer than expected.",
      },
    };
  }

  // ... existing poll logic
}
```

6. **Consider async alternatives**:
   - Use webhook callbacks instead of polling
   - Queue job and poll from separate endpoint
   - Return job ID and let user poll status

7. **Add configuration**:
```typescript
// Make configurable based on environment
const MAX_POLL_ATTEMPTS = process.env.VERCEL_ENV === "production"
  ? 25  // Conservative for 60s timeout
  : 120; // Generous for local dev
```

8. **Document timeout behavior**:
```typescript
/**
 * Polls fal.ai for image generation completion
 * Max duration: ~50s (safe for Vercel 60s limit)
 * If generation takes longer, operation will timeout
 * Consider using webhook callback for long-running generations
 */
```

9. **Add user-facing error message**:
```typescript
return {
  success: false,
  error: {
    message: "Image generation timed out. Try a simpler prompt or smaller image size.",
  },
};
```

10. **Test with long-running operations**:
    - Deploy to Vercel preview
    - Test with prompts that take >30 seconds
    - Verify graceful timeout handling
    - Check logs for actual timeout errors

---

## P1-12: Parallelize Execution Traversal

**Current Implementation Grade: 6/10**

**Findings:**
- **File**: `lib/workflow-executor.workflow.ts`
- **Current Behavior**: Likely executes workflow nodes sequentially
- **Performance Issue**: Independent parallel branches are executed serially
- **Example**: If node A branches to B and C (independent), B finishes before C starts
- **Solution**: Use `Promise.allSettled()` for parallel execution

**Security Risk**: None
**Stability Risk**: LOW
**Code Quality**: Poor - Suboptimal performance
**Performance**: Poor - Unnecessary sequential execution

**Detailed Guidance to Reach 10/10:**

1. **Read current executor implementation**:
```bash
cat lib/workflow-executor.workflow.ts
```

2. **Identify traversal logic**:
   - Find where nodes are executed
   - Identify how successors are determined
   - Understand current execution order

3. **Map workflow graph structure**:
```typescript
// Understand the data structure
type WorkflowNode = {
  id: string;
  // ... other fields
};

type WorkflowEdge = {
  source: string; // source node ID
  target: string; // target node ID
};
```

4. **Build adjacency list**:
```typescript
function buildGraph(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
  const graph = new Map<string, string[]>();

  // Initialize all nodes
  for (const node of nodes) {
    graph.set(node.id, []);
  }

  // Add edges
  for (const edge of edges) {
    const successors = graph.get(edge.source) || [];
    successors.push(edge.target);
    graph.set(edge.source, successors);
  }

  return graph;
}
```

5. **Implement parallel execution**:
```typescript
async function executeNode(nodeId: string): Promise<ExecutionResult> {
  // ... existing node execution logic
}

async function executeWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
  const graph = buildGraph(nodes, edges);
  const executed = new Set<string>();
  const results = new Map<string, ExecutionResult>();

  // Find entry points (nodes with no incoming edges)
  const inDegree = new Map<string, number>();
  for (const node of nodes) {
    inDegree.set(node.id, 0);
  }
  for (const edge of edges) {
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  const entryPoints = nodes
    .filter(node => inDegree.get(node.id) === 0)
    .map(node => node.id);

  // Execute level by level
  async function executeLevel(nodeIds: string[]): Promise<void> {
    // Execute all nodes at this level in parallel
    const promises = nodeIds.map(async (nodeId) => {
      if (executed.has(nodeId)) return;

      const result = await executeNode(nodeId);
      executed.add(nodeId);
      results.set(nodeId, result);

      return result;
    });

    // Wait for all to complete (or fail)
    const settled = await Promise.allSettled(promises);

    // Collect next level nodes
    const nextLevel = new Set<string>();
    for (const nodeId of nodeIds) {
      const successors = graph.get(nodeId) || [];
      for (const successor of successors) {
        // Only add if all predecessors are executed
        const predecessors = edges
          .filter(e => e.target === successor)
          .map(e => e.source);

        if (predecessors.every(p => executed.has(p))) {
          nextLevel.add(successor);
        }
      }
    }

    // Recurse to next level if any
    if (nextLevel.size > 0) {
      await executeLevel(Array.from(nextLevel));
    }
  }

  await executeLevel(entryPoints);
  return results;
}
```

6. **Handle conditional branches**:
```typescript
// For condition nodes, evaluate condition first
// Then only execute the matching branch
if (node.type === "condition") {
  const conditionResult = await evaluateCondition(node);
  const successors = graph.get(node.id) || [];

  // Filter successors based on condition
  const activeSuccessors = successors.filter(s =>
    shouldExecuteBranch(s, conditionResult)
  );

  return executeLevel(activeSuccessors);
}
```

7. **Add execution tracking**:
```typescript
// Log when nodes start/finish for debugging
console.log(`[Executor] Starting parallel execution of nodes: ${nodeIds.join(", ")}`);

const startTime = Date.now();
await Promise.allSettled(promises);
const duration = Date.now() - startTime;

console.log(`[Executor] Completed ${nodeIds.length} nodes in ${duration}ms`);
```

8. **Handle errors gracefully**:
```typescript
const settled = await Promise.allSettled(promises);

for (let i = 0; i < settled.length; i++) {
  const result = settled[i];
  const nodeId = nodeIds[i];

  if (result.status === "rejected") {
    console.error(`[Executor] Node ${nodeId} failed:`, result.reason);
    results.set(nodeId, {
      success: false,
      error: { message: result.reason.message },
    });
  }
}
```

9. **Test parallel execution**:
   - Create workflow with parallel branches
   - Add timing logs to verify parallel execution
   - Compare performance before/after
   - Verify correctness with complex graphs

10. **Document the behavior**:
```typescript
/**
 * Executes workflow nodes in parallel when possible
 * - Nodes at the same "level" (no dependencies between them) run concurrently
 * - Uses Promise.allSettled to handle failures gracefully
 * - Maintains execution order constraints from edges
 */
```

---

## Summary: P1 High Priority Items

**Critical for Architecture/Performance:**
1. **P1-4**: Fix Serverless State Bug - Will break in production
2. **P1-1**: Remove V0 SDK Dependency - Architecture violation
3. **P1-11**: Fix Synchronous Polling - Production timeouts

**Important for Data Integrity:**
4. **P1-6**: Fix Account Link Migration - Data loss risk
5. **P1-9**: Add Cascade Deletion - Data consistency
6. **P1-10**: Enforce DB Timestamps - Data integrity

**Code Quality/Maintainability:**
7. **P1-2**: Consolidate Visibility Types - DRY principle
8. **P1-3**: Enforce API Client Typings - Type safety
9. **P1-5**: Fix Drizzle Adapter Schema - Clean architecture

**New Features:**
10. **P1-7**: Update DB Schema Duration Types - Better queries
11. **P1-8**: Add API Key Expiration - Security best practice
12. **P1-12**: Parallelize Execution Traversal - Performance

Prioritize items 1-3 first as they have production impact, then address data integrity items 4-6.
