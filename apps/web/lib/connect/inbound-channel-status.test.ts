import { describe, expect, it, vi, beforeEach } from "vitest";

const listConnections = vi.fn();
const listWorkspaces = vi.fn();
const getAccount = vi.fn();

vi.mock("@ssota/adapter-postgres", () => ({
  createAccountConnectionPort: () => ({
    list: listConnections,
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
    listConnections.mockReset();
    listWorkspaces.mockReset();
    getAccount.mockReset();
    delete process.env.SLACK_CONNECT;
    delete process.env.SLACK_BOT_TOKEN;
    process.env.SLACK_CONNECT_CONNECTOR = "slack/ssota";
    process.env.DISCORD_CONNECT_CONNECTOR = "discord/ssota";
    getAccount.mockResolvedValue({ id: "acct-1" });
  });

  it("marks Slack ready when credential and workspace link exist", async () => {
    listConnections.mockResolvedValue([
      {
        id: "conn-1",
        connector: "slack/ssota",
        installationId: "T123",
        tenantId: "T123",
        name: "Acme",
        subjectUserId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    listWorkspaces.mockResolvedValue([
      {
        id: "cw-1",
        platform: "slack",
        workspaceKey: "T123",
        name: "Acme",
        accountId: null,
      },
    ]);

    const { loadInboundChannelStatus } = await import("./inbound-channel-status");
    const statuses = await loadInboundChannelStatus("teamspace-1");
    const slack = statuses.find((row) => row.platform === "slack");

    expect(slack?.credentialConnected).toBe(true);
    expect(slack?.workspaceLinked).toBe(true);
    expect(slack?.ready).toBe(true);
    expect(slack?.workspaceKey).toBe("T123");
    expect(slack?.workspaces).toHaveLength(1);
    expect(slack?.workspaces[0]).toMatchObject({
      id: "cw-1",
      workspaceKey: "T123",
      connectionId: "conn-1",
      status: "linked",
    });
  });

  it("marks Slack credential connected but not ready without workspace link", async () => {
    listConnections.mockResolvedValue([
      {
        id: "conn-1",
        connector: "slack/ssota",
        installationId: "T123",
        tenantId: "T123",
        name: "Acme",
        subjectUserId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    listWorkspaces.mockResolvedValue([]);

    const { loadInboundChannelStatus } = await import("./inbound-channel-status");
    const slack = (await loadInboundChannelStatus("teamspace-1")).find(
      (row) => row.platform === "slack",
    );

    expect(slack?.credentialConnected).toBe(true);
    expect(slack?.workspaceLinked).toBe(false);
    expect(slack?.ready).toBe(false);
    expect(slack?.workspaces).toHaveLength(1);
    expect(slack?.workspaces[0]?.status).toBe("credential_only");
  });

  it("lists multiple linked Slack workspaces", async () => {
    listConnections.mockResolvedValue([
      {
        id: "conn-1",
        connector: "slack/ssota",
        installationId: "T123",
        tenantId: "T123",
        name: "Acme",
        subjectUserId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "conn-2",
        connector: "slack/ssota",
        installationId: "T456",
        tenantId: "T456",
        name: "Beta",
        subjectUserId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    listWorkspaces.mockResolvedValue([
      {
        id: "cw-1",
        platform: "slack",
        workspaceKey: "T123",
        name: "Acme",
        accountId: null,
      },
      {
        id: "cw-2",
        platform: "slack",
        workspaceKey: "T456",
        name: "Beta",
        accountId: null,
      },
    ]);

    const { loadInboundChannelStatus } = await import("./inbound-channel-status");
    const slack = (await loadInboundChannelStatus("teamspace-1")).find(
      (row) => row.platform === "slack",
    );

    expect(slack?.workspaces).toHaveLength(2);
    expect(slack?.ready).toBe(true);
  });
});
