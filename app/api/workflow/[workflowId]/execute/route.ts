import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { internalServerError } from "@/lib/api/errors";
import { executeWorkflowSchema, readValidatedJson } from "@/lib/api/validation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateWorkflowIntegrations } from "@/lib/db/integrations";
import { workflowExecutions, workflows } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import { executeWorkflow } from "@/lib/workflow-executor.workflow";
import type { WorkflowEdge, WorkflowNode } from "@/lib/workflow-store";

// biome-ignore lint/nursery/useMaxParams: Background execution requires all workflow context
async function executeWorkflowBackground(
  executionId: string,
  workflowId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  input: Record<string, unknown>
) {
  try {
    logger.debug("[Workflow Execute] Starting execution", {
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
        workflowId, // Pass workflow ID so steps can fetch credentials
      },
    ]);

    logger.info("[Workflow Execute] Workflow started successfully", {
      executionId,
      workflowId,
    });
  } catch (error) {
    logger.error("[Workflow Execute] Error during execution", error);

    // Update execution record with error
    await db
      .update(workflowExecutions)
      .set({
        status: "error",
        error: `Execution failed to start (${error instanceof Error ? error.name : "UnknownError"})`,
        completedAt: new Date(),
      })
      .where(eq(workflowExecutions.id, executionId));
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await context.params;

    // Get session
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await enforceRateLimit({
      key: session.user.id,
      prefix: "workflow-execute",
      limit: 30,
      windowMs: 60_000,
      message: "Workflow execution rate limit exceeded",
    });
    if (!rateLimit.success) {
      return rateLimit.response;
    }

    // Get workflow and verify ownership
    const workflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId),
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    if (workflow.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate that all integrationIds in workflow nodes belong to the current user
    const validation = await validateWorkflowIntegrations(
      workflow.nodes as WorkflowNode[],
      session.user.id
    );
    if (!validation.valid) {
      logger.warn("[Workflow Execute] Invalid integration references", {
        workflowId,
        invalidIds: validation.invalidIds,
      });
      return NextResponse.json(
        { error: "Workflow contains invalid integration references" },
        { status: 403 }
      );
    }

    const validationResult = await readValidatedJson(
      request,
      executeWorkflowSchema
    );
    if (!validationResult.success) {
      return validationResult.response;
    }
    const { input } = validationResult.data;

    // Create execution record
    const [execution] = await db
      .insert(workflowExecutions)
      .values({
        workflowId,
        userId: session.user.id,
        status: "running",
        input,
      })
      .returning();

    logger.info("[Workflow Execute] Created execution", {
      executionId: execution.id,
      workflowId,
    });

    // Execute the workflow in the background (don't await)
    executeWorkflowBackground(
      execution.id,
      workflowId,
      workflow.nodes as WorkflowNode[],
      workflow.edges as WorkflowEdge[],
      input
    );

    // Return immediately with the execution ID
    return NextResponse.json(
      {
        executionId: execution.id,
        status: "running",
      },
      { headers: rateLimit.headers }
    );
  } catch (error) {
    return internalServerError("Failed to start workflow execution", error);
  }
}
