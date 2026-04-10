import { NextResponse } from "next/server";
import postgres from "postgres";
import { internalServerError } from "@/lib/api/errors";
import { integrationTestSchema, readValidatedJson } from "@/lib/api/validation";
import { auth } from "@/lib/auth";
import type {
  IntegrationConfig,
  IntegrationType,
} from "@/lib/types/integration";
import {
  getCredentialMapping,
  getIntegration as getPluginFromRegistry,
} from "@/plugins";

export type TestConnectionRequest = {
  type: IntegrationType;
  config: IntegrationConfig;
};

export type TestConnectionResult = {
  status: "success" | "error";
  message: string;
};

/**
 * POST /api/integrations/test
 * Test connection credentials without saving
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
      integrationTestSchema
    );
    if (!validationResult.success) {
      return validationResult.response;
    }
    const body = validationResult.data as TestConnectionRequest;

    if (body.type === "database") {
      const result = await testDatabaseConnection(body.config.url);
      return NextResponse.json(result);
    }

    const plugin = getPluginFromRegistry(body.type);

    if (!plugin) {
      return NextResponse.json(
        { error: "Invalid integration type" },
        { status: 400 }
      );
    }

    if (!plugin.testConfig) {
      return NextResponse.json(
        { error: "Integration does not support testing" },
        { status: 400 }
      );
    }

    const credentials = getCredentialMapping(plugin, body.config);

    const testFn = await plugin.testConfig.getTestFunction();
    const testResult = await testFn(credentials);

    const result: TestConnectionResult = {
      status: testResult.success ? "success" : "error",
      message: testResult.success
        ? "Connection successful"
        : testResult.error || "Connection failed",
    };

    return NextResponse.json(result);
  } catch (error) {
    const response = internalServerError("Failed to test connection", error);
    return NextResponse.json(
      {
        status: "error",
        message: (await response.json()).error,
      },
      { status: response.status }
    );
  }
}

async function testDatabaseConnection(
  databaseUrl?: string
): Promise<TestConnectionResult> {
  let connection: postgres.Sql | null = null;

  try {
    if (!databaseUrl) {
      return {
        status: "error",
        message: "Connection failed",
      };
    }

    connection = postgres(databaseUrl, {
      max: 1,
      idle_timeout: 5,
      connect_timeout: 5,
    });

    await connection`SELECT 1`;

    return {
      status: "success",
      message: "Connection successful",
    };
  } catch {
    return {
      status: "error",
      message: "Connection failed",
    };
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
