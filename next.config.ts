import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";
import { validateRequiredEnvVars } from "./lib/env-validation";

// Skip validation during test runs
if (process.env.NODE_ENV !== "test") {
  validateRequiredEnvVars();
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default withWorkflow(nextConfig);
