import { mcpScopesForConnector } from "@ssota/agent-runtime/connect-scopes";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  connectorProviderForAuthorize,
  getConnectors,
  isMcpConnector,
  resolveAuthorizeScopes,
} from "./connectors";

describe("getConnectors env resolution", () => {
  const keys = [
    "NOTION_MCP_CONNECTOR",
    "NOTION_API_CONNECTOR",
    "NOTION_CONNECT_CONNECTOR",
  ];
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of keys) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  const notion = () => getConnectors().find((c) => c.provider === "notion")!;

  it("splits MCP and API connectors into separate slots", () => {
    process.env.NOTION_MCP_CONNECTOR = "mcp.notion.com/ssota";
    process.env.NOTION_API_CONNECTOR = "notion/ssota";
    const c = notion();
    expect(c.connectorUid).toBe("mcp.notion.com/ssota");
    expect(c.apiConnectorUid).toBe("notion/ssota");
    expect(c.isMcp).toBe(true);
  });

  it("falls back to the legacy slot for the MCP connector", () => {
    process.env.NOTION_CONNECT_CONNECTOR = "mcp.notion.com/legacy";
    const c = notion();
    expect(c.connectorUid).toBe("mcp.notion.com/legacy");
    expect(c.apiConnectorUid).toBeNull();
    expect(c.isMcp).toBe(true);
  });

  it("MCP slot wins over the legacy slot", () => {
    process.env.NOTION_MCP_CONNECTOR = "mcp.notion.com/new";
    process.env.NOTION_CONNECT_CONNECTOR = "notion/old";
    expect(notion().connectorUid).toBe("mcp.notion.com/new");
  });
});

describe("isMcpConnector", () => {
  it("treats mcp.* host uids as MCP-type", () => {
    expect(isMcpConnector("mcp.notion.com/ssota")).toBe(true);
  });

  it("treats provider uids as API/OAuth (non-MCP)", () => {
    expect(isMcpConnector("notion/ssota")).toBe(false);
    expect(isMcpConnector("slack/ssota")).toBe(false);
  });

  it("returns false when unconfigured", () => {
    expect(isMcpConnector(null)).toBe(false);
    expect(isMcpConnector(undefined)).toBe(false);
  });
});

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

  it("grants full X scopes for twitter and x.com connector uids", () => {
    const expected = resolveAuthorizeScopes("twitter/ssota");
    expect(expected).toContain("list.read");
    expect(expected).toContain("list.write");
    expect(expected).toContain("space.read");
    expect(expected).toContain("mute.write");
    expect(expected).toContain("block.read");
    expect(expected).toContain("tweet.moderate.write");
    expect(expected).toContain("offline.access");
    expect(resolveAuthorizeScopes("x.com/ssota")).toEqual(expected);
  });
});

describe("connectorProviderForAuthorize", () => {
  it("maps x.com connector uids to twitter", () => {
    expect(connectorProviderForAuthorize("x.com/ssota")).toBe("twitter");
  });
});
