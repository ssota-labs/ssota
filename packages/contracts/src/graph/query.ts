import { z } from "zod";

export const listNodesByTypeInputSchema = z.object({
  projectId: z.string().uuid(),
  catalogKey: z.string().min(1).optional(),
  nodeCatalogId: z.string().uuid().optional(),
  /** Filter on properties.lifecycleStatus (dev-workflow convention). */
  lifecycleStatus: z.string().min(1).optional(),
  limit: z.number().int().positive().max(500).default(100),
  offset: z.number().int().nonnegative().default(0),
});

export type ListNodesByTypeInput = z.input<typeof listNodesByTypeInputSchema>;

export const traverseEdgesInputSchema = z.object({
  projectId: z.string().uuid(),
  nodeId: z.string().uuid(),
  direction: z.enum(["outgoing", "incoming", "both"]).default("both"),
  catalogKey: z.string().min(1).optional(),
  edgeCatalogId: z.string().uuid().optional(),
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
  catalogKey: z.string().min(1).optional(),
  edgeCatalogId: z.string().uuid().optional(),
  limit: z.number().int().positive().max(500).default(100),
});

export type TraverseFromInitiativeInput = z.infer<
  typeof traverseFromInitiativeInputSchema
>;

export const getEvergreenSingletonInputSchema = z.object({
  projectId: z.string().uuid(),
  catalogKey: z.string().min(1),
});

export type GetEvergreenSingletonInput = z.infer<
  typeof getEvergreenSingletonInputSchema
>;
