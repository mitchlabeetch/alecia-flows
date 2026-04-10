import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { Office365Credentials } from "../credentials";
import { getToken } from "../lib/get-token";

type AddRowResult =
  | { success: true; data: { rowIndex: number } }
  | { success: false; error: { message: string } };

type RowResponse = { index: number };

export type AddExcelRowCoreInput = {
  fileId: string;
  worksheetName?: string;
  tableName?: string;
  rowData: string;
};

export type AddExcelRowInput = StepInput &
  AddExcelRowCoreInput & { integrationId?: string };

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
    const tableName = input.tableName || "Table1";

    let parsedRow: unknown[];
    try {
      parsedRow = JSON.parse(input.rowData) as unknown[];
    } catch {
      parsedRow = input.rowData.split(",").map((v) => v.trim());
    }

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/items/${input.fileId}/workbook/worksheets/${worksheetName}/tables/${tableName}/rows`,
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
