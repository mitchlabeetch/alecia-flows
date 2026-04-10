# 🟡 P2 — Medium Priority (Code Quality & DX)

## P2-1: Update README Endpoints

**Current Implementation Grade: 7/10**

**Findings:**
- **File**: `README.md`
- **Issues Found**:
  - Line 128: Shows `/api/workflows/{id}/generate-code` endpoint
  - Line 161: References `/api/ai/generate-workflow` (should be `/api/ai/generate`)
  - Documentation may be outdated for other endpoints
- **Need to Verify**: Check actual API routes vs documented routes

**Security Risk**: None
**Stability Risk**: None
**Documentation Quality**: Poor - Incorrect information confuses developers
**Developer Experience**: Poor - Wastes time debugging wrong endpoints

**Detailed Guidance to Reach 10/10:**

1. **List all actual API endpoints**:
```bash
find app/api -name "route.ts" | sed 's|app/api/||;s|/route.ts||' | sort
```

2. **Compare with README documentation**:
   - Read lines 138-162 (API Endpoints section)
   - Check each documented endpoint
   - Mark which ones are incorrect

3. **Verify correct AI endpoint**:
   - Check `app/api/ai/generate/route.ts` exists
   - Update line 161 from `/api/ai/generate-workflow` to `/api/ai/generate`

4. **Remove non-existent endpoints**:
   - Line 156-157: Check if `/api/workflows/{id}/generate-code` exists
   - If not, remove or update to correct endpoint
   - Likely should be `/api/workflows/{id}/code`

5. **Update endpoint documentation**:
```markdown
### Code Generation

- `GET /api/workflows/{id}/code` - Generate TypeScript code for workflow
- `POST /api/workflows/{id}/download` - Download workflow as deployable package

### AI Generation

- `POST /api/ai/generate` - Generate workflow from natural language prompt
```

6. **Add missing endpoints**:
   - Check for undocumented endpoints
   - Add webhook endpoint
   - Add execution status endpoint
   - Add any other public-facing endpoints

7. **Add request/response examples**:
```markdown
#### Example: Generate Workflow from AI

```bash
POST /api/ai/generate
Content-Type: application/json

{
  "prompt": "Send an email when a new user signs up"
}
```

Response:
```json
{
  "nodes": [...],
  "edges": [...]
}
```
```

8. **Verify all endpoint paths are correct**:
   - Test each endpoint with curl or HTTP client
   - Update documentation to match reality
   - Note any deprecated endpoints

9. **Add API versioning note** if applicable

10. **Update table of contents** if README has one

---

## P2-2: Update README Integrations

**Current Implementation Grade: 6/10**

**Findings:**
- **File**: `README.md` lines 199-274
- **Issue**: Code examples show old import patterns:
  ```typescript
  import { sendEmail } from "@/lib/integrations/resend";
  import { createTicket } from "@/lib/integrations/linear";
  ```
- **Reality**: New plugin system uses different architecture
- **Current Pattern**: Should import from plugin registry or use workflow executor

**Security Risk**: None
**Stability Risk**: None
**Documentation Quality**: Poor - Examples won't work
**Developer Experience**: Poor - Misleading documentation

**Detailed Guidance to Reach 10/10:**

1. **Understand current plugin architecture**:
   - Read `plugins/*/index.ts` files
   - Check how steps are registered
   - Verify import patterns

2. **Read auto-generated files**:
   - Run `pnpm discover-plugins`
   - Check `lib/step-registry.ts`
   - Check `plugins/index.ts`
   - Understand export structure

3. **Update Resend example** (lines 206-213):
```markdown
### Resend (Email)

Send transactional emails with Resend's API.

```typescript
// In a workflow step
import { sendEmailStep } from "@/plugins/resend/steps/send-email";

const result = await sendEmailStep({
  integrationId: "your-integration-id",
  to: "user@example.com",
  subject: "Welcome!",
  body: "Welcome to our platform",
});
```
```

4. **Update Linear example** (lines 217-226):
```markdown
### Linear (Tickets)

Create and manage Linear issues.

```typescript
// In a workflow step
import { createTicketStep } from "@/plugins/linear/steps/create-ticket";

const result = await createTicketStep({
  integrationId: "your-integration-id",
  title: "Bug Report",
  description: "Something is broken",
  priority: 1,
});
```
```

5. **Update other integration examples**:
   - PostgreSQL (lines 228-235)
   - External APIs (lines 237-248)
   - Firecrawl (lines 253-274)

6. **Add workflow-based examples**:
```markdown
### Using Integrations in Workflows

Integrations are designed to be used within workflows:

```typescript
export async function welcomeWorkflow(email: string) {
  "use workflow";

  // AI generates personalized message
  const { message } = await generateText({
    prompt: `Write welcome email for ${email}`,
  });

  // Send via Resend
  const result = await sendEmail({
    to: email,
    subject: "Welcome!",
    body: message,
  });

  return result;
}
```
```

7. **Add note about plugin system**:
```markdown
## Plugin System

All integrations are implemented as plugins in the `plugins/` directory. Each plugin:
- Defines available actions and their configuration fields
- Implements step functions that execute the actions
- Supports credential management and OAuth flows
- Automatically generates TypeScript types

To add a new plugin, run:
```bash
pnpm create-plugin
```
```

8. **Update the auto-generated section** (lines 81-99):
   - Verify it's properly marked with comments
   - Ensure `pnpm discover-plugins` updates it
   - Test the auto-generation

9. **Add migration guide** if breaking changes:
```markdown
### Migrating from Old Integration Pattern

If you have code using the old pattern:
```typescript
// Old pattern (deprecated)
import { sendEmail } from "@/lib/integrations/resend";

// New pattern
import { sendEmailStep } from "@/plugins/resend/steps/send-email";
```
```

10. **Add link to plugin development docs**

---

## P2-3: Localize Admin UI

**Current Implementation Grade: 2/10**

