import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { SuperagentCredentials } from "../credentials";

type RedactData = {
  redactedText: string;
  reasoning?: string;
};

type RedactResult =
  | { success: true; data: RedactData }
  | { success: false; error: { message: string } };

export type SuperagentRedactCoreInput = {
  text: string;
  entities?: string[] | string;
};

export type SuperagentRedactInput = StepInput &
  SuperagentRedactCoreInput & {
    integrationId?: string;
  };

/**
 * Core logic
 */
async function stepHandler(
  input: SuperagentRedactCoreInput,
  credentials: SuperagentCredentials
): Promise<RedactResult> {
  const apiKey = credentials.SUPERAGENT_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: { message: "Superagent API Key is not configured." },
    };
  }

  try {
    const body: { text: string; entities?: string[] } = {
      text: input.text,
    };

    if (input.entities) {
      let entitiesArray: string[];

      if (typeof input.entities === "string") {
        entitiesArray = input.entities.split(",").map((e) => e.trim());
      } else if (Array.isArray(input.entities)) {
        entitiesArray = input.entities.map((e) => String(e).trim());
      } else {
        entitiesArray = [];
      }

      const validEntities = entitiesArray.filter((e) => e.length > 0);

      if (validEntities.length > 0) {
        body.entities = validEntities;
      }
    }

    const response = await fetch("https://app.superagent.sh/api/redact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: { message: `Redact API error: ${error}` },
      };
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      success: true,
      data: {
        redactedText: choice?.message?.content || input.text,
        reasoning: choice?.message?.reasoning,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: { message: `Failed to redact text: ${getErrorMessage(error)}` },
    };
  }
}

/**
 * Step entry point
 */
export async function superagentRedactStep(
  input: SuperagentRedactInput
): Promise<RedactResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
superagentRedactStep.maxRetries = 0;

export const _integrationType = "superagent";
