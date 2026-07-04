import { describe, expect, it } from "vitest";
import { parsePageLoadingRoute } from "./parse-page-loading-route";

describe("parsePageLoadingRoute", () => {
  it("parses flat page URLs", () => {
    expect(parsePageLoadingRoute("/ssota-labs/p/page-123")).toEqual({
      kind: "page",
      orgSlug: "ssota-labs",
      teamspaceSlug: "ssota-dev",
      pageId: "page-123",
    });
  });

  it("parses flat node drill-in page URLs", () => {
    expect(parsePageLoadingRoute("/ssota-labs/n/node-1/p/page-2")).toEqual({
      kind: "node-page",
      orgSlug: "ssota-labs",
      teamspaceSlug: "ssota-dev",
      nodeId: "node-1",
      pageId: "page-2",
    });
  });

  it("strips query strings from page ids", () => {
    expect(parsePageLoadingRoute("/ssota-labs/p/page-123?tab=studies")).toEqual({
      kind: "page",
      orgSlug: "ssota-labs",
      teamspaceSlug: "ssota-dev",
      pageId: "page-123",
    });
  });

  it("returns null for unrelated paths", () => {
    expect(parsePageLoadingRoute("/ssota-labs/tasks")).toBeNull();
  });
});
