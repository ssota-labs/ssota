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
});
