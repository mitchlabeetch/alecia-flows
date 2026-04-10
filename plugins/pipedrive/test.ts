export async function testPipedrive(
  credentials: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const { PIPEDRIVE_API_KEY: apiKey, PIPEDRIVE_COMPANY_DOMAIN: companyDomain } =
    credentials;

  if (!apiKey) {
    return { success: false, error: "Clé API requise" };
  }

  const domain = companyDomain || "api";

  try {
    const response = await fetch(
      `https://${domain}.pipedrive.com/api/v1/users/me?api_token=${apiKey}`
    );

    if (!response.ok) {
      return {
        success: false,
        error: `Erreur d'authentification: ${response.status}`,
      };
    }

    const data = (await response.json()) as { success: boolean; error?: string };
    if (!data.success) {
      return {
        success: false,
        error: data.error || "Authentification échouée",
      };
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
