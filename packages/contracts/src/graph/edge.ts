import { z } from "zod";
import { edgeTypeSchema } from "../catalog/edge-types.js";

export const edgeInstanceSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  edgeType: edgeTypeSchema,
  sourceNodeId: z.string().uuid(),
  targetNodeId: z.string().uuid(),
  properties: z.record(z.unknown()).default({}),
  createdAt: z.coerce.date(),
});

export type EdgeInstance = z.infer<typeof edgeInstanceSchema>;
