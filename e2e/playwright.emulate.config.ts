import { defineConfig, devices } from "@playwright/test";
import { withWebDeps } from "./web-server-command";

// Emulate OAuth E2E: real Slack OAuth picker via vercel-labs/emulate, no CONNECT_STUB.
const webPort = process.env.WEB_PORT ?? "3100";
const webUrl = process.env.WEB_URL ?? `http://localhost:${webPort}`;
const workspaceRoot = process.env.WORKSPACE_ROOT ?? `${process.cwd()}/..`;

const env = {
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
  CONNECT_STUB: "0",
  EMULATE_ENABLED: "1",
  EMULATE_OAUTH: "1",
  STUB_MODEL: "1",
  EMULATE_SLACK_URL: "http://127.0.0.1:4003",
  EMULATE_SLACK_SIGNING_SECRET: "ssota-emulate-test-secret",
  CHAT_PROJECT_ID: "ac26abf1-2503-4ea3-b73e-5a05461874ab",
  EMULATE_GITHUB_URL: "http://127.0.0.1:4001",
  EMULATE_LINEAR_URL: "http://127.0.0.1:4012",
  MCP_STUB: "1",
  JOB_RUNNER: "inline",
  CREDENTIALS: "own-app",
  SLACK_BOT_TOKEN: "xoxb-local-test",
  SLACK_SIGNING_SECRET: "ssota-emulate-test-secret",
  SLACK_API_URL: "http://127.0.0.1:4003/api/",
  SLACK_CONNECT: "0",
  SLACK_CONNECT_INTAKE: "0",
  CONNECTOR_SLACK_DEV_TOKEN: "xoxb-local-test",
  SLACK_CONNECT_CONNECTOR: "slack/dev",
  NOTION_CONNECT_CONNECTOR: "notion/dev",
  GITHUB_CONNECT_CONNECTOR: "github/dev",
  DISCORD_CONNECT_CONNECTOR: "discord/dev",
  LINEAR_CONNECT_CONNECTOR: "linear/dev",
};

export default defineConfig({
  testDir: "./tests",
  testMatch: /emulate-slack.*\.spec\.ts/,
  globalSetup: "./global-setup.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  outputDir: "./report/emulate-results",
  reporter: [["list"]],
  use: { baseURL: webUrl, trace: "on", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node scripts/emulate-dev.mjs",
      cwd: workspaceRoot,
      url: "http://127.0.0.1:4003",
      reuseExistingServer: !!process.env.REUSE_SERVERS,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: withWebDeps(`pnpm --filter web exec next dev --port ${webPort}`),
      cwd: workspaceRoot,
      url: webUrl,
      reuseExistingServer: !!process.env.REUSE_SERVERS,
      timeout: 180_000,
      env: { ...process.env, ...env, PORT: webPort },
    },
  ],
});
