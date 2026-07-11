import type { AgentDefinitionSeed, ToolBundle } from "../agent-definition.js";
import { textToBlockNoteContent } from "../agent-definition.js";
import { loadAgentInstruction } from "./load-instruction.js";
import {
  SWDL_AGENT_IDS,
  SWDL_SPECIALIST_IDS,
  type SwdlAgentId,
} from "./swdl-ids.js";

type SwdlAgentMeta = {
  id: SwdlAgentId;
  title: string;
  description: string;
  instructionFile: string;
  toolBundles: ToolBundle[];
  allowedTriggers: NonNullable<
    AgentDefinitionSeed["runPolicy"]
  >["allowedTriggers"];
  linkedWorkerAgentIds?: string[];
};

/**
 * SWDL domain agents for SOFTWARE_DEV_TEMPLATE.
 * Assumes no generic built-in specialists/workers in the template seed.
 */
const SWDL_AGENT_META: SwdlAgentMeta[] = [
  {
    id: SWDL_AGENT_IDS.research,
    title: "SWDL Research",
    description:
      "Use when advancing market/user research, competitors, or hypotheses in the software-development workflow.",
    instructionFile: "swdl.research.md",
    toolBundles: ["graph.read", "graph.write", "tasks.manage", "connectors"],
    allowedTriggers: ["task", "manual"],
  },
  {
    id: SWDL_AGENT_IDS.planning,
    title: "SWDL Planning",
    description:
      "Use when shaping initiatives, PRDs, features, or user stories for human review on Manager/planning pages.",
    instructionFile: "swdl.planning.md",
    toolBundles: ["graph.read", "graph.write", "tasks.manage", "pages.author"],
    allowedTriggers: ["task", "manual"],
  },
  {
    id: SWDL_AGENT_IDS.delivery,
    title: "SWDL Delivery",
    description:
      "Use when creating or advancing build tasks, sprints, or pull requests for an initiative.",
    instructionFile: "swdl.delivery.md",
    toolBundles: ["graph.read", "graph.write", "tasks.manage", "sandbox.code"],
    allowedTriggers: ["task", "manual"],
  },
  {
    id: SWDL_AGENT_IDS.qa,
    title: "SWDL QA",
    description:
      "Use when verifying delivery against acceptance criteria, test plans, or launch readiness.",
    instructionFile: "swdl.qa.md",
    toolBundles: ["graph.read", "graph.write", "tasks.manage"],
    allowedTriggers: ["task", "manual"],
  },
  {
    id: SWDL_AGENT_IDS.direction,
    title: "SWDL Direction",
    description:
      "Use when running Cycle A cadences: quarterly planning, weekly KPI review, or roadmap rebalance via schedule and Slack.",
    instructionFile: "swdl.direction.md",
    toolBundles: ["graph.read", "graph.write", "tasks.manage", "connectors"],
    allowedTriggers: ["schedule", "chat", "chatbot", "manual"],
  },
  {
    id: SWDL_AGENT_IDS.orchestrator,
    title: "SWDL Orchestrator",
    description:
      "Use when running the weekday SWDL cadence: scan research→planning→delivery→QA and spawn_task to specialists.",
    instructionFile: "swdl.orchestrator.md",
    toolBundles: ["graph.read", "tasks.manage", "delegate", "workers"],
    allowedTriggers: ["schedule", "heartbeat", "manual"],
    linkedWorkerAgentIds: [...SWDL_SPECIALIST_IDS],
  },
];

/** Template / DB seeds — specialists first, orchestrator last (link targets exist). */
export const SWDL_AGENT_DEFINITION_SEEDS: AgentDefinitionSeed[] =
  SWDL_AGENT_META.map((entry) => ({
    id: entry.id,
    name: entry.title,
    description: entry.description,
    instructions: textToBlockNoteContent(
      loadAgentInstruction(entry.instructionFile),
    ),
    toolBundles: entry.toolBundles,
    nodeScopes: [],
    runPolicy: {
      allowedTriggers: entry.allowedTriggers,
      ...(entry.linkedWorkerAgentIds
        ? { linkedWorkerAgentIds: entry.linkedWorkerAgentIds }
        : {}),
      ...(entry.id === SWDL_AGENT_IDS.delivery
        ? { sandboxPolicy: "required" as const }
        : {}),
    },
  }));

export function listSwdlAgentIds(): SwdlAgentId[] {
  return SWDL_AGENT_META.map((e) => e.id);
}

export function getSwdlAgentMeta(id: string): SwdlAgentMeta | null {
  return SWDL_AGENT_META.find((e) => e.id === id) ?? null;
}
