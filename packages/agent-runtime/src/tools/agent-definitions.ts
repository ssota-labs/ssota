import { tool, type ToolSet } from "ai";
import { z } from "zod";
import {
  listAgentDefinitions,
  readAgentDefinitionById,
  readAgentDefinitionByKey,
} from "@ssota/core";
import {
  blockNoteContentToText,
  textToBlockNoteContent,
} from "@ssota/contracts";
import {
  getAgentDefinitionByKey,
  listRoutableAgentIndex,
} from "@ssota/contracts/agents";
import { getAgentDefinitionPort } from "../ports.js";
import { getRunContext } from "./context.js";

export function createAgentDefinitionTools(): ToolSet {
  return {
    list_agent_definitions: tool({
      description:
        "List agent definitions for this project (metadata only).",
      inputSchema: z.object({}),
      execute: async (_input, { context }) => {
        const ctx = getRunContext(context);
        const items = await listAgentDefinitions(
          getAgentDefinitionPort(ctx.teamspaceId, ctx.accountId),
        );
        const dbRows = items.map((definition) => ({
          id: definition.id as string | null,
          key: definition.key,
          name: definition.name,
          description: definition.description,
          agentKind: definition.agentKind,
        }));
        const dbKeys = new Set(dbRows.map((r) => r.key));
        const builtins = listRoutableAgentIndex()
          .filter((b) => !dbKeys.has(b.key))
          .map((b) => ({ id: null, ...b }));
        return { definitions: [...dbRows, ...builtins] };
      },
    }),

    get_agent_instruction: tool({
      description:
        "Fetch an agent definition playbook by id or key. Returns BlockNote content as plain text for reading. Load on demand — do not cache entire library inline.",
      inputSchema: z.object({
        id: z.string().uuid().optional(),
        key: z.string().optional(),
      }),
      execute: async (input, { context }) => {
        const ctx = getRunContext(context);
        const port = getAgentDefinitionPort(ctx.teamspaceId, ctx.accountId);
        const result = input.id
          ? await readAgentDefinitionById(port, input.id)
          : input.key
            ? await readAgentDefinitionByKey(port, input.key)
            : null;
        if (result) {
          return {
            found: true,
            id: result.definition.id,
            key: result.definition.key,
            name: result.definition.name,
            description: result.definition.description,
            text: blockNoteContentToText(result.definition.instructions),
          };
        }
        const builtin = input.key ? getAgentDefinitionByKey(input.key) : null;
        if (builtin) {
          return {
            found: true,
            id: null,
            key: builtin.agentKey,
            name: builtin.title,
            description: builtin.description,
            text: builtin.instruction,
          };
        }
        return { found: false };
      },
    }),

    write_agent_definition: tool({
      description:
        "Create or update an agent definition (upsert by key). Write the playbook as markdown in `body` — a clear step-by-step process. `description` is a skill-style 'when to use' line (routing quality depends on it).",
      inputSchema: z.object({
        key: z
          .string()
          .describe("Stable agent key, e.g. 'specialist.onboard_customer'."),
        name: z.string().describe("Human-readable title."),
        description: z
          .string()
          .describe("Skill-style 'when to use this agent' line."),
        body: z
          .string()
          .describe("The playbook as markdown / plain text."),
        agentKind: z
          .enum(["main", "specialist", "worker", "guide"])
          .optional()
          .describe("Agent kind; defaults to specialist."),
      }),
      execute: async (input, { context }) => {
        const ctx = getRunContext(context);
        try {
          const saved = await getAgentDefinitionPort(
            ctx.teamspaceId,
            ctx.accountId,
          ).upsertDefinition({
            key: input.key,
            name: input.name,
            description: input.description,
            instructions: textToBlockNoteContent(input.body),
            agentKind: input.agentKind ?? "specialist",
            toolBundles: [],
            nodeScopes: [],
            runPolicy: {},
          });
          return { ok: true, id: saved.id, key: saved.key };
        } catch (error) {
          return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    }),
  };
}

/** @deprecated Use createAgentDefinitionTools */
export const createWorkflowInstructionTools = createAgentDefinitionTools;
