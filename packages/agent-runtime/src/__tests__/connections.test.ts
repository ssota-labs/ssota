import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { filterMcpTools } from "../connections/filter-tools.js";
import {
  parseQualifiedToolName,
  toQualifiedToolName,
} from "../connections/qualified-name.js";
import { ConnectionRunState } from "../connections/run-state.js";
import { defineMcpClientConnection } from "../connections/define-mcp-connection.js";
import {
  connectCredential,
  resolveConnectorUid,
} from "../connections/connect-credential.js";
import {
  getKnownToolsForConnection,
  inferConnectionIdFromQuery,
} from "../connections/tool-catalog.js";
import { CONNECTION_CALL_TOOL, CONNECTION_SEARCH_TOOL } from "../connections/run-state.js";

describe("qualified tool names", () => {
  it("builds and parses Eve-style names", () => {
    expect(toQualifiedToolName("linear", "search_issues")).toBe(
      "linear__search_issues",
    );
    expect(parseQualifiedToolName("linear__search_issues")).toEqual({
      connectionId: "linear",
      toolName: "search_issues",
    });
  });
});

describe("filterMcpTools", () => {
  const tools = [
    { name: "a", description: "A" },
    { name: "b", description: "B" },
    { name: "c", description: "C" },
  ];

  it("applies allow list", () => {
    expect(filterMcpTools(tools, { allow: ["a", "c"] }).map((t) => t.name)).toEqual(
      ["a", "c"],
    );
  });

  it("applies block list", () => {
    expect(filterMcpTools(tools, { block: ["b"] }).map((t) => t.name)).toEqual([
      "a",
      "c",
    ]);
  });
});

describe("tool catalog", () => {
  it("lists slack post_message without MCP", () => {
    const def = defineMcpClientConnection("slack", {
      url: "https://mcp.slack.com/mcp",
      transport: "http",
      description: "Slack",
      auth: connectCredential("slack"),
    });
    expect(def.transport).toBe("http");
    const names = getKnownToolsForConnection(def).map((t) => t.name);
    expect(names).toContain("post_message");
    expect(names).toContain("search_messages");
  });

  it("infers connection id from Korean and English service names", () => {
    expect(inferConnectionIdFromQuery("슬랙에 메시지 보내")).toBe("slack");
    expect(inferConnectionIdFromQuery("send slack message")).toBe("slack");
    expect(inferConnectionIdFromQuery("linear issues")).toBe("linear");
    expect(inferConnectionIdFromQuery("graph nodes")).toBeUndefined();
  });
});

describe("defineMcpClientConnection", () => {
  it("infers sse transport from legacy /sse urls", () => {
    const def = defineMcpClientConnection("example", {
      url: "https://example.com/mcp/sse",
      description: "Example",
      auth: connectCredential("linear"),
    });
    expect(def.transport).toBe("sse");
    expect(def.id).toBe("example");
  });

  it("defaults to http transport for /mcp urls", () => {
    const def = defineMcpClientConnection("linear", {
      url: "https://mcp.linear.app/mcp",
      description: "Linear",
      auth: connectCredential("linear"),
    });
    expect(def.transport).toBe("http");
    expect(def.id).toBe("linear");
  });
});

describe("ConnectionRunState", () => {
  it("records installation scope from search hits", () => {
    const state = new ConnectionRunState();
    state.recordInstallations([
      { connection: "linear", installationId: "inst-1" },
    ]);
    expect(state.getInstallationId("linear")).toBe("inst-1");
  });
});

describe("resolveConnectorUid", () => {
  const keys = ["NOTION_MCP_CONNECTOR", "NOTION_CONNECT_CONNECTOR", "NOTION_API_CONNECTOR"];
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

  it("prefers the MCP connector over the legacy slot", () => {
    process.env.NOTION_MCP_CONNECTOR = "mcp.notion.com/ssota";
    process.env.NOTION_CONNECT_CONNECTOR = "notion/legacy";
    expect(resolveConnectorUid("notion")).toBe("mcp.notion.com/ssota");
  });

  it("falls back to the legacy slot for existing deployments", () => {
    process.env.NOTION_CONNECT_CONNECTOR = "notion/legacy";
    expect(resolveConnectorUid("notion")).toBe("notion/legacy");
  });

  it("never resolves the API connector slot (agent uses MCP only)", () => {
    process.env.NOTION_API_CONNECTOR = "notion/api-only";
    expect(resolveConnectorUid("notion")).toBeNull();
  });
});

describe("connection facade tool names", () => {
  it("exposes stable search and call tool ids", () => {
    expect(CONNECTION_SEARCH_TOOL).toBe("connection_search");
    expect(CONNECTION_CALL_TOOL).toBe("connection_call");
  });
});
