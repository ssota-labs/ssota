import { defineConfig, devices } from "@playwright/test";

const webPort = process.env.WEB_PORT ?? "3100";
const mcpPort = process.env.MCP_PORT ?? "3101";
const webUrl = process.env.WEB_URL ?? `http://127.0.0.1:${webPort}`;
const mcpUrl = process.env.MCP_URL ?? `http://127.0.0.1:${mcpPort}`;

process.env.MCP_URL ??= mcpUrl;

const defaultSupabaseEnv = {
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
};

export default defineConfig({
  testDir: "./tests",
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
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `pnpm --filter web exec next dev --port ${webPort}`,
      url: webUrl,
      reuseExistingServer: !!process.env.REUSE_SERVERS,
      timeout: 120_000,
      env: {
        ...process.env,
        ...defaultSupabaseEnv,
        PORT: webPort,
      },
    },
    {
      command: `pnpm --filter mcp exec next dev --port ${mcpPort}`,
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
