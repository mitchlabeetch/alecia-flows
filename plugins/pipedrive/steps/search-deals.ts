import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { PipedriveCredentials } from "../credentials";

type SearchDealsResult =
  | {
      success: true;
      data: { deals: unknown[]; count: number };
    }
  | { success: false; error: { message: string } };

export type SearchPipedriveDealsCoreInput = {
  searchTerm: string;
  status?: string;
};

export type SearchPipedriveDealsInput = StepInput &
  SearchPipedriveDealsCoreInput & { integrationId?: string };

type PipedriveDealsSearchResponse = {
  success: boolean;
  data?: { items?: Array<{ item: unknown }> };
  error?: string;
};

async function stepHandler(
  input: SearchPipedriveDealsCoreInput,
  credentials: PipedriveCredentials
): Promise<SearchDealsResult> {
  const apiKey = credentials.PIPEDRIVE_API_KEY;
  const domain = credentials.PIPEDRIVE_COMPANY_DOMAIN || "api";

  if (!apiKey) {
    return {
      success: false,
      error: { message: "Clé API Pipedrive manquante" },
    };
  }

  // Use /deals/search which supports status filtering
  const params = new URLSearchParams({
    term: input.searchTerm,
    api_token: apiKey,
  });

  const status = input.status || "open";
  if (status !== "all_not_deleted") {
    params.set("status", status);
  }

  const response = await fetch(
    `https://${domain}.pipedrive.com/api/v1/deals/search?${params}`
  );

  if (!response.ok) {
    return {
      success: false,
      error: { message: `Erreur Pipedrive: ${response.status}` },
    };
  }

  const data = (await response.json()) as PipedriveDealsSearchResponse;

  if (!data.success) {
    return {
      success: false,
      error: { message: data.error || "Recherche échouée" },
    };
  }

  const deals = (data.data?.items || []).map((item) => item.item);

  return {
    success: true,
    data: { deals, count: deals.length },
  };
}

export async function searchPipedriveDealsStep(
  input: SearchPipedriveDealsInput
): Promise<SearchDealsResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
searchPipedriveDealsStep.maxRetries = 0;

export const _integrationType = "pipedrive";
