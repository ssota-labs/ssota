import { describe, expect, it } from "vitest";
import { toolMatchesQuery } from "../tools/connections.js";

// Haystacks mirror how connection_search builds them: lowercased join of
// qualifiedName, tool name, description, connection id, etc.
const slackSendMessage =
  "slack__send_message send_message send a message to a slack channel slack";
const linearCreateIssue =
  "linear__create_issue create_issue create an issue in linear linear";

const terms = (q: string) => q.trim().toLowerCase().split(/\s+/).filter(Boolean);

describe("toolMatchesQuery", () => {
  it("keeps tools when a multi-word query shares any term (regression: 'slack messaging' dropped all 18 tools)", () => {
    expect(toolMatchesQuery(slackSendMessage, terms("Slack messaging"))).toBe(
      true,
    );
  });

  it("matches a single relevant term", () => {
    expect(toolMatchesQuery(slackSendMessage, terms("message"))).toBe(true);
  });

  it("excludes tools that share no term", () => {
    expect(toolMatchesQuery(linearCreateIssue, terms("Slack messaging"))).toBe(
      false,
    );
  });

  it("returns everything for an empty query", () => {
    expect(toolMatchesQuery(slackSendMessage, terms(""))).toBe(true);
    expect(toolMatchesQuery(linearCreateIssue, [])).toBe(true);
  });

  it("does not require the contiguous phrase", () => {
    // "send channel" never appears contiguously, but both terms do appear.
    expect(toolMatchesQuery(slackSendMessage, terms("send channel"))).toBe(true);
  });
});
