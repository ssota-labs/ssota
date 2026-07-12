import { describe, expect, it } from "vitest";
import {
  SWDL_AGENT_DEFINITION_SEEDS,
  SWDL_DIRECTION_SLACK_BINDING,
  getSwdlAgentMeta,
  listSwdlAgentIds,
} from "./swdl-seed.js";
import {
  SWDL_AGENT_IDS,
  SWDL_SPECIALIST_IDS,
  isSwdlAgentId,
} from "./swdl-ids.js";

describe("SWDL domain agent seeds", () => {
  it("seeds four specialists, direction steward, and orchestrator", () => {
    expect(listSwdlAgentIds()).toHaveLength(6);
    expect(SWDL_AGENT_DEFINITION_SEEDS).toHaveLength(6);
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
    const direction = getSwdlAgentMeta(SWDL_AGENT_IDS.direction)!;
    expect(direction.allowedTriggers).toContain("schedule");
    expect(direction.allowedTriggers).toContain("chat");
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

  it("declares only opt-in tool bundles (baseline is runtime-merged)", () => {
    const byId = Object.fromEntries(
      SWDL_AGENT_DEFINITION_SEEDS.map((seed) => [seed.id, seed.toolBundles]),
    );
    expect(byId[SWDL_AGENT_IDS.research]).toEqual([]);
    expect(byId[SWDL_AGENT_IDS.planning]).toEqual([]);
    expect(byId[SWDL_AGENT_IDS.qa]).toEqual([]);
    expect(byId[SWDL_AGENT_IDS.direction]).toEqual([]);
    expect(byId[SWDL_AGENT_IDS.delivery]).toEqual(["sandbox.code"]);
    expect(byId[SWDL_AGENT_IDS.orchestrator]).toEqual(["delegate"]);
  });

  it("seeds Direction with Slack connector binding for Cycle A digests", () => {
    const direction = SWDL_AGENT_DEFINITION_SEEDS.find(
      (seed) => seed.id === SWDL_AGENT_IDS.direction,
    )!;
    expect(direction.runPolicy.connectorBindings).toEqual([
      SWDL_DIRECTION_SLACK_BINDING,
    ]);
    expect(direction.runPolicy.enabledConnectorProviders).toEqual(["slack"]);
  });
});
