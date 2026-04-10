export async function testNotion(
  credentials: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const { NOTION_API_KEY: apiKey } = credentials;

  if (!apiKey) {
    return { success: false, error: "Clé API Notion requise" };
  }

  try {
    const response = await fetch("https://api.notion.com/v1/users/me", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Notion-Version": "2022-06-28",
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Erreur d'authentification: ${response.status}`,
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
