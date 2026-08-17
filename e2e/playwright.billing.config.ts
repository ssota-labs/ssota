import { LOCAL_SUPABASE_DEMO_ANON_KEY } from "./helpers/local-supabase";
import { defineConfig, devices } from "@playwright/test";
import { chatStubWebEnv } from "./chat-stub-env";
import { E2E_STRIPE_WEBHOOK_SECRET } from "./helpers/billing";
import { playwrightMediaUse } from "./playwright-media";
import { withWebDeps } from "./web-server-command";

const webPort = process.env.WEB_PORT ?? "3100";
const mcpPort = process.env.MCP_PORT ?? "3101";
const webUrl = process.env.WEB_URL ?? `http://localhost:${webPort}`;
const mcpUrl = process.env.MCP_URL ?? `http://127.0.0.1:${mcpPort}`;

const defaultSupabaseEnv = {
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    LOCAL_SUPABASE_DEMO_ANON_KEY,
  SUPABASE_URL: process.env.SUPABASE_URL ?? "http://127.0.0.1:54321",
  SUPABASE_SERVICE_ROLE_KEY:
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
};

/** Stripe-mode web env for billing gate + webhook API specs. */
const billingStripeWebEnv = {
  ...chatStubWebEnv,
  BILLING: "stripe",
  STRIPE_SECRET_KEY:
    process.env.STRIPE_SECRET_KEY ??
    "sk_test_e2e000000000000000000000000000000000000000000000000000000000000",
  STRIPE_WEBHOOK_SECRET: E2E_STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_STARTER: process.env.STRIPE_PRICE_STARTER ?? "price_starter_e2e",
  STRIPE_PRICE_BUSINESS: process.env.STRIPE_PRICE_BUSINESS ?? "price_business_e2e",
  STRIPE_TRIAL_DAYS: process.env.STRIPE_TRIAL_DAYS ?? "0",
};

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/billing-stripe/**/*.spec.ts",
  globalSetup: "./global-setup.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  outputDir: "./report/billing-stripe-results",
  reporter: [
    ["list"],
    ["html", { outputFolder: "./report/billing-stripe-html", open: "never" }],
    ["json", { outputFile: "./report/billing-stripe-results.json" }],
  ],
  use: {
    baseURL: webUrl,
    ...playwrightMediaUse,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: withWebDeps(`pnpm --filter web exec next dev --port ${webPort}`),
      url: webUrl,
      reuseExistingServer: !!process.env.REUSE_SERVERS,
      timeout: 120_000,
      env: {
        ...process.env,
        ...defaultSupabaseEnv,
        ...billingStripeWebEnv,
        MARKETING_ONLY: "false",
        PORT: webPort,
      },
    },
    {
      command: withWebDeps(`pnpm --filter mcp exec next dev --port ${mcpPort}`),
      url: mcpUrl,
      reuseExistingServer: !!process.env.REUSE_SERVERS,
      timeout: 120_000,
      env: {
        ...process.env,
        ...defaultSupabaseEnv,
        PORT: mcpPort,
      },
    },
  ],
});
