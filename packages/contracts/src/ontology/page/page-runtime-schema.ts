import { z } from "zod";

export const propertyFilterSchema = z.object({
  key: z.string().min(1),
  op: z.enum(["eq", "neq", "exists", "gt", "gte", "lt", "lte"]),
  value: z.unknown().optional(),
});

export type PropertyFilter = z.infer<typeof propertyFilterSchema>;

/** Attach graph-linked child nodes onto each parent row (for ExpandableTable). */
export const attachChildrenSchema = z.object({
  edgeCatalogKey: z.string().min(1),
  direction: z.enum(["out", "in"]).default("out"),
  catalogKey: z.string().min(1).optional(),
  property: z.string().min(1),
});

export type AttachChildren = z.infer<typeof attachChildrenSchema>;

export const bindingDefSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("query"),
    catalogKey: z.string().min(1),
    filter: z.array(propertyFilterSchema).optional(),
    attachChildren: attachChildrenSchema.optional(),
  }),
  z.object({
    kind: z.literal("singleton"),
    catalogKey: z.string().min(1),
    ensure: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal("evergreen"),
    catalogKey: z.string().min(1),
  }),
  z.object({
    kind: z.literal("initiative_scope"),
    catalogKey: z.string().min(1),
    limit: z.number().int().positive().optional(),
    filter: z.array(propertyFilterSchema).optional(),
    attachChildren: attachChildrenSchema.optional(),
  }),
  z.object({
    kind: z.literal("node"),
    nodeId: z.string().uuid(),
  }),
  z.object({
    // The page's anchor node (from `pages.subject_node_id`), supplied at render
    // time via the binding context. Generic replacement for initiative-scoping:
    // a dashboard page bound to a specific node resolves its subject here, and
    // `traverse`/`artifact` bindings can reference it by `from: "subject"`.
    kind: z.literal("subject"),
  }),
  z.object({
    kind: z.literal("traverse"),
    from: z.string().min(1),
    edgeCatalogKey: z.string().min(1),
    direction: z.enum(["out", "in"]).default("out"),
    /** When set, keep only targets whose catalogKey matches. */
    catalogKey: z.string().min(1).optional(),
    attachChildren: attachChildrenSchema.optional(),
  }),
  z.object({
    kind: z.literal("ref"),
    binding: z.string().min(1),
  }),
  z.object({
    // Resolves a node carrying a built artifact (buildHash/previewArtifactPath)
    // into render metadata. Domain-agnostic: any node type can hold a build.
    // Core returns graph fields only; signed URLs + theme are resolved web-side.
    kind: z.literal("artifact"),
    nodeId: z.string().uuid().optional(),
    ref: z.string().min(1).optional(),
  }),
  z.object({
    // URL-driven row selection: reads `context.searchParams[param]`, loads the
    // node by id, and rejects when catalogKey mismatches. Drives SelectionProvider
    // client sync and traverse bindings (`from: "selected"`).
    kind: z.literal("url_selection"),
    param: z.string().min(1),
    catalogKey: z.string().min(1),
  }),
]);

export type BindingDef = z.infer<typeof bindingDefSchema>;

export const jsonRenderElementSchema: z.ZodType<{
  type: string;
  props?: Record<string, unknown>;
  children?: string[];
}> = z.lazy(() =>
  z.object({
    type: z.string().min(1),
    props: z.record(z.unknown()).optional(),
    children: z.array(z.string()).optional(),
  }),
);

export const jsonRenderSpecSchema = z.object({
  root: z.string().min(1),
  elements: z.record(jsonRenderElementSchema),
});

export type JsonRenderSpec = z.infer<typeof jsonRenderSpecSchema>;

/**
 * Per-user, per-table-element view state for the advanced data table: the
 * interactive layer (ordering/visibility/sizing/pinning/sorting/filters/
 * pagination) over an authored column schema. Persisted server-side keyed by
 * (user, page, element); the table component treats it as a controlled prop so
 * the storage backend is a swappable seam. All fields optional — a partial blob
 * round-trips losslessly.
 */
export const tableViewStateSchema = z.object({
  columnOrder: z.array(z.string()).optional(),
  columnVisibility: z.record(z.boolean()).optional(),
  columnSizing: z.record(z.number()).optional(),
  columnPinning: z
    .object({
      left: z.array(z.string()).optional(),
      right: z.array(z.string()).optional(),
    })
    .optional(),
  sorting: z
    .array(z.object({ id: z.string(), desc: z.boolean() }))
    .optional(),
  columnFilters: z
    .array(z.object({ id: z.string(), value: z.unknown() }))
    .optional(),
  globalFilter: z.string().optional(),
  pagination: z
    .object({
      pageIndex: z.number().int().nonnegative(),
      pageSize: z.number().int().positive(),
    })
    .optional(),
});

export type TableViewState = z.infer<typeof tableViewStateSchema>;

/**
 * A value in an action descriptor may be a literal or a reference resolved
 * server-side at execution time:
 * - `{ $binding: "rows.0.id" }` — dotted path into the page's resolved bindings
 * - `{ $ctx: "initiativeId" }`  — value from the page context
 * - `{ $input: "title" }`       — value from the client-collected form payload
 */
export const actionValueRefSchema = z.union([
  z.object({ $binding: z.string().min(1) }),
  z.object({ $ctx: z.string().min(1) }),
  z.object({ $input: z.string().min(1) }),
]);

export type ActionValueRef = z.infer<typeof actionValueRefSchema>;

