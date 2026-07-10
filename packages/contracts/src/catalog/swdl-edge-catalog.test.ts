import { describe, expect, it } from "vitest";
import edgeCatalogSeed from "../../seed-packs/software-development-workflow/edge-catalog.json" with {
  type: "json",
};
import { EDGE_TYPES, NODE_TYPES } from "./index.js";
import { SWDL_AGENT_SKILL_KEYS, SWDL_SKILL_KEYS } from "../agents/skills/swdl-skill-pack.js";
import { SWDL_AGENT_IDS } from "../agents/swdl-ids.js";

type EdgeSeed = {
  key: string;
  domainKeys?: string[];
  rangeKeys?: string[];
};

describe("SWDL edge-catalog seed", () => {
  const seeds = edgeCatalogSeed as EdgeSeed[];
  const nodeKeys = new Set<string>(NODE_TYPES);

  it("includes blocked_by and implements with non-empty domain/range", () => {
    const blocked = seeds.find((e) => e.key === "blocked_by");
    const implementsEdge = seeds.find((e) => e.key === "implements");
    expect(blocked?.domainKeys).toEqual(["task"]);
    expect(blocked?.rangeKeys).toEqual(["task"]);
    expect(implementsEdge?.domainKeys).toEqual(["task", "pull_request"]);
    expect(implementsEdge?.rangeKeys).toEqual(["user_story", "feature"]);
  });

  it("fills domain/range for every seeded edge and references known node keys", () => {
    for (const entry of seeds) {
      expect(entry.domainKeys?.length ?? 0).toBeGreaterThan(0);
      expect(entry.rangeKeys?.length ?? 0).toBeGreaterThan(0);
      for (const key of entry.domainKeys ?? []) {
        expect(nodeKeys.has(key), `unknown domain key ${key} on ${entry.key}`).toBe(
          true,
        );
      }
      for (const key of entry.rangeKeys ?? []) {
        expect(nodeKeys.has(key), `unknown range key ${key} on ${entry.key}`).toBe(
          true,
        );
      }
    }
  });

  it("does not seed agent_owns_page in the Domain Pack overlay", () => {
    expect(seeds.some((e) => e.key === "agent_owns_page")).toBe(false);
    expect(EDGE_TYPES).toContain("agent_owns_page");
  });
});

describe("SWDL skill pack matrix", () => {
  it("defines 8 skills and binds every SWDL agent", () => {
    expect(SWDL_SKILL_KEYS).toHaveLength(8);
    for (const id of Object.values(SWDL_AGENT_IDS)) {
      expect(SWDL_AGENT_SKILL_KEYS[id]?.length).toBeGreaterThan(0);
    }
    expect(SWDL_AGENT_SKILL_KEYS[SWDL_AGENT_IDS.orchestrator]).toEqual([
      "swdl-task-contract",
      "swdl-orchestrate",
    ]);
  });
});
