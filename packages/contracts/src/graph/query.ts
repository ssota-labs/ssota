import { z } from "zod";
import { LifecycleStatusSchema } from "../definitions.js";
import { edgeTypeSchema } from "../catalog/edge-types.js";
import { nodeTypeSchema } from "../catalog/node-types.js";

export const listNodesByTypeInputSchema = z.object({
  projectId: z.string().uuid(),
  nodeType: nodeTypeSchema.optional(),
  lifecycleStatus: LifecycleStatusSchema.optional(),
  limit: z.number().int().positive().max(500).default(100),
  offset: z.number().int().nonnegative().default(0),
});

export type ListNodesByTypeInput = z.input<typeof listNodesByTypeInputSchema>;

export const traverseEdgesInputSchema = z.object({
  projectId: z.string().uuid(),
  nodeId: z.string().uuid(),
  direction: z.enum(["outgoing", "incoming", "both"]).default("both"),
  edgeType: edgeTypeSchema.optional(),
});

export type TraverseEdgesInput = z.input<typeof traverseEdgesInputSchema>;

export const getNodeInputSchema = z.object({
  projectId: z.string().uuid(),
  nodeId: z.string().uuid(),
});

export type GetNodeInput = z.infer<typeof getNodeInputSchema>;

export const traverseFromInitiativeInputSchema = z.object({
  projectId: z.string().uuid(),
  initiativeId: z.string().uuid(),
  edgeType: edgeTypeSchema.optional(),
  limit: z.number().int().positive().max(500).default(100),
});

export type TraverseFromInitiativeInput = z.infer<
  typeof traverseFromInitiativeInputSchema
>;

export const getEvergreenSingletonInputSchema = z.object({
  projectId: z.string().uuid(),
  nodeType: nodeTypeSchema,
});

export type GetEvergreenSingletonInput = z.infer<
  typeof getEvergreenSingletonInputSchema
>;
