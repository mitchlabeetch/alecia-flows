import "server-only";

import type { Office365Credentials } from "../credentials";

type TokenResponse = { access_token: string };

/**
 * Obtain an OAuth2 client-credentials access token for Microsoft Graph API.
 * Throws an error if the token request fails.
 */
export async function getToken(credentials: Office365Credentials): Promise<string> {
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

  if (!response.ok) {
    throw new Error(`Authentification Microsoft échouée: ${response.status}`);
  }

  const data = (await response.json()) as TokenResponse;

  if (!data.access_token) {
    throw new Error("Aucun token renvoyé par Microsoft");
  }

  return data.access_token;
}
