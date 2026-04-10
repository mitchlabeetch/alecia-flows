async function getAccessToken(credentials: Record<string, string>): Promise<string> {
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
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Authentification échouée: ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

export async function testOffice365(
  credentials: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const {
    OFFICE365_TENANT_ID: tenantId,
    OFFICE365_CLIENT_ID: clientId,
    OFFICE365_CLIENT_SECRET: clientSecret,
  } = credentials;

  if (!tenantId || !clientId || !clientSecret) {
    return { success: false, error: "Tous les champs sont requis" };
  }

  try {
    const token = await getAccessToken(credentials);

    const response = await fetch(
      "https://graph.microsoft.com/v1.0/organization",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      return { success: false, error: `Erreur API: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erreur de connexion",
    };
  }
}
