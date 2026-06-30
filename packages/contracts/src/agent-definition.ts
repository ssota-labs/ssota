import { z } from "zod";

/** BlockNote block — stored as jsonb; validated loosely at the boundary. */
export const BlockNoteContentSchema = z.array(z.record(z.unknown()));

export type BlockNoteContent = z.infer<typeof BlockNoteContentSchema>;

export const AgentTriggerSchema = z.enum([
  "chat",
  "chatbot",
  "task",
  "schedule",
  "heartbeat",
  "manual",
  "gate_resume",
]);

export type AgentTrigger = z.infer<typeof AgentTriggerSchema>;

export const ToolBundleSchema = z.enum([
  "graph.read",
  "graph.write",
  "tasks.manage",
  "pages.author",
  "connectors",
  "delegate",
  "script_tools",
  "sandbox.code",
]);

export type ToolBundle = z.infer<typeof ToolBundleSchema>;

export const NodeScopeSchema = z.object({
  catalogKeys: z.array(z.string()).optional(),
  nodeIds: z.array(z.string().uuid()).optional(),
  traversePolicy: z.enum(["none", "outbound", "inbound", "both"]).optional(),
});

export type NodeScope = z.infer<typeof NodeScopeSchema>;

export const RunPolicySchema = z.object({
  model: z.string().optional(),
  maxSteps: z.number().int().positive().optional(),
  sandboxPolicy: z.enum(["none", "optional", "required"]).optional(),
  allowedTriggers: z.array(AgentTriggerSchema).optional(),
  approvalPolicy: z.enum(["none", "gate", "human"]).optional(),
  timeoutMs: z.number().int().positive().optional(),
  /** Worker agent definitions linked as delegate targets for this agent. */
  linkedWorkerAgentIds: z.array(z.string().uuid()).optional(),
});

export type RunPolicy = z.infer<typeof RunPolicySchema>;

export const AgentDefinitionSchema = z.object({
  id: z.string().uuid(),
  teamspaceId: z.string().uuid(),
  accountId: z.string().uuid().nullable(),
  name: z.string().min(1),
  description: z.string(),
  instructions: BlockNoteContentSchema,
  isMain: z.boolean().default(false),
  referenceOnly: z.boolean().default(false),
  toolBundles: z.array(ToolBundleSchema).default([]),
  nodeScopes: z.array(NodeScopeSchema).default([]),
  runPolicy: RunPolicySchema.default({}),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AgentDefinition = z.infer<typeof AgentDefinitionSchema>;

export const AgentDefinitionIndexSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string(),
  isMain: z.boolean().default(false),
  referenceOnly: z.boolean().default(false),
});

export type AgentDefinitionIndex = z.infer<typeof AgentDefinitionIndexSchema>;

export const AgentDefinitionSeedSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().default(""),
  instructions: BlockNoteContentSchema,
  isMain: z.boolean().default(false),
  referenceOnly: z.boolean().default(false),
  toolBundles: z.array(ToolBundleSchema).default([]),
  nodeScopes: z.array(NodeScopeSchema).default([]),
  runPolicy: RunPolicySchema.default({}),
});

export type AgentDefinitionSeed = z.infer<typeof AgentDefinitionSeedSchema>;

export const UpsertAgentDefinitionInputSchema = AgentDefinitionSeedSchema;

export type UpsertAgentDefinitionInput = z.infer<
  typeof UpsertAgentDefinitionInputSchema
>;

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
