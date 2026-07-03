import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import {
  listAgentDefinitions,
  readAgentDefinitionById,
} from "@ssota/core";
import {
  blockNoteContentToText,
  textToBlockNoteContent,
} from "@ssota/contracts";
import { getAgentDefinitionById } from "@ssota/contracts/agents";
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
        return {
          definitions: items.map((definition) => ({
            id: definition.id,
            name: definition.name,
            description: definition.description,
          })),
        };
      },
    }),

    get_agent_instruction: tool({
      description:
        "Fetch an agent definition playbook by id. Returns BlockNote content as plain text for reading. Load on demand — do not cache entire library inline.",
      inputSchema: z.object({
        id: z.string().uuid(),
      }),
      execute: async (input, { context }) => {
        const ctx = getRunContext(context);
        const port = getAgentDefinitionPort(ctx.teamspaceId, ctx.accountId);
        const result = await readAgentDefinitionById(port, input.id);
        if (result) {
          return {
            found: true,
            id: result.definition.id,
            name: result.definition.name,
            description: result.definition.description,
            text: blockNoteContentToText(result.definition.instructions),
          };
        }
        const builtin = getAgentDefinitionById(input.id);
        if (builtin) {
          return {
            found: true,
            id: builtin.id,
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
        "Create or update an agent definition (upsert by id). Omit id to create a new agent. Write the playbook as markdown in `body` — a clear step-by-step process. `description` is a skill-style 'when to use' line (routing quality depends on it).",
      inputSchema: z.object({
        id: z.string().uuid().optional(),
        name: z.string().describe("Human-readable title."),
        description: z
          .string()
          .describe("Skill-style 'when to use this agent' line."),
        body: z
          .string()
          .describe("The playbook as markdown / plain text."),
      }),
      execute: async (input, { context }) => {
        const ctx = getRunContext(context);
        try {
          const saved = await getAgentDefinitionPort(
            ctx.teamspaceId,
            ctx.accountId,
          ).upsertDefinition({
            id: input.id ?? randomUUID(),
            name: input.name,
            description: input.description,
            instructions: textToBlockNoteContent(input.body),
            toolBundles: [],
            nodeScopes: [],
            runPolicy: {},
          });
          return { ok: true, id: saved.id };
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
