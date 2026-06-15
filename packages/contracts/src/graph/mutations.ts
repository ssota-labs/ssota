import { z } from "zod";
import { LifecycleStatusSchema } from "../definitions.js";
import { edgeTypeSchema } from "../catalog/edge-types.js";
import { nodeTypeSchema } from "../catalog/node-types.js";

export const createNodeInputSchema = z.object({
  projectId: z.string().uuid(),
  nodeType: nodeTypeSchema,
  title: z.string().min(1),
  properties: z.record(z.unknown()).default({}),
  content: z.string().nullable().optional(),
  lifecycleStatus: LifecycleStatusSchema.default("Draft"),
  schemaVersion: z.number().int().positive().default(1),
  /** When set, create a for_initiative edge after node creation. */
  initiativeId: z.string().uuid().optional(),
  releaseId: z.string().uuid().optional(),
});

export type CreateNodeInput = z.input<typeof createNodeInputSchema>;

export const updateNodeInputSchema = z.object({
  projectId: z.string().uuid(),
  nodeId: z.string().uuid(),
  title: z.string().min(1).optional(),
  properties: z.record(z.unknown()).optional(),
  content: z.string().nullable().optional(),
  lifecycleStatus: LifecycleStatusSchema.optional(),
});

export type UpdateNodeInput = z.infer<typeof updateNodeInputSchema>;

export const createEdgeInputSchema = z.object({
  projectId: z.string().uuid(),
  edgeType: edgeTypeSchema,
  sourceNodeId: z.string().uuid(),
  targetNodeId: z.string().uuid(),
  properties: z.record(z.unknown()).default({}),
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
