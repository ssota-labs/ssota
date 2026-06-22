import { describe, expect, it } from "vitest";
import { filterMcpTools } from "../connections/filter-tools.js";
import {
  parseQualifiedToolName,
  toQualifiedToolName,
} from "../connections/qualified-name.js";
import { ConnectionRunState } from "../connections/run-state.js";
import { buildActiveTools } from "../connections/activate-tools.js";
import { defineMcpClientConnection } from "../connections/define-mcp-connection.js";
import { connectCredential } from "../connections/connect-credential.js";
import {
  getKnownToolsForConnection,
  inferConnectionIdFromQuery,
} from "../connections/tool-catalog.js";

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
      description: "Slack",
      auth: connectCredential("slack"),
    });
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

describe("buildActiveTools", () => {
  it("starts with connection_search only among MCP tools", () => {
    const state = new ConnectionRunState();
    const active = buildActiveTools(state, [
      "linear__search_issues",
      "linear__get_issue",
    ]);
    expect(active).toContain("connection_search");
    expect(active).toContain("request_connection");
    expect(active).not.toContain("linear__search_issues");
  });

  it("activates qualified tools after connection_search", () => {
    const state = new ConnectionRunState();
    state.activateFromSearch([
      {
        qualifiedName: "linear__search_issues",
        connection: "linear",
        installationId: "inst-1",
      },
    ]);
    const active = buildActiveTools(state, ["linear__search_issues"]);
    expect(active).toContain("linear__search_issues");
  });
});
