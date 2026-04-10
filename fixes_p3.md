# 🔵 P3 — Low Priority (Polish & Maintenance)

## P3-1: Add Prepare Script

**Current Implementation Grade: 5/10**

**Findings:**
- **Issue**: Fresh `pnpm install` doesn't auto-generate plugin files
- **Impact**: Developers must manually run `pnpm discover-plugins` after install
- **Solutions**:
  - Option A: `prepare` script (runs after install in all scenarios)
  - Option B: `postinstall` script (runs after install, including in production)
- **Trade-offs**: `postinstall` runs in production builds, `prepare` doesn't

**Security Risk**: None
**Stability Risk**: None
**Developer Experience**: Medium - Extra manual step
**Maintainability**: Good improvement

**Detailed Guidance to Reach 10/10:**

1. **Evaluate options**:
   - `prepare`: Runs after `pnpm install` but NOT during `pnpm install --production`
   - `postinstall`: Runs after every install, including production
   - `predev`: Runs before `pnpm dev` only

2. **Recommended approach** - Use `prepare`:
```json
// package.json
{
  "scripts": {
    "prepare": "pnpm discover-plugins",
    "dev": "next dev",
    "build": "tsx scripts/migrate-prod.ts && pnpm discover-plugins && next build"
  }
}
```

Rationale:
- Runs automatically after `pnpm install` for developers
- Doesn't run in production (where files should already be generated during build)
- Safe and predictable behavior

3. **Alternative approach** - Use `postinstall` with guard:
```json
{
  "scripts": {
    "postinstall": "node -e \"process.env.NODE_ENV !== 'production' && require('child_process').execSync('pnpm discover-plugins', {stdio:'inherit'})\""
  }
}
```

4. **Add helpful error messages** to scripts that need generated files:
```typescript
// scripts/check-generated-files.ts
import fs from "node:fs";
import path from "node:path";

const requiredFiles = [
  "lib/types/integration.ts",
  "lib/step-registry.ts",
  "lib/codegen-registry.ts",
  "lib/output-display-configs.ts",
];

for (const file of requiredFiles) {
  const filePath = path.join(process.cwd(), file);
  if (!fs.existsSync(filePath)) {
    console.error(`\n❌ Missing generated file: ${file}`);
    console.error("📝 Run: pnpm discover-plugins\n");
    process.exit(1);
  }
}

console.log("✅ All generated files present");
```

5. **Update type-check script** to check for files first:
```json
{
  "type-check": "node scripts/check-generated-files.js && tsc --noEmit"
}
```

6. **Document in README**:
```markdown
## Development Setup

After cloning:

```bash
pnpm install  # Automatically runs plugin discovery
pnpm dev      # Start development server
```

If you encounter type errors about missing files, run:

```bash
pnpm discover-plugins
```
```

7. **Add to .gitignore** if not already there (already present):
```gitignore
# Generated plugin files
lib/types/integration.ts
lib/codegen-registry.ts
lib/step-registry.ts
lib/output-display-configs.ts
```

8. **Consider caching** for faster installs:
```typescript
// In scripts/discover-plugins.ts
const cacheFile = ".plugin-cache.json";
const currentHash = hashPluginFiles();
const cachedHash = readCachedHash();

if (currentHash === cachedHash) {
  console.log("Plugin files unchanged, skipping discovery");
  process.exit(0);
}

// ... generate files

writeCachedHash(currentHash);
```

9. **Test the setup**:
```bash
# Clean install test
rm -rf node_modules
pnpm install
# Verify generated files exist
ls lib/types/integration.ts
```

10. **Pros and cons**:

Pros:
- Automatic setup for new developers
- Reduces support questions
- Consistent developer experience

Cons:
- Slightly slower install times
- Could slow down CI if not cached
- May generate files unnecessarily if plugins haven't changed

**Recommendation**: Implement `prepare` script as it provides the best balance of convenience and safety.

---

## P3-2: Refactor Vercel Integration

**Current Implementation Grade: 6/10**

**Findings:**
- **File**: `lib/integrations/vercel.ts`
- **Status**: Standalone integration file, not following plugin pattern
- **Issue**: Inconsistent with other integrations
- **Options**:
  - Convert to standard plugin in `plugins/vercel/`
  - Document as internal utility (not user-facing)
  - Remove if unused

**Security Risk**: None
**Stability Risk**: None
**Code Quality**: Medium - Inconsistent architecture
**Maintainability**: Medium - Confusion about purpose

**Detailed Guidance to Reach 10/10:**

1. **Read the current file**:
```bash
cat lib/integrations/vercel.ts
```

2. **Determine its purpose**:
   - Is it used for Vercel project deployments?
   - Is it internal infrastructure code?
   - Is it user-facing integration?

3. **Check for usage**:
```bash
grep -r "from.*lib/integrations/vercel" --include="*.ts" --include="*.tsx"
grep -r "from.*@/lib/integrations/vercel" --include="*.ts" --include="*.tsx"
```

4. **Option A: Convert to plugin** (if user-facing):

Create `plugins/vercel/index.ts`:
```typescript
import type { Plugin } from "@/lib/types/plugin";

export default {
  id: "vercel",
  name: "Vercel",
  description: "Deploy and manage Vercel projects",
  icon: "vercel-icon.svg",

  auth: {
    type: "oauth" as const,
    authorizationUrl: "https://vercel.com/oauth/authorize",
    tokenUrl: "https://api.vercel.com/oauth/token",
    scopes: ["deployment:read", "deployment:write"],
  },

  actions: [
    {
      id: "deploy-project",
      label: "Deploy Project",
      description: "Deploy a project to Vercel",
      category: "deployment",
      configFields: [
        {
          key: "projectId",
          label: "Project ID",
          type: "text",
          required: true,
        },
        {
          key: "gitBranch",
          label: "Git Branch",
          type: "text",
          required: false,
        },
      ],
      outputFields: [
        { field: "deploymentUrl", label: "Deployment URL" },
        { field: "deploymentId", label: "Deployment ID" },
        { field: "status", label: "Status" },
      ],
    },
    // ... other actions
  ],
} satisfies Plugin;
```

Create step files in `plugins/vercel/steps/`:
```typescript
// plugins/vercel/steps/deploy-project.ts
"use step";
import "server-only";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { withStepLogging } from "@/lib/steps/step-handler";

export const _integrationType = "vercel";

async function deployProjectFn(input: StepInput) {
  const credentials = await fetchCredentials(input.integrationId, "vercel");

  const response = await fetch(
    `https://api.vercel.com/v13/deployments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: input.projectId,
        gitSource: {
          ref: input.gitBranch || "main",
          type: "github",
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    return {
      success: false,
      error: { message: error.message || "Deployment failed" },
    };
  }

  const data = await response.json();
  return {
    success: true,
    data: {
      deploymentUrl: data.url,
      deploymentId: data.id,
      status: data.readyState,
    },
  };
}