**Findings:**
- **File**: `app/admin/page.tsx`
- **Issue**: Entire admin UI is in French
- **Examples**:
  - Line 40: "Chargement..."
  - Line 61: "Administration Alecia Flows"
  - Line 64: "Gérez les paramètres, connexions et intégrations..."
  - Line 70: "Connexions"
  - Lines 80-82: "Gestion des connexions", "Configurez et testez..."
  - Many more throughout the file
- **Problem**: Primary application language is English
- **Impact**: Inconsistent user experience

**Security Risk**: None
**Stability Risk**: None
**Code Quality**: Poor - Inconsistent localization
**User Experience**: Poor - Language mismatch

**Detailed Guidance to Reach 10/10:**

1. **Create translation mapping**:
```typescript
// Create a reference of all French strings and their English translations
const translations = {
  "Chargement...": "Loading...",
  "Administration Alecia Flows": "Alecia Flows Administration",
  "Gérez les paramètres, connexions et intégrations de votre plateforme.":
    "Manage your platform settings, connections, and integrations.",
  "Connexions": "Connections",
  "Design": "Design",
  "Contenu": "Content",
  // ... etc
};
```

2. **Update page systematically**:

Line 40 - Loading state:
```typescript
// Before:
<div className="text-muted-foreground text-sm">Chargement...</div>

// After:
<div className="text-muted-foreground text-sm">Loading...</div>
```

Line 61-65 - Page header:
```typescript
// Before:
<h1 className="text-3xl font-bold text-foreground">
  Administration Alecia Flows
</h1>
<p className="mt-2 text-muted-foreground">
  Gérez les paramètres, connexions et intégrations de votre plateforme.
</p>

// After:
<h1 className="text-3xl font-bold text-foreground">
  Alecia Flows Administration
</h1>
<p className="mt-2 text-muted-foreground">
  Manage your platform settings, connections, and integrations.
</p>
```

3. **Update tab labels** (line 70-72):
```typescript
// Before:
<TabsTrigger value="connections">Connexions</TabsTrigger>
<TabsTrigger value="design">Design</TabsTrigger>
<TabsTrigger value="content">Contenu</TabsTrigger>

// After:
<TabsTrigger value="connections">Connections</TabsTrigger>
<TabsTrigger value="design">Design</TabsTrigger>
<TabsTrigger value="content">Content</TabsTrigger>
```

4. **Update Connections tab** (lines 76-103):
```typescript
// Before:
<CardTitle>Gestion des connexions</CardTitle>
<CardDescription>
  Configurez et testez les connexions aux services externes.
</CardDescription>

<Button onClick={handleAddConnection}>
  <Plus className="mr-2 size-4" />
  Nouvelle connexion
</Button>

placeholder="Filtrer les connexions..."

// After:
<CardTitle>Connection Management</CardTitle>
<CardDescription>
  Configure and test connections to external services.
</CardDescription>

<Button onClick={handleAddConnection}>
  <Plus className="mr-2 size-4" />
  New Connection
</Button>

placeholder="Filter connections..."
```

5. **Update Design tab** (lines 106-169):
```typescript
// Before:
<CardTitle>Paramètres de design</CardTitle>
<CardDescription>
  Personnalisez l'apparence visuelle de la plateforme.
</CardDescription>

<Label>Thème actuel</Label>
<p className="text-sm text-muted-foreground">
  Thème navy glassmorphique Alecia — couleur d'accent or/ambre...
</p>

<h3 className="font-medium">Palette de couleurs</h3>
<ColorSwatch label="Primaire (or)" value="oklch(0.78 0.12 80)" />

<h3 className="font-medium">Effets glassmorphiques</h3>

// After:
<CardTitle>Design Settings</CardTitle>
<CardDescription>
  Customize the visual appearance of the platform.
</CardDescription>

<Label>Current Theme</Label>
<p className="text-sm text-muted-foreground">
  Alecia navy glassmorphic theme — gold/amber accent color...
</p>

<h3 className="font-medium">Color Palette</h3>
<ColorSwatch label="Primary (gold)" value="oklch(0.78 0.12 80)" />

<h3 className="font-medium">Glassmorphic Effects</h3>
```

6. **Update Content tab** (lines 172-232):
```typescript
// Before:
<CardTitle>Paramètres de contenu</CardTitle>
<CardDescription>
  Configurez les libellés et textes de l'interface.
</CardDescription>

<Label htmlFor="app-name">Nom de l'application</Label>
<Label htmlFor="app-desc">Description</Label>
<Label htmlFor="company">Entreprise</Label>

<p className="text-sm text-muted-foreground">
  Les paramètres de contenu sont définis dans le code source.
  Contactez votre équipe technique pour les modifier.
</p>

onClick={() => toast.info("Modification du contenu via le code source requis.")}
En savoir plus

// After:
<CardTitle>Content Settings</CardTitle>
<CardDescription>
  Configure interface labels and text.
</CardDescription>

<Label htmlFor="app-name">Application Name</Label>
<Label htmlFor="app-desc">Description</Label>
<Label htmlFor="company">Company</Label>

<p className="text-sm text-muted-foreground">
  Content settings are defined in the source code.
  Contact your technical team to modify them.
</p>

onClick={() => toast.info("Content modification requires source code changes.")}
Learn More
```

7. **Update toast messages**:
```typescript
// Before:
toast.success("Connexion ajoutée avec succès");

// After:
toast.success("Connection added successfully");
```

8. **Check for any remaining French strings**:
```bash
grep -n "é\|è\|à\|ù\|ç" app/admin/page.tsx
```

9. **Consider i18n setup** for future:
   - If multiple languages needed, use i18n library
   - Create translation files
   - Document localization process

10. **Test the page**:
    - Visit /admin
    - Verify all text is in English
    - Check that functionality still works
    - Verify no broken strings

---

## P2-4: Localize Plugin Actions

**Current Implementation Grade: 2/10**

**Findings:**
- **Files**: Multiple plugin index.ts files have French labels
  - `plugins/notion/index.ts`
  - `plugins/pipedrive/index.ts`
  - `plugins/office365/index.ts`
