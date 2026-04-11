type EnvValidationResult = {
  valid: boolean;
  missing: string[];
};

export function validateRequiredEnvVars(): EnvValidationResult {
  const required = ["DATABASE_URL", "BETTER_AUTH_SECRET"];
  const optional = ["AI_GATEWAY_API_KEY", "BETTER_AUTH_URL", "ENCRYPTION_KEY"];

  const missing = required.filter((key) => !process.env[key]);

  for (const key of optional) {
    if (!process.env[key]) {
      console.warn(`[env] Optional environment variable not set: ${key}`);
    }
  }

  if (missing.length > 0) {
    console.error(
      `[env] Missing required environment variables: ${missing.join(", ")}`
    );
  }

  return { valid: missing.length === 0, missing };
}