export const deployProjectStep = withStepLogging(deployProjectFn);
deployProjectStep.maxRetries = 0;
```

5. **Option B: Document as internal utility**:

If it's internal infrastructure code:

```typescript
// lib/integrations/vercel.ts
/**
 * Internal Vercel API utilities
 *
 * This is NOT a user-facing integration plugin.
 * It provides internal utilities for:
 * - Vercel project detection
 * - Environment variable management
 * - Build configuration
 *
 * For user-facing Vercel integration, see plugins/vercel/
 */

// Add clear JSDoc comments explaining purpose
```

Update any imports to make it clear:
```typescript
// Instead of:
import { vercelUtils } from "@/lib/integrations/vercel";

// Use:
import { vercelInternalUtils } from "@/lib/internal/vercel";
```

6. **Option C: Remove if unused**:

If not used anywhere:
```bash
# Check if safe to delete
git rm lib/integrations/vercel.ts
# Remove directory if empty
rmdir lib/integrations
```

7. **Move related utilities**:

If there are other integration utilities:
```bash
# Create internal utilities directory
mkdir -p lib/internal
mv lib/integrations/* lib/internal/
```

8. **Update architecture documentation**:
```markdown
## Project Structure

### User-Facing Integrations
- `plugins/*/` - User-facing integration plugins
- Follow plugin system conventions
- Auto-discovered and registered

### Internal Utilities
- `lib/internal/` - Internal infrastructure code
- Not exposed to users
- Direct imports only
```

9. **Consider future expansion**:

If Vercel integration might be user-facing later:
- Start with internal utilities
- Plan plugin architecture
- Document migration path

10. **Clean up confusion**:

Remove or rename `lib/integrations/` directory:
```bash
# If keeping for internal use
mv lib/integrations lib/internal

# If converting to plugins
# Move each to appropriate plugin directory
```

**Recommendation**: Evaluate usage and choose Option B (document as internal) unless there's clear user-facing need for Option A (convert to plugin).

---

## P3-3: Audit Embedded Boilerplate

**Current Implementation Grade: 5/10**

**Findings:**
- **File**: `lib/next-boilerplate/package.json`
- **Issue**: Dependencies not pinned to exact versions
- **Risk**: Supply chain vulnerabilities through uncontrolled updates
- **Example**: `"next": "^16.0.0"` allows automatic minor/patch updates

**Security Risk**: MEDIUM - Unvetted dependency updates
**Stability Risk**: MEDIUM - Breaking changes in patches
**Code Quality**: Poor - Unmanaged dependencies
**Supply Chain Security**: Poor - Uncontrolled transitive deps

**Detailed Guidance to Reach 10/10:**

1. **Read current boilerplate package.json**:
```bash
cat lib/next-boilerplate/package.json
```

2. **Understand the boilerplate's purpose**:
   - Is it embedded in generated workflow code?
   - Is it the template for workflow downloads?
   - When does it get used?

3. **Pin all dependencies to exact versions**:
```json
// Before:
{
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.0.0",
    "drizzle-orm": "~0.44.0"
  }
}

// After:
{
  "dependencies": {
    "next": "16.0.10",
    "react": "19.2.1",
    "drizzle-orm": "0.44.7"
  }
}
```

4. **Remove all version range operators**:
   - Remove `^` (caret) - allows minor and patch updates
   - Remove `~` (tilde) - allows patch updates
   - Remove `>=`, `<`, etc.
   - Use exact versions only

5. **Create update script** (`scripts/update-boilerplate-deps.ts`):
```typescript
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

// Read main package.json for current versions
const mainPkg = JSON.parse(
  fs.readFileSync("package.json", "utf-8")
);

// Read boilerplate package.json
const boilerplatePath = "lib/next-boilerplate/package.json";
const boilerplatePkg = JSON.parse(
  fs.readFileSync(boilerplatePath, "utf-8")
);

// Update dependencies to match main project (exact versions)
const updatedDeps: Record<string, string> = {};

for (const [dep, version] of Object.entries(boilerplatePkg.dependencies || {})) {
  if (mainPkg.dependencies[dep]) {
    // Use exact version from main project
    const exactVersion = mainPkg.dependencies[dep].replace(/[\^~>=<]/, "");
    updatedDeps[dep] = exactVersion;
  } else {
    // Keep existing but remove range operators
    updatedDeps[dep] = (version as string).replace(/[\^~>=<]/, "");
  }
}

boilerplatePkg.dependencies = updatedDeps;

// Write updated package.json
fs.writeFileSync(
  boilerplatePath,
  JSON.stringify(boilerplatePkg, null, 2) + "\n"
);

console.log("✅ Boilerplate dependencies pinned to exact versions");
```

6. **Add validation** to CI:
```typescript
// scripts/validate-boilerplate-deps.ts
import fs from "node:fs";

const pkg = JSON.parse(
  fs.readFileSync("lib/next-boilerplate/package.json", "utf-8")
);

const hasRanges = Object.values(pkg.dependencies || {}).some(
  (version) => /[\^~>=<]/.test(version as string)
);

if (hasRanges) {
  console.error("❌ Boilerplate dependencies must use exact versions");
  console.error("   Run: pnpm update-boilerplate-deps");
  process.exit(1);
}

console.log("✅ All boilerplate dependencies use exact versions");
```

7. **Add to CI workflow**:
```yaml
# .github/workflows/pr-checks.yml
- name: Validate boilerplate dependencies
  run: tsx scripts/validate-boilerplate-deps.ts
```

8. **Document update process**:
```markdown
## Updating Boilerplate Dependencies

The workflow download boilerplate uses pinned dependencies for security.

To update:

```bash
# 1. Update main project dependencies
pnpm update

# 2. Sync boilerplate to match
pnpm update-boilerplate-deps

# 3. Test the boilerplate
cd lib/next-boilerplate
pnpm install
pnpm build
```

Manual testing required before updating:
- Generate workflow download
- Extract and install
- Verify build works
- Verify deployment works
```

9. **Add package.json script**:
```json
{
  "scripts": {
    "update-boilerplate-deps": "tsx scripts/update-boilerplate-deps.ts",
    "validate-boilerplate-deps": "tsx scripts/validate-boilerplate-deps.ts"
  }
}
```

10. **Consider lockfile**:
```bash
# Generate lockfile for boilerplate
cd lib/next-boilerplate
pnpm install
# Commit pnpm-lock.yaml to pin transitive deps
```

11. **Add security scanning**:
```yaml
# .github/workflows/security.yml
- name: Audit boilerplate dependencies
  run: |
    cd lib/next-boilerplate
    pnpm audit --audit-level=high
```