- **Examples from README** (lines 89-92):
  - "Créer une Page"
  - "Ajouter une entrée à une base de données"
  - "Créer un Deal"
  - "Envoyer un Email"
- **Problem**: LLM workflow generation gets confused by French labels
- **Impact**: AI-generated workflows may have incorrect node configurations

**Security Risk**: None
**Stability Risk**: MEDIUM - AI generation produces incorrect workflows
**Code Quality**: Poor - Inconsistent language
**User Experience**: Poor - Confusing for English-speaking users

**Detailed Guidance to Reach 10/10:**

1. **Audit all plugins for French labels**:
```bash
grep -r "label:" plugins/*/index.ts | grep -E "é|è|à|ù|ç"
```

2. **Read notion plugin** (`plugins/notion/index.ts`):
   - Find all action labels
   - Find all field labels
   - Create translation mapping

3. **Update notion actions**:
```typescript
// Before:
{
  id: "notion-create-page",
  label: "Créer une Page",
  description: "Crée une nouvelle page dans Notion",
  // ...
}

// After:
{
  id: "notion-create-page",
  label: "Create Page",
  description: "Create a new page in Notion",
  // ...
}
```

4. **Update notion fields**:
```typescript
// Check for field labels like:
// label: "Titre de la page"
// Should be: "Page Title"
```

5. **Read pipedrive plugin** (`plugins/pipedrive/index.ts`):
```typescript
// Update actions:
"Créer un Deal" → "Create Deal"
"Rechercher des Deals" → "Search Deals"
"Créer un Contact" → "Create Contact"
"Ajouter une Note" → "Add Note"
"Mettre à jour un Deal" → "Update Deal"
```

6. **Read office365 plugin** (`plugins/office365/index.ts`):
```typescript
// Update actions:
"Créer un classeur Excel" → "Create Excel Workbook"
"Ajouter une ligne Excel" → "Add Excel Row"
"Créer un document Word" → "Create Word Document"
"Créer une présentation PowerPoint" → "Create PowerPoint Presentation"
"Créer une page OneNote" → "Create OneNote Page"
"Envoyer un Email" → "Send Email"
```

7. **Update field labels in all plugins**:
```typescript
// Common French field labels to translate:
"Nom" → "Name"
"Titre" → "Title"
"Description" → "Description"
"Contenu" → "Content"
"Destinataire" → "Recipient"
"Sujet" → "Subject"
"Corps" → "Body"
"Priorité" → "Priority"
"Statut" → "Status"
"Date" → "Date"
"Montant" → "Amount"
"Type" → "Type"
```

8. **Run plugin discovery**:
```bash
pnpm discover-plugins
```

9. **Verify generated files**:
   - Check `lib/types/integration.ts`
   - Check `lib/step-registry.ts`
   - Verify labels are now in English

10. **Test with AI generation**:
    - Try generating workflow with English prompts
    - Verify plugin actions are selected correctly
    - Check that field labels make sense

11. **Update tests** if any reference French labels

12. **Check README auto-generated section**:
    - Lines 89-92 should now show English labels
    - Run `pnpm discover-plugins` to update

---

## P2-5: Clean Up Console Logs

**Current Implementation Grade: 7/10**

**Findings:**
- **Files with debug logs**:
  - `components/overlays/overlay-container.tsx`
  - `lib/credential-fetcher.ts`
  - `lib/auth.ts`
- **Issue**: Debug console.log statements left in production code
- **Problem**: Clutters console, may log sensitive data, unprofessional

**Security Risk**: LOW - May log sensitive information
**Stability Risk**: None
**Code Quality**: Poor - Debug code in production
**Performance**: Negligible

**Detailed Guidance to Reach 10/10:**

1. **Search for all console.log statements**:
```bash
grep -rn "console.log" --include="*.ts" --include="*.tsx" | grep -v node_modules
```

2. **Categorize logs**:
   - Debug logs (should be removed)
   - Important logs (should use proper logger)
   - Error logs (should use console.error)

3. **Read overlay-container.tsx**:
   - Find console.log statements
   - Determine if they're debug or important
   - Remove or replace with proper logging

4. **Read credential-fetcher.ts**:
   - Check for sensitive data logging
   - Remove any credential/key logging
   - Keep only essential operational logs

5. **Read lib/auth.ts**:
   - Lines 63-66: Migration logs are useful, keep them
   - Line 87: Success log is useful, keep it
   - Line 92: Error log is useful, keep it
   - Update format to be consistent

6. **Create logging utility** (`lib/logger.ts`):
```typescript
const isDevelopment = process.env.NODE_ENV === "development";

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log("[DEBUG]", ...args);
    }
  },

  info: (...args: unknown[]) => {
    console.log("[INFO]", ...args);
  },

  warn: (...args: unknown[]) => {
    console.warn("[WARN]", ...args);
  },

  error: (...args: unknown[]) => {
    console.error("[ERROR]", ...args);
  },
};
```

7. **Replace debug logs**:
```typescript
// Before:
console.log("Fetching credentials for", integrationId);

// After (if needed):
logger.debug("Fetching credentials for", integrationId);

// Or remove entirely if not useful
```

8. **Keep important operational logs**:
```typescript
// These are good to keep:
logger.info(`[Anonymous Migration] Migrating from user ${fromUserId} to ${toUserId}`);
logger.info(`[Anonymous Migration] Successfully migrated data`);
logger.error("[Anonymous Migration] Error migrating user data:", error);
```

9. **Add structured logging for production**:
```typescript
// For production monitoring
export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.log(JSON.stringify({
      level: "info",
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    }));
  },
  // ... other levels
};
```

10. **Remove all temporary debug logs**:
```bash
# Examples to remove:
console.log("TEST");
console.log("DEBUG:", variable);
console.log("Here");
console.log("Component rendered");
```

11. **Set up ESLint rule** to prevent future console.logs:
```json
// .eslintrc.json or ultracite config
{
  "rules": {
    "no-console": ["warn", {
      "allow": ["warn", "error"]
    }]
  }
}
```

