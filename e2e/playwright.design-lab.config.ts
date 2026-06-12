import { defineConfig, devices } from "@playwright/test";

const designLabPort = process.env.DESIGN_LAB_PORT ?? "6107";
const designLabUrl =
  process.env.DESIGN_LAB_URL ?? `http://127.0.0.1:${designLabPort}`;

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/design-lab-visual.spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  outputDir: "./report/design-lab-test-results",
  snapshotPathTemplate:
    "{testDir}/../design-lab/snapshots/{testFilePath}/{arg}{ext}",
  reporter: [
    ["list"],
    ["html", { outputFolder: "./report/design-lab-html", open: "never" }],
  ],
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    },
  },
  use: {
    baseURL: designLabUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm --filter design-lab exec vite --port ${designLabPort} --host 127.0.0.1`,
    url: designLabUrl,
    reuseExistingServer: !!process.env.REUSE_SERVERS,
    timeout: 120_000,
  },
});
