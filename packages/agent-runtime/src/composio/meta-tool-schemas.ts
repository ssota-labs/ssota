/**
 * Fixed Composio Tool Router meta-tools. Composio sessions expose a small stable
 * set (search / execute / manage connections) — not per-toolkit action defs.
 * Schemas match Composio meta-tool reference; declared statically for WorkflowAgent.
 */
import { z } from "zod";

export const COMPOSIO_META_TOOL_NAMES = [
  "COMPOSIO_SEARCH_TOOLS",
  "COMPOSIO_GET_TOOL_SCHEMAS",
  "COMPOSIO_MULTI_EXECUTE_TOOL",
  "COMPOSIO_MANAGE_CONNECTIONS",
] as const;

export type ComposioMetaToolName = (typeof COMPOSIO_META_TOOL_NAMES)[number];

export const composioMetaToolSchemas = {
  COMPOSIO_SEARCH_TOOLS: z.object({
    queries: z
      .array(
        z.object({
          use_case: z.string().min(1),
          known_fields: z.string().optional(),
        }),
      )
      .min(1),
    session: z
      .object({
        id: z.string().optional(),
        generate_id: z.boolean().optional(),
      })
      .optional(),
    model: z.string().optional(),
  }),
  COMPOSIO_GET_TOOL_SCHEMAS: z.object({
    tool_slugs: z.array(z.string().min(1)).min(1),
  }),
  COMPOSIO_MULTI_EXECUTE_TOOL: z.object({
    tools: z
      .array(
        z.object({
          tool_slug: z.string().min(1),
          arguments: z.record(z.unknown()),
        }),
      )
      .min(1),
    thought: z.string().optional(),
    sync_response_to_workbench: z.boolean().optional(),
    current_step: z.string().optional(),
    current_step_metric: z.string().optional(),
    session_id: z.string().optional(),
  }),
  COMPOSIO_MANAGE_CONNECTIONS: z.object({
    toolkit: z.string().optional(),
    action: z
      .enum(["connect", "disconnect", "list", "status"])
      .optional()
      .describe("Connection management action; omit to list/status."),
    connected_account_id: z.string().optional(),
  }),
} as const satisfies Record<ComposioMetaToolName, z.ZodTypeAny>;

export const COMPOSIO_META_TOOL_DESCRIPTIONS: Record<ComposioMetaToolName, string> = {
  COMPOSIO_SEARCH_TOOLS:
    "Discover relevant third-party tools across connected apps. Call first when an external service action is needed.",
  COMPOSIO_GET_TOOL_SCHEMAS:
    "Fetch full input schemas for tool slugs returned by COMPOSIO_SEARCH_TOOLS.",
  COMPOSIO_MULTI_EXECUTE_TOOL:
    "Execute up to 50 discovered tools in parallel using exact schemas from search.",
  COMPOSIO_MANAGE_CONNECTIONS:
    "Connect, disconnect, or inspect OAuth connections for external toolkits.",
};

const COMPOSIO_META_TOOL_SET = new Set<string>(COMPOSIO_META_TOOL_NAMES);

export function isComposioMetaToolName(name: string): name is ComposioMetaToolName {
  return COMPOSIO_META_TOOL_SET.has(name);
}
