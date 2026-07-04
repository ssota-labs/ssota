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

vi.mock("@ssota/agent-runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@ssota/agent-runtime")>();
  return {
    ...actual,
    getDb: () => ({}),
    createVercelConnectProvider: () => ({
      getToken,
    }),
    probeSlackToken: vi.fn(),
  };
});

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
    getToken.mockResolvedValue(null);
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
    getToken.mockResolvedValueOnce({ token: "xoxb-minted" });

    const { getSlackBotTokenForInstallation } = await import("./slack-token");
    const token = await getSlackBotTokenForInstallation("T0914DV7GA0");

    expect(token).toBe("xoxb-minted");
    expect(getToken).toHaveBeenCalledTimes(1);
    expect(getToken).toHaveBeenCalledWith("slack/ssota", {
      teamspaceId: "teamspace-1",
      accountId: "acct-1",
      installationId: "T0914DV7GA0",
      connectPurpose: "inbound",
    });
  });

  it("rejects user token fallback and returns null when only xoxp is available", async () => {
    resolveWorkspace.mockResolvedValue({
      teamspaceId: "teamspace-1",
      accountId: "acct-1",
    });
    listScopes.mockResolvedValue([
      {
        connector: "slack/ssota",
        installationId: "T0914DV7GA0",
        tenantId: "T0914DV7GA0",
        subjectUserId: "user-who-connected",
        installationName: "SSOTA Labs",
      },
    ]);
    getToken.mockResolvedValueOnce({ token: "xoxp-user-only" });

    const { getSlackBotTokenForInstallation } = await import("./slack-token");
    const token = await getSlackBotTokenForInstallation("T0914DV7GA0");

    expect(token).toBeNull();
    expect(getToken).toHaveBeenCalledTimes(1);
    expect(getToken).toHaveBeenCalledWith("slack/ssota", {
      teamspaceId: "teamspace-1",
      accountId: "acct-1",
      installationId: "T0914DV7GA0",
      connectPurpose: "inbound",
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
    getToken.mockResolvedValueOnce({ token: "xoxb-minted" });

    const { getSlackBotTokenForInstallation } = await import("./slack-token");
    const token = await getSlackBotTokenForInstallation("T0914DV7GA0");

    expect(token).toBe("xoxb-minted");
    expect(getAccount).toHaveBeenCalledWith("teamspace-fallback");
    expect(getToken).toHaveBeenCalledWith("slack/ssota", {
      teamspaceId: "teamspace-fallback",
      accountId: "acct-fallback",
      installationId: "T0914DV7GA0",
      connectPurpose: "inbound",
    });
  });

  it("does not cache user subject when user token is rejected", async () => {
    resolveWorkspace.mockResolvedValue({
      teamspaceId: "teamspace-1",
      accountId: "acct-1",
    });
    listScopes.mockResolvedValue([
      {
        connector: "slack/ssota",
        installationId: "T0914DV7GA0",
        tenantId: "T0914DV7GA0",
        subjectUserId: "user-who-connected",
        installationName: "SSOTA Labs",
      },
    ]);
    getToken.mockResolvedValueOnce({ token: "xoxp-user-only" });

    const { getSlackBotTokenForInstallation, getCachedSlackTokenSubject } =
      await import("./slack-token");
    await getSlackBotTokenForInstallation("T0914DV7GA0");

    expect(getCachedSlackTokenSubject("T0914DV7GA0")).toBeUndefined();
  });

  it("caches app subject when Connect returns bot token", async () => {
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
    getToken.mockResolvedValueOnce({ token: "xoxb-minted" });

    const { getSlackBotTokenForInstallation, getCachedSlackTokenSubject } =
      await import("./slack-token");
    await getSlackBotTokenForInstallation("T0914DV7GA0");

    expect(getCachedSlackTokenSubject("T0914DV7GA0")).toBe("app");
  });
});

describe("slack token helpers", () => {
  it("detects user tokens by prefix", async () => {
    const { isSlackUserToken } = await import("./slack-token");
    expect(isSlackUserToken("xoxp-123")).toBe(true);
    expect(isSlackUserToken("xoxb-123")).toBe(false);
  });

  it("detects not_allowed_token_type Slack API errors", async () => {
    const { isSlackNotAllowedTokenTypeError } = await import("./slack-token");
    expect(
      isSlackNotAllowedTokenTypeError(
        new Error("An API error occurred: not_allowed_token_type"),
      ),
    ).toBe(true);
    expect(
      isSlackNotAllowedTokenTypeError({
        code: "slack_webapi_platform_error",
        data: { ok: false, error: "not_allowed_token_type" },
      }),
    ).toBe(true);
    expect(isSlackNotAllowedTokenTypeError(new Error("channel_not_found"))).toBe(
      false,
    );
  });
});
