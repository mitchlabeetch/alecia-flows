import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { PipedriveCredentials } from "../credentials";

type CreateDealResult =
  | {
      success: true;
      data: { id: number; title: string; status: string; value: number | null };
    }
  | { success: false; error: { message: string } };

export type CreatePipedriveDealCoreInput = {
  dealTitle: string;
  dealValue?: string;
  dealStage?: string;
  dealPersonId?: string;
  dealOrgId?: string;
};

export type CreatePipedriveDealInput = StepInput &
  CreatePipedriveDealCoreInput & { integrationId?: string };

type PipedriveDeal = {
  id: number;
  title: string;
  status: string;
  value: number | null;
};

type PipedriveResponse = {
  success: boolean;
  data?: PipedriveDeal;
  error?: string;
};

async function stepHandler(
  input: CreatePipedriveDealCoreInput,
  credentials: PipedriveCredentials
): Promise<CreateDealResult> {
  const apiKey = credentials.PIPEDRIVE_API_KEY;
  const domain = credentials.PIPEDRIVE_COMPANY_DOMAIN || "api";

  if (!apiKey) {
    return {
      success: false,
      error: { message: "Clé API Pipedrive manquante" },
    };
  }

  const body: Record<string, unknown> = { title: input.dealTitle };
  if (input.dealValue) body.value = Number(input.dealValue);
  if (input.dealStage) body.stage_id = Number(input.dealStage);
  if (input.dealPersonId) body.person_id = Number(input.dealPersonId);
  if (input.dealOrgId) body.org_id = Number(input.dealOrgId);

  const response = await fetch(
    `https://${domain}.pipedrive.com/api/v1/deals?api_token=${apiKey}`,
    {
      method: "POST",
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

  const data = (await response.json()) as PipedriveResponse;

  if (!data.success || !data.data) {
    return {
      success: false,
      error: { message: data.error || "Création du deal échouée" },
    };
  }

  return {
    success: true,
    data: {
      id: data.data.id,
      title: data.data.title,
      status: data.data.status,
      value: data.data.value,
    },
  };
}

export async function createPipedriveDealStep(
  input: CreatePipedriveDealInput
): Promise<CreateDealResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
createPipedriveDealStep.maxRetries = 0;

export const _integrationType = "pipedrive";