12. **Document versioning policy**:
```markdown
## Boilerplate Dependency Policy

1. **Exact versions only** - No `^`, `~`, or ranges
2. **Manual updates** - Run `update-boilerplate-deps` after main dependency updates
3. **Security patches** - Update immediately for CVEs
4. **Major versions** - Test thoroughly before updating
5. **Lockfile committed** - Pins all transitive dependencies
```

**Recommendation**: Implement exact version pinning immediately (steps 3-5), then add automation and validation (steps 6-11) for long-term maintenance.

---

## P3-4: Add API Pagination

**Current Implementation Grade: 0/10**

**Findings:**
- **Files**:
  - `app/api/workflows/route.ts` - GET all workflows
  - `app/api/workflows/[workflowId]/executions/route.ts` - GET execution history
- **Issue**: No pagination support
- **Risk**: Performance degradation with large datasets
- **Type**: Cursor-based pagination using `createdAt`

**Security Risk**: None
**Stability Risk**: HIGH (with scale) - Performance issues
**Code Quality**: Poor - Missing standard feature
**Scalability**: Very poor - Won't scale

**Detailed Guidance to Reach 10/10:**

1. **Create pagination utilities** (`lib/api/pagination.ts`):
```typescript
import { z } from "zod";

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(), // ISO timestamp
});

export type PaginationParams = z.infer<typeof paginationSchema>;

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
    limit: number;
  };
};

export function createPaginatedResponse<T>(
  data: T[],
  limit: number,
  getCursor: (item: T) => string
): PaginatedResponse<T> {
  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, limit) : data;
  const nextCursor = hasMore ? getCursor(items[items.length - 1]) : null;

  return {
    data: items,
    pagination: {
      hasMore,
      nextCursor,
      limit,
    },
  };
}
```

2. **Update workflows list endpoint**:
```typescript
// app/api/workflows/route.ts
import { paginationSchema, createPaginatedResponse } from "@/lib/api/pagination";
import { desc, lt } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query params
    const url = new URL(request.url);
    const params = paginationSchema.parse({
      limit: url.searchParams.get("limit"),
      cursor: url.searchParams.get("cursor"),
    });

    // Fetch one extra to check if there are more
    const limit = params.limit + 1;

    let query = db
      .select()
      .from(workflows)
      .where(eq(workflows.userId, session.user.id))
      .orderBy(desc(workflows.createdAt))
      .limit(limit);

    // Apply cursor if provided
    if (params.cursor) {
      const cursorDate = new Date(params.cursor);
      query = query.where(lt(workflows.createdAt, cursorDate));
    }

    const results = await query;

    // Create paginated response
    const response = createPaginatedResponse(
      results,
      params.limit,
      (workflow) => workflow.createdAt.toISOString()
    );

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, "GET /api/workflows");
  }
}
```

3. **Update executions endpoint**:
```typescript
// app/api/workflows/[workflowId]/executions/route.ts
export async function GET(
  request: Request,
  { params }: { params: { workflowId: string } }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse pagination params
    const url = new URL(request.url);
    const paginationParams = paginationSchema.parse({
      limit: url.searchParams.get("limit"),
      cursor: url.searchParams.get("cursor"),
    });

    // Verify ownership
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(
        and(
          eq(workflows.id, params.workflowId),
          eq(workflows.userId, session.user.id)
        )
      )
      .limit(1);

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Fetch executions with pagination
    const limit = paginationParams.limit + 1;

    let query = db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.workflowId, params.workflowId))
      .orderBy(desc(workflowExecutions.createdAt))
      .limit(limit);

    if (paginationParams.cursor) {
      const cursorDate = new Date(paginationParams.cursor);
      query = query.where(lt(workflowExecutions.createdAt, cursorDate));
    }

    const executions = await query;

    const response = createPaginatedResponse(
      executions,
      paginationParams.limit,
      (execution) => execution.createdAt.toISOString()
    );

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, "GET /api/workflows/executions");
  }
}
```

4. **Update API client**:
```typescript
// lib/api-client.ts
export type PaginatedWorkflows = {
  data: SavedWorkflow[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
    limit: number;
  };
};

export const workflowApi = {
  // Update getAll to support pagination
  async getAll(options?: {
    limit?: number;
    cursor?: string;
  }): Promise<PaginatedWorkflows> {
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", options.limit.toString());
    if (options?.cursor) params.set("cursor", options.cursor);

    return apiCall<PaginatedWorkflows>(
      `/api/workflows?${params.toString()}`,
      { method: "GET" }
    );
  },

  async getExecutions(
    workflowId: string,
    options?: { limit?: number; cursor?: string }
  ): Promise<PaginatedResponse<WorkflowExecution>> {
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", options.limit.toString());
    if (options?.cursor) params.set("cursor", options.cursor);

    return apiCall<PaginatedResponse<WorkflowExecution>>(
      `/api/workflows/${workflowId}/executions?${params.toString()}`,
      { method: "GET" }
    );
  },
};
```

5. **Update UI components** to handle pagination:
```typescript
// components/workflows/workflow-list.tsx
export function WorkflowList() {
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const response = await api.workflow.getAll({
        limit: 20,
        cursor: cursor || undefined,
      });

      setWorkflows((prev) => [...prev, ...response.data]);
      setCursor(response.pagination.nextCursor);
      setHasMore(response.pagination.hasMore);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  return (
    <div>
      {workflows.map((workflow) => (
        <WorkflowCard key={workflow.id} workflow={workflow} />
      ))}

      {hasMore && (
        <Button onClick={loadWorkflows} disabled={loading}>
          {loading ? "Loading..." : "Load More"}
        </Button>
      )}
    </div>
  );
}
```

6. **Add infinite scroll** (optional):
```typescript
// Using intersection observer
const loadMoreRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!loadMoreRef.current || !hasMore || loading) return;

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        loadWorkflows();
      }
    },
    { threshold: 0.5 }
  );

  observer.observe(loadMoreRef.current);

  return () => observer.disconnect();
}, [hasMore, loading]);

// In render:
<div ref={loadMoreRef}>
  {hasMore && <Spinner />}
</div>
```

7. **Add filtering support**:
```typescript
// Extend pagination with filters
export const workflowFilterSchema = z.object({
  ...paginationSchema.shape,
  visibility: z.enum(["private", "public"]).optional(),
  search: z.string().max(100).optional(),
});

// In API route:
if (filters.visibility) {
  query = query.where(eq(workflows.visibility, filters.visibility));
}

if (filters.search) {
  query = query.where(
    or(
      ilike(workflows.name, `%${filters.search}%`),
      ilike(workflows.description, `%${filters.search}%`)
    )
  );
}
```

