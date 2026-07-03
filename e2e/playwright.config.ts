import { defineConfig, devices } from "@playwright/test";
import { chatStubWebEnv } from "./chat-stub-env";
import { withWebDeps } from "./web-server-command";

const webPort = process.env.WEB_PORT ?? "3100";
const mcpPort = process.env.MCP_PORT ?? "3101";
const designLabPort = process.env.DESIGN_LAB_PORT ?? "6107";
// Use localhost consistently: connect OAuth derives redirect origin from the
// request host; browser cookies must match redirect targets.
const webUrl = process.env.WEB_URL ?? `http://localhost:${webPort}`;
const mcpUrl = process.env.MCP_URL ?? `http://127.0.0.1:${mcpPort}`;
const designLabUrl =
  process.env.DESIGN_LAB_URL ?? `http://127.0.0.1:${designLabPort}`;

process.env.MCP_URL ??= mcpUrl;
process.env.DATABASE_URL ??=
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const defaultSupabaseEnv = {
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
  SUPABASE_URL: process.env.SUPABASE_URL ?? "http://127.0.0.1:54321",
  SUPABASE_SERVICE_ROLE_KEY:
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
};

export default defineConfig({
  testDir: "./tests",
  testIgnore: "**/billing-stripe/**",
  globalSetup: "./global-setup.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  outputDir: "./report/test-results",
  reporter: [
    ["list"],
    ["html", { outputFolder: "./report/html", open: "never" }],
    ["json", { outputFile: "./report/results.json" }],
  ],
  use: {
    baseURL: webUrl,
    trace: "on",
    screenshot: "on",
    video: "on",
  },
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    },
  },
  snapshotPathTemplate:
    "{testDir}/../design-lab/snapshots/{testFilePath}/{arg}{ext}",
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
        ...chatStubWebEnv,
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
    {
      command: `pnpm --filter design-lab exec vite --port ${designLabPort} --host 127.0.0.1`,
      url: designLabUrl,
      reuseExistingServer: !!process.env.REUSE_SERVERS,
      timeout: 120_000,
    },
  ],
});
