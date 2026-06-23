import { mcpScopesForConnector } from "@ssota/agent-runtime/connect-scopes";
import { describe, expect, it } from "vitest";
import { resolveAuthorizeScopes } from "./connectors";

describe("resolveAuthorizeScopes", () => {
  it("returns explicit scopes when provided", () => {
    expect(resolveAuthorizeScopes("discord/ssota", ["identify"])).toEqual([
      "identify",
    ]);
  });

  it("defaults to bot scope for Discord connectors", () => {
    expect(resolveAuthorizeScopes("discord/ssota")).toEqual(["bot"]);
  });

  it("grants the broad MCP scopes for Slack at consent time", () => {
    const scopes = resolveAuthorizeScopes("slack/acme");
    // Must match the scopes the runtime later requests at token mint, or the
    // minted Bearer can't carry them (identity-only token → 0 tools).
    expect(scopes).toEqual(mcpScopesForConnector("slack/acme"));
    expect(scopes).toContain("channels:read");
    expect(scopes).toContain("search:read.public");
    // Slack OAuth can't mix identity.* (Sign in with Slack) with workspace scopes.
    expect(scopes?.some((s) => s.startsWith("identity."))).toBe(false);
  });

  it("grants read/write for Linear at consent time", () => {
    const scopes = resolveAuthorizeScopes("linear/ssota");
    expect(scopes).toContain("read");
    expect(scopes).toContain("write");
  });

  it("returns undefined for providers without granular scopes (Notion)", () => {
    // Notion uses a content-grant model — no scope strings — so consent falls
    // back to the connector's configured default grant.
    expect(resolveAuthorizeScopes("notion/ssota")).toBeUndefined();
  });
});
