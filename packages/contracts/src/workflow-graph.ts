import { z } from "zod";

/** Stable snake_case identifier for workflow routing and MCP lookup. */
export const WorkflowKeySchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]*$/, "workflowKey must be snake_case");

export type WorkflowKey = z.infer<typeof WorkflowKeySchema>;

export const WorkflowExternalLinkSourceSchema = z.enum([
  "notion",
  "gdrive",
  "gmail",
  "generic",
]);

export type WorkflowExternalLinkSource = z.infer<
  typeof WorkflowExternalLinkSourceSchema
>;

/** External resource link on Route or Step (progressive disclosure). */
export const WorkflowExternalLinkSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  url: z.string().url(),
  source: WorkflowExternalLinkSourceSchema.optional(),
});

export type WorkflowExternalLink = z.infer<typeof WorkflowExternalLinkSchema>;

export const RouteOutletTargetSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("step"),
    stepId: z.string().min(1),
  }),
  z.object({
    kind: z.literal("route"),
    routeId: z.string().min(1),
  }),
  z.object({
    kind: z.literal("workflow"),
    workflowBlockId: z.string().min(1),
  }),
]);

export type RouteOutletTarget = z.infer<typeof RouteOutletTargetSchema>;

export const RouteOutletSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  target: RouteOutletTargetSchema.nullable().optional(),
});

export type RouteOutlet = z.infer<typeof RouteOutletSchema>;

/** Multi-outlet routing block — agent picks outlet using routingInstructionUrl + links. */
export const RouteBlockSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  routingInstructionUrl: z.string().url().nullable().optional(),
  links: z.array(WorkflowExternalLinkSchema).default([]),
  outlets: z.array(RouteOutletSchema).default([]),
});

export type RouteBlock = z.infer<typeof RouteBlockSchema>;

/** Canvas node referencing another workflow (single workflowKey). */
export const WorkflowBlockRefSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  workflowKey: WorkflowKeySchema,
});

export type WorkflowBlockRef = z.infer<typeof WorkflowBlockRefSchema>;

/** First executable node after Context on the main spine. */
export const WorkflowFlowEntrySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("step"),
    stepId: z.string().min(1),
  }),
  z.object({
    kind: z.literal("route"),
    routeId: z.string().min(1),
  }),
]);

export type WorkflowFlowEntry = z.infer<typeof WorkflowFlowEntrySchema>;