12. **Review and clean**:
```bash
# After cleaning, verify only intentional logs remain
grep -rn "console\." --include="*.ts" --include="*.tsx" | grep -v node_modules
```

---

## P2-6: Fix Codegen Fallbacks

**Current Implementation Grade: 6/10**

**Findings:**
- **File**: `lib/workflow-codegen.ts`
- **Issue**: Missing action types marked with TODOs
- **Problem**: Generated code breaks when using these action types
- **Need to**: Audit all TODOs and implement or add skip logic

**Security Risk**: None
**Stability Risk**: HIGH - Generated code may be broken
**Code Quality**: Poor - Incomplete implementation
**User Experience**: Poor - Code generation fails unexpectedly

**Detailed Guidance to Reach 10/10:**

1. **Read workflow-codegen.ts**:
```bash
cat lib/workflow-codegen.ts | grep -A 5 -B 5 "TODO"
```

2. **List all TODO items**:
   - Document which action types are missing
   - Note what needs to be implemented
   - Prioritize based on usage

3. **Check for missing action handlers**:
```typescript
// Look for patterns like:
case "some-action-type":
  // TODO: Implement this
  break;
```

4. **Implement missing handlers**:
```typescript
// Example for missing action type
case "database-query":
  return `
    const ${nodeId} = await databaseQueryStep({
      integrationId: "${config.integrationId}",
      query: ${JSON.stringify(config.query)},
      parameters: ${JSON.stringify(config.parameters)},
    });
  `;
```

5. **Add graceful fallback** for unimplemented types:
```typescript
default:
  // Unknown action type - generate comment instead of breaking
  console.warn(`[Codegen] Unknown action type: ${actionType}`);
  return `
    // TODO: Manual implementation required for action type: ${actionType}
    // const ${nodeId} = await ${actionType}Step({ ... });
  `;
```

6. **Add type checking**:
```typescript
// At the start of codegen
const unsupportedActions = nodes
  .filter(node => !isActionSupported(node.type))
  .map(node => node.id);

if (unsupportedActions.length > 0) {
  console.warn(`[Codegen] Workflow contains unsupported actions: ${unsupportedActions.join(", ")}`);
  // Either throw error or continue with placeholders
}
```

7. **Implement specific missing types**:

For HTTP Request:
```typescript
case "http-request":
  return `
    const ${nodeId} = await httpRequestStep({
      url: ${resolveTemplate(config.url)},
      method: "${config.method}",
      headers: ${JSON.stringify(config.headers)},
      body: ${config.body ? resolveTemplate(config.body) : "undefined"},
    });
  `;
```

For Condition:
```typescript
case "condition":
  return `
    const ${nodeId} = await conditionStep({
      condition: ${resolveTemplate(config.condition)},
      operator: "${config.operator}",
    });
  `;
```

8. **Add comprehensive tests**:
```typescript
// Test each action type
describe("workflow codegen", () => {
  it("generates code for database query", () => {
    const workflow = createTestWorkflow("database-query");
    const code = generateCode(workflow);
    expect(code).toContain("databaseQueryStep");
  });

  it("handles unknown action types gracefully", () => {
    const workflow = createTestWorkflow("unknown-type");
    const code = generateCode(workflow);
    expect(code).toContain("TODO: Manual implementation");
  });
});
```

9. **Update documentation**:
```typescript
/**
 * Generates TypeScript code from workflow definition
 *
 * Supported action types:
 * - http-request: HTTP API calls
 * - database-query: Database operations
 * - condition: Conditional branching
 * - [list all supported types]
 *
 * Unsupported action types will generate TODO comments
 * requiring manual implementation
 */
export function generateWorkflowCode(workflow: Workflow): string {
  // ...
}
```

10. **Add validation endpoint**:
```typescript
// POST /api/workflows/{id}/validate-codegen
export async function POST(request: Request) {
  const workflow = await getWorkflow(params.workflowId);

  const validation = validateCodegenSupport(workflow);

  return NextResponse.json({
    supported: validation.isFullySupported,
    unsupportedNodes: validation.unsupportedNodes,
    warnings: validation.warnings,
  });
}
```

11. **Show warnings in UI**:
```typescript
// Before allowing download/deploy
if (!codegen.isFullySupported) {
  showWarning(
    `Some actions require manual implementation: ${unsupportedNodes.join(", ")}`
  );
}
```

---

## P2-7: Add Request Validation

**Current Implementation Grade: 3/10**

**Findings:**
- **Issue**: No Zod validation in API routes
- **Files**: `app/api/workflows/create/route.ts` and others
- **Problem**: No validation of request payloads
- **Missing**: Max string lengths, required fields, type checking
- **Risk**: Invalid data enters database, potential injection attacks

**Security Risk**: MEDIUM - Injection attacks, data corruption
**Stability Risk**: HIGH - Invalid data crashes application
**Code Quality**: Poor - No input validation
**Data Integrity**: Poor - Garbage data in database

**Detailed Guidance to Reach 10/10:**

1. **Install Zod** (already in package.json:66):
```bash
# Verify version
pnpm list zod
```

2. **Create validation schemas** (`lib/api/schemas.ts`):
```typescript
import { z } from "zod";

// Workflow schemas
export const createWorkflowSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  nodes: z.array(z.any()).max(1000), // Limit nodes
  edges: z.array(z.any()).max(2000), // Limit edges
  visibility: z.enum(["private", "public"]).optional(),
});

export const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  nodes: z.array(z.any()).max(1000).optional(),
  edges: z.array(z.any()).max(2000).optional(),
  visibility: z.enum(["private", "public"]).optional(),
});

// API key schemas
export const createApiKeySchema = z.object({
  name: z.string().max(100).optional(),
  expiresInDays: z.number().int().positive().max(365).optional(),
});

// AI generation schema
export const generateWorkflowSchema = z.object({
  prompt: z.string().min(10).max(2000),
  context: z.string().max(5000).optional(),
});

// Workflow execution schema
export const executeWorkflowSchema = z.object({
  input: z.record(z.any()),
});
```

