import type {
  AgentConnectorBinding,
  AgentDefinitionSeed,
  ToolBundle,
} from "../agent-definition.js";
import { deriveEnabledConnectorProviders, textToBlockNoteContent } from "../agent-definition.js";
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
  connectorBindings?: AgentConnectorBinding[];
};

/** Dev/stub Slack org account — matches `AGENT_TOOLS_CONNECTION_SEED` in web console. */
export const SWDL_DIRECTION_SLACK_BINDING: AgentConnectorBinding = {
  connectionId: "seed-slack-org-1",
  provider: "slack",
  scope: "org",
  accountLabel: "ssota-labs.slack.com",
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
    toolBundles: [],
    allowedTriggers: ["task", "manual"],
  },
  {
    id: SWDL_AGENT_IDS.planning,
    title: "SWDL Planning",
    description:
      "Use when shaping initiatives, PRDs, features, or user stories for human review on Manager/planning pages.",
    instructionFile: "swdl.planning.md",
    toolBundles: [],
    allowedTriggers: ["task", "manual"],
  },
  {
    id: SWDL_AGENT_IDS.delivery,
    title: "SWDL Delivery",
    description:
      "Use when creating or advancing build tasks, sprints, or pull requests for an initiative.",
    instructionFile: "swdl.delivery.md",
    toolBundles: ["sandbox.code"],
    allowedTriggers: ["task", "manual"],
  },
  {
    id: SWDL_AGENT_IDS.qa,
    title: "SWDL QA",
    description:
      "Use when verifying delivery against acceptance criteria, test plans, or launch readiness.",
    instructionFile: "swdl.qa.md",
    toolBundles: [],
    allowedTriggers: ["task", "manual"],
  },
  {
    id: SWDL_AGENT_IDS.design,
    title: "SWDL Design",
    description:
      "Use when advancing the design track: IA, user flows, wireframes/prototypes, design crit prep, or ui_component/design_theme upkeep.",
    instructionFile: "swdl.design.md",
    toolBundles: [],
    allowedTriggers: ["task", "manual"],
  },
  {
    id: SWDL_AGENT_IDS.direction,
    title: "SWDL Direction",
    description:
      "Use when running Cycle A cadences: quarterly planning, weekly KPI review, or roadmap rebalance via schedule and Slack.",
    instructionFile: "swdl.direction.md",
    toolBundles: [],
    allowedTriggers: ["schedule", "chat", "chatbot", "manual"],
    connectorBindings: [SWDL_DIRECTION_SLACK_BINDING],
  },
  {
    id: SWDL_AGENT_IDS.orchestrator,
    title: "SWDL Orchestrator",
    description:
      "Use when running the weekday SWDL cadence: scan research→planning→delivery→QA and spawn_task to specialists.",
    instructionFile: "swdl.orchestrator.md",
    toolBundles: ["delegate"],
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
      ...(entry.connectorBindings
        ? {
            connectorBindings: entry.connectorBindings,
            enabledConnectorProviders: deriveEnabledConnectorProviders({
              connectorBindings: entry.connectorBindings,
            }),
          }
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
