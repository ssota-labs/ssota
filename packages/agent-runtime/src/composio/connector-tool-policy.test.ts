import { describe, expect, it } from "vitest";
import {
  findApprovalRequiredMultiExecuteSlugs,
  findBlockedMultiExecuteSlugs,
  mergeDisabledToolsByToolkit,
  parseMultiExecuteToolSlugs,
} from "./connector-tool-policy.js";

describe("connector-tool-policy", () => {
  const bindings = [
    {
      connectionId: "acc-1",
      provider: "notion",
      scope: "user" as const,
      toolPermissions: {
        NOTION_CREATE_PAGE: "block" as const,
        NOTION_SEARCH: "approval" as const,
      },
    },
  ];

  it("merges global and agent blocked tool slugs per toolkit", () => {
    expect(
      mergeDisabledToolsByToolkit(
        { notion: ["NOTION_ARCHIVE"] },
        { notion: ["NOTION_CREATE_PAGE"], github: ["GITHUB_CREATE_ISSUE"] },
      ),
    ).toEqual({
      github: ["GITHUB_CREATE_ISSUE"],
      notion: ["NOTION_ARCHIVE", "NOTION_CREATE_PAGE"],
    });
  });

  it("parses multi-execute tool slugs", () => {
    expect(
      parseMultiExecuteToolSlugs({
        tools: [{ tool_slug: "NOTION_SEARCH", arguments: {} }],
      }),
    ).toEqual(["NOTION_SEARCH"]);
  });

  it("finds blocked slugs from global and agent policy", () => {
    expect(
      findBlockedMultiExecuteSlugs(
        ["NOTION_CREATE_PAGE", "NOTION_SEARCH"],
        { notion: ["NOTION_ARCHIVE"] },
        bindings,
      ),
    ).toEqual(["NOTION_CREATE_PAGE"]);
  });

  it("finds approval-required slugs excluding pre-approved ones", () => {
    expect(
      findApprovalRequiredMultiExecuteSlugs(
        ["NOTION_SEARCH", "NOTION_CREATE_PAGE"],
        bindings,
        ["NOTION_SEARCH"],
      ),
    ).toEqual([]);
    expect(
      findApprovalRequiredMultiExecuteSlugs(["NOTION_SEARCH"], bindings),
    ).toEqual(["NOTION_SEARCH"]);
  });
});
