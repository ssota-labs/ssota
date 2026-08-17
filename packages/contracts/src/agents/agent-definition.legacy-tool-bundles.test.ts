import { describe, expect, it } from "vitest";
import { normalizeLegacyToolBundles } from "./agent-definition.js";

describe("normalizeLegacyToolBundles", () => {
  it("maps script_tools to workers", () => {
    expect(
      normalizeLegacyToolBundles(["graph.read", "script_tools", "tasks.manage"]),
    ).toEqual(["graph.read", "workers", "tasks.manage"]);
  });

  it("dedupes when both legacy and workers are present", () => {
    expect(normalizeLegacyToolBundles(["script_tools", "workers"])).toEqual([
      "workers",
    ]);
  });

  it("drops unknown bundle strings", () => {
    expect(normalizeLegacyToolBundles(["graph.read", "not-a-bundle"])).toEqual([
      "graph.read",
    ]);
  });
});
