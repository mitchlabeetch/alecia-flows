import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import { createV0Chat } from "../api";
import type { V0Credentials } from "../credentials";

type CreateChatResult =
  | { success: true; chatId: string; url: string; demoUrl?: string }
  | { success: false; error: string };

export type CreateChatCoreInput = {
  message: string;
  system?: string;
};

export type CreateChatInput = StepInput &
  CreateChatCoreInput & {
    integrationId?: string;
  };

/**
 * Core logic - portable between app and export
 */
async function stepHandler(
  input: CreateChatCoreInput,
  credentials: V0Credentials
): Promise<CreateChatResult> {
  const apiKey = credentials.V0_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error:
        "V0_API_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  try {
    const result = await createV0Chat({
      apiKey,
      message: input.message,
      system: input.system,
    });

    return {
      success: true,
      chatId: result.id,
      url: result.webUrl,
      demoUrl: result.latestVersion?.demoUrl,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create chat: ${getErrorMessage(error)}`,
    };
  }
}

/**
 * App entry point - fetches credentials and wraps with logging
 */
export async function createChatStep(
  input: CreateChatInput
): Promise<CreateChatResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
createChatStep.maxRetries = 0;

export const _integrationType = "v0";
