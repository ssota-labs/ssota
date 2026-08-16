import { defineConfig, devices } from "@playwright/test";
import { chatStubWebEnv } from "./chat-stub-env";
import { playwrightMediaUse } from "./playwright-media";
import { withWebDeps } from "./web-server-command";

// Focused config for the chat + connections e2e: only the web server, with the
// local dev stubs enabled (CONNECT_STUB, STUB_MODEL) and connector env set so
// the Connections page offers real Connect links.
const webPort = process.env.WEB_PORT ?? "3100";
// Use localhost (not 127.0.0.1) consistently: the connect routes derive their
// redirect origin from the request host, so the browser, cookies, and redirect
// targets must all agree on one host or the session is dropped on the bounce.
const webUrl = process.env.WEB_URL ?? `http://localhost:${webPort}`;

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
  ...chatStubWebEnv,
};

export default defineConfig({
  testDir: "./tests",
  testMatch: "chat-connections.spec.ts",
  globalSetup: "./global-setup.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  outputDir: "./report/chat-results",
  reporter: [["list"]],
  use: { baseURL: webUrl, ...playwrightMediaUse },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: withWebDeps(`pnpm --filter web exec next dev --port ${webPort}`),
      url: webUrl,
      reuseExistingServer: !!process.env.REUSE_SERVERS,
      timeout: 180_000,
      env: { ...process.env, ...env, PORT: webPort },
    },
  ],
});
