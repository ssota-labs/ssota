import { describe, expect, it } from "vitest";
import { filterMcpTools } from "../connections/filter-tools.js";
import {
  parseQualifiedToolName,
  toQualifiedToolName,
} from "../connections/qualified-name.js";
import { ConnectionRunState } from "../connections/run-state.js";
import { defineMcpClientConnection } from "../connections/define-mcp-connection.js";
import { connectCredential } from "../connections/connect-credential.js";
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
    expect(names).toContain("slack_send_message");
    expect(names).toContain("slack_search_channels");
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
  it("records installation scope and args schema from search hits", () => {
    const state = new ConnectionRunState();
    state.recordInstallations([
      {
        connection: "linear",
        installationId: "inst-1",
        qualifiedName: "linear__search_issues",
        argsSchema: {
          required: ["query"],
          properties: { query: "string" },
        },
      },
    ]);
    expect(state.getInstallationId("linear")).toBe("inst-1");
    expect(state.getArgsSchema("linear__search_issues")).toEqual({
      required: ["query"],
      properties: { query: "string" },
    });
  });
});

describe("connection facade tool names", () => {
  it("exposes stable search and call tool ids", () => {
    expect(CONNECTION_SEARCH_TOOL).toBe("connection_search");
    expect(CONNECTION_CALL_TOOL).toBe("connection_call");
  });
});
