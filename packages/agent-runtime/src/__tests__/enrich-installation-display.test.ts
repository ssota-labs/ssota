import { afterEach, describe, expect, it, vi } from "vitest";
import { enrichConnectInstallationDisplay } from "../connections/enrich-installation-display.js";
import {
  createEnvCredentialProvider,
  type ConnectInstallation,
} from "../credentials/provider.js";

const baseInstallation: ConnectInstallation = {
  installationId: "T0914DV7GA0",
  tenantId: "T0914DV7GA0",
};

describe("enrichConnectInstallationDisplay", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.CONNECT_STUB;
    delete process.env.CREDENTIALS;
    delete process.env.CONNECTOR_SLACK_TOKEN;
    delete process.env.CONNECTOR_SLACK_T0914DV7GA0_TOKEN;
  });

  it("returns unchanged when Connect already provided a name", async () => {
    const installation = { ...baseInstallation, name: "Acme Workspace" };
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await enrichConnectInstallationDisplay({
      connector: "slack/ssota",
      installation,
      scope: { projectId: "p", userId: "u" },
    });

    expect(result).toEqual(installation);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips enrichment when CONNECT_STUB=1", async () => {
    process.env.CONNECT_STUB = "1";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await enrichConnectInstallationDisplay({
      connector: "slack/ssota",
      installation: baseInstallation,
      scope: { projectId: "p", userId: "u" },
    });

    expect(result).toEqual(baseInstallation);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("enriches Slack workspace name via auth.test when name is missing", async () => {
    process.env.CREDENTIALS = "own-app";
    process.env.CONNECTOR_SLACK_TOKEN = "xoxb-test";
    expect(createEnvCredentialProvider()).toBeTruthy();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, team: "Pax Humana" }),
      }),
    );

    const result = await enrichConnectInstallationDisplay({
      connector: "slack/ssota",
      installation: baseInstallation,
      scope: { projectId: "p", userId: "u" },
    });

    expect(result.name).toBe("Pax Humana");
  });

  it("prefers app-subject token for Slack enrichment when userId is set", async () => {
    process.env.CREDENTIALS = "own-app";
    process.env.CONNECTOR_SLACK_T0914DV7GA0_TOKEN = "xoxb-app";
    process.env.CONNECTOR_SLACK_TOKEN = "xoxp-user-should-not-use";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, team: "SSOTA Labs" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await enrichConnectInstallationDisplay({
      connector: "slack/ssota",
      installation: baseInstallation,
      scope: { projectId: "p", userId: "user-1" },
    });

    expect(result.name).toBe("SSOTA Labs");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://slack.com/api/auth.test",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer xoxb-app",
        }),
      }),
    );
  });

  it("returns unchanged when provider API fails", async () => {
    process.env.CREDENTIALS = "own-app";
    process.env.CONNECTOR_SLACK_TOKEN = "xoxb-test";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ ok: false }),
      }),
    );

    const result = await enrichConnectInstallationDisplay({
      connector: "slack/ssota",
      installation: baseInstallation,
      scope: { projectId: "p", userId: "u" },
    });

    expect(result).toEqual(baseInstallation);
  });

  it("maps oauth/* connectors to Notion enrichment", async () => {
    process.env.CREDENTIALS = "own-app";
    process.env.CONNECTOR_OAUTH_TOKEN = "secret_notion";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        type: "bot",
        bot: { workspace_name: "SSOTA Docs" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await enrichConnectInstallationDisplay({
      connector: "oauth/ssota-notion",
      installation: { installationId: "" },
      scope: { projectId: "p", userId: "u" },
    });

    expect(result.name).toBe("SSOTA Docs");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.notion.com/v1/users/me",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer secret_notion",
        }),
      }),
    );
  });

  it("enriches GitHub org name via installation repositories", async () => {
    process.env.CREDENTIALS = "own-app";
    process.env.CONNECTOR_GITHUB_TOKEN = "ghs_test";

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          repositories: [{ owner: { login: "ssota-labs", type: "Organization" } }],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await enrichConnectInstallationDisplay({
      connector: "github/ssota",
      installation: {},
      scope: { projectId: "p", userId: "u" },
    });

    expect(result.name).toBe("ssota-labs");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/installation/repositories?per_page=1",
      expect.any(Object),
    );
  });

  it("enriches Discord guild name via bot guild list when ids are missing", async () => {
    process.env.CREDENTIALS = "own-app";
    process.env.CONNECTOR_DISCORD_TOKEN = "discord-bot-token";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ id: "1234567890", name: "SSOTA Community" }],
      }),
    );

    const result = await enrichConnectInstallationDisplay({
      connector: "discord/ssota",
      installation: {},
      scope: { projectId: "p", userId: "u" },
    });

    expect(result.name).toBe("SSOTA Community");
    expect(result.tenantId).toBe("1234567890");
    expect(result.installationId).toBe("1234567890");
  });

  it("enriches X account via users/me for x.com connector uids", async () => {
    process.env.CREDENTIALS = "own-app";
    process.env.CONNECTOR_X_COM_TOKEN = "x-user-token";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: "12345",
          username: "felixyeon",
          name: "Felix Yeon",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await enrichConnectInstallationDisplay({
      connector: "x.com/ssota",
      installation: {},
      scope: { projectId: "p", userId: "u" },
    });

    expect(result.name).toBe("Felix Yeon (@felixyeon)");
    expect(result.tenantId).toBe("12345");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.x.com/2/users/me?user.fields=username,name",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer x-user-token",
        }),
      }),
    );
  });
});
