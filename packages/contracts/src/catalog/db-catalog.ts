import { z } from "zod";

/** L1 data catalog row — project-scoped node type definition. */
export const nodeCatalogRowSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  key: z.string().min(1),
  label: z.string().min(1),
  propertySchema: z.record(z.unknown()).default({}),
});

export type NodeCatalogRow = z.infer<typeof nodeCatalogRowSchema>;

/** L1 data catalog row — project-scoped edge type definition. */
export const edgeCatalogRowSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  key: z.string().min(1),
  label: z.string().min(1),
  domainCatalogIds: z.array(z.string().uuid()).default([]),
  rangeCatalogIds: z.array(z.string().uuid()).default([]),
  propertySchema: z.record(z.unknown()).nullable().default(null),
});

export type EdgeCatalogRow = z.infer<typeof edgeCatalogRowSchema>;
