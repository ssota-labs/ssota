import { SWDL_AGENT_IDS, type SwdlAgentId } from "../swdl-ids.js";

/** Domain Pack skill keys — not repo `.agents/skills` builtins. */
export const SWDL_SKILL_KEYS = [
  "swdl-graph-ops",
  "swdl-task-contract",
  "swdl-handoff",
  "swdl-research-pipeline",
  "swdl-planning-pipeline",
  "swdl-delivery-pipeline",
  "swdl-qa-pipeline",
  "swdl-orchestrate",
] as const;

export type SwdlSkillKey = (typeof SWDL_SKILL_KEYS)[number];

const SHARED_SPECIALIST: SwdlSkillKey[] = [
  "swdl-graph-ops",
  "swdl-task-contract",
  "swdl-handoff",
];

/** Agent definition id → skill keys (Progressive Disclosure pack). */
export const SWDL_AGENT_SKILL_KEYS: Record<SwdlAgentId, readonly SwdlSkillKey[]> =
  {
    [SWDL_AGENT_IDS.research]: [
      ...SHARED_SPECIALIST,
      "swdl-research-pipeline",
    ],
    [SWDL_AGENT_IDS.planning]: [
      ...SHARED_SPECIALIST,
      "swdl-planning-pipeline",
    ],
    [SWDL_AGENT_IDS.delivery]: [
      ...SHARED_SPECIALIST,
      "swdl-delivery-pipeline",
    ],
    [SWDL_AGENT_IDS.qa]: [...SHARED_SPECIALIST, "swdl-qa-pipeline"],
    [SWDL_AGENT_IDS.orchestrator]: ["swdl-task-contract", "swdl-orchestrate"],
  };
