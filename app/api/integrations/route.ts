import { NextResponse } from "next/server";
import { internalServerError } from "@/lib/api/errors";
import {
  integrationCreateSchema,
  readValidatedJson,
} from "@/lib/api/validation";
import { auth } from "@/lib/auth";
import { createIntegration, getIntegrations } from "@/lib/db/integrations";
import type {
  IntegrationConfig,
  IntegrationType,
} from "@/lib/types/integration";

export type GetIntegrationsResponse = {
  id: string;
  name: string;
  type: IntegrationType;
  isManaged?: boolean;
  createdAt: string;
  updatedAt: string;
  // Config is intentionally excluded for security
}[];

export type CreateIntegrationRequest = {
  name?: string;
  type: IntegrationType;
  config: IntegrationConfig;
};

export type CreateIntegrationResponse = {
  id: string;
  name: string;
  type: IntegrationType;
  createdAt: string;
  updatedAt: string;
};

/**
 * GET /api/integrations
 * List all integrations for the authenticated user
 */
export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get optional type filter from query params
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get("type") as IntegrationType | null;

    const integrations = await getIntegrations(
      session.user.id,
      typeFilter || undefined
    );

    // Return integrations without config for security
    const response: GetIntegrationsResponse = integrations.map(
      (integration) => ({
        id: integration.id,
        name: integration.name,
        type: integration.type,
        isManaged: integration.isManaged ?? false,
        createdAt: integration.createdAt.toISOString(),
        updatedAt: integration.updatedAt.toISOString(),
      })
    );

    return NextResponse.json(response);
  } catch (error) {
    return internalServerError("Failed to get integrations", error);
  }
}

/**
 * POST /api/integrations
 * Create a new integration
 */
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const validationResult = await readValidatedJson(
      request,
      integrationCreateSchema
    );
    if (!validationResult.success) {
      return validationResult.response;
    }
    const body = validationResult.data as CreateIntegrationRequest;

    const integration = await createIntegration(
      session.user.id,
      body.name || "",
      body.type,
      body.config
    );

    const response: CreateIntegrationResponse = {
      id: integration.id,
      name: integration.name,
      type: integration.type,
      createdAt: integration.createdAt.toISOString(),
      updatedAt: integration.updatedAt.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    return internalServerError("Failed to create integration", error);
  }
}
