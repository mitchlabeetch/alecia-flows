import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { Office365Credentials } from "../credentials";
import { getToken } from "../lib/get-token";

type FileResult =
  | { success: true; data: { id: string; name: string; webUrl: string } }
  | { success: false; error: { message: string } };

type DriveItem = { id: string; name: string; webUrl: string };

export type CreateExcelWorkbookCoreInput = {
  fileName: string;
  folderPath?: string;
};

export type CreateExcelWorkbookInput = StepInput &
  CreateExcelWorkbookCoreInput & { integrationId?: string };

async function stepHandler(
  input: CreateExcelWorkbookCoreInput,
  credentials: Office365Credentials
): Promise<FileResult> {
  const { OFFICE365_TENANT_ID: tenantId } = credentials;
  if (!tenantId) {
    return { success: false, error: { message: "Credentials Office 365 manquantes" } };
  }

  try {
    const token = await getToken(credentials);
    const name = input.fileName.endsWith(".xlsx") ? input.fileName : `${input.fileName}.xlsx`;
    const path = input.folderPath ? `${input.folderPath}/${name}` : `/${name}`;

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/root:${path}:/content`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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

export async function createExcelWorkbookStep(
  input: CreateExcelWorkbookInput
): Promise<FileResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
createExcelWorkbookStep.maxRetries = 0;

export const _integrationType = "office365";