8. **Add sorting support**:
```typescript
export const sortSchema = z.enum(["createdAt", "updatedAt", "name"]);

// In API route:
const sortField = sortSchema.parse(url.searchParams.get("sort") || "createdAt");

switch (sortField) {
  case "createdAt":
    query = query.orderBy(desc(workflows.createdAt));
    break;
  case "updatedAt":
    query = query.orderBy(desc(workflows.updatedAt));
    break;
  case "name":
    query = query.orderBy(workflows.name);
    break;
}
```

9. **Add caching** (optional):
```typescript
// Use React Query or SWR for caching
import { useInfiniteQuery } from "@tanstack/react-query";

const {
  data,
  fetchNextPage,
  hasNextPage,
  isLoading,
} = useInfiniteQuery({
  queryKey: ["workflows"],
  queryFn: ({ pageParam }) =>
    api.workflow.getAll({ cursor: pageParam }),
  getNextPageParam: (lastPage) =>
    lastPage.pagination.nextCursor,
});
```

10. **Document pagination**:
```markdown
## API Pagination

All list endpoints support cursor-based pagination:

```bash
GET /api/workflows?limit=20&cursor=2024-01-01T00:00:00Z

Response:
{
  "data": [...],
  "pagination": {
    "hasMore": true,
    "nextCursor": "2024-01-15T12:30:00Z",
    "limit": 20
  }
}
```

Parameters:
- `limit`: Number of items (1-100, default 20)
- `cursor`: ISO timestamp for next page
```

**Recommendation**: Implement basic pagination (steps 1-4) immediately, add UI support (step 5), then enhance with filtering/sorting as needed.

---

## P3-5: Create Legacy Action Migration

**Current Implementation Grade: 4/10**

**Findings:**
- **File**: `plugins/legacy-mappings.ts`
- **Purpose**: Maps old action type strings to new format
- **Issue**: Runtime mapping instead of data migration
- **Problem**: Legacy data remains in database
- **Solution**: One-time migration script to update database

**Security Risk**: None
**Stability Risk**: LOW - Mapping works but is inefficient
**Code Quality**: Medium - Temporary workaround
**Data Integrity**: Poor - Database contains outdated values

**Detailed Guidance to Reach 10/10:**

1. **Read legacy mappings file**:
```bash
cat plugins/legacy-mappings.ts
```

2. **Document all mappings**:
```typescript
// Example mappings (verify actual mappings)
const legacyMappings = {
  "send-email": "resend-send-email",
  "create-ticket": "linear-create-ticket",
  "database-query": "database-query", // May stay same
  // ... etc
};
```

3. **Create migration script** (`scripts/migrate-legacy-actions.ts`):
```typescript
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

// Import legacy mappings
import { legacyActionMappings } from "@/plugins/legacy-mappings";

async function migrateLegacyActions() {
  console.log("Starting legacy action migration...");

  let totalUpdated = 0;

  // Get all workflows
  const allWorkflows = await db.select().from(workflows);

  console.log(`Found ${allWorkflows.length} workflows to check`);

  for (const workflow of allWorkflows) {
    let updated = false;
    const nodes = workflow.nodes as any[];

    // Update nodes with legacy action types
    const updatedNodes = nodes.map((node) => {
      if (node.data?.config?.actionType) {
        const oldType = node.data.config.actionType;
        const newType = legacyActionMappings[oldType];

        if (newType && newType !== oldType) {
          console.log(`  Updating ${oldType} -> ${newType} in workflow ${workflow.id}`);
          updated = true;
          return {
            ...node,
            data: {
              ...node.data,
              config: {
                ...node.data.config,
                actionType: newType,
              },
            },
          };
        }
      }
      return node;
    });

    // Update workflow if changes were made
    if (updated) {
      await db
        .update(workflows)
        .set({
          nodes: updatedNodes,
          updatedAt: new Date(),
        })
        .where(sql`id = ${workflow.id}`);

      totalUpdated++;
    }
  }

  console.log(`\n✅ Migration complete: ${totalUpdated} workflows updated`);

  return { totalWorkflows: allWorkflows.length, updated: totalUpdated };
}

// Run migration
migrateLegacyActions()
  .then((result) => {
    console.log("\nMigration summary:", result);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  });
```

4. **Add dry-run mode**:
```typescript
const DRY_RUN = process.env.DRY_RUN === "true";

if (DRY_RUN) {
  console.log("DRY RUN MODE - No changes will be made\n");
}

// In migration loop:
if (updated) {
  if (!DRY_RUN) {
    await db.update(workflows)...
  } else {
    console.log(`  [DRY RUN] Would update workflow ${workflow.id}`);
  }
  totalUpdated++;
}
```

5. **Add backup step**:
```typescript
async function backupWorkflows() {
  console.log("Creating backup...");

  const allWorkflows = await db.select().from(workflows);
  const backup = {
    timestamp: new Date().toISOString(),
    count: allWorkflows.length,
    workflows: allWorkflows,
  };

  await fs.writeFile(
    `backups/workflows-${Date.now()}.json`,
    JSON.stringify(backup, null, 2)
  );

  console.log("✅ Backup created");
}

// Run before migration
await backupWorkflows();
await migrateLegacyActions();
```

6. **Add rollback capability**:
```typescript
async function rollbackMigration(backupFile: string) {
  console.log(`Rolling back from ${backupFile}...`);

  const backup = JSON.parse(
    await fs.readFile(backupFile, "utf-8")
  );

  for (const workflow of backup.workflows) {
    await db
      .update(workflows)
      .set({
        nodes: workflow.nodes,
        updatedAt: new Date(workflow.updatedAt),
      })
      .where(sql`id = ${workflow.id}`);
  }

  console.log("✅ Rollback complete");
}
```

7. **Create Drizzle migration** (optional):
```sql
-- drizzle/migrations/0001_migrate_legacy_actions.sql
-- This approach uses PostgreSQL JSON functions to update nested data

UPDATE workflows
SET
  nodes = (
    SELECT jsonb_agg(
      CASE
        WHEN node->'data'->'config'->>'actionType' = 'send-email'
        THEN jsonb_set(node, '{data,config,actionType}', '"resend-send-email"')
        WHEN node->'data'->'config'->>'actionType' = 'create-ticket'
        THEN jsonb_set(node, '{data,config,actionType}', '"linear-create-ticket"')
        -- Add all other mappings...
        ELSE node
      END
    )
    FROM jsonb_array_elements(nodes) AS node
  ),
  updated_at = NOW()
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements(nodes) AS node
  WHERE node->'data'->'config'->>'actionType' IN (
    'send-email',
    'create-ticket'
    -- Add all legacy action types...
  )
);
```

