import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { NotionCredentials } from "../credentials";

type AppendBlockResult =
  | { success: true; data: { blockIds: string[] } }
  | { success: false; error: { message: string } };

type NotionBlockResponse = {
  results?: Array<{ id: string }>;
};

export type AppendNotionBlockCoreInput = {
  pageId: string;
  content: string;
};

export type AppendNotionBlockInput = StepInput &
  AppendNotionBlockCoreInput & { integrationId?: string };

async function stepHandler(
  input: AppendNotionBlockCoreInput,
  credentials: NotionCredentials
): Promise<AppendBlockResult> {
  const apiKey = credentials.NOTION_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: { message: "Clé API Notion manquante" },
    };
  }

  const lines = input.content.split("\n").filter(Boolean);
  const blocks = lines.map((line) => {
    if (line.startsWith("- ")) {
      return {
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [{ type: "text", text: { content: line.slice(2) } }],
        },
      };
    }
    return {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ type: "text", text: { content: line } }],
      },
    };
  });

  const response = await fetch(
    `https://api.notion.com/v1/blocks/${input.pageId}/children`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({ children: blocks }),
    }
  );

  if (!response.ok) {
    return {
      success: false,
      error: { message: `Erreur Notion: ${response.status}` },
    };
  }

  const data = (await response.json()) as NotionBlockResponse;
  return {
    success: true,
    data: { blockIds: (data.results || []).map((b) => b.id) },
  };
}

export async function appendNotionBlockStep(
  input: AppendNotionBlockInput
): Promise<AppendBlockResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
appendNotionBlockStep.maxRetries = 0;

export const _integrationType = "notion";
