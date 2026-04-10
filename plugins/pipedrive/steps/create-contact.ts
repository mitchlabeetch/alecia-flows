import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { PipedriveCredentials } from "../credentials";

type CreateContactResult =
  | {
      success: true;
      data: { id: number; name: string; email: string | undefined };
    }
  | { success: false; error: { message: string } };

export type CreatePipedriveContactCoreInput = {
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  contactOrgId?: string;
};

export type CreatePipedriveContactInput = StepInput &
  CreatePipedriveContactCoreInput & { integrationId?: string };

type PipedrivePersonResponse = {
  success: boolean;
  data?: {
    id: number;
    name: string;
    email?: Array<{ value: string; primary: boolean }>;
  };
  error?: string;
};

async function stepHandler(
  input: CreatePipedriveContactCoreInput,
  credentials: PipedriveCredentials
): Promise<CreateContactResult> {
  const apiKey = credentials.PIPEDRIVE_API_KEY;
  const domain = credentials.PIPEDRIVE_COMPANY_DOMAIN || "api";

  if (!apiKey) {
    return {
      success: false,
      error: { message: "Clé API Pipedrive manquante" },
    };
  }

  const body: Record<string, unknown> = { name: input.contactName };
  if (input.contactEmail)
    body.email = [{ value: input.contactEmail, primary: true }];
  if (input.contactPhone)
    body.phone = [{ value: input.contactPhone, primary: true }];
  if (input.contactOrgId) body.org_id = Number(input.contactOrgId);

  const response = await fetch(
    `https://${domain}.pipedrive.com/api/v1/persons?api_token=${apiKey}`,
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

  const data = (await response.json()) as PipedrivePersonResponse;

  if (!data.success || !data.data) {
    return {
      success: false,
      error: { message: data.error || "Création du contact échouée" },
    };
  }

  return {
    success: true,
    data: {
      id: data.data.id,
      name: data.data.name,
      email: data.data.email?.[0]?.value,
    },
  };
}

export async function createPipedriveContactStep(
  input: CreatePipedriveContactInput
): Promise<CreateContactResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
createPipedriveContactStep.maxRetries = 0;

export const _integrationType = "pipedrive";
