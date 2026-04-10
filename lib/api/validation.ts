import { NextResponse } from "next/server";
import { type ZodType, z } from "zod";

const workflowNodesSchema = z.array(z.record(z.string(), z.unknown()));
const workflowEdgesSchema = z.array(z.record(z.string(), z.unknown()));
const workflowVisibilitySchema = z.enum(["private", "public"]);
const integrationConfigSchema = z.record(z.string(), z.unknown());
const jsonObjectSchema = z.record(z.string(), z.unknown());

export const aiGenerateSchema = z.object({
  prompt: z.string().trim().min(1, "Prompt is required").max(4000),
  existingWorkflow: z
    .object({
      name: z.string().trim().max(255).optional(),
      nodes: workflowNodesSchema,
      edges: workflowEdgesSchema,
    })
    .optional(),
});

export const apiKeyCreateSchema = z
  .object({
    name: z.string().trim().max(255).nullish(),
    expiresAt: z.string().datetime().nullish(),
  })
  .transform((data) => ({
    name: data.name ? data.name : null,
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
  }));

export const executeWorkflowSchema = z.object({
  input: jsonObjectSchema.optional().default({}),
});

export const integrationCreateSchema = z.object({
  name: z.string().trim().max(255).optional(),
  type: z.string().trim().min(1, "Integration type is required"),
  config: integrationConfigSchema,
});

export const integrationUpdateSchema = z
  .object({
    name: z.string().trim().max(255).optional(),
    config: integrationConfigSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const integrationTestSchema = z.object({
  type: z.string().trim().min(1, "Integration type is required"),
  config: integrationConfigSchema,
});

export const workflowCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  description: z.string().trim().max(5000).optional(),
  nodes: workflowNodesSchema,
  edges: workflowEdgesSchema,
  visibility: workflowVisibilitySchema.optional(),
});

export const workflowUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(5000).optional().nullable(),
    nodes: workflowNodesSchema.optional(),
    edges: workflowEdgesSchema.optional(),
    visibility: workflowVisibilitySchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const webhookPayloadSchema = jsonObjectSchema.default({});

type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse };

export async function readValidatedJson<T>(
  request: Request,
  schema: ZodType<T>
): Promise<ValidationResult<T>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Invalid JSON request body" },
        { status: 400 }
      ),
    };
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    return {
      success: false,
      response: NextResponse.json(
        { error: result.error.issues[0]?.message ?? "Invalid request body" },
        { status: 400 }
      ),
    };
  }

  return { success: true, data: result.data };
}
