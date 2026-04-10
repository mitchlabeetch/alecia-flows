import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { internalServerError } from "@/lib/api/errors";
import { webhookPayloadSchema } from "@/lib/api/validation";
import { db } from "@/lib/db";
import { validateWorkflowIntegrations } from "@/lib/db/integrations";
import { apiKeys, workflowExecutions, workflows } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { enforceRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  isWebhookTimestampFresh,
  verifyWebhookSignature,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
} from "@/lib/webhook/signature";
import { executeWorkflow } from "@/lib/workflow-executor.workflow";
import type { WorkflowEdge, WorkflowNode } from "@/lib/workflow-store";

type ExtractApiKeyResult =
  | { valid: true; key: string }
  | { valid: false; error: string; statusCode: number };

function extractApiKey(authHeader: string | null): ExtractApiKeyResult {
  if (!authHeader) {
    return {
      valid: false,
      error: "Missing Authorization header",
      statusCode: 401,
    };
  }

  const key = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (!key?.startsWith("wfb_")) {
    return { valid: false, error: "Invalid API key format", statusCode: 401 };
  }

  return { valid: true, key };
}

function validateWebhookPayload(rawBody: string) {
  const parsedBody = rawBody.trim() === "" ? {} : JSON.parse(rawBody);
  return webhookPayloadSchema.safeParse(parsedBody);
}

async function validateSignedWebhookRequest(options: {
  clientIp: string;
  request: Request;
  secret: string;
  workflowId: string;
}): Promise<
  | { success: true; rawBody: string }
  | { success: false; response: NextResponse }
> {
  const timestamp = options.request.headers.get(WEBHOOK_TIMESTAMP_HEADER);
  const signature = options.request.headers.get(WEBHOOK_SIGNATURE_HEADER);

  if (!(timestamp && signature)) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error:
            "Missing webhook signature headers. Provide X-Webhook-Timestamp and X-Webhook-Signature.",
        },
        { status: 401, headers: corsHeaders }
      ),
    };
  }

  if (!isWebhookTimestampFresh(timestamp)) {
    logger.warn("[Webhook] Rejected request with stale timestamp", {
      clientIp: options.clientIp,
      timestamp,
      workflowId: options.workflowId,
    });
    return {
      success: false,
      response: NextResponse.json(
        { error: "Webhook timestamp is invalid or expired" },
        { status: 401, headers: corsHeaders }
      ),
    };
  }

  const rawBody = await options.request.text();

  if (!verifyWebhookSignature(rawBody, timestamp, signature, options.secret)) {
    logger.warn("[Webhook] Invalid signature", {
      clientIp: options.clientIp,
      workflowId: options.workflowId,
    });
    return {
      success: false,
      response: NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401, headers: corsHeaders }
      ),
    };
  }

  return { success: true, rawBody };
}

// Validate API key and return the user ID if valid
async function validateApiKey(
  apiKey: string,
  workflowUserId: string
): Promise<{ valid: boolean; error?: string; statusCode?: number }> {
  // Hash the key to compare with stored hash
  const keyHash = createHash("sha256").update(apiKey).digest("hex");

  // Find the API key in the database
  const storedApiKey = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.keyHash, keyHash),
  });

  if (!storedApiKey) {
    return { valid: false, error: "Invalid API key", statusCode: 401 };
  }

  if (storedApiKey.expiresAt && storedApiKey.expiresAt <= new Date()) {
    return { valid: false, error: "API key has expired", statusCode: 401 };
  }

  // Verify the API key belongs to the workflow owner
  if (storedApiKey.userId !== workflowUserId) {
    return {
      valid: false,
      error: "You do not have permission to run this workflow",
      statusCode: 403,
    };
  }

  // Update last used timestamp (don't await, fire and forget)
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, storedApiKey.id))
    .catch(() => {
      // Fire and forget - ignore errors
    });

  return { valid: true };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Webhook-Signature, X-Webhook-Timestamp",
};

