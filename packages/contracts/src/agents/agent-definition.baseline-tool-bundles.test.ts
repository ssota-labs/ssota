import { describe, it, expect } from "vitest";
import {
  DEFAULT_AGENT_TOOL_BUNDLES,
  mergeAgentToolBundles,
} from "./agent-definition.js";

describe("DEFAULT_AGENT_TOOL_BUNDLES (forced general-tool baseline)", () => {
  it("includes the general tools every agent must carry", () => {
    for (const bundle of [
      "graph.read",
      "graph.write",
      "tasks.manage",
      "pages.author",
      "skills.read",
      "workers",
      "connectors",
    ] as const) {
      expect(DEFAULT_AGENT_TOOL_BUNDLES).toContain(bundle);
    }
  });

  it("keeps role-specific bundles OUT of the baseline (opt-in only)", () => {
    expect(DEFAULT_AGENT_TOOL_BUNDLES).not.toContain("delegate");
    expect(DEFAULT_AGENT_TOOL_BUNDLES).not.toContain("sandbox.code");
  });
});

describe("mergeAgentToolBundles", () => {
  it("gives a bare specialist the full baseline", () => {
    expect(new Set(mergeAgentToolBundles([]))).toEqual(
      new Set(DEFAULT_AGENT_TOOL_BUNDLES),
    );
  });

  it("does not duplicate a declared baseline bundle", () => {
    expect(
      mergeAgentToolBundles(["graph.read"]).filter((b) => b === "graph.read"),
    ).toHaveLength(1);
  });

  it("unions an opt-in bundle on top of the baseline", () => {
    const merged = mergeAgentToolBundles(["delegate"]);
    expect(merged).toContain("delegate");
    expect(merged).toContain("graph.write");
  });
});
