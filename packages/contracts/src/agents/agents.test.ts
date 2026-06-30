import { describe, expect, it } from "vitest";
import {
  AGENT_DEFINITION_KEYS,
  AGENT_DEFINITION_REGISTRY,
  getAgentDefinitionByKey,
  getMainAgentDefinition,
  isKnownAgentKey,
  listAgentDefinitionKeys,
  listAgentsByKind,
  listRoutableAgentIndex,
} from "./index.js";

describe("agent definition registry SSOT", () => {
  it("defines main, specialist, worker, and guide agents", () => {
    expect(AGENT_DEFINITION_KEYS.length).toBeGreaterThanOrEqual(15);
    expect(isKnownAgentKey("main.ssota")).toBe(true);
    expect(isKnownAgentKey("specialist.implement_feature")).toBe(true);
    expect(isKnownAgentKey("worker.notion")).toBe(true);
    expect(isKnownAgentKey("guide.agent_authoring")).toBe(true);
    expect(isKnownAgentKey("unknown.agent")).toBe(false);
  });

  it("no longer defines legacy workflow keys", () => {
    expect(isKnownAgentKey("orchestrator.daily")).toBe(false);
    expect(isKnownAgentKey("work.implement_feature")).toBe(false);
    expect(isKnownAgentKey("agent.setup")).toBe(false);
    expect(isKnownAgentKey("agent.main")).toBe(false);
  });

  it("every agent carries a skill-style description for routing", () => {
    for (const key of AGENT_DEFINITION_KEYS) {
      const entry = AGENT_DEFINITION_REGISTRY[key]!;
      if (!entry.reference) {
        expect(entry.description.length).toBeGreaterThan(20);
      }
    }
  });

  it("returns full instruction for main.ssota", () => {
    const agent = getAgentDefinitionByKey("main.ssota");
    expect(agent).not.toBeNull();
    expect(agent?.instruction).toContain("main.ssota");
    expect(agent?.instruction).toContain("query_tasks");
    expect(agent?.agentKind).toBe("main");
  });

  it("has unique agent keys", () => {
    const keys = listAgentDefinitionKeys();
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("loads non-empty instructions for every registry entry", () => {
    for (const key of AGENT_DEFINITION_KEYS) {
      const entry = AGENT_DEFINITION_REGISTRY[key]!;
      expect(entry.instruction.length).toBeGreaterThan(50);
      expect(entry.agentKey).toBe(key);
    }
  });

  it("getAgentDefinitionByKey returns null for unknown keys", () => {
    expect(getAgentDefinitionByKey("not.an.agent")).toBeNull();
  });

  it("lists specialists and workers in routable manifest", () => {
    const routable = listRoutableAgentIndex();
    expect(routable.some((a) => a.key === "specialist.implement_feature")).toBe(
      true,
    );
    expect(routable.some((a) => a.key === "worker.notion")).toBe(true);
    expect(routable.some((a) => a.key === "main.ssota")).toBe(false);
    expect(routable.some((a) => a.key.startsWith("guide."))).toBe(false);
  });

  it("hides reference guides from routable manifest but resolves them by key", () => {
    expect(
      getAgentDefinitionByKey("guide.page_authoring"),
    ).not.toBeNull();
    expect(
      listRoutableAgentIndex().some((a) => a.key === "guide.page_authoring"),
    ).toBe(false);
  });

  it("getMainAgentDefinition returns main.ssota", () => {
    expect(getMainAgentDefinition().agentKey).toBe("main.ssota");
  });

  it("groups agents by kind", () => {
    expect(listAgentsByKind("main")).toHaveLength(1);
    expect(listAgentsByKind("specialist").length).toBeGreaterThanOrEqual(6);
    expect(listAgentsByKind("worker").length).toBeGreaterThanOrEqual(4);
    expect(listAgentsByKind("guide").length).toBeGreaterThanOrEqual(4);
  });
});
