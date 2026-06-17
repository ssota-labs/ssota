import { z } from "zod";
import { LifecycleStatusSchema } from "../definitions.js";
import { nodeTypeSchema } from "../catalog/node-types.js";

export const nodeInstanceSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  nodeType: nodeTypeSchema,
  title: z.string(),
  properties: z.record(z.unknown()),
  content: z.string().nullable(),
  lifecycleStatus: LifecycleStatusSchema,
  schemaVersion: z.number().int().positive().default(1),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type NodeInstance = z.infer<typeof nodeInstanceSchema>;
