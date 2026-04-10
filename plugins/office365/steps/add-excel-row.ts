import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { Office365Credentials } from "../credentials";

type AddRowResult =
  | { success: true; data: { rowIndex: number } }
  | { success: false; error: { message: string } };

type TokenResponse = { access_token: string };
type RowResponse = { index: number };

export type AddExcelRowCoreInput = {
  fileId: string;
  worksheetName?: string;
  rowData: string;
};

export type AddExcelRowInput = StepInput &
  AddExcelRowCoreInput & { integrationId?: string };

async function getToken(credentials: Office365Credentials): Promise<string> {
  const {
    OFFICE365_TENANT_ID: tenantId,
    OFFICE365_CLIENT_ID: clientId,
    OFFICE365_CLIENT_SECRET: clientSecret,
  } = credentials;
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
  input: AddExcelRowCoreInput,
  credentials: Office365Credentials
): Promise<AddRowResult> {
  const { OFFICE365_TENANT_ID: tenantId } = credentials;
  if (!tenantId) {
    return { success: false, error: { message: "Credentials Office 365 manquantes" } };
  }

  try {
    const token = await getToken(credentials);
    const worksheetName = input.worksheetName || "Feuil1";

    let parsedRow: unknown[];
    try {
      parsedRow = JSON.parse(input.rowData) as unknown[];
    } catch {
      parsedRow = input.rowData.split(",").map((v) => v.trim());
    }

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/items/${input.fileId}/workbook/worksheets/${worksheetName}/tables/Table1/rows`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: [parsedRow] }),
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: { message: `Erreur Microsoft Graph: ${response.status}` },
      };
    }

    const data = (await response.json()) as RowResponse;
    return { success: true, data: { rowIndex: data.index } };
  } catch (error) {
    return {
      success: false,
      error: { message: error instanceof Error ? error.message : "Erreur inconnue" },
    };
  }
}

export async function addExcelRowStep(
  input: AddExcelRowInput
): Promise<AddRowResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
addExcelRowStep.maxRetries = 0;

export const _integrationType = "office365";