8. **Add validation**:
```typescript
async function validateMigration() {
  console.log("\nValidating migration...");

  const allWorkflows = await db.select().from(workflows);
  const legacyActions = new Set(Object.keys(legacyActionMappings));

  let found = 0;

  for (const workflow of allWorkflows) {
    const nodes = workflow.nodes as any[];

    for (const node of nodes) {
      const actionType = node.data?.config?.actionType;
      if (actionType && legacyActions.has(actionType)) {
        console.log(`❌ Found legacy action ${actionType} in workflow ${workflow.id}`);
        found++;
      }
    }
  }

  if (found === 0) {
    console.log("✅ No legacy actions found");
  } else {
    console.log(`❌ Found ${found} legacy actions`);
  }

  return found === 0;
}
```

9. **Run migration**:
```bash
# Dry run first
DRY_RUN=true tsx scripts/migrate-legacy-actions.ts

# Review output, then run for real
tsx scripts/migrate-legacy-actions.ts

# Validate
tsx scripts/validate-migration.ts
```

10. **Delete legacy mappings file**:
```bash
# After successful migration
git rm plugins/legacy-mappings.ts

# Remove imports
grep -r "legacy-mappings" --include="*.ts" --include="*.tsx"
# Update those files
```

11. **Document in changelog**:
```markdown
## Database Migration Required

If upgrading from version < 2.0.0:

```bash
# Backup database first
pg_dump database_name > backup.sql

# Run migration
tsx scripts/migrate-legacy-actions.ts

# Validate
tsx scripts/validate-migration.ts
```

This updates legacy action type identifiers to the new plugin format.
```

**Recommendation**: Run migration on staging first, validate thoroughly, then run on production with a fresh backup.

---

## P3-6: Remove Build-Time Migrations

**Current Implementation Grade: 3/10**

**Findings:**
- **File**: `package.json:9`
- **Issue**: `build` script includes `tsx scripts/migrate-prod.ts`
- **Problem**: Parallel Vercel deployments cause race conditions
- **Risk**: Migration runs multiple times simultaneously
- **Solution**: Run migrations separately from builds

**Security Risk**: None
**Stability Risk**: HIGH - Database corruption from race conditions
**Code Quality**: Poor - Wrong approach for migrations
**Deployment Safety**: Very poor - Dangerous in production

**Detailed Guidance to Reach 10/10:**

1. **Read current build script**:
```json
// package.json
{
  "build": "tsx scripts/migrate-prod.ts && pnpm discover-plugins && next build"
}
```

2. **Understand the risks**:
- Vercel can run multiple builds in parallel
- Each build runs migrations
- Concurrent migrations can corrupt data
- No locking mechanism

3. **Remove migration from build**:
```json
// package.json
{
  "build": "pnpm discover-plugins && next build",
  "migrate": "tsx scripts/migrate-prod.ts"
}
```

4. **Create separate migration workflow**:
```yaml
# .github/workflows/migrate.yml
name: Run Database Migrations

on:
  workflow_dispatch: # Manual trigger only
    inputs:
      environment:
        description: 'Environment to migrate'
        required: true
        type: choice
        options:
          - production
          - staging

jobs:
  migrate:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}

    steps:
      - uses: actions/checkout@v3

      - uses: pnpm/action-setup@v2

      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: pnpm migrate

      - name: Verify migration
        run: tsx scripts/verify-schema.ts
```

5. **Use Vercel deployment hooks**:
```yaml
# vercel.json
{
  "buildCommand": "pnpm build",
  "framework": "nextjs",
  "hooks": {
    "pre-deploy": "node scripts/check-migrations.js"
  }
}
```

6. **Create migration lock mechanism**:
```typescript
// scripts/migrate-with-lock.ts
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

async function acquireLock(lockName: string, timeout = 10000): Promise<boolean> {
  // PostgreSQL advisory lock
  const result = await db.execute(
    sql`SELECT pg_try_advisory_lock(hashtext(${lockName}))`
  );
  return result.rows[0]?.pg_try_advisory_lock === true;
}

async function releaseLock(lockName: string) {
  await db.execute(
    sql`SELECT pg_advisory_unlock(hashtext(${lockName}))`
  );
}

async function migrateWithLock() {
  const lockAcquired = await acquireLock("db-migration");

  if (!lockAcquired) {
    console.log("⏳ Another migration is in progress, skipping...");
    return;
  }

  try {
    console.log("🔒 Lock acquired, running migrations...");
    await runMigrations();
    console.log("✅ Migrations complete");
  } finally {
    await releaseLock("db-migration");
    console.log("🔓 Lock released");
  }
}
```

7. **Add migration status tracking**:
```typescript
// Create migrations table
export const migrations = pgTable("migrations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  executedAt: timestamp("executed_at").notNull().defaultNow(),
  success: boolean("success").notNull(),
  error: text("error"),
});

// Track migrations
async function recordMigration(name: string, success: boolean, error?: string) {
  await db.insert(migrations).values({
    name,
    success,
    error,
  });
}
```

8. **Use Drizzle Kit properly**:
```json
// package.json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "migrate:prod": "drizzle-kit migrate --config=drizzle.config.ts"
  }
}
```

9. **Document migration process**:
```markdown
## Database Migrations

### Development
```bash
# Generate migration from schema changes
pnpm db:generate

# Apply to local database
pnpm db:migrate
```

### Production

**IMPORTANT**: Never run migrations during build!

Option A - Manual:
```bash
# SSH to server or use database client
pnpm migrate:prod
```

Option B - GitHub Actions:
1. Go to Actions > Run Database Migrations
2. Select environment (production/staging)
3. Click "Run workflow"
4. Wait for completion before deploying

Option C - Deployment script:
```bash
# Run before deploying new code
./scripts/deploy.sh
```

### Migration Safety

- Always backup database before migrating
- Test migrations on staging first
- Run migrations before code deployment
- Never run concurrent migrations
- Monitor for errors
```

10. **Create deployment script** (`scripts/deploy.sh`):
```bash
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# 1. Backup database
echo "📦 Creating database backup..."
./scripts/backup-db.sh

# 2. Run migrations
echo "🔄 Running database migrations..."
pnpm migrate:prod

# 3. Deploy to Vercel
echo "☁️  Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete"
```

11. **Add pre-build check**:
```typescript
// scripts/check-migrations.js
const { execSync } = require("child_process");

// Check if migrations are up to date
try {
  execSync("drizzle-kit check", { stdio: "pipe" });
  console.log("✅ Migrations are up to date");
} catch (error) {
  console.error("❌ Pending migrations detected!");
  console.error("Run migrations before building:");
  console.error("  pnpm migrate:prod");
  process.exit(1);
}
```

**Recommendation**: Remove migrations from build immediately (step 3), implement proper migration workflow (steps 4-6), and document the process (step 9).

---

## P3-7: Consolidate Env Vars

**Current Implementation Grade: 6/10**

**Findings:**
- **Missing**: No `.env.example` file at repository root
- **Problem**: Environment variables are scattered and undocumented
- **Impact**: New developers don't know what variables are needed
- **Categories**: Database, Auth, AI Gateway, OAuth providers

