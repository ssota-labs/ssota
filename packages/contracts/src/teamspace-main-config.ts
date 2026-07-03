import { z } from "zod";
import {
  BlockNoteContentSchema,
  RunPolicySchema,
  ToolBundleSchema,
  type ToolBundle,
} from "./agent-definition.js";

/** Default orchestrator tool bundles (code SSOT; overridable per teamspace). */
export const DEFAULT_MAIN_TOOL_BUNDLES: ToolBundle[] = [
  "graph.read",
  "graph.write",
  "tasks.manage",
  "pages.author",
  "connectors",
  "delegate",
  "skills.read",
];

export const DEFAULT_MAIN_RUN_POLICY = {
  allowedTriggers: [
    "chat",
    "chatbot",
    "heartbeat",
    "schedule",
    "manual",
  ],
} as const;

export const TeamspaceMainConfigSchema = z.object({
  teamspaceId: z.string().uuid(),
  instructions: BlockNoteContentSchema,
  toolBundles: z.array(ToolBundleSchema),
  runPolicy: RunPolicySchema,
  updatedAt: z.string(),
});

export type TeamspaceMainConfig = z.infer<typeof TeamspaceMainConfigSchema>;

export const UpdateTeamspaceMainConfigInputSchema = z.object({
  instructions: BlockNoteContentSchema.optional(),
  toolBundles: z.array(ToolBundleSchema).optional(),
  runPolicy: RunPolicySchema.optional(),
});

export type UpdateTeamspaceMainConfigInput = z.infer<
  typeof UpdateTeamspaceMainConfigInputSchema
>;
