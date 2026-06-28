import { z } from "zod";

/** BlockNote block — stored as jsonb; validated loosely at the boundary. */
export const BlockNoteContentSchema = z.array(z.record(z.unknown()));

export type BlockNoteContent = z.infer<typeof BlockNoteContentSchema>;

export const WorkflowInstructionSchema = z.object({
  id: z.string().uuid(),
  teamspaceId: z.string().uuid(),
  accountId: z.string().uuid().nullable(),
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  content: BlockNoteContentSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type WorkflowInstruction = z.infer<typeof WorkflowInstructionSchema>;

export const WorkflowInstructionIndexSchema = z.object({
  id: z.string().uuid(),
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
});

export type WorkflowInstructionIndex = z.infer<
  typeof WorkflowInstructionIndexSchema
>;

export const WorkflowInstructionSeedSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
  content: BlockNoteContentSchema,
});

export type WorkflowInstructionSeed = z.infer<
  typeof WorkflowInstructionSeedSchema
>;

export const UpsertWorkflowInstructionInputSchema = WorkflowInstructionSeedSchema;

export type UpsertWorkflowInstructionInput = z.infer<
  typeof UpsertWorkflowInstructionInputSchema
>;

export const AgentRuntimeKindSchema = z.enum(["main", "task", "scheduler"]);

export type AgentRuntimeKind = z.infer<typeof AgentRuntimeKindSchema>;

/** Convert markdown/plain text to a minimal BlockNote document. */
export function textToBlockNoteContent(text: string): BlockNoteContent {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 0);
  if (paragraphs.length === 0) {
    return [{ type: "paragraph", content: [{ type: "text", text: "" }] }];
  }
  return paragraphs.map((paragraph) => ({
    type: "paragraph",
    content: [{ type: "text", text: paragraph.trim() }],
  }));
}

/** Serialize BlockNote content to plain text for agent prompts. */
export function blockNoteContentToText(content: BlockNoteContent): string {
  return content
    .map((block) => {
      const parts = block.content;
      if (!Array.isArray(parts)) return "";
      return parts
        .map((part) => {
          if (
            part &&
            typeof part === "object" &&
            "type" in part &&
            part.type === "text" &&
            "text" in part &&
            typeof part.text === "string"
          ) {
            return part.text;
          }
          return "";
        })
        .join("");
    })
    .filter(Boolean)
    .join("\n\n");
}
