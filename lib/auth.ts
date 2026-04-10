import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous, genericOAuth } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { isAiGatewayManagedKeysEnabled } from "./ai-gateway/config";
import { db } from "./db";
import {
  accounts,
  apiKeys,
  integrations,
  sessions,
  users,
  verifications,
  workflowExecutions,
  workflows,
} from "./db/schema";
import { logger } from "./logger";

// Construct schema object for drizzle adapter
const schema = {
  user: users,
  session: sessions,
  account: accounts,
  verification: verifications,
};

// Determine the base URL for authentication
// This supports Vercel Preview deployments with dynamic URLs
function getBaseURL() {
  // Priority 1: Explicit BETTER_AUTH_URL (set manually for production/dev)
  if (process.env.BETTER_AUTH_URL) {
    return process.env.BETTER_AUTH_URL;
  }

  // Priority 2: NEXT_PUBLIC_APP_URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Priority 3: Check if we're on Vercel (for preview deployments)
  if (process.env.VERCEL_URL) {
    // VERCEL_URL doesn't include protocol, so add it
    // Use https for Vercel deployments (both production and preview)
    return `https://${process.env.VERCEL_URL}`;
  }

  // Fallback: Local development
  return "http://localhost:3000";
}

// Build plugins array conditionally
const plugins = [
  anonymous({
    async onLinkAccount(data) {
      // When an anonymous user links to a real account, migrate their data
      const fromUserId = data.anonymousUser.user.id;
      const toUserId = data.newUser.user.id;

      logger.info("[Anonymous Migration] Starting account link migration", {
        fromUserId,
        toUserId,
      });

      try {
        // Migrate workflows
        await db
          .update(workflows)
          .set({ userId: toUserId })
          .where(eq(workflows.userId, fromUserId));

        // Migrate workflow executions
        await db
          .update(workflowExecutions)
          .set({ userId: toUserId })
          .where(eq(workflowExecutions.userId, fromUserId));

        // Migrate integrations
        await db
          .update(integrations)
          .set({ userId: toUserId })
          .where(eq(integrations.userId, fromUserId));

        await db
          .update(apiKeys)
          .set({ userId: toUserId })
          .where(eq(apiKeys.userId, fromUserId));

        logger.info("[Anonymous Migration] Completed account link migration", {
          fromUserId,
          toUserId,
        });
      } catch (error) {
        logger.error(
          "[Anonymous Migration] Failed to migrate linked account data",
          {
            fromUserId,
            toUserId,
            error,
          }
        );
        throw error;
      }
    },
  }),
  ...(process.env.VERCEL_CLIENT_ID
    ? [
        genericOAuth({
          config: [
            {
              providerId: "vercel",
              clientId: process.env.VERCEL_CLIENT_ID,
              clientSecret: process.env.VERCEL_CLIENT_SECRET || "",
              authorizationUrl: "https://vercel.com/oauth/authorize",
              tokenUrl: "https://api.vercel.com/login/oauth/token",
              userInfoUrl: "https://api.vercel.com/login/oauth/userinfo",
              // Include read-write:team scope when AI Gateway User Keys is enabled
              // This grants APIKey and APIKeyAiGateway permissions for creating user keys
              scopes: isAiGatewayManagedKeysEnabled()
                ? ["openid", "email", "profile", "read-write:team"]
                : ["openid", "email", "profile"],
              discoveryUrl: undefined,
              pkce: true,
              getUserInfo: async (tokens) => {
                const response = await fetch(
                  "https://api.vercel.com/login/oauth/userinfo",
                  {
                    headers: {
                      Authorization: `Bearer ${tokens.accessToken}`,
                    },
                  }
                );
                const profile = await response.json();
                return {
                  id: profile.sub,
                  email: profile.email,
                  name: profile.name ?? profile.preferred_username,
                  emailVerified: profile.email_verified ?? true,
                  image: profile.picture,
                };
              },
            },
          ],
        }),
      ]
    : []),
];

export const auth = betterAuth({
  baseURL: getBaseURL(),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      enabled: !!process.env.GITHUB_CLIENT_ID,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      enabled: !!process.env.GOOGLE_CLIENT_ID,
    },
  },
  plugins,
});