3. **Create validation middleware**:
```typescript
// lib/api/validate.ts
import type { ZodSchema } from "zod";
import { NextResponse } from "next/server";

export async function validateRequest<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<{ data: T } | NextResponse> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400 }
    );
  }
}
```

4. **Update create workflow endpoint**:
```typescript
// app/api/workflows/create/route.ts
import { createWorkflowSchema } from "@/lib/api/schemas";
import { validateRequest } from "@/lib/api/validate";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate request
    const validation = await validateRequest(request, createWorkflowSchema);
    if (validation instanceof NextResponse) {
      return validation; // Validation error
    }

    const { name, description, nodes, edges, visibility } = validation.data;

    // ... rest of implementation
  } catch (error) {
    return handleApiError(error, "POST /api/workflows/create");
  }
}
```

5. **Update AI generation endpoint**:
```typescript
// app/api/ai/generate/route.ts
import { generateWorkflowSchema } from "@/lib/api/schemas";
import { validateRequest } from "@/lib/api/validate";

export async function POST(request: Request) {
  const validation = await validateRequest(request, generateWorkflowSchema);
  if (validation instanceof NextResponse) {
    return validation;
  }

  const { prompt, context } = validation.data;

  // ... rest of implementation
}
```

6. **Add node/edge schemas** for better validation:
```typescript
// More specific validation for nodes/edges
const workflowNodeSchema = z.object({
  id: z.string().max(50),
  type: z.enum(["trigger", "action", "condition"]),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z.object({
    label: z.string().max(200),
    description: z.string().max(1000).optional(),
    type: z.string(),
    config: z.record(z.any()),
    status: z.enum(["idle", "running", "success", "error"]).optional(),
  }),
});

const workflowEdgeSchema = z.object({
  id: z.string().max(100),
  source: z.string().max(50),
  target: z.string().max(50),
  sourceHandle: z.string().max(50).optional(),
  targetHandle: z.string().max(50).optional(),
});
```

7. **Add integration validation**:
```typescript
export const createIntegrationSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.string().max(50),
  config: z.record(z.any()),
});
```

8. **Add webhook validation**:
```typescript
export const webhookPayloadSchema = z.object({
  event: z.string().max(100).optional(),
  data: z.record(z.any()),
  timestamp: z.string().datetime().optional(),
});
```

9. **Apply to all POST/PUT/PATCH endpoints**:
   - Systematically go through all API routes
   - Add appropriate validation schema
   - Test with invalid input
   - Verify error messages are helpful

10. **Add validation tests**:
```typescript
describe("API validation", () => {
  it("rejects workflow with name too long", async () => {
    const response = await fetch("/api/workflows/create", {
      method: "POST",
      body: JSON.stringify({
        name: "x".repeat(101),
        nodes: [],
        edges: [],
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid request");
  });
});
```

11. **Document validation rules** in API docs

---

## P2-8: Deprecate Auto-Save Endpoint

**Current Implementation Grade: 5/10**

**Findings:**
- **Endpoint**: `/api/workflows/current` (POST)
- **Issue**: Special-case endpoint that should use standard workflow CRUD
- **Current Usage**: Unknown - need to check callers
- **Better Approach**: Use `/api/workflows/{id}` PUT endpoint with the autosave workflow ID

**Security Risk**: None
**Stability Risk**: LOW
**Code Quality**: Poor - Unnecessary special case
**Maintainability**: Poor - Extra code to maintain

**Detailed Guidance to Reach 10/10:**

1. **Find all callers** of the autosave endpoint:
```bash
grep -r "workflows/current" --include="*.ts" --include="*.tsx"
grep -r "autoSaveCurrent" --include="*.ts" --include="*.tsx"
```

2. **Read lib/api-client.ts**:
   - Find `autoSaveCurrent` function
   - Understand how it's used
   - Check for related functions

3. **Update workflow store** to track autosave ID:
```typescript
// In lib/workflow-store.ts
export const autosaveWorkflowIdAtom = atom<string | null>(null);
```

4. **Create migration logic**:
```typescript
// In components that use autosave
const [autosaveId, setAutosaveId] = useAtom(autosaveWorkflowIdAtom);

// On first load, get or create autosave workflow
useEffect(() => {
  const initializeAutosave = async () => {
    if (!autosaveId) {
      // Check if autosave workflow exists
      const workflows = await api.workflow.getAll();
      const autosave = workflows.find(w => w.name === AUTOSAVE_WORKFLOW_SENTINEL);

      if (autosave) {
        setAutosaveId(autosave.id);
      } else {
        // Create autosave workflow
        const newWorkflow = await api.workflow.create({
          name: AUTOSAVE_WORKFLOW_SENTINEL,
          description: "Auto-saved current workflow",
          nodes: [],
          edges: [],
        });
        setAutosaveId(newWorkflow.id);
      }
    }
  };

  initializeAutosave();
}, []);
```

5. **Update autosave function**:
```typescript
// In lib/api-client.ts
export async function autoSaveWorkflow(
  workflowId: string, // Now requires ID
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): Promise<void> {
  // Use standard update endpoint
  await api.workflow.update(workflowId, { nodes, edges });
}
```

6. **Update all callers**:
```typescript
// Before:
await autoSaveCurrent(nodes, edges);

// After:
if (autosaveId) {
  await autoSaveWorkflow(autosaveId, nodes, edges);
}
```

7. **Add deprecation warning** to old endpoint:
```typescript
// In app/api/workflows/current/route.ts
export async function POST(request: Request) {
  console.warn("[DEPRECATED] /api/workflows/current is deprecated. Use /api/workflows/{id} instead.");

  // Keep functionality for backwards compatibility
  // But add warning header
  const response = await handleCurrentWorkflow(request);
  response.headers.set("X-Deprecated", "true");
  response.headers.set("X-Deprecation-Message", "Use /api/workflows/{id} endpoint");

  return response;
}
```

