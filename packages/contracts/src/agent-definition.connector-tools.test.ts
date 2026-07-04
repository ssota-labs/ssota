import { describe, expect, it } from "vitest";
import type { AgentConnectorBinding } from "./agent-definition.js";
import {
  deriveApprovalToolsByToolkit,
  deriveBlockedToolsByToolkit,
} from "./agent-definition.js";

describe("connector tool permission helpers", () => {
  const bindings: AgentConnectorBinding[] = [
    {
      connectionId: "acc-1",
      provider: "notion",
      scope: "user",
      toolPermissions: {
        NOTION_CREATE_PAGE: "block",
        NOTION_SEARCH: "approval",
      },
    },
    {
      connectionId: "acc-2",
      provider: "github",
      scope: "user",
      toolPermissions: { GITHUB_CREATE_ISSUE: "block" },
    },
  ];

  it("derives blocked tool slugs grouped by toolkit", () => {
    expect(deriveBlockedToolsByToolkit(bindings)).toEqual({
      github: ["GITHUB_CREATE_ISSUE"],
      notion: ["NOTION_CREATE_PAGE"],
    });
  });

  it("derives approval-required tool slugs grouped by toolkit", () => {
    expect(deriveApprovalToolsByToolkit(bindings)).toEqual({
      notion: ["NOTION_SEARCH"],
    });
  });
});
