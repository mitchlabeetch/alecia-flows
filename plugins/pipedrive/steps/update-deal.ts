import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { PipedriveCredentials } from "../credentials";

type UpdateDealResult =
  | {
      success: true;
      data: { id: number; title: string; status: string };
    }
  | { success: false; error: { message: string } };

export type UpdatePipedriveDealCoreInput = {
  dealId: string;
  dealTitle?: string;
  dealValue?: string;
  dealStatus?: string;
};

export type UpdatePipedriveDealInput = StepInput &
  UpdatePipedriveDealCoreInput & { integrationId?: string };

type PipedriveDealResponse = {
  success: boolean;
  data?: { id: number; title: string; status: string };
  error?: string;
};

async function stepHandler(
  input: UpdatePipedriveDealCoreInput,
  credentials: PipedriveCredentials
): Promise<UpdateDealResult> {
  const apiKey = credentials.PIPEDRIVE_API_KEY;
  const domain = credentials.PIPEDRIVE_COMPANY_DOMAIN || "api";

  if (!apiKey) {
    return {
      success: false,
      error: { message: "Clé API Pipedrive manquante" },
    };
  }

  if (!input.dealId) {
    return {
      success: false,
      error: { message: "ID du deal requis" },
    };
  }

  const body: Record<string, unknown> = {};
  if (input.dealTitle) body.title = input.dealTitle;
  if (input.dealValue) body.value = Number(input.dealValue);
  if (input.dealStatus) body.status = input.dealStatus;

  const response = await fetch(
    `https://${domain}.pipedrive.com/api/v1/deals/${input.dealId}?api_token=${apiKey}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    return {
      success: false,
      error: { message: `Erreur Pipedrive: ${response.status}` },
    };
  }

  const data = (await response.json()) as PipedriveDealResponse;

  if (!data.success || !data.data) {
    return {
      success: false,
      error: { message: data.error || "Mise à jour du deal échouée" },
    };
  }

  return {
    success: true,
    data: {
      id: data.data.id,
      title: data.data.title,
      status: data.data.status,
    },
  };
}

export async function updatePipedriveDealStep(
  input: UpdatePipedriveDealInput
): Promise<UpdateDealResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
updatePipedriveDealStep.maxRetries = 0;

export const _integrationType = "pipedrive";
