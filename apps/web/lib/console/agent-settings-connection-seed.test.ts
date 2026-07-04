import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentConnectorBinding } from "@ssota/contracts";
import {
  AGENT_TOOLS_CONNECTION_SEED,
  MAIN_AGENT_CONNECTOR_BINDING_SEED,
  mergeAgentToolsConnectionSeed,
  mergeMainAgentConnectorBindingSeed,
} from "./agent-settings-connection-seed";

describe("mergeAgentToolsConnectionSeed", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns live connections unchanged when seed merge is disabled", () => {
    vi.stubEnv("AGENT_TOOLS_CONNECTION_SEED", "0");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CONNECT_STUB", "");

    const live = {
      user: [{ id: "live-1", connector: "notion", name: "Live" }],
      org: [],
    };
    expect(mergeAgentToolsConnectionSeed(live)).toEqual(live);
  });

  it("merges seed rows without duplicating ids when enabled", () => {
    vi.stubEnv("AGENT_TOOLS_CONNECTION_SEED", "1");
    vi.stubEnv("CONNECT_STUB", "");

    const merged = mergeAgentToolsConnectionSeed({
      user: [{ id: "seed-notion-user-1", connector: "notion", name: "Existing" }],
      org: [],
    });

    expect(merged.user).toHaveLength(AGENT_TOOLS_CONNECTION_SEED.user.length);
    expect(merged.user[0]?.name).toBe("Existing");
    expect(merged.org).toHaveLength(AGENT_TOOLS_CONNECTION_SEED.org.length);
  });
});

describe("mergeMainAgentConnectorBindingSeed", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns runPolicy unchanged when seed merge is disabled", () => {
    vi.stubEnv("AGENT_TOOLS_CONNECTION_SEED", "0");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CONNECT_STUB", "");

    const runPolicy = { connectorBindings: [] as AgentConnectorBinding[] };
    expect(mergeMainAgentConnectorBindingSeed(runPolicy)).toEqual(runPolicy);
  });

  it("merges seed binding for main agent preview", () => {
    vi.stubEnv("AGENT_TOOLS_CONNECTION_SEED", "1");
    vi.stubEnv("CONNECT_STUB", "");

    const merged = mergeMainAgentConnectorBindingSeed({
      connectorBindings: [],
      enabledConnectorProviders: [],
    });

    expect(merged.connectorBindings).toEqual(MAIN_AGENT_CONNECTOR_BINDING_SEED);
    expect(merged.enabledConnectorProviders).toEqual(["notion"]);
  });
});
