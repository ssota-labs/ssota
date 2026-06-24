import { describe, expect, it } from "vitest";
import {
  rankToolsForQuery,
  shouldBrowseOnEmptyMatch,
  toolMatchesQuery,
  tokenize,
  type ToolSearchCandidate,
} from "../connections/tool-search.js";

const slackSendMessage: ToolSearchCandidate = {
  qualifiedName: "slack__send_message",
  connection: "slack",
  tool: "send_message",
  description: "send a message to a slack channel",
  connectionDescription: "Slack workspace messaging",
  installationName: "Acme Slack",
  installationId: "T1",
};

const slackSearchMessages: ToolSearchCandidate = {
  qualifiedName: "slack__search_messages",
  connection: "slack",
  tool: "search_messages",
  description: "search messages across the slack workspace",
  connectionDescription: "Slack workspace messaging",
  installationName: "Acme Slack",
  installationId: "T1",
};

const linearCreateIssue: ToolSearchCandidate = {
  qualifiedName: "linear__create_issue",
  connection: "linear",
  tool: "create_issue",
  description: "create an issue in linear",
  connectionDescription: "Linear issue tracking",
  installationName: "",
  installationId: "inst-linear",
};

const linearSearchIssues: ToolSearchCandidate = {
  qualifiedName: "linear__search_issues",
  connection: "linear",
  tool: "search_issues",
  description: "search issues in the connected linear workspace",
  connectionDescription: "Linear issue tracking",
  installationName: "",
  installationId: "inst-linear",
};

const allDocs = [
  slackSendMessage,
  slackSearchMessages,
  linearCreateIssue,
  linearSearchIssues,
];

describe("tokenize", () => {
  it("splits snake_case tool names", () => {
    expect(tokenize("search_issues")).toEqual(["search", "issues"]);
  });
});

describe("toolMatchesQuery", () => {
  const slackHaystack =
    "slack__send_message send_message send a message to a slack channel slack";
  const linearHaystack =
    "linear__create_issue create_issue create an issue in linear linear";

  it("keeps tools when a multi-word query shares any term", () => {
    expect(toolMatchesQuery(slackHaystack, tokenize("Slack messaging"))).toBe(
      true,
    );
  });

  it("excludes tools that share no term", () => {
    expect(toolMatchesQuery(linearHaystack, tokenize("Slack messaging"))).toBe(
      false,
    );
  });
});

describe("rankToolsForQuery", () => {
  it("returns slack tools for 'slack messaging' with search ranked above send", () => {
    const hits = rankToolsForQuery(allDocs, "Slack messaging");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => h.connection === "slack")).toBe(true);
    const names = hits.map((h) => h.tool);
    expect(names).toContain("search_messages");
    expect(names).toContain("send_message");
  });

  it("ranks linear search_issues first for 'linear search issues'", () => {
    const hits = rankToolsForQuery(allDocs, "linear search issues");
    expect(hits[0]?.qualifiedName).toBe("linear__search_issues");
  });

  it("excludes unrelated connectors", () => {
    const hits = rankToolsForQuery(allDocs, "Slack messaging");
    expect(hits.some((h) => h.connection === "linear")).toBe(false);
  });

  it("caps results at limit (default 5)", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      ...slackSendMessage,
      qualifiedName: `slack__tool_${i}`,
      tool: `tool_${i}`,
    }));
    expect(rankToolsForQuery(many, "slack").length).toBe(5);
  });

  it("returns up to limit docs for empty query", () => {
    const hits = rankToolsForQuery(allDocs, "");
    expect(hits.length).toBe(allDocs.length);
  });

  it("prefers tool name matches over connection-only overlap", () => {
    const hits = rankToolsForQuery(allDocs, "create issue");
    expect(hits[0]?.qualifiedName).toBe("linear__create_issue");
  });

  it("returns no hits for generic status query without service name", () => {
    expect(rankToolsForQuery(allDocs, "connection status")).toEqual([]);
  });
});

describe("shouldBrowseOnEmptyMatch", () => {
  it("detects English connection-status queries", () => {
    expect(shouldBrowseOnEmptyMatch("connection status")).toBe(true);
    expect(shouldBrowseOnEmptyMatch("check connection")).toBe(true);
  });

  it("does not treat capability queries as status browse", () => {
    expect(shouldBrowseOnEmptyMatch("create issue")).toBe(false);
    expect(shouldBrowseOnEmptyMatch("notion graph")).toBe(false);
  });

  it("allows status browse when connection filter is set", () => {
    expect(shouldBrowseOnEmptyMatch("slack status check", "slack")).toBe(true);
  });
});
