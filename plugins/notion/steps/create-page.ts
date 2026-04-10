import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { NotionCredentials } from "../credentials";

type CreatePageResult =
  | { success: true; data: { id: string; url: string; title: string } }
  | { success: false; error: { message: string } };

type NotionPageResponse = {
  id: string;
  url: string;
  object?: string;
  message?: string;
};

export type CreateNotionPageCoreInput = {
  parentId: string;
  title: string;
  content?: string;
};

export type CreateNotionPageInput = StepInput &
  CreateNotionPageCoreInput & { integrationId?: string };

async function stepHandler(
  input: CreateNotionPageCoreInput,
  credentials: NotionCredentials
): Promise<CreatePageResult> {
  const apiKey = credentials.NOTION_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: { message: "Clé API Notion manquante" },
    };
  }

  const blocks = input.content
    ? input.content
        .split("\n")
        .filter(Boolean)
        .map((line) => ({
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ type: "text", text: { content: line } }],
          },
        }))
    : [];

  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      parent: { page_id: input.parentId },
      properties: {
        title: {
          title: [{ type: "text", text: { content: input.title } }],
        },
      },
      children: blocks,
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
    data: { id: data.id, url: data.url, title: input.title },
  };
}

export async function createNotionPageStep(
  input: CreateNotionPageInput
): Promise<CreatePageResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
createNotionPageStep.maxRetries = 0;

export const _integrationType = "notion";
