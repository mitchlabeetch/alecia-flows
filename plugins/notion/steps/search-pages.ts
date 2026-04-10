import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { NotionCredentials } from "../credentials";

type SearchPagesResult =
  | {
      success: true;
      data: {
        pages: Array<{ id: string; url: string; properties?: unknown }>;
        count: number;
      };
    }
  | { success: false; error: { message: string } };

type NotionSearchResponse = {
  results?: Array<{
    id: string;
    url: string;
    properties?: unknown;
  }>;
};

export type SearchNotionPagesCoreInput = {
  query: string;
  filterType?: string;
};

export type SearchNotionPagesInput = StepInput &
  SearchNotionPagesCoreInput & { integrationId?: string };

async function stepHandler(
  input: SearchNotionPagesCoreInput,
  credentials: NotionCredentials
): Promise<SearchPagesResult> {
  const apiKey = credentials.NOTION_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: { message: "Clé API Notion manquante" },
    };
  }

  const filterType = input.filterType || "page";

  const response = await fetch("https://api.notion.com/v1/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      query: input.query,
      filter: { value: filterType, property: "object" },
      sort: { direction: "descending", timestamp: "last_edited_time" },
    }),
  });

  if (!response.ok) {
    return {
      success: false,
      error: { message: `Erreur Notion: ${response.status}` },
    };
  }

  const data = (await response.json()) as NotionSearchResponse;
  const pages = (data.results || []).map((p) => ({
    id: p.id,
    url: p.url,
    properties: p.properties,
  }));

  return {
    success: true,
    data: { pages, count: pages.length },
  };
}

export async function searchNotionPagesStep(
  input: SearchNotionPagesInput
): Promise<SearchPagesResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
searchNotionPagesStep.maxRetries = 0;

export const _integrationType = "notion";
