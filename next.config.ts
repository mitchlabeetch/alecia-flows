import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withWorkflow } from "workflow/next";
import { validateRequiredEnvVars } from "./lib/env-validation";

// Skip validation during test runs
if (process.env.NODE_ENV !== "test") {
  validateRequiredEnvVars();
}

const nextConfig: NextConfig = {
  /* config options here */
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(withWorkflow(nextConfig));
