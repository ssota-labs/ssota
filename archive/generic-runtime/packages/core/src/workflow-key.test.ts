import { describe, expect, it } from "vitest";
import { deriveWorkflowKeyFromTitle } from "./workflow-key.js";

describe("deriveWorkflowKeyFromTitle", () => {
  it("derives snake_case from Latin title", () => {
    expect(deriveWorkflowKeyFromTitle("Homepage Creation", () => false)).toBe(
      "homepage_creation",
    );
  });

  it("falls back for non-Latin titles", () => {
    const key = deriveWorkflowKeyFromTitle("홈페이지 제작", () => false);
    expect(key).toMatch(/^wf_[a-z0-9_]+$/);
  });

  it("appends suffix when key is taken", () => {
    const key = deriveWorkflowKeyFromTitle("Homepage Creation", (candidate) =>
      candidate === "homepage_creation",
    );
    expect(key).toMatch(/^homepage_creation_[a-z0-9_]+$/);
  });
});
