/**
 * Stable UUIDs for built-in agent definitions. Seeded into every teamspace with
 * these exact ids so callers can reference agents without a separate key column.
 */
export const BUILTIN_AGENT_IDS = {
  main: "a0000000-0000-4000-8000-000000000001",
  implementFeature: "a0000000-0000-4000-8000-000000000002",
  reviewChanges: "a0000000-0000-4000-8000-000000000003",
  research: "a0000000-0000-4000-8000-000000000004",
  writeDocument: "a0000000-0000-4000-8000-000000000005",
  unblockTask: "a0000000-0000-4000-8000-000000000006",
  qa: "a0000000-0000-4000-8000-000000000007",
  workerNotion: "a0000000-0000-4000-8000-000000000010",
  workerGraphBatch: "a0000000-0000-4000-8000-000000000011",
  workerConnectorSync: "a0000000-0000-4000-8000-000000000012",
  workerReportBuilder: "a0000000-0000-4000-8000-000000000013",
  guideAgentAuthoring: "a0000000-0000-4000-8000-000000000020",
  guidePageAuthoring: "a0000000-0000-4000-8000-000000000021",
  guideScriptToolAuthoring: "a0000000-0000-4000-8000-000000000022",
  guideTaskDelegation: "a0000000-0000-4000-8000-000000000023",
} as const;

export type BuiltinAgentId =
  (typeof BUILTIN_AGENT_IDS)[keyof typeof BUILTIN_AGENT_IDS];

export const MAIN_AGENT_ID = BUILTIN_AGENT_IDS.main;

const BUILTIN_ID_SET = new Set<string>(Object.values(BUILTIN_AGENT_IDS));

const GUIDE_BUILTIN_ID_SET = new Set<string>([
  BUILTIN_AGENT_IDS.guideAgentAuthoring,
  BUILTIN_AGENT_IDS.guidePageAuthoring,
  BUILTIN_AGENT_IDS.guideScriptToolAuthoring,
  BUILTIN_AGENT_IDS.guideTaskDelegation,
]);

export function isBuiltinAgentId(id: string): id is BuiltinAgentId {
  return BUILTIN_ID_SET.has(id);
}

export function isGuideBuiltinAgentId(agentDefinitionId: string): boolean {
  return GUIDE_BUILTIN_ID_SET.has(agentDefinitionId);
}