8. **Set removal date**:
```typescript
// Add header indicating when endpoint will be removed
response.headers.set("X-Deprecation-Date", "2026-06-01");
```

9. **Test migration**:
   - Clear local storage
   - Test autosave initialization
   - Verify autosave works
   - Check no calls to old endpoint

10. **After migration period, remove endpoint**:
```bash
# Delete the file
rm app/api/workflows/current/route.ts
```

11. **Update tests** to use new pattern

12. **Document in changelog**:
```markdown
## Breaking Changes

- Removed `/api/workflows/current` endpoint
- Use `/api/workflows/{id}` with the autosave workflow ID instead
```

---

## P2-9: Fix Auto-Save Promise

**Current Implementation Grade: 6/10**

**Findings:**
- **File**: `lib/api-client.ts`
- **Issue**: `autoSaveWorkflow` returns `undefined` instead of `Promise<void>`
- **Problem**: Callers can't await completion of debounced save
- **Use Case**: Need to wait for save before navigation or other actions

**Security Risk**: None
**Stability Risk**: LOW - Race conditions possible
**Code Quality**: Poor - Inconsistent async patterns
**Developer Experience**: Poor - Can't properly await saves

**Detailed Guidance to Reach 10/10:**

1. **Read current implementation**:
```bash
grep -A 20 "autoSaveWorkflow" lib/api-client.ts
```

2. **Identify the problem**:
```typescript
// Current implementation likely:
export function autoSaveWorkflow(nodes, edges) {
  clearTimeout(autosaveTimeout);

  autosaveTimeout = setTimeout(async () => {
    await saveToApi(nodes, edges);
  }, DEBOUNCE_DELAY);

  // Returns undefined!
}
```

3. **Implement Promise-based debounce**:
```typescript
type PendingSave = {
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
};

let pendingSave: PendingSave | null = null;
let autosaveTimeout: NodeJS.Timeout | null = null;

export function autoSaveWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): Promise<void> {
  // Clear existing timeout
  if (autosaveTimeout) {
    clearTimeout(autosaveTimeout);
  }

  // Create or reuse pending promise
  if (!pendingSave) {
    let resolve: () => void;
    let reject: (error: Error) => void;

    const promise = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    pendingSave = {
      promise,
      resolve: resolve!,
      reject: reject!,
    };
  }

  // Set new timeout
  autosaveTimeout = setTimeout(async () => {
    try {
      await saveToApi(nodes, edges);
      pendingSave?.resolve();
    } catch (error) {
      pendingSave?.reject(error as Error);
    } finally {
      pendingSave = null;
      autosaveTimeout = null;
    }
  }, DEBOUNCE_DELAY);

  return pendingSave.promise;
}
```

4. **Add flush method** for immediate save:
```typescript
export async function flushAutoSave(): Promise<void> {
  if (autosaveTimeout) {
    clearTimeout(autosaveTimeout);
    // Trigger save immediately
    // ...
  }
  // Wait for pending save to complete
  if (pendingSave) {
    await pendingSave.promise;
  }
}
```

5. **Update callers to await**:
```typescript
// Now can properly await
await autoSaveWorkflow(nodes, edges);

// Or handle errors
try {
  await autoSaveWorkflow(nodes, edges);
  console.log("Autosave complete");
} catch (error) {
  console.error("Autosave failed:", error);
}
```

6. **Add loading state integration**:
```typescript
// In component
const [isSaving, setIsSaving] = useState(false);

const handleChange = async (nodes, edges) => {
  setIsSaving(true);
  try {
    await autoSaveWorkflow(nodes, edges);
  } finally {
    setIsSaving(false);
  }
};
```

7. **Add navigation guard**:
```typescript
// Prevent navigation during save
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (pendingSave) {
      e.preventDefault();
      e.returnValue = "Autosave in progress...";
    }
  };

  window.addEventListener("beforeunload", handleBeforeUnload);
  return () => window.removeEventListener("beforeunload", handleBeforeUnload);
}, []);
```

8. **Add cancel method**:
```typescript
export function cancelAutoSave(): void {
  if (autosaveTimeout) {
    clearTimeout(autosaveTimeout);
    autosaveTimeout = null;
  }
  if (pendingSave) {
    pendingSave.reject(new Error("Autosave cancelled"));
    pendingSave = null;
  }
}
```

9. **Add tests**:
```typescript
describe("autoSaveWorkflow", () => {
  it("returns a promise", () => {
    const promise = autoSaveWorkflow([], []);
    expect(promise).toBeInstanceOf(Promise);
  });

  it("debounces multiple calls", async () => {
    const spy = jest.spyOn(api, "saveWorkflow");

    autoSaveWorkflow([], []);
    autoSaveWorkflow([], []);
    const promise = autoSaveWorkflow([], []);

    await promise;

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("resolves when save completes", async () => {
    const promise = autoSaveWorkflow([], []);
    await expect(promise).resolves.toBeUndefined();
  });

  it("rejects on save error", async () => {
    jest.spyOn(api, "saveWorkflow").mockRejectedValue(new Error("Network error"));

    const promise = autoSaveWorkflow([], []);
    await expect(promise).rejects.toThrow("Network error");
  });
});
```

10. **Document behavior**:
```typescript
/**
 * Auto-saves workflow with debouncing
 *
 * @returns Promise that resolves when the debounced save completes
 *
 * Multiple rapid calls will be debounced, but all will resolve when
 * the final save completes. If save fails, all pending promises reject.
 *
 * @example
 * // Wait for save to complete
 * await autoSaveWorkflow(nodes, edges);
 * console.log("Save complete");
 *
 * @example
 * // Multiple calls share the same promise
 * autoSaveWorkflow(nodes1, edges1);
 * autoSaveWorkflow(nodes2, edges2);
 * await autoSaveWorkflow(nodes3, edges3); // Waits for final save
 */
export function autoSaveWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): Promise<void>
```

---

## P2-10: Add Core Unit Tests