**Security Risk**: LOW - Could lead to misconfiguration
**Stability Risk**: MEDIUM - Missing env vars cause runtime errors
**Developer Experience**: Poor - Trial and error to configure
**Documentation**: Poor - No central reference

**Detailed Guidance to Reach 10/10:**

1. **Search for all environment variables**:
```bash
grep -roh "process\.env\.[A-Z_]*" --include="*.ts" --include="*.tsx" | sort -u
```

2. **Read configuration files**:
```bash
cat lib/auth.ts | grep "process.env"
cat lib/db/index.ts | grep "process.env"
cat drizzle.config.ts | grep "process.env"
```

3. **Create comprehensive `.env.example`**:
```env
# ============================================
# AI Workflow Builder - Environment Variables
# ============================================
# Copy this file to .env.local and fill in your values
# See README.md for detailed setup instructions

# ============================================
# 🗄️ Database Configuration
# ============================================
# PostgreSQL connection string
# Format: postgresql://user:password@host:port/database
# Example: postgresql://postgres:password@localhost:5432/workflow_builder
DATABASE_URL=postgresql://user:password@localhost:5432/workflow_builder

# ============================================
# 🔐 Authentication (Better Auth)
# ============================================
# Required for authentication
# Generate a random secret: openssl rand -base64 32
BETTER_AUTH_SECRET=your-secret-key-here

# Base URL for authentication callbacks
# Development: http://localhost:3000
# Production: https://your-domain.com
BETTER_AUTH_URL=http://localhost:3000

# Optional: Public app URL (for emails, etc.)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ============================================
# 🤖 AI Gateway
# ============================================
# API key for AI workflow generation
# Get from: https://openai.com/api/ or your AI provider
AI_GATEWAY_API_KEY=your-openai-api-key

# Optional: AI model to use (default: gpt-4)
AI_MODEL=gpt-4

# ============================================
# 🔑 OAuth Providers (Optional)
# ============================================

# GitHub OAuth
# Get from: https://github.com/settings/developers
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Google OAuth
# Get from: https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Vercel OAuth (for Vercel integration)
# Get from: https://vercel.com/account/tokens
VERCEL_CLIENT_ID=your-vercel-client-id
VERCEL_CLIENT_SECRET=your-vercel-client-secret

# ============================================
# 🔒 Encryption
# ============================================
# Key for encrypting integration credentials
# Generate: openssl rand -base64 32
# IMPORTANT: Never change this in production or encrypted data will be lost
ENCRYPTION_KEY=your-encryption-key-32-chars

# ============================================
# 📧 Email (Optional)
# ============================================
# For sending transactional emails (password reset, etc.)
RESEND_API_KEY=your-resend-api-key

# ============================================
# 🚦 Rate Limiting (Optional but Recommended)
# ============================================
# Upstash Redis for rate limiting
# Get from: https://upstash.com/
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token

# ============================================
# 📊 Monitoring (Optional)
# ============================================
# Sentry for error tracking
SENTRY_DSN=your-sentry-dsn

# PostHog for analytics
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# ============================================
# 🏗️ Build & Deployment
# ============================================
# Node environment
NODE_ENV=development

# Vercel deployment info (auto-populated by Vercel)
# VERCEL_ENV=development
# VERCEL_URL=your-app.vercel.app
# VERCEL_GIT_COMMIT_SHA=abc123

# ============================================
# 🧪 Testing (Test Environment Only)
# ============================================
# Test database (separate from development)
# TEST_DATABASE_URL=postgresql://user:password@localhost:5432/workflow_builder_test

# Disable auth in tests
# E2E_BYPASS_AUTH=true
```

4. **Add `.env.development.example`** for local dev:
```env
# Development-specific settings
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/workflow_builder
BETTER_AUTH_URL=http://localhost:3000
NODE_ENV=development

# Use mock AI in development (optional)
# AI_MOCK_MODE=true
```

5. **Add `.env.production.example`**:
```env
# Production-specific settings
NODE_ENV=production

# Database connection pooling
DATABASE_MAX_CONNECTIONS=20

# Strict security
BETTER_AUTH_SECURE_COOKIE=true
```

6. **Update README** with environment setup:
```markdown
## Environment Variables

### Quick Start

1. Copy the example file:
```bash
cp .env.example .env.local
```

2. Fill in required variables:
   - `DATABASE_URL` - PostgreSQL connection
   - `BETTER_AUTH_SECRET` - Generate with `openssl rand -base64 32`
   - `AI_GATEWAY_API_KEY` - OpenAI API key

3. Optional variables for additional features:
   - OAuth providers (GitHub, Google)
   - Rate limiting (Upstash Redis)
   - Monitoring (Sentry, PostHog)

### Detailed Configuration

See [Environment Variables Guide](docs/environment-variables.md) for:
- How to obtain each API key
- Configuration examples
- Troubleshooting

### Vercel Deployment

When deploying to Vercel, add these environment variables in the Vercel dashboard:

**Required:**
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL` (set to your Vercel domain)
- `AI_GATEWAY_API_KEY`
- `ENCRYPTION_KEY`

**Optional:**
- OAuth credentials
- Rate limiting
- Monitoring
```

7. **Create detailed guide** (`docs/environment-variables.md`):
```markdown
# Environment Variables Guide

## Required Variables

### DATABASE_URL
PostgreSQL connection string for your database.

**Format:**
```
postgresql://username:password@hostname:port/database_name
```

