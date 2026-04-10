export async function testV0(credentials: Record<string, string>) {
  try {
    const apiKey = credentials.V0_API_KEY;
    const { getV0User } = await import("./api");

    if (!apiKey) {
      return {
        success: false,
        error: "API key is required",
      };
    }

    // Test the API key by making a request to get user info
    await getV0User(apiKey);

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
