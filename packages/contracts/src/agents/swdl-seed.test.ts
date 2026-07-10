import { describe, expect, it } from "vitest";
import {
  SWDL_AGENT_DEFINITION_SEEDS,
  getSwdlAgentMeta,
  listSwdlAgentIds,
} from "./swdl-seed.js";
import {
  SWDL_AGENT_IDS,
  SWDL_SPECIALIST_IDS,
  isSwdlAgentId,
} from "./swdl-ids.js";

describe("SWDL domain agent seeds", () => {
  it("seeds four specialists plus one orchestrator", () => {
    expect(listSwdlAgentIds()).toHaveLength(5);
    expect(SWDL_AGENT_DEFINITION_SEEDS).toHaveLength(5);
  });

  it("uses stable a100… ids distinct from built-in a000… namespace", () => {
    for (const id of listSwdlAgentIds()) {
      expect(id.startsWith("a1000000-")).toBe(true);
      expect(isSwdlAgentId(id)).toBe(true);
    }
  });

  it("gives every agent a routing-style description", () => {
    for (const seed of SWDL_AGENT_DEFINITION_SEEDS) {
      expect(seed.description.toLowerCase()).toContain("use when");
      expect(seed.description.length).toBeGreaterThan(40);
    }
  });

  it("specialists accept task trigger; orchestrator accepts schedule", () => {
    for (const id of SWDL_SPECIALIST_IDS) {
      const meta = getSwdlAgentMeta(id)!;
      expect(meta.allowedTriggers).toContain("task");
    }
    const orch = getSwdlAgentMeta(SWDL_AGENT_IDS.orchestrator)!;
    expect(orch.allowedTriggers).toContain("schedule");
    expect(orch.allowedTriggers).toContain("heartbeat");
    expect(orch.linkedWorkerAgentIds).toEqual([...SWDL_SPECIALIST_IDS]);
  });

  it("orchestrator seed embeds linkedWorkerAgentIds in runPolicy", () => {
    const orch = SWDL_AGENT_DEFINITION_SEEDS.find(
      (s) => s.id === SWDL_AGENT_IDS.orchestrator,
    )!;
    expect(orch.runPolicy.linkedWorkerAgentIds).toEqual([
      ...SWDL_SPECIALIST_IDS,
    ]);
  });

  it("loads non-empty playbook instructions", () => {
    for (const seed of SWDL_AGENT_DEFINITION_SEEDS) {
      expect(seed.instructions.length).toBeGreaterThan(0);
    }
  });
});
