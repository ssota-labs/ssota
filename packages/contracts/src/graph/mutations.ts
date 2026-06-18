import { z } from "zod";

export const createNodeInputSchema = z
  .object({
    projectId: z.string().uuid(),
    catalogKey: z.string().min(1).optional(),
    nodeCatalogId: z.string().uuid().optional(),
    title: z.string().min(1),
    properties: z.record(z.unknown()).default({}),
    schemaVersion: z.number().int().positive().default(1),
    /** When set, create a for_initiative edge after node creation. */
    initiativeId: z.string().uuid().optional(),
    releaseId: z.string().uuid().optional(),
  })
  .refine((data) => Boolean(data.catalogKey ?? data.nodeCatalogId), {
    message: "catalogKey or nodeCatalogId is required",
  });

export type CreateNodeInput = z.input<typeof createNodeInputSchema>;

export const updateNodeInputSchema = z.object({
  projectId: z.string().uuid(),
  nodeId: z.string().uuid(),
  title: z.string().min(1).optional(),
  properties: z.record(z.unknown()).optional(),
});

export type UpdateNodeInput = z.infer<typeof updateNodeInputSchema>;

export const createEdgeInputSchema = z
  .object({
    projectId: z.string().uuid(),
    catalogKey: z.string().min(1).optional(),
    edgeCatalogId: z.string().uuid().optional(),
    sourceNodeId: z.string().uuid(),
    targetNodeId: z.string().uuid(),
    properties: z.record(z.unknown()).default({}),
  })
  .refine((data) => Boolean(data.catalogKey ?? data.edgeCatalogId), {
    message: "catalogKey or edgeCatalogId is required",
  });

export type CreateEdgeInput = z.input<typeof createEdgeInputSchema>;

export const deleteEdgeInputSchema = z.object({
  projectId: z.string().uuid(),
  edgeId: z.string().uuid(),
});

export type DeleteEdgeInput = z.infer<typeof deleteEdgeInputSchema>;

export const createInitiativeBundleInputSchema = z.object({
  projectId: z.string().uuid(),
  initiativeTitle: z.string().min(1),
  releaseVersion: z.string().min(1),
  initiativeProperties: z.record(z.unknown()).default({}),
  releaseProperties: z.record(z.unknown()).default({}),
});

export type CreateInitiativeBundleInput = z.input<
  typeof createInitiativeBundleInputSchema
>;

export const createInitiativeBundleResultSchema = z.object({
  initiativeId: z.string().uuid(),
  releaseId: z.string().uuid(),
  pairedWithEdgeId: z.string().uuid(),
});

export type CreateInitiativeBundleResult = z.infer<
  typeof createInitiativeBundleResultSchema
>;
