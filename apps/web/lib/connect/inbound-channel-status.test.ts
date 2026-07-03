import { describe, expect, it, vi, beforeEach } from "vitest";

const listScopes = vi.fn();
const listWorkspaces = vi.fn();
const getAccount = vi.fn();

vi.mock("@ssota/adapter-postgres", () => ({
  createAccountConnectionPort: () => ({
    listConnectCredentialScopes: listScopes,
  }),
}));

vi.mock("@ssota/agent-runtime", () => ({
  getDb: () => ({}),
}));

vi.mock("@/lib/ports", () => ({
  getOrCreateProjectAccount: getAccount,
  getChatWorkspacePort: () => ({ list: listWorkspaces }),
}));

describe("loadInboundChannelStatus", () => {
  beforeEach(() => {
    vi.resetModules();
    listScopes.mockReset();
    listWorkspaces.mockReset();
    getAccount.mockReset();
    delete process.env.SLACK_CONNECT;
    delete process.env.SLACK_BOT_TOKEN;
    process.env.SLACK_CONNECT_CONNECTOR = "slack/ssota";
    process.env.DISCORD_CONNECT_CONNECTOR = "discord/ssota";
    getAccount.mockResolvedValue({ id: "acct-1" });
  });

  it("marks Slack ready when credential and workspace link exist", async () => {
    listScopes.mockResolvedValue([
      { connector: "slack/ssota", installationId: "T123", tenantId: "T123" },
    ]);
    listWorkspaces.mockResolvedValue([
      {
        id: "cw-1",
        platform: "slack",
        workspaceKey: "T123",
        name: "Acme",
      },
    ]);

    const { loadInboundChannelStatus } = await import("./inbound-channel-status");
    const statuses = await loadInboundChannelStatus("teamspace-1");
    const slack = statuses.find((row) => row.platform === "slack");

    expect(slack?.credentialConnected).toBe(true);
    expect(slack?.workspaceLinked).toBe(true);
    expect(slack?.ready).toBe(true);
    expect(slack?.workspaceKey).toBe("T123");
  });

  it("marks Slack credential connected but not ready without workspace link", async () => {
    listScopes.mockResolvedValue([
      { connector: "slack/ssota", installationId: "T123", tenantId: "T123" },
    ]);
    listWorkspaces.mockResolvedValue([]);

    const { loadInboundChannelStatus } = await import("./inbound-channel-status");
    const slack = (await loadInboundChannelStatus("teamspace-1")).find(
      (row) => row.platform === "slack",
    );

    expect(slack?.credentialConnected).toBe(true);
    expect(slack?.workspaceLinked).toBe(false);
    expect(slack?.ready).toBe(false);
  });
});
