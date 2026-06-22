import { tool, type ToolSet } from "ai";
import { z } from "zod";
import {
  listWorkflowInstructions,
  readWorkflowInstructionById,
  readWorkflowInstructionByKey,
} from "@ssota/core";
import {
  UpsertWorkflowInstructionInputSchema,
  blockNoteContentToText,
} from "@ssota/contracts";
import { getWorkflowInstructionPort } from "../ports.js";
import { getRunContext } from "./context.js";

export function createWorkflowInstructionTools(): ToolSet {
  return {
    list_workflow_instructions: tool({
      description:
        "List workflow instruction definitions for this project (metadata only).",
      inputSchema: z.object({}),
      execute: async (_input, { experimental_context }) => {
        const ctx = getRunContext(experimental_context);
        const items = await listWorkflowInstructions(
          getWorkflowInstructionPort(ctx.projectId, ctx.accountId),
        );
        return {
          instructions: items.map(({ instruction }) => ({
            id: instruction.id,
            key: instruction.key,
            name: instruction.name,
            description: instruction.description,
          })),
        };
      },
    }),

    get_workflow_instruction: tool({
      description:
        "Fetch a workflow instruction playbook by id or key. Returns BlockNote content as plain text for reading. Load on demand — do not cache entire library inline.",
      inputSchema: z.object({
        id: z.string().uuid().optional(),
        key: z.string().optional(),
      }),
      execute: async (input, { experimental_context }) => {
        const ctx = getRunContext(experimental_context);
        const port = getWorkflowInstructionPort(ctx.projectId, ctx.accountId);
        const result = input.id
          ? await readWorkflowInstructionById(port, input.id)
          : input.key
            ? await readWorkflowInstructionByKey(port, input.key, ctx.accountId)
            : null;
        if (!result) return { found: false };
        return {
          found: true,
          id: result.instruction.id,
          key: result.instruction.key,
          name: result.instruction.name,
          description: result.instruction.description,
          text: blockNoteContentToText(result.instruction.content),
        };
      },
    }),

    write_workflow_instruction: tool({
      description:
        "Create or update a workflow instruction (upsert by key). Fields: key, name, description, content (BlockNote json array).",
      inputSchema: z.object({
        definition: UpsertWorkflowInstructionInputSchema,
      }),
      execute: async (input, { experimental_context }) => {
        const ctx = getRunContext(experimental_context);
        try {
          const saved = await getWorkflowInstructionPort(
            ctx.projectId,
            ctx.accountId,
          ).upsertInstruction(input.definition);
          return { ok: true, instruction: saved };
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
