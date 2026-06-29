/** Shared web-server env for chat + connections Playwright suites. */
export const chatStubWebEnv = {
  BILLING: "none",
  CONNECT_STUB: "1",
  MCP_STUB: "1",
  STUB_MODEL: "1",
  JOB_RUNNER: "inline",
  CONNECTOR_LINEAR_DEV_TOKEN: "stub-linear-token",
  SLACK_CONNECT_CONNECTOR: "slack/dev",
  NOTION_CONNECT_CONNECTOR: "notion/dev",
  GITHUB_CONNECT_CONNECTOR: "github/dev",
  DISCORD_CONNECT_CONNECTOR: "discord/dev",
  LINEAR_CONNECT_CONNECTOR: "linear/dev",
} as const;
