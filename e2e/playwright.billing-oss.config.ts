import baseConfig from "./playwright.config";

/**
 * OSS billing specs only (BILLING=none). Inherits video/trace/screenshot from base config.
 */
export default {
  ...baseConfig,
  testMatch: "**/billing/**/*.spec.ts",
  testIgnore: undefined,
  outputDir: "./report/billing-oss-results",
  reporter: [
    ["list"],
    ["html", { outputFolder: "./report/billing-oss-html", open: "never" }],
    ["json", { outputFile: "./report/billing-oss-results.json" }],
  ],
};
