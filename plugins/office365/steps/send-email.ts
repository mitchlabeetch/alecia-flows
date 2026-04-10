import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { Office365Credentials } from "../credentials";

type SendEmailResult =
  | { success: true; data: { messageId: string } }
  | { success: false; error: { message: string } };

type TokenResponse = { access_token: string };

export type SendOutlookEmailCoreInput = {
  to: string;
  subject: string;
  body: string;
  cc?: string;
};

export type SendOutlookEmailInput = StepInput &
  SendOutlookEmailCoreInput & { integrationId?: string };

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
  input: SendOutlookEmailCoreInput,
  credentials: Office365Credentials
): Promise<SendEmailResult> {
  const { OFFICE365_TENANT_ID: tenantId } = credentials;
  if (!tenantId) {
    return {
      success: false,
      error: { message: "Credentials Office 365 manquantes" },
    };
  }

  try {
    const token = await getToken(credentials);

    const toRecipients = input.to.split(",").map((email) => ({
      emailAddress: { address: email.trim() },
    }));

    const ccRecipients = input.cc
      ? input.cc
          .split(",")
          .map((email) => ({ emailAddress: { address: email.trim() } }))
      : [];

    const message: Record<string, unknown> = {
      subject: input.subject,
      body: { contentType: "text", content: input.body },
      toRecipients,
    };

    if (ccRecipients.length > 0) {
      message.ccRecipients = ccRecipients;
    }

    const response = await fetch(
      "https://graph.microsoft.com/v1.0/me/sendMail",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: { message: `Erreur Microsoft Graph: ${response.status}` },
      };
    }

    return { success: true, data: { messageId: "sent" } };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : "Erreur inconnue",
      },
    };
  }
}

export async function sendOutlookEmailStep(
  input: SendOutlookEmailInput
): Promise<SendEmailResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
sendOutlookEmailStep.maxRetries = 0;

export const _integrationType = "office365";