**Get it:**
- Local: Install PostgreSQL and create database
- Hosted: Use [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Vercel Postgres](https://vercel.com/storage/postgres)

**Example:**
```
DATABASE_URL=postgresql://postgres:mypassword@localhost:5432/workflow_builder
```

### BETTER_AUTH_SECRET
Secret key for encrypting session tokens.

**Generate:**
```bash
openssl rand -base64 32
```

**Security:**
- Keep this secret
- Different for each environment
- Never commit to version control

[... continue for each variable ...]
```

8. **Add validation script** (`scripts/validate-env.ts`):
```typescript
import { z } from "zod";

const envSchema = z.object({
  // Required
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  AI_GATEWAY_API_KEY: z.string().min(1),
  ENCRYPTION_KEY: z.string().length(44), // Base64 of 32 bytes

  // Optional
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

try {
  envSchema.parse(process.env);
  console.log("✅ Environment variables are valid");
} catch (error) {
  console.error("❌ Invalid environment variables:");
  console.error(error);
  process.exit(1);
}
```

9. **Add to CI**:
```yaml
# .github/workflows/pr-checks.yml
- name: Validate environment variables
  run: tsx scripts/validate-env.ts
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    BETTER_AUTH_SECRET: ${{ secrets.BETTER_AUTH_SECRET }}
    # ... other secrets
```

10. **Add git ignore**:
```gitignore
# Environment files
.env
.env.local
.env.*.local
.env.production
.env.development

# Keep example files
!.env.example
!.env.*.example
```

11. **Create setup wizard** (optional):
```typescript
// scripts/setup-env.ts
import inquirer from "inquirer";
import fs from "node:fs";
import { randomBytes } from "node:crypto";

async function setupEnvironment() {
  console.log("🚀 Environment Setup Wizard\n");

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "DATABASE_URL",
      message: "PostgreSQL connection URL:",
      default: "postgresql://postgres:postgres@localhost:5432/workflow_builder",
    },
    {
      type: "input",
      name: "AI_GATEWAY_API_KEY",
      message: "OpenAI API key:",
    },
    {
      type: "confirm",
      name: "generateSecrets",
      message: "Generate random secrets?",
      default: true,
    },
  ]);

  // Generate secrets
  const env = {
    ...answers,
    BETTER_AUTH_SECRET: randomBytes(32).toString("base64"),
    ENCRYPTION_KEY: randomBytes(32).toString("base64"),
    BETTER_AUTH_URL: "http://localhost:3000",
  };

  // Write to .env.local
  const envContent = Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  fs.writeFileSync(".env.local", envContent);

  console.log("\n✅ Environment file created: .env.local");
  console.log("\n🎉 Setup complete! Run 'pnpm dev' to start");
}

setupEnvironment();
```

**Recommendation**: Create `.env.example` immediately (step 3), update README (step 6), and add validation (step 8) to catch missing variables early.

---

## P3-8: Fix Regex Export Bug

**Current Implementation Grade: 6/10**

**Findings:**
- **File**: `lib/workflow-codegen-shared.ts`
- **Issue**: Exported regex has `g` (global) flag
- **Problem**: Regex maintains `lastIndex` state across calls
- **Bug**: Shared regex produces inconsistent results
- **Example**: First call works, second call fails

**Security Risk**: None
**Stability Risk**: MEDIUM - Subtle bugs in codegen
**Code Quality**: Poor - Misunderstands regex stateful behavior
**Reliability**: Poor - Non-deterministic behavior

**Detailed Guidance to Reach 10/10:**

1. **Read current implementation**:
```bash
grep -A 3 "TEMPLATE_PATTERN" lib/workflow-codegen-shared.ts
```

2. **Understand the problem**:
```typescript
// Current (problematic):
export const TEMPLATE_PATTERN = /\{\{([^}]+)\}\}/g;

// Usage:
const match1 = TEMPLATE_PATTERN.exec("{{foo}}"); // Works
const match2 = TEMPLATE_PATTERN.exec("{{bar}}"); // Fails! lastIndex is at end

// The global flag maintains state
console.log(TEMPLATE_PATTERN.lastIndex); // Not 0!
```

3. **Solution A: Remove global flag** (recommended):
```typescript
// Remove 'g' flag for shared regex
export const TEMPLATE_PATTERN = /\{\{([^}]+)\}\}/;

// Users who need global matching use String methods:
const matches = text.match(/\{\{([^}]+)\}\}/g);
// or
const matches = Array.from(text.matchAll(/\{\{([^}]+)\}\}/g));
```

4. **Solution B: Export factory function**:
```typescript
// Export a function that creates fresh regex
export function createTemplatePattern(): RegExp {
  return /\{\{([^}]+)\}\}/g;
}

// Usage:
const pattern = createTemplatePattern();
let match;
while ((match = pattern.exec(text)) !== null) {
  // Works correctly
}
```

5. **Solution C: Provide both**:
```typescript
// For single matches (no state)
export const TEMPLATE_PATTERN = /\{\{([^}]+)\}\}/;

// For multiple matches (caller manages state)
export function createGlobalTemplatePattern(): RegExp {
  return /\{\{([^}]+)\}\}/g;
}

// Or use String.matchAll which handles state internally
export function getAllTemplateMatches(text: string): RegExpMatchArray[] {
  return Array.from(text.matchAll(/\{\{([^}]+)\}\}/g));
}
```

6. **Update all importers**:
```bash
# Find all uses of TEMPLATE_PATTERN
grep -r "TEMPLATE_PATTERN" --include="*.ts" --include="*.tsx"
```

7. **Fix each usage**:
```typescript
// Before:
import { TEMPLATE_PATTERN } from "./workflow-codegen-shared";
const matches = text.match(TEMPLATE_PATTERN);

// After (if using Solution A):
import { TEMPLATE_PATTERN } from "./workflow-codegen-shared";
// Add 'g' flag where needed
const globalPattern = new RegExp(TEMPLATE_PATTERN.source, 'g');
const matches = text.match(globalPattern);

// Or use String methods:
const matches = Array.from(text.matchAll(new RegExp(TEMPLATE_PATTERN, 'g')));
```

8. **Add utility functions**:
```typescript
// lib/utils/template.ts
import { TEMPLATE_PATTERN } from "../workflow-codegen-shared";

/**
 * Extract all template variables from a string
 */
export function extractTemplateVars(text: string): string[] {
  const pattern = new RegExp(TEMPLATE_PATTERN.source, 'g');
  const matches = Array.from(text.matchAll(pattern));
  return matches.map(match => match[1]);
}

/**
 * Check if string contains any template variables
 */
export function hasTemplateVars(text: string): boolean {
  return TEMPLATE_PATTERN.test(text);
}

/**
 * Replace all template variables
 */
export function replaceTemplateVars(
  text: string,
  replacer: (varName: string) => string
): string {
  const pattern = new RegExp(TEMPLATE_PATTERN.source, 'g');
  return text.replace(pattern, (_, varName) => replacer(varName));
}
```

9. **Add tests to verify fix**:
```typescript
// lib/workflow-codegen-shared.test.ts
import { TEMPLATE_PATTERN, extractTemplateVars } from "./workflow-codegen-shared";