// biome-ignore lint/nursery/useMaxParams: Background execution requires all workflow context
async function executeWorkflowBackground(
  executionId: string,
  workflowId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  input: Record<string, unknown>
) {
  try {
    logger.debug("[Webhook] Starting execution", {
      executionId,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      workflowId,
    });

    start(executeWorkflow, [
      {
        nodes,
        edges,
        triggerInput: input,
        executionId,
        workflowId,
      },
    ]);

    logger.info("[Webhook] Workflow started successfully", {
      executionId,
      workflowId,
    });
  } catch (error) {
    logger.error("[Webhook] Error during execution", error);

    await db
      .update(workflowExecutions)
      .set({
        status: "error",
        error:
          error instanceof Error
            ? `Execution failed to start (${error.name}: ${error.message})`
            : "Execution failed to start (UnknownError)",
        completedAt: new Date(),
      })
      .where(eq(workflowExecutions.id, executionId));
  }
}

export function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await context.params;
    const clientIp = getClientIp(request);
    const rateLimit = await enforceRateLimit({
      key: `${workflowId}:${clientIp}`,
      prefix: "workflow-webhook",
      limit: 60,
      windowMs: 60_000,
      message: "Webhook rate limit exceeded",
    });
    if (!rateLimit.success) {
      const rateLimitBody = await rateLimit.response.json();
      return NextResponse.json(rateLimitBody, {
        status: rateLimit.response.status,
        headers: {
          ...corsHeaders,
          ...Object.fromEntries(rateLimit.response.headers.entries()),
        },
      });
    }

    // Get workflow
    const workflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId),
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    const extractedApiKey = extractApiKey(request.headers.get("Authorization"));
    if (!extractedApiKey.valid) {
      return NextResponse.json(
        { error: extractedApiKey.error },
        { status: extractedApiKey.statusCode, headers: corsHeaders }
      );
    }

    // Validate API key - must belong to the workflow owner
    const apiKeyValidation = await validateApiKey(
      extractedApiKey.key,
      workflow.userId
    );

    if (!apiKeyValidation.valid) {
      return NextResponse.json(
        { error: apiKeyValidation.error },
        { status: apiKeyValidation.statusCode || 401, headers: corsHeaders }
      );
    }

    const signedWebhookRequest = await validateSignedWebhookRequest({
      clientIp,
      request,
      secret: extractedApiKey.key,
      workflowId,
    });

    if (!signedWebhookRequest.success) {
      return signedWebhookRequest.response;
    }

    const { rawBody } = signedWebhookRequest;

    // Verify this is a webhook-triggered workflow
    const triggerNode = (workflow.nodes as WorkflowNode[]).find(
      (node) => node.data.type === "trigger"
    );

    if (!triggerNode || triggerNode.data.config?.triggerType !== "Webhook") {
      return NextResponse.json(
        { error: "This workflow is not configured for webhook triggers" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate that all integrationIds in workflow nodes belong to the workflow owner
    const validation = await validateWorkflowIntegrations(
      workflow.nodes as WorkflowNode[],
      workflow.userId
    );
    if (!validation.valid) {
      logger.warn("[Webhook] Invalid integration references", {
        workflowId,
        invalidIds: validation.invalidIds,
      });
      return NextResponse.json(
        { error: "Workflow contains invalid integration references" },
        { status: 403, headers: corsHeaders }
      );
    }

    let validationResult: ReturnType<typeof validateWebhookPayload>;

    try {
      validationResult = validateWebhookPayload(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error:
            validationResult.error.issues[0]?.message ?? "Invalid request body",
        },
        { status: 400, headers: corsHeaders }
      );
    }
    const body = validationResult.data;

    // Create execution record
    const [execution] = await db
      .insert(workflowExecutions)
      .values({
        workflowId,
        userId: workflow.userId,
        status: "running",
        input: body,
      })
      .returning();

    logger.info("[Webhook] Created execution", {
      executionId: execution.id,
      workflowId,
    });

    // Execute the workflow in the background (don't await)
    executeWorkflowBackground(
      execution.id,
      workflowId,
      workflow.nodes as WorkflowNode[],
      workflow.edges as WorkflowEdge[],
      body
    );

    // Return immediately with the execution ID
    return NextResponse.json(
      {
        executionId: execution.id,
        status: "running",
      },
      {
        headers: {
          ...corsHeaders,
          ...Object.fromEntries(rateLimit.headers.entries()),
        },
      }
    );
  } catch (error) {
    const response = internalServerError(
      "Failed to start webhook workflow execution",
      error
    );
    return NextResponse.json(await response.json(), {
      status: response.status,
      headers: corsHeaders,
    });
  }
}
