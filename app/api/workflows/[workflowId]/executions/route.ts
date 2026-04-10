import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { internalServerError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflowExecutions, workflows } from "@/lib/db/schema";

export async function GET(
  request: Request,
  context: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await context.params;
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify workflow ownership
    const workflow = await db.query.workflows.findFirst({
      where: and(
        eq(workflows.id, workflowId),
        eq(workflows.userId, session.user.id)
      ),
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Fetch executions
    const executions = await db.query.workflowExecutions.findMany({
      where: eq(workflowExecutions.workflowId, workflowId),
      orderBy: [desc(workflowExecutions.startedAt)],
      limit: 50,
    });

    return NextResponse.json(executions);
  } catch (error) {
    return internalServerError("Failed to get executions", error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await context.params;
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify workflow ownership
    const workflow = await db.query.workflows.findFirst({
      where: and(
        eq(workflows.id, workflowId),
        eq(workflows.userId, session.user.id)
      ),
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    const deletedExecutions = await db
      .delete(workflowExecutions)
      .where(eq(workflowExecutions.workflowId, workflowId))
      .returning({ id: workflowExecutions.id });

    return NextResponse.json({
      success: true,
      deletedCount: deletedExecutions.length,
    });
  } catch (error) {
    return internalServerError("Failed to delete executions", error);
  }
}
