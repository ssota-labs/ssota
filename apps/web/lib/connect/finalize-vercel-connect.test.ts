import { describe, expect, it, vi, beforeEach } from "vitest";

const getConnectInstallation = vi.fn();
const enrichConnectInstallationDisplay = vi.fn();
const record = vi.fn();
const link = vi.fn();

vi.mock("@ssota/agent-runtime", () => ({
  getConnectInstallation,
  enrichConnectInstallationDisplay,
  getDb: () => ({}),
  normalizeConnectInstallationId: (id?: string | null) =>
    id?.trim() ? id.trim() : undefined,
  connectTokenScopesForConnector: () => ["chat:write"],
}));

vi.mock("@ssota/adapter-postgres", () => ({
  createAccountConnectionPort: () => ({ record }),
  createChatWorkspacePort: () => ({ link }),
}));

vi.mock("@/lib/api/resolve-api-account-scope", () => ({
  resolveApiAccountScope: vi.fn().mockResolvedValue({ accountId: "acc-1" }),
  isApiAccountScopeError: () => false,
}));

describe("finalizeVercelConnect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConnectInstallation.mockResolvedValue({
      installationId: "inst-1",
      tenantId: "T01234567",
      name: "Acme Slack",
    });
    enrichConnectInstallationDisplay.mockImplementation(
      async ({ installation }) => installation,
    );
    record.mockResolvedValue(undefined);
    link.mockResolvedValue(undefined);
  });

  it("records account connection and auto-links Slack team_id", async () => {
    const { finalizeVercelConnect } = await import("./finalize-vercel-connect");

    const result = await finalizeVercelConnect({
      connector: "slack/ssota",
      teamspaceId: "00000000-0000-4000-8000-000000000001",
      accountId: "acc-1",
      userId: "user-1",
      installationId: "inst-1",
    });

    expect(result).toEqual({
      platform: "slack",
      workspaceKey: "T01234567",
      recorded: true,
      linked: true,
    });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        connector: "slack/ssota",
        tenantId: "T01234567",
        accountId: "acc-1",
      }),
    );
    expect(link).toHaveBeenCalledWith({
      teamspaceId: "00000000-0000-4000-8000-000000000001",
      accountId: "acc-1",
      platform: "slack",
      workspaceKey: "T01234567",
      name: "Acme Slack",
    });
  });

  it("skips chat link for non-chat providers", async () => {
    getConnectInstallation.mockResolvedValue({
      installationId: "inst-gh",
      tenantId: "12345",
      name: "org",
    });

    const { finalizeVercelConnect } = await import("./finalize-vercel-connect");

    const result = await finalizeVercelConnect({
      connector: "github/ssota",
      teamspaceId: "00000000-0000-4000-8000-000000000001",
      accountId: "acc-1",
      userId: "user-1",
    });

    expect(result.linked).toBe(false);
    expect(link).not.toHaveBeenCalled();
    expect(result.recorded).toBe(true);
  });
});
