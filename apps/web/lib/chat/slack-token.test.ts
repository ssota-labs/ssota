import { beforeEach, describe, expect, it, vi } from "vitest";

const listScopes = vi.fn();
const resolveWorkspace = vi.fn();
const listWorkspaces = vi.fn();
const getAccount = vi.fn();
const getToken = vi.fn();

vi.mock("@ssota/adapter-postgres", () => ({
  createAccountConnectionPort: () => ({
    listConnectCredentialScopes: listScopes,
  }),
  createChatWorkspacePort: () => ({
    resolve: resolveWorkspace,
    list: listWorkspaces,
  }),
}));

vi.mock("@ssota/agent-runtime", () => ({
  getDb: () => ({}),
  createVercelConnectProvider: () => ({
    getToken,
  }),
}));

vi.mock("@/lib/ports", () => ({
  getOrCreateProjectAccount: getAccount,
}));

describe("getSlackBotTokenForInstallation", () => {
  beforeEach(() => {
    vi.resetModules();
    listScopes.mockReset();
    resolveWorkspace.mockReset();
    listWorkspaces.mockReset();
    getAccount.mockReset();
    getToken.mockReset();
    delete process.env.SLACK_CONNECT;
    delete process.env.SLACK_BOT_TOKEN;
    delete process.env.CHAT_PROJECT_ID;
    process.env.SLACK_CONNECT_CONNECTOR = "slack/wrong-default";
    getAccount.mockResolvedValue({ id: "acct-fallback" });
    getToken.mockResolvedValue({ token: "xoxb-minted" });
  });

  it("uses account_connections connector for the linked workspace", async () => {
    resolveWorkspace.mockResolvedValue({
      teamspaceId: "teamspace-1",
      accountId: "acct-1",
    });
    listScopes.mockResolvedValue([
      {
        connector: "slack/ssota",
        installationId: "T0914DV7GA0",
        tenantId: "T0914DV7GA0",
        subjectUserId: null,
        installationName: "SSOTA Labs",
      },
    ]);

    const { getSlackBotTokenForInstallation } = await import("./slack-token");
    const token = await getSlackBotTokenForInstallation("T0914DV7GA0");

    expect(token).toBe("xoxb-minted");
    expect(getToken).toHaveBeenCalledWith("slack/ssota", {
      teamspaceId: "teamspace-1",
      accountId: "acct-1",
      installationId: "T0914DV7GA0",
    });
  });

  it("falls back to CHAT_PROJECT_ID when workspace is not linked", async () => {
    resolveWorkspace.mockResolvedValue(null);
    process.env.CHAT_PROJECT_ID = "teamspace-fallback";
    listScopes.mockResolvedValue([
      {
        connector: "slack/ssota",
        installationId: "T0914DV7GA0",
        tenantId: "T0914DV7GA0",
        subjectUserId: null,
        installationName: "SSOTA Labs",
      },
    ]);

    const { getSlackBotTokenForInstallation } = await import("./slack-token");
    const token = await getSlackBotTokenForInstallation("T0914DV7GA0");

    expect(token).toBe("xoxb-minted");
    expect(getAccount).toHaveBeenCalledWith("teamspace-fallback");
    expect(getToken).toHaveBeenCalledWith("slack/ssota", {
      teamspaceId: "teamspace-fallback",
      accountId: "acct-fallback",
      installationId: "T0914DV7GA0",
    });
  });
});
