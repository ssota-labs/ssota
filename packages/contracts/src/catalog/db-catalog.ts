import { z } from "zod";

/** L1 data catalog row — project-scoped node type definition. */
export const nodeCatalogRowSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  key: z.string().min(1),
  label: z.string().min(1),
  /** Search-facing one-line description (empty when not authored). */
  description: z.string().default(""),
  /** Search aliases/synonyms for recall. */
  keywords: z.array(z.string()).default([]),
  propertySchema: z.record(z.unknown()).default({}),
});

export type NodeCatalogRow = z.infer<typeof nodeCatalogRowSchema>;

/** L1 data catalog row — project-scoped edge type definition. */
export const edgeCatalogRowSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  key: z.string().min(1),
  label: z.string().min(1),
  /** Search-facing one-line description (empty when not authored). */
  description: z.string().default(""),
  /** Search aliases/synonyms for recall. */
  keywords: z.array(z.string()).default([]),
  domainCatalogIds: z.array(z.string().uuid()).default([]),
  rangeCatalogIds: z.array(z.string().uuid()).default([]),
  propertySchema: z.record(z.unknown()).nullable().default(null),
});

export type EdgeCatalogRow = z.infer<typeof edgeCatalogRowSchema>;

/**
 * Two-tier "progressive disclosure" catalog search (mirrors MCP connection
 * search): {@link catalogSearchInputSchema} returns lightweight
 * {@link catalogSearchHitSchema} hits; callers then fetch full detail via
 * get_node_type / get_edge_type. The matching backend (ILIKE → FTS → vector)
 * lives behind the read port and can change without touching this contract.
 */
export const catalogKindSchema = z.enum(["node", "edge"]);
export type CatalogKind = z.infer<typeof catalogKindSchema>;

export const catalogSearchInputSchema = z.object({
  query: z.string().min(1),
  kind: catalogKindSchema.optional(),
  limit: z.number().int().positive().max(50).default(10),
});
export type CatalogSearchInput = z.infer<typeof catalogSearchInputSchema>;

export const catalogSearchHitSchema = z.object({
  kind: catalogKindSchema,
  key: z.string(),
  label: z.string(),
  /** Short snippet (description or matched text) — not the full schema. */
  snippet: z.string(),
  /** Higher = better match. Backend-defined scale; only ordering is stable. */
  score: z.number(),
});
export type CatalogSearchHit = z.infer<typeof catalogSearchHitSchema>;
