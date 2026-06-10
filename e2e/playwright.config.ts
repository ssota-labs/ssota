import { defineConfig, devices } from "@playwright/test";

const webPort = process.env.WEB_PORT ?? "3100";
const mcpPort = process.env.MCP_PORT ?? "3101";
const webUrl = process.env.WEB_URL ?? `http://127.0.0.1:${webPort}`;
const mcpUrl = process.env.MCP_URL ?? `http://127.0.0.1:${mcpPort}`;

process.env.MCP_URL ??= mcpUrl;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: webUrl,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `pnpm --filter web exec next dev --port ${webPort}`,
      url: webUrl,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        PORT: webPort,
      },
    },
    {
      command: `pnpm --filter mcp exec next dev --port ${mcpPort}`,
      url: mcpUrl,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        PORT: mcpPort,
      },
    },
  ],
});