**Current Implementation Grade: 0/10**

**Findings:**
- **Missing Tests**: No Vitest tests for critical utilities
- **Critical Files**:
  - `lib/utils/template.ts` - Template variable resolution
  - `lib/db/integrations.ts` - Credential encryption
  - `lib/condition-validator.ts` - Expression validation
- **Risk**: Core functionality has no test coverage

**Security Risk**: HIGH (for encryption) - Bugs could leak credentials
**Stability Risk**: HIGH - Untested critical paths
**Code Quality**: Poor - No test coverage
**Maintainability**: Very poor - Changes break things silently

**Detailed Guidance to Reach 10/10:**

1. **Install Vitest** (if not already):
```bash
pnpm add -D vitest @vitest/ui
```

2. **Create vitest config** (`vitest.config.ts`):
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
```

3. **Add test script** to `package.json`:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

4. **Create template utility tests** (`lib/utils/template.test.ts`):
```typescript
import { describe, it, expect } from "vitest";
import { resolveTemplate } from "./template";

describe("template resolution", () => {
  it("resolves simple variable", () => {
    const result = resolveTemplate("Hello {{name}}", { name: "World" });
    expect(result).toBe("Hello World");
  });

  it("resolves nested path", () => {
    const result = resolveTemplate(
      "Email: {{user.email}}",
      { user: { email: "test@example.com" } }
    );
    expect(result).toBe("Email: test@example.com");
  });

  it("resolves step output reference", () => {
    const result = resolveTemplate(
      "Result: {{@step1:output}}",
      { "@step1": { output: "success" } }
    );
    expect(result).toBe("Result: success");
  });

  it("handles missing variable", () => {
    const result = resolveTemplate("Hello {{missing}}", {});
    expect(result).toBe("Hello ");
  });

  it("handles multiple variables", () => {
    const result = resolveTemplate(
      "{{greeting}} {{name}}!",
      { greeting: "Hello", name: "World" }
    );
    expect(result).toBe("Hello World!");
  });

  it("handles arrays", () => {
    const result = resolveTemplate(
      "First: {{items.0}}",
      { items: ["one", "two"] }
    );
    expect(result).toBe("First: one");
  });

  it("preserves non-template strings", () => {
    const result = resolveTemplate("No templates here", {});
    expect(result).toBe("No templates here");
  });
});
```

5. **Create encryption tests** (`lib/db/integrations.test.ts`):
```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { encryptCredentials, decryptCredentials } from "./integrations";

describe("credential encryption", () => {
  beforeAll(() => {
    // Set up test encryption key
    process.env.ENCRYPTION_KEY = "test-key-32-characters-long!!";
  });

  it("encrypts and decrypts credentials", () => {
    const credentials = {
      apiKey: "secret-key-123",
      apiSecret: "super-secret-456",
    };

    const encrypted = encryptCredentials(credentials);
    expect(encrypted).not.toBe(JSON.stringify(credentials));

    const decrypted = decryptCredentials(encrypted);
    expect(decrypted).toEqual(credentials);
  });

  it("produces different ciphertext for same input", () => {
    const credentials = { apiKey: "test" };

    const encrypted1 = encryptCredentials(credentials);
    const encrypted2 = encryptCredentials(credentials);

    // IV should be different
    expect(encrypted1).not.toBe(encrypted2);

    // But both should decrypt to same value
    expect(decryptCredentials(encrypted1)).toEqual(credentials);
    expect(decryptCredentials(encrypted2)).toEqual(credentials);
  });

  it("throws on invalid ciphertext", () => {
    expect(() => decryptCredentials("invalid")).toThrow();
  });

  it("throws on missing encryption key", () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encryptCredentials({})).toThrow();
  });

  it("handles special characters", () => {
    const credentials = {
      password: "p@$$w0rd!#%^&*()",
      token: "🔐🔑",
    };

    const encrypted = encryptCredentials(credentials);
    const decrypted = decryptCredentials(encrypted);

    expect(decrypted).toEqual(credentials);
  });
});
```

6. **Create condition validator tests** (`lib/condition-validator.test.ts`):
```typescript
import { describe, it, expect } from "vitest";
import { validateCondition, evaluateCondition } from "./condition-validator";

describe("condition validation", () => {
  it("validates simple comparison", () => {
    expect(validateCondition("{{value}} > 10")).toBe(true);
  });

  it("validates equality", () => {
    expect(validateCondition("{{status}} === 'active'")).toBe(true);
  });

  it("validates logical operators", () => {
    expect(validateCondition("{{a}} && {{b}}")).toBe(true);
    expect(validateCondition("{{a}} || {{b}}")).toBe(true);
  });

  it("rejects invalid syntax", () => {
    expect(validateCondition("invalid syntax {{")).toBe(false);
  });

  it("rejects dangerous code", () => {
    expect(validateCondition("{{value}}; process.exit()")).toBe(false);
  });
});

describe("condition evaluation", () => {
  it("evaluates simple comparison", () => {
    const result = evaluateCondition(
      "{{value}} > 10",
      { value: 15 }
    );
    expect(result).toBe(true);
  });

  it("evaluates string comparison", () => {
    const result = evaluateCondition(
      "{{status}} === 'active'",
      { status: "active" }
    );
    expect(result).toBe(true);
  });

  it("evaluates logical AND", () => {
    const result = evaluateCondition(
      "{{a}} && {{b}}",
      { a: true, b: true }
    );
    expect(result).toBe(true);
  });

  it("handles missing variables", () => {
    const result = evaluateCondition("{{missing}} > 10", {});
    expect(result).toBe(false);
  });
});
```

7. **Run tests**:
```bash
pnpm test
```

8. **Add coverage reporting**:
```bash
pnpm add -D @vitest/coverage-v8
pnpm test:coverage
```

9. **Add CI integration**:
```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: "pnpm"
      - run: pnpm install
      - run: pnpm discover-plugins
      - run: pnpm test
      - run: pnpm test:coverage
