/**
 * Stable UUIDs for Software Development Workflow (SWDL) domain agents.
 * Referenced by GatePolicy seeds (agentDefinitionId match / onPass spawn).
 */
export const SWDL_AGENT_IDS = {
  research: "a1000000-0000-4000-8000-000000000001",
  planning: "a1000000-0000-4000-8000-000000000002",
  delivery: "a1000000-0000-4000-8000-000000000003",
  qa: "a1000000-0000-4000-8000-000000000004",
  orchestrator: "a1000000-0000-4000-8000-000000000010",
} as const;

export type SwdlAgentId = (typeof SWDL_AGENT_IDS)[keyof typeof SWDL_AGENT_IDS];

const SWDL_ID_SET = new Set<string>(Object.values(SWDL_AGENT_IDS));

export function isSwdlAgentId(id: string): id is SwdlAgentId {
  return SWDL_ID_SET.has(id);
}

/** Specialists the SWDL orchestrator dispatches to (stable order). */
export const SWDL_SPECIALIST_IDS: SwdlAgentId[] = [
  SWDL_AGENT_IDS.research,
  SWDL_AGENT_IDS.planning,
  SWDL_AGENT_IDS.delivery,
  SWDL_AGENT_IDS.qa,
];
