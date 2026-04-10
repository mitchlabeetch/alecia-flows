import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { internalServerError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { isInternalWorkflowName } from "@/lib/workflows/constants";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json([], { status: 200 });
    }

    const userWorkflows = await db
      .select()
      .from(workflows)
      .where(eq(workflows.userId, session.user.id))
      .orderBy(desc(workflows.updatedAt));

    const mappedWorkflows = userWorkflows
      .filter((workflow) => !isInternalWorkflowName(workflow.name))
      .map((workflow) => ({
        ...workflow,
        createdAt: workflow.createdAt.toISOString(),
        updatedAt: workflow.updatedAt.toISOString(),
      }));

    return NextResponse.json(mappedWorkflows);
  } catch (error) {
    return internalServerError("Failed to get workflows", error);
  }
}
