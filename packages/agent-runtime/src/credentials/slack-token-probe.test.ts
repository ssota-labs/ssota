import { afterEach, describe, expect, it, vi } from "vitest";
import { probeSlackToken, slackTokenPrefix } from "./slack-token-probe.js";

describe("slackTokenPrefix", () => {
  it("classifies common Slack token prefixes", () => {
    expect(slackTokenPrefix("xoxb-123")).toBe("xoxb");
    expect(slackTokenPrefix("xoxp-456")).toBe("xoxp");
    expect(slackTokenPrefix("abcd")).toBe("abcd");
  });
});

describe("probeSlackToken", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns auth.test metadata and oauth scopes header", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        headers: {
          get: (name: string) =>
            name.toLowerCase() === "x-oauth-scopes"
              ? "chat:write,channels:history"
              : null,
        },
        json: async () => ({
          ok: true,
          team: "SSOTA Labs",
          team_id: "T0914DV7GA0",
          user_id: "U123",
          bot_id: "B123",
        }),
      }),
    );

    const probe = await probeSlackToken("xoxb-test-token");
    expect(probe.tokenPrefix).toBe("xoxb");
    expect(probe.authTest.ok).toBe(true);
    expect(probe.authTest.team).toBe("SSOTA Labs");
    expect(probe.authTest.oauthScopes).toEqual([
      "chat:write",
      "channels:history",
    ]);
  });
});