```

10. **Add more test files** for other utilities:
    - `lib/utils/id.test.ts`
    - `lib/api/error-handler.test.ts`
    - `lib/webhook/signature.test.ts`

---

## P2-11: Fix E2E Test Setup

**Current Implementation Grade: 4/10**

**Findings:**
- **File**: `e2e/workflow.spec.ts` and `playwright.config.ts`
- **Issue**: E2E tests require manual auth UI interaction
- **Problem**: Can't run tests in CI without human interaction
- **Need**: Global setup that seeds test user and bypasses auth

**Security Risk**: None
**Stability Risk**: None
**Code Quality**: Poor - Tests not automatable
**CI/CD**: Broken - Can't run E2E tests in pipeline

**Detailed Guidance to Reach 10/10:**

1. **Read current E2E test**:
```bash
cat e2e/workflow.spec.ts
```

2. **Check Playwright config**:
```bash
cat playwright.config.ts
```

3. **Create global setup** (`e2e/global-setup.ts`):
```typescript
import { chromium, type FullConfig } from "@playwright/test";
import { db } from "@/lib/db";
import { users, sessions } from "@/lib/db/schema";
import { generateId } from "@/lib/utils/id";

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Create test user in database
  const testUserId = generateId();
  const testUser = {
    id: testUserId,
    name: "Test User",
    email: "test@example.com",
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(users).values(testUser);

  // Create session
  const sessionToken = generateId();
  const session = {
    id: generateId(),
    userId: testUserId,
    token: sessionToken,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(sessions).values(session);

  // Set session cookie
  await page.goto(config.projects[0].use?.baseURL || "http://localhost:3000");
  await page.context().addCookies([
    {
      name: "better-auth.session_token",
      value: sessionToken,
      domain: "localhost",
      path: "/",
      expires: session.expiresAt.getTime() / 1000,
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  // Save storage state
  await context.storageState({ path: "e2e/.auth/user.json" });

  await browser.close();

  // Store test user ID for cleanup
  process.env.E2E_TEST_USER_ID = testUserId;
}

export default globalSetup;
```

4. **Create global teardown** (`e2e/global-teardown.ts`):
```typescript
import { db } from "@/lib/db";
import { users, workflows, workflowExecutions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

async function globalTeardown() {
  const testUserId = process.env.E2E_TEST_USER_ID;

  if (testUserId) {
    // Clean up test data
    await db.delete(workflowExecutions).where(
      eq(workflowExecutions.userId, testUserId)
    );
    await db.delete(workflows).where(
      eq(workflows.userId, testUserId)
    );
    await db.delete(users).where(
      eq(users.id, testUserId)
    );
  }
}

export default globalTeardown;
```

5. **Update Playwright config**:
```typescript
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // Run tests serially for E2E
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  // Add global setup/teardown
  globalSetup: require.resolve("./e2e/global-setup"),
  globalTeardown: require.resolve("./e2e/global-teardown"),

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    // Use saved auth state
    storageState: "e2e/.auth/user.json",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Start dev server before tests
  webServer: {
    command: "pnpm dev",
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

6. **Update test file** to use authenticated context:
```typescript
// e2e/workflow.spec.ts
import { test, expect } from "@playwright/test";

// Tests now run with authenticated user from global setup
test("create workflow", async ({ page }) => {
  await page.goto("/");

  // Should already be authenticated
  await expect(page.getByText("New Workflow")).toBeVisible();

  // ... rest of test
});

test("execute workflow", async ({ page }) => {
  // Test with existing auth
  // ...
});
```

7. **Add test database setup**:
```typescript
// e2e/setup-test-db.ts
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export async function setupTestDatabase() {
  // Ensure we're not in production!
  if (process.env.NODE_ENV === "production") {
    throw new Error("Cannot run E2E tests in production");
  }

  // Run migrations
  // await migrate(db, { migrationsFolder: "./drizzle" });

  // Clear test data
  await db.execute(sql`
    DELETE FROM workflow_execution_logs WHERE execution_id IN (
      SELECT id FROM workflow_executions WHERE user_id LIKE 'test_%'
    )
  `);
  await db.execute(sql`DELETE FROM workflow_executions WHERE user_id LIKE 'test_%'`);
  await db.execute(sql`DELETE FROM workflows WHERE user_id LIKE 'test_%'`);
  await db.execute(sql`DELETE FROM sessions WHERE user_id LIKE 'test_%'`);
  await db.execute(sql`DELETE FROM users WHERE id LIKE 'test_%'`);
}
```

8. **Add env variable for test database**:
```env
# .env.test
DATABASE_URL=postgresql://user:pass@localhost:5432/workflow_builder_test
```

9. **Update test script** in `package.json`:
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:setup": "tsx e2e/setup-test-db.ts"
  }
}
```

10. **Add CI configuration**:
```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: "pnpm"
      - run: pnpm install
      - run: pnpm discover-plugins
      - run: npx playwright install --with-deps
      - run: pnpm test:e2e:setup
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Summary: P2 Medium Priority Items

**Critical for Developer Experience:**
1. **P2-7**: Add Request Validation - Security and stability
2. **P2-10**: Add Core Unit Tests - Test coverage for critical code
3. **P2-11**: Fix E2E Test Setup - Enable CI testing

**Code Quality:**
4. **P2-5**: Clean Up Console Logs - Production code cleanup
5. **P2-6**: Fix Codegen Fallbacks - Prevent broken generated code
6. **P2-9**: Fix Auto-Save Promise - Proper async handling

**Documentation:**
7. **P2-1**: Update README Endpoints - Correct API documentation
8. **P2-2**: Update README Integrations - Accurate code examples

**Localization:**
9. **P2-3**: Localize Admin UI - Language consistency
10. **P2-4**: Localize Plugin Actions - Fix AI generation confusion

**Technical Debt:**
11. **P2-8**: Deprecate Auto-Save Endpoint - Simplify API surface

Prioritize items 1, 2, and 3 first as they have the most impact on quality and reliability.