/** A descriptor param: a value-ref or any literal JSON. */
export const actionParamSchema = z.union([actionValueRefSchema, z.unknown()]);

/**
 * A standardized, declarative action an interactive element can trigger. The
 * server re-reads this descriptor authoritatively (never trusting the client),
 * interpolates value-refs, and calls the matching graph use-case. New kinds map
 * 1:1 to existing graph mutations; the execution chokepoint can later be swapped
 * for the full executeAction(gate→commit) pipeline.
 */
export const pageActionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("create_node"),
    catalogKey: z.string().min(1),
    title: actionParamSchema.optional(),
    properties: z.record(actionParamSchema).optional(),
  }),
  z.object({
    kind: z.literal("update_node"),
    nodeId: actionParamSchema,
    title: actionParamSchema.optional(),
    properties: z.record(actionParamSchema).optional(),
    /** When true, merge into the node's existing properties instead of replacing
     * them (for single-field/token edits). */
    merge: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal("create_edge"),
    catalogKey: z.string().min(1),
    sourceNodeId: actionParamSchema,
    targetNodeId: actionParamSchema,
  }),
  z.object({
    kind: z.literal("delete_edge"),
    edgeId: actionParamSchema,
  }),
  z.object({
    // A single-field write on a node, where the field name itself is a value-ref.
    // Powers Notion-style data-table inline editing: one descriptor handles every
    // editable column (the client supplies `nodeId`/`field`/`value`). The server
    // treats `field === "title"` as a title update; otherwise it merges the value
    // into the node's properties. Generalizes `update_node` (whose property keys
    // are fixed in the descriptor) to a dynamic, per-cell edit.
    kind: z.literal("set_node_property"),
    nodeId: actionParamSchema,
    field: actionParamSchema,
    value: actionParamSchema,
  }),
  z.object({
    kind: z.literal("delete_node"),
    nodeId: actionParamSchema,
  }),
  z.object({
    kind: z.literal("create_initiative_bundle"),
    initiativeTitle: actionParamSchema,
    releaseVersion: actionParamSchema,
  }),
  z.object({
    kind: z.literal("spawn_task"),
    title: actionParamSchema,
    agentDefinitionId: actionParamSchema,
    targetNodeId: actionParamSchema.optional(),
    idempotencyKey: actionParamSchema.optional(),
    executorType: z.enum(["Agent", "Human"]).optional(),
  }),
]);

export type PageAction = z.infer<typeof pageActionSchema>;

/**
 * Validate that every element's `binding`/`action` prop references a defined
 * binding/action.
 */
function refineSpecReferences(
  value: {
    spec: JsonRenderSpec;
    bindings: Record<string, unknown>;
    actions: Record<string, unknown>;
  },
  ctx: z.RefinementCtx,
): void {
  const bindingKeys = new Set(Object.keys(value.bindings));
  const actionKeys = new Set(Object.keys(value.actions));
  for (const [elementId, element] of Object.entries(value.spec.elements)) {
    const props = element.props ?? {};
    const bindingKey = props.binding;
    if (typeof bindingKey === "string" && !bindingKeys.has(bindingKey)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Element '${elementId}' references unknown binding '${bindingKey}'`,
        path: ["spec", "elements", elementId, "props", "binding"],
      });
    }
    const actionKey = props.action;
    if (typeof actionKey === "string" && !actionKeys.has(actionKey)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Element '${elementId}' references unknown action '${actionKey}'`,
        path: ["spec", "elements", elementId, "props", "action"],
      });
    }
  }
}

/**
 * A page in the Notion-style tree. NOT 1:1 with a node or workflow: a page is a
 * JSON-render dashboard (places catalog components) that loads node/edge data via
 * `bindings`. Hierarchy is `parentId` (recursive tree); addressing is flat by id.
 * `subjectNodeId` optionally anchors bindings to a node (generic replacement for
 * the old scope / `{$ctx:initiativeId}`). The `id`/tree fields are managed by the
 * store; this schema validates the editable content of a page record.
 */
export const pageRecordSchema = z
  .object({
    title: z.string().min(1),
    icon: z.string().optional(),
    slug: z.string().min(1).optional(),
    parentId: z.string().uuid().nullable().optional(),
    position: z.number().int().nonnegative().optional(),
    subjectNodeId: z.string().uuid().nullable().optional(),
    /** When set, a node-type drill-in template (renders for that catalogKey). */
    appliesToNodeType: z.string().min(1).nullable().optional(),
    spec: jsonRenderSpecSchema,
    bindings: z.record(bindingDefSchema).default({}),
    actions: z.record(pageActionSchema).default({}),
  })
  .superRefine(refineSpecReferences);

export type PageRecord = z.infer<typeof pageRecordSchema>;

/** A persisted page: a {@link PageRecord} plus store-managed identity fields. */
export const pageSchema = z
  .object({
    id: z.string().uuid(),
    teamspaceId: z.string().uuid(),
    accountId: z.string().uuid().nullable().optional(),
    title: z.string().min(1),
    icon: z.string().nullable().optional(),
    slug: z.string().nullable().optional(),
    parentId: z.string().uuid().nullable().optional(),
    position: z.number().int().nonnegative(),
    subjectNodeId: z.string().uuid().nullable().optional(),
    appliesToNodeType: z.string().min(1).nullable().optional(),
    spec: jsonRenderSpecSchema,
    bindings: z.record(bindingDefSchema).default({}),
    actions: z.record(pageActionSchema).default({}),
  })
  .superRefine(refineSpecReferences);

export type Page = z.infer<typeof pageSchema>;
