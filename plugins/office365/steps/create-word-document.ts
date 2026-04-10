import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { Office365Credentials } from "../credentials";

type FileResult =
  | { success: true; data: { id: string; name: string; webUrl: string } }
  | { success: false; error: { message: string } };

type DriveItem = { id: string; name: string; webUrl: string };
type TokenResponse = { access_token: string };

export type CreateWordDocumentCoreInput = {
  fileName: string;
  content?: string;
  folderPath?: string;
};

export type CreateWordDocumentInput = StepInput &
  CreateWordDocumentCoreInput & { integrationId?: string };

async function getToken(credentials: Office365Credentials): Promise<string> {
  const { OFFICE365_TENANT_ID: tenantId, OFFICE365_CLIENT_ID: clientId, OFFICE365_CLIENT_SECRET: clientSecret } = credentials;
  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId ?? "",
        client_secret: clientSecret ?? "",
        scope: "https://graph.microsoft.com/.default",
      }),
    }
  );
  const data = (await response.json()) as TokenResponse;
  return data.access_token;
}

async function stepHandler(
  input: CreateWordDocumentCoreInput,
  credentials: Office365Credentials
): Promise<FileResult> {
  const { OFFICE365_TENANT_ID: tenantId } = credentials;
  if (!tenantId) {
    return { success: false, error: { message: "Credentials Office 365 manquantes" } };
  }

  try {
    const token = await getToken(credentials);
    const name = input.fileName.endsWith(".docx") ? input.fileName : `${input.fileName}.docx`;
    const path = input.folderPath ? `${input.folderPath}/${name}` : `/${name}`;

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/root:${path}:/content`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
        body: new Uint8Array([]),
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: { message: `Erreur Microsoft Graph: ${response.status}` },
      };
    }

    const data = (await response.json()) as DriveItem;
    return {
      success: true,
      data: { id: data.id, name: data.name, webUrl: data.webUrl },
    };
  } catch (error) {
    return {
      success: false,
      error: { message: error instanceof Error ? error.message : "Erreur inconnue" },
    };
  }
}

export async function createWordDocumentStep(
  input: CreateWordDocumentInput
): Promise<FileResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
createWordDocumentStep.maxRetries = 0;

export const _integrationType = "office365";
