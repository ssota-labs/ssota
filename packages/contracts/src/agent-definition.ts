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
  "skills.read",
  "sandbox.code",
]);

export type ToolBundle = z.infer<typeof ToolBundleSchema>;

/** Bundles merged into every runnable agent at runtime. */
export const DEFAULT_AGENT_TOOL_BUNDLES: ToolBundle[] = [
  "graph.read",
  "tasks.manage",
  "connectors",
  "script_tools",
];

export function mergeAgentToolBundles(bundles: ToolBundle[]): ToolBundle[] {
  return [...new Set([...DEFAULT_AGENT_TOOL_BUNDLES, ...bundles])];
}

export const NodeScopeSchema = z.object({
  catalogKeys: z.array(z.string()).optional(),
  nodeIds: z.array(z.string().uuid()).optional(),
  traversePolicy: z.enum(["none", "outbound", "inbound", "both"]).optional(),
});

export type NodeScope = z.infer<typeof NodeScopeSchema>;

/** Connection-based trigger (Slack, Notion, etc.) configured per agent. */
export const ConnectionTriggerSchema = z.object({
  id: z.string().min(1),
  provider: z.string().min(1),
  kind: z.string().min(1),
  label: z.string().min(1),
  enabled: z.boolean().default(true),
  /** Slack user group id (S…); set when `kind` is `agent_mentioned`. */
  slackUserGroupId: z.string().optional(),
  /** Slack @mention handle without `@` (e.g. `content-planner`). */
  slackUserGroupHandle: z.string().optional(),
  /** When false, skip Chat SDK typing indicator for this trigger. */
  showTypingIndicator: z.boolean().optional(),
});

export type ConnectionTrigger = z.infer<typeof ConnectionTriggerSchema>;

/** Per-tool permission for a connector binding on an agent. */
export const ConnectorToolPermissionSchema = z.enum([
  "allow",
  "approval",
  "block",
]);

export type ConnectorToolPermission = z.infer<
  typeof ConnectorToolPermissionSchema
>;

/** Per-connection toolkit access bound to an agent (Composio connected-account id). */
export const AgentConnectorBindingSchema = z.object({
  connectionId: z.string().min(1),
  provider: z.string().min(1),
  scope: z.enum(["user", "org"]),
  /** Display snapshot — account label at bind time. */
  accountLabel: z.string().optional(),
  /** Tool slug → permission. Omitted slugs default to allow at runtime. */
  toolPermissions: z
    .record(z.string(), ConnectorToolPermissionSchema)
    .optional(),
});

export type AgentConnectorBinding = z.infer<typeof AgentConnectorBindingSchema>;

export const RunPolicySchema = z.object({
  model: z.string().optional(),
  maxSteps: z.number().int().positive().optional(),
  sandboxPolicy: z.enum(["none", "optional", "required"]).optional(),
  sandboxAccess: z.enum(["none", "inspect", "code"]).optional(),
  allowedTriggers: z.array(AgentTriggerSchema).optional(),
  approvalPolicy: z.enum(["none", "gate", "human"]).optional(),
  timeoutMs: z.number().int().positive().optional(),
  /** Worker agent definitions linked as delegate targets for this agent. */
  linkedWorkerAgentIds: z.array(z.string().uuid()).optional(),
  /** Composio connector providers this agent may use (empty = none selected). */
  enabledConnectorProviders: z.array(z.string()).optional(),
  /** Explicit connected-account bindings (preferred over provider-level toggles). */
  connectorBindings: z.array(AgentConnectorBindingSchema).optional(),
  /** External connection event triggers (Slack, Notion, etc.). */
  connectionTriggers: z.array(ConnectionTriggerSchema).optional(),
});

/** Unique toolkit slugs from bindings, or legacy enabledConnectorProviders. */
export function deriveEnabledConnectorProviders(
  runPolicy: Pick<RunPolicy, "connectorBindings" | "enabledConnectorProviders">,
): string[] {
  const fromBindings = runPolicy.connectorBindings?.map((b) => b.provider) ?? [];
  if (fromBindings.length > 0) {
    return [...new Set(fromBindings)].sort();
  }
  return [...(runPolicy.enabledConnectorProviders ?? [])].sort();
}

/** Agent-blocked tool slugs grouped by Composio toolkit. */
export function deriveBlockedToolsByToolkit(
  bindings: AgentConnectorBinding[],
): Record<string, string[]> {
  const grouped = new Map<string, Set<string>>();
  for (const binding of bindings) {
    if (!binding.toolPermissions) continue;
    for (const [slug, permission] of Object.entries(binding.toolPermissions)) {
      if (permission !== "block") continue;
      const slugs = grouped.get(binding.provider) ?? new Set<string>();
      slugs.add(slug);
      grouped.set(binding.provider, slugs);
    }
  }
  return Object.fromEntries(
    [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([toolkit, slugs]) => [toolkit, [...slugs].sort()]),
  );
}

/** Agent approval-required tool slugs grouped by Composio toolkit. */
export function deriveApprovalToolsByToolkit(
  bindings: AgentConnectorBinding[],
): Record<string, string[]> {
  const grouped = new Map<string, Set<string>>();
  for (const binding of bindings) {
    if (!binding.toolPermissions) continue;
    for (const [slug, permission] of Object.entries(binding.toolPermissions)) {
      if (permission !== "approval") continue;
      const slugs = grouped.get(binding.provider) ?? new Set<string>();
      slugs.add(slug);
      grouped.set(binding.provider, slugs);
    }
  }
  return Object.fromEntries(
    [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([toolkit, slugs]) => [toolkit, [...slugs].sort()]),
  );
}

export type RunPolicy = z.infer<typeof RunPolicySchema>;

export const AgentDefinitionSchema = z.object({
  id: z.string().uuid(),
  teamspaceId: z.string().uuid(),
  accountId: z.string().uuid().nullable(),
  name: z.string().min(1),
  description: z.string(),
  instructions: BlockNoteContentSchema,
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
});

export type AgentDefinitionIndex = z.infer<typeof AgentDefinitionIndexSchema>;

export const AgentDefinitionSeedSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().default(""),
  instructions: BlockNoteContentSchema,
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
