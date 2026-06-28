import { tool, type ToolSet } from "ai";
import { z } from "zod";
import {
  listWorkflowInstructions,
  readWorkflowInstructionById,
  readWorkflowInstructionByKey,
} from "@ssota/core";
import {
  blockNoteContentToText,
  textToBlockNoteContent,
} from "@ssota/contracts";
import {
  getBuiltinWorkflowByKey,
  listBuiltinWorkflowIndex,
} from "@ssota/contracts/workflows";
import { getWorkflowInstructionPort } from "../ports.js";
import { getRunContext } from "./context.js";

export function createWorkflowInstructionTools(): ToolSet {
  return {
    list_workflow_instructions: tool({
      description:
        "List workflow instruction definitions for this project (metadata only).",
      inputSchema: z.object({}),
      execute: async (_input, { context }) => {
        const ctx = getRunContext(context);
        const items = await listWorkflowInstructions(
          getWorkflowInstructionPort(ctx.teamspaceId, ctx.accountId),
        );
        const dbRows = items.map(({ instruction }) => ({
          id: instruction.id as string | null,
          key: instruction.key,
          name: instruction.name,
          description: instruction.description,
        }));
        const dbKeys = new Set(dbRows.map((r) => r.key));
        // DB rows override built-ins with the same key.
        const builtins = listBuiltinWorkflowIndex()
          .filter((b) => !dbKeys.has(b.key))
          .map((b) => ({ id: null, ...b }));
        return { instructions: [...dbRows, ...builtins] };
      },
    }),

    get_workflow_instruction: tool({
      description:
        "Fetch a workflow instruction playbook by id or key. Returns BlockNote content as plain text for reading. Load on demand — do not cache entire library inline.",
      inputSchema: z.object({
        id: z.string().uuid().optional(),
        key: z.string().optional(),
      }),
      execute: async (input, { context }) => {
        const ctx = getRunContext(context);
        const port = getWorkflowInstructionPort(ctx.teamspaceId, ctx.accountId);
        const result = input.id
          ? await readWorkflowInstructionById(port, input.id)
          : input.key
            ? await readWorkflowInstructionByKey(port, input.key, ctx.accountId)
            : null;
        if (result) {
          return {
            found: true,
            id: result.instruction.id,
            key: result.instruction.key,
            name: result.instruction.name,
            description: result.instruction.description,
            text: blockNoteContentToText(result.instruction.content),
          };
        }
        // Fall back to a code-defined built-in workflow (e.g. agent.setup),
        // which is not seeded into the DB.
        const builtin = input.key ? getBuiltinWorkflowByKey(input.key) : null;
        if (builtin) {
          return {
            found: true,
            id: null,
            key: builtin.workflowKey,
            name: builtin.title,
            description: builtin.description,
            text: builtin.instruction,
          };
        }
        return { found: false };
      },
    }),

    write_workflow_instruction: tool({
      description:
        "Create or update a workflow instruction (upsert by key). Write the playbook as markdown in `body` — a clear step-by-step process. `description` is a skill-style 'when to use' line (routing quality depends on it).",
      inputSchema: z.object({
        key: z
          .string()
          .describe("Stable workflow key, e.g. 'work.onboard_customer'."),
        name: z.string().describe("Human-readable title."),
        description: z
          .string()
          .describe("Skill-style 'when to use this workflow' line."),
        body: z
          .string()
          .describe("The playbook as markdown / plain text."),
      }),
      execute: async (input, { context }) => {
        const ctx = getRunContext(context);
        try {
          const saved = await getWorkflowInstructionPort(
            ctx.teamspaceId,
            ctx.accountId,
          ).upsertInstruction({
            key: input.key,
            name: input.name,
            description: input.description,
            content: textToBlockNoteContent(input.body),
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
