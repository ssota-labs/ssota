import { z } from "zod";

export const edgeInstanceSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  edgeCatalogId: z.string().uuid(),
  catalogKey: z.string().min(1).optional(),
  catalogLabel: z.string().min(1).optional(),
  sourceNodeId: z.string().uuid(),
  targetNodeId: z.string().uuid(),
  properties: z.record(z.unknown()),
  createdAt: z.coerce.date(),
});

export type EdgeInstance = z.infer<typeof edgeInstanceSchema>;
