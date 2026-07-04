import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AGENT_TOOLS_CONNECTION_SEED,
  mergeAgentToolsConnectionSeed,
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