describe("TEMPLATE_PATTERN", () => {
  it("matches template variables", () => {
    expect("{{foo}}".match(TEMPLATE_PATTERN)).toBeTruthy();
  });

  it("is stateless across calls", () => {
    const text1 = "{{foo}}";
    const text2 = "{{bar}}";

    // Both should match
    expect(TEMPLATE_PATTERN.test(text1)).toBe(true);
    expect(TEMPLATE_PATTERN.test(text2)).toBe(true);

    // Verify lastIndex is reset (only if using 'g' flag)
    if (TEMPLATE_PATTERN.global) {
      expect(TEMPLATE_PATTERN.lastIndex).toBe(0);
    }
  });

  it("extracts multiple variables correctly", () => {
    const text = "Hello {{name}}, your email is {{email}}";
    const vars = extractTemplateVars(text);

    expect(vars).toEqual(["name", "email"]);
  });

  it("handles consecutive calls", () => {
    // This test catches the lastIndex bug
    const result1 = extractTemplateVars("{{foo}}");
    const result2 = extractTemplateVars("{{bar}}");

    expect(result1).toEqual(["foo"]);
    expect(result2).toEqual(["bar"]);
  });
});
```

10. **Document the pattern**:
```typescript
/**
 * Pattern for matching template variables in format {{variableName}}
 *
 * NOTE: This regex does NOT have the global flag to avoid stateful behavior
 * when shared across multiple calls. If you need global matching, use:
 *
 * @example
 * // For finding all matches:
 * const matches = Array.from(text.matchAll(new RegExp(TEMPLATE_PATTERN, 'g')));
 *
 * // For testing if pattern exists:
 * const hasTemplate = TEMPLATE_PATTERN.test(text);
 *
 * // For replacing:
 * const result = text.replace(new RegExp(TEMPLATE_PATTERN, 'g'), replacer);
 */
export const TEMPLATE_PATTERN = /\{\{([^}]+)\}\}/;
```

11. **Add ESLint rule** to catch future issues:
```json
// .eslintrc.json
{
  "rules": {
    "no-restricted-syntax": [
      "error",
      {
        "selector": "ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[id.name=/PATTERN|REGEX/] > NewExpression[callee.name='RegExp'][arguments.1.value=/g/]",
        "message": "Exported regexes with global flag maintain state. Use factory function or remove 'g' flag."
      }
    ]
  }
}
```

**Recommendation**: Implement Solution A (remove global flag) as it's the simplest and safest. Provide utility functions (step 8) for common use cases.

---

## P3-9: Clean Drizzle Adapter

**Current Implementation Grade: 4/10**

**Findings:**
- **File**: `lib/auth.ts:19-29`
- **Issue**: Application tables mixed with auth tables in adapter schema
- **Tables in adapter**:
  - ✅ `users`, `sessions`, `accounts`, `verifications` (Better Auth core)
  - ❌ `workflows` (application table)
  - ❌ `workflowExecutions` (application table)
  - ❌ `workflowExecutionLogs` (application table)
  - ❌ `workflowExecutionsRelations` (Drizzle relations)
- **Problem**: Pollutes auth adapter with application concerns

**Security Risk**: None
**Stability Risk**: LOW - May cause ORM confusion
**Code Quality**: Poor - Mixing concerns
**Architecture**: Poor - Violates separation of concerns

**Detailed Guidance to Reach 10/10:**

1. **Read current schema definition** (from previous findings):
```typescript
// lib/auth.ts:19-29
const schema = {
  user: users,
  session: sessions,
  account: accounts,
  verification: verifications,
  workflows,                      // Should not be here
  workflowExecutions,             // Should not be here
  workflowExecutionLogs,          // Should not be here
  workflowExecutionsRelations,    // Should not be here
};
```

2. **Understand why they might be there**:
- Possibly for `onLinkAccount` callback access
- Or mistaken inclusion from copy-paste
- Relations object shouldn't be in adapter at all

3. **Check Better Auth documentation**:
```typescript
// Better Auth adapter only needs these tables:
drizzleAdapter(db, {
  provider: "pg",
  schema: {
    user: userTable,
    session: sessionTable,
    account: accountTable,
    verification: verificationTable,
  },
});
```

4. **Create clean auth schema**:
```typescript
// lib/auth.ts
import {
  accounts,
  sessions,
  users,
  verifications,
} from "./db/schema";

// Clean schema for Better Auth adapter
// Only includes authentication-related tables
const authSchema = {
  user: users,
  session: sessions,
  account: accounts,
  verification: verifications,
};
```

5. **Update auth config**:
```typescript
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema, // Use clean schema
  }),
  // ... rest of config
});
```

6. **Keep application imports separate**:
```typescript
// Application tables used in callbacks
import {
  workflows,
  workflowExecutions,
  integrations,
  apiKeys,
} from "./db/schema";

// These are used directly in the onLinkAccount callback,
// not passed to the adapter
```

7. **Verify onLinkAccount still works**:
```typescript
anonymous({
  async onLinkAccount(data) {
    // These imports work fine without being in adapter schema
    await db.update(workflows)...
    await db.update(workflowExecutions)...
    await db.update(integrations)...
    await db.update(apiKeys)...
  },
})
```

8. **Remove relations from imports**:
```typescript
// Before:
import {
  // ...
  workflowExecutionsRelations, // Remove this
} from "./db/schema";

// Relations are for Drizzle query API, not for adapter
```

9. **Verify no other places use the polluted schema**:
```bash
grep -r "authSchema\|auth\.database" --include="*.ts"
```

10. **Test authentication flows**:
- User registration
- User login
- Anonymous user creation
- Account linking with migration
- Session management
- Verify all still work

11. **Add comment explaining separation**:
```typescript
/**
 * Better Auth Configuration
 */

// Database adapter with core auth tables only
const authSchema = {
  user: users,
  session: sessions,
  account: accounts,
  verification: verifications,
};

// Application tables (imported for use in callbacks)
// NOT included in adapter schema to maintain separation of concerns
import {
  workflows,
  workflowExecutions,
  integrations,
  apiKeys,
} from "./db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  // ...
});
```

12. **Document the pattern**:
```markdown
## Authentication Architecture

### Database Schema Separation

The Better Auth adapter only receives core authentication tables:
- `users`
- `sessions`
- `accounts`
- `verifications`

Application tables (workflows, executions, etc.) are **not** included in the adapter schema. They are accessed directly through Drizzle in callback functions.

This separation ensures:
- Clear separation of concerns
- No ORM confusion
- Easier to reason about
- Follows Better Auth best practices
```

**Recommendation**: Implement clean separation immediately (steps 4-6) as it's a simple change with no functional impact but significantly improves code quality.

---

## Summary: P3 Low Priority Items

**Recommended Order:**

**High Value, Low Effort:**
1. **P3-8**: Fix Regex Export Bug - Quick fix, prevents subtle bugs
2. **P3-9**: Clean Drizzle Adapter - Simple cleanup, improves architecture
3. **P3-7**: Consolidate Env Vars - Improves DX significantly
4. **P3-1**: Add Prepare Script - Automatic setup for developers

**Important for Production:**
5. **P3-6**: Remove Build-Time Migrations - Critical for safe deployments
6. **P3-3**: Audit Embedded Boilerplate - Security and supply chain

**Technical Debt:**
7. **P3-5**: Create Legacy Action Migration - Data cleanup
8. **P3-2**: Refactor Vercel Integration - Architecture consistency

**Feature Additions:**
9. **P3-4**: Add API Pagination - Scalability improvement

All P3 items are polish and maintenance, but items 1-4 provide the best return on investment and should be prioritized.
