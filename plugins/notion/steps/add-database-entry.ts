import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { NotionCredentials } from "../credentials";

type AddEntryResult =
  | { success: true; data: { id: string; url: string } }
  | { success: false; error: { message: string } };

type NotionPageResponse = {
  id: string;
  url: string;
  message?: string;
};

export type AddNotionDatabaseEntryCoreInput = {
  databaseId: string;
  properties: string;
};

export type AddNotionDatabaseEntryInput = StepInput &
  AddNotionDatabaseEntryCoreInput & { integrationId?: string };

async function stepHandler(
  input: AddNotionDatabaseEntryCoreInput,
  credentials: NotionCredentials
): Promise<AddEntryResult> {
  const apiKey = credentials.NOTION_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: { message: "Clé API Notion manquante" },
    };
  }

  let parsedProperties: Record<string, unknown>;
  try {
    parsedProperties = JSON.parse(input.properties) as Record<string, unknown>;
  } catch {
    return {
      success: false,
      error: { message: "Format JSON invalide pour les propriétés" },
    };
  }

  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      parent: { database_id: input.databaseId },
      properties: parsedProperties,
    }),
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { message?: string };
    return {
      success: false,
      error: { message: err.message || `Erreur Notion: ${response.status}` },
    };
  }

  const data = (await response.json()) as NotionPageResponse;
  return {
    success: true,
    data: { id: data.id, url: data.url },
  };
}

export async function addNotionDatabaseEntryStep(
  input: AddNotionDatabaseEntryInput
): Promise<AddEntryResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
addNotionDatabaseEntryStep.maxRetries = 0;

export const _integrationType = "notion";
