import { describe, expect, it } from "vitest";
import {
  getToolTraceLabelKey,
  TOOL_TRACE_LABEL_KEYS,
} from "./tool-trace-labels";

describe("getToolTraceLabelKey", () => {
  it("maps known workflow tools", () => {
    expect(getToolTraceLabelKey("query_nodes")).toBe("queryNodes");
    expect(getToolTraceLabelKey("connection_search")).toBe("connectionSearch");
    expect(getToolTraceLabelKey("COMPOSIO_SEARCH_TOOLS")).toBe(
      "composioSearchTools",
    );
  });

  it("returns null for unknown tools", () => {
    expect(getToolTraceLabelKey("unknown_tool")).toBeNull();
  });

  it("covers every registered label key", () => {
    for (const key of Object.keys(TOOL_TRACE_LABEL_KEYS)) {
      expect(getToolTraceLabelKey(key)).toBeTruthy();
    }
  });
});
