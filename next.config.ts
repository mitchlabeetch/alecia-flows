import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";
import { validateRequiredEnvVars } from "./lib/env-validation";

validateRequiredEnvVars();

const nextConfig: NextConfig = {
  /* config options here */
};

export default withWorkflow(nextConfig);
