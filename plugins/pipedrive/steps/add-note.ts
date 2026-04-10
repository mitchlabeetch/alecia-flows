import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { PipedriveCredentials } from "../credentials";

type AddNoteResult =
  | { success: true; data: { id: number; content: string } }
  | { success: false; error: { message: string } };

export type AddPipedriveNoteCoreInput = {
  noteContent: string;
  dealId?: string;
  personId?: string;
};

export type AddPipedriveNoteInput = StepInput &
  AddPipedriveNoteCoreInput & { integrationId?: string };

type PipedriveNoteResponse = {
  success: boolean;
  data?: { id: number; content: string };
  error?: string;
};

async function stepHandler(
  input: AddPipedriveNoteCoreInput,
  credentials: PipedriveCredentials
): Promise<AddNoteResult> {
  const apiKey = credentials.PIPEDRIVE_API_KEY;
  const domain = credentials.PIPEDRIVE_COMPANY_DOMAIN || "api";

  if (!apiKey) {
    return {
      success: false,
      error: { message: "Clé API Pipedrive manquante" },
    };
  }

  const body: Record<string, unknown> = { content: input.noteContent };
  if (input.dealId) body.deal_id = Number(input.dealId);
  if (input.personId) body.person_id = Number(input.personId);

  const response = await fetch(
    `https://${domain}.pipedrive.com/api/v1/notes?api_token=${apiKey}`,
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

  const data = (await response.json()) as PipedriveNoteResponse;

  if (!data.success || !data.data) {
    return {
      success: false,
      error: { message: data.error || "Ajout de la note échoué" },
    };
  }

  return {
    success: true,
    data: { id: data.data.id, content: data.data.content },
  };
}

export async function addPipedriveNoteStep(
  input: AddPipedriveNoteInput
): Promise<AddNoteResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
addPipedriveNoteStep.maxRetries = 0;

export const _integrationType = "pipedrive";
