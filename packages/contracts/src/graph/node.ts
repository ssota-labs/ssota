import { z } from "zod";

export const nodeInstanceSchema = z.object({
  id: z.string().uuid(),
  teamspaceId: z.string().uuid(),
  nodeCatalogId: z.string().uuid(),
  catalogKey: z.string().min(1).optional(),
  catalogLabel: z.string().min(1).optional(),
  title: z.string(),
  properties: z.record(z.unknown()),
  schemaVersion: z.number().int().positive().default(1),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type NodeInstance = z.infer<typeof nodeInstanceSchema>;
