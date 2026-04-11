const REQUIRED_ENV_VARS = ["DATABASE_URL", "BETTER_AUTH_SECRET"];
const OPTIONAL_ENV_VARS = [
  "AI_GATEWAY_API_KEY",
  "BETTER_AUTH_URL",
  "ENCRYPTION_KEY",
];

export function validateRequiredEnvVars(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  for (const key of OPTIONAL_ENV_VARS) {
    if (!process.env[key]) {
      console.warn(`[env] Optional environment variable not set: ${key}`);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[env] Missing required environment variables: ${missing.join(", ")}. Set these before starting the application.`
    );
  }
}
