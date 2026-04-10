import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { escapeHtml } from "@/lib/utils/html";
import type { Office365Credentials } from "../credentials";
import { getToken } from "../lib/get-token";

type OneNoteResult =
  | {
      success: true;
      data: { id: string; title: string; webUrl: string | undefined };
    }
  | { success: false; error: { message: string } };

type OneNoteItem = { id: string; displayName: string };
type OneNotePage = {
  id: string;
  title: string;
  links?: { oneNoteWebUrl?: { href: string } };
};
type OneNoteListResponse = { value?: OneNoteItem[] };

export type CreateOneNotePageCoreInput = {
  notebookName: string;
  sectionName: string;
  pageTitle: string;
  pageContent?: string;
};

export type CreateOneNotePageInput = StepInput &
  CreateOneNotePageCoreInput & { integrationId?: string };

async function getOrCreateNotebook(
  token: string,
  notebookName: string
): Promise<string> {
  const resp = await fetch(
    "https://graph.microsoft.com/v1.0/me/onenote/notebooks",
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = (await resp.json()) as OneNoteListResponse;
  const existing = data.value?.find(
    (n) => n.displayName === notebookName
  );
  if (existing) return existing.id;

  const createResp = await fetch(
    "https://graph.microsoft.com/v1.0/me/onenote/notebooks",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ displayName: notebookName }),
    }
  );
  const created = (await createResp.json()) as OneNoteItem;
  return created.id;
}

async function getOrCreateSection(
  token: string,
  notebookId: string,
  sectionName: string
): Promise<string> {
  const resp = await fetch(
    `https://graph.microsoft.com/v1.0/me/onenote/notebooks/${notebookId}/sections`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = (await resp.json()) as OneNoteListResponse;
  const existing = data.value?.find(
    (s) => s.displayName === sectionName
  );
  if (existing) return existing.id;

  const createResp = await fetch(
    `https://graph.microsoft.com/v1.0/me/onenote/notebooks/${notebookId}/sections`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ displayName: sectionName }),
    }
  );
  const created = (await createResp.json()) as OneNoteItem;
  return created.id;
}

async function stepHandler(
  input: CreateOneNotePageCoreInput,
  credentials: Office365Credentials
): Promise<OneNoteResult> {
  const { OFFICE365_TENANT_ID: tenantId } = credentials;
  if (!tenantId) {
    return {
      success: false,
      error: { message: "Credentials Office 365 manquantes" },
    };
  }

  try {
    const token = await getToken(credentials);
    const notebookId = await getOrCreateNotebook(token, input.notebookName);
    const sectionId = await getOrCreateSection(
      token,
      notebookId,
      input.sectionName
    );

    const safeTitle = escapeHtml(input.pageTitle);
    // pageContent is trusted workflow template output; only the title is escaped
    const bodyContent = input.pageContent || `<h1>${safeTitle}</h1>`;
    const htmlContent = [
      "<!DOCTYPE html><html><head>",
      `<title>${safeTitle}</title>`,
      `</head><body>${bodyContent}</body></html>`,
    ].join("");

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/onenote/sections/${sectionId}/pages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/xhtml+xml",
        },
        body: htmlContent,
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: { message: `Erreur Microsoft Graph: ${response.status}` },
      };
    }

    const data = (await response.json()) as OneNotePage;
    return {
      success: true,
      data: {
        id: data.id,
        title: data.title,
        webUrl: data.links?.oneNoteWebUrl?.href,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
    };
  }
}

export async function createOneNotePageStep(
  input: CreateOneNotePageInput
): Promise<OneNoteResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
createOneNotePageStep.maxRetries = 0;

export const _integrationType = "office365";
