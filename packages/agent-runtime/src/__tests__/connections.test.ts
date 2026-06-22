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

describe("defineMcpClientConnection", () => {
  it("infers sse transport from url", () => {
    const def = defineMcpClientConnection("linear", {
      url: "https://mcp.linear.app/sse",
      description: "Linear",
      auth: connectCredential("linear"),
    });
    expect(def.transport).toBe("sse");
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
