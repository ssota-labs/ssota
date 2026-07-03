import { describe, expect, it } from "vitest";
import {
  BUILTIN_AGENT_IDS,
  AGENT_DEFINITION_REGISTRY,
  getAgentDefinitionById,
  getMainAgentDefinition,
  isKnownBuiltinAgentId,
  listBuiltinAgentIds,
  listRoutableAgentIndex,
} from "./index.js";

describe("agent definition registry SSOT", () => {
  it("defines main, specialist, worker, and guide agents", () => {
    expect(listBuiltinAgentIds().length).toBeGreaterThanOrEqual(15);
    expect(isKnownBuiltinAgentId(BUILTIN_AGENT_IDS.main)).toBe(true);
    expect(isKnownBuiltinAgentId(BUILTIN_AGENT_IDS.implementFeature)).toBe(true);
    expect(isKnownBuiltinAgentId(BUILTIN_AGENT_IDS.workerNotion)).toBe(true);
    expect(isKnownBuiltinAgentId(BUILTIN_AGENT_IDS.guideAgentAuthoring)).toBe(
      true,
    );
    expect(
      isKnownBuiltinAgentId("00000000-0000-4000-8000-000000000099"),
    ).toBe(false);
  });

  it("every agent carries a skill-style description for routing", () => {
    for (const id of listBuiltinAgentIds()) {
      const entry = AGENT_DEFINITION_REGISTRY[id]!;
      if (!entry.referenceOnly) {
        expect(entry.description.length).toBeGreaterThan(20);
      }
    }
  });

  it("returns full instruction for main agent", () => {
    const agent = getAgentDefinitionById(BUILTIN_AGENT_IDS.main);
    expect(agent).not.toBeNull();
    expect(agent?.instruction).toContain("query_tasks");
    expect(agent?.isMain).toBe(true);
  });

  it("has unique agent ids", () => {
    const ids = listBuiltinAgentIds();
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("loads non-empty instructions for every registry entry", () => {
    for (const id of listBuiltinAgentIds()) {
      const entry = AGENT_DEFINITION_REGISTRY[id]!;
      expect(entry.instruction.length).toBeGreaterThan(50);
      expect(entry.id).toBe(id);
    }
  });

  it("getAgentDefinitionById returns null for unknown ids", () => {
    expect(
      getAgentDefinitionById("00000000-0000-4000-8000-000000000099"),
    ).toBeNull();
  });

  it("lists specialists and workers in routable manifest", () => {
    const routable = listRoutableAgentIndex();
    expect(
      routable.some((a) => a.id === BUILTIN_AGENT_IDS.implementFeature),
    ).toBe(true);
    expect(routable.some((a) => a.id === BUILTIN_AGENT_IDS.workerNotion)).toBe(
      true,
    );
    expect(routable.some((a) => a.id === BUILTIN_AGENT_IDS.main)).toBe(false);
    expect(
      routable.some((a) => a.id === BUILTIN_AGENT_IDS.guideAgentAuthoring),
    ).toBe(false);
  });

  it("hides reference guides from routable manifest but resolves them by id", () => {
    expect(
      getAgentDefinitionById(BUILTIN_AGENT_IDS.guidePageAuthoring),
    ).not.toBeNull();
    expect(
      listRoutableAgentIndex().some(
        (a) => a.id === BUILTIN_AGENT_IDS.guidePageAuthoring,
      ),
    ).toBe(false);
  });

  it("getMainAgentDefinition returns main builtin", () => {
    expect(getMainAgentDefinition().id).toBe(BUILTIN_AGENT_IDS.main);
  });
});
