import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createEmulator, type Emulator } from "emulate";
import { enrichConnectInstallationDisplay } from "../connections/enrich-installation-display.js";

const SLACK_SEED: Record<string, unknown> = {
  team: { name: "Emulate Test Team", domain: "emulate-test" },
  users: [{ name: "smoke", real_name: "Smoke", email: "smoke@ssota.test" }],
  tokens: [
    {
      token: "xoxb-emulate-enrich",
      user: "smoke",
      scopes: ["team:read", "users:read"],
    },
  ],
  strict_scopes: false,
};

describe("enrichConnectInstallationDisplay (emulate)", () => {
  let slack: Emulator;
  const prev = {
    emulateEnabled: process.env.EMULATE_ENABLED,
    slackUrl: process.env.EMULATE_SLACK_URL,
    credentials: process.env.CREDENTIALS,
    connectorToken: process.env.CONNECTOR_SLACK_DEV_TOKEN,
    connectStub: process.env.CONNECT_STUB,
  };

  beforeAll(async () => {
    slack = await createEmulator({
      service: "slack",
      port: 4103,
      seed: SLACK_SEED,
    });
    process.env.EMULATE_ENABLED = "1";
    process.env.EMULATE_SLACK_URL = slack.url;
    process.env.CREDENTIALS = "own-app";
    process.env.CONNECTOR_SLACK_DEV_TOKEN = "xoxb-emulate-enrich";
    delete process.env.CONNECT_STUB;
  });

  afterEach(() => {
    slack.reset();
  });

  afterAll(async () => {
    await slack.close();
    if (prev.emulateEnabled === undefined) delete process.env.EMULATE_ENABLED;
    else process.env.EMULATE_ENABLED = prev.emulateEnabled;
    if (prev.slackUrl === undefined) delete process.env.EMULATE_SLACK_URL;
    else process.env.EMULATE_SLACK_URL = prev.slackUrl;
    if (prev.credentials === undefined) delete process.env.CREDENTIALS;
    else process.env.CREDENTIALS = prev.credentials;
    if (prev.connectorToken === undefined) delete process.env.CONNECTOR_SLACK_DEV_TOKEN;
    else process.env.CONNECTOR_SLACK_DEV_TOKEN = prev.connectorToken;
    if (prev.connectStub === undefined) delete process.env.CONNECT_STUB;
    else process.env.CONNECT_STUB = prev.connectStub;
  });

  it("resolves slack workspace name from emulate auth.test", async () => {
    const result = await enrichConnectInstallationDisplay({
      connector: "slack/dev",
      installation: { installationId: "TEMULATE1" },
      scope: { projectId: "proj-1", accountId: "acct-1" },
    });
    expect(result.name).toBe("Emulate");
  });
});
