import { z } from "zod";

export const propertyFilterSchema = z.object({
  key: z.string().min(1),
  op: z.enum(["eq", "neq", "exists"]),
  value: z.unknown().optional(),
});

export type PropertyFilter = z.infer<typeof propertyFilterSchema>;

export const bindingDefSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("query"),
    catalogKey: z.string().min(1),
    filter: z.array(propertyFilterSchema).optional(),
  }),
  z.object({
    kind: z.literal("singleton"),
    catalogKey: z.string().min(1),
    ensure: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal("node"),
    nodeId: z.string().uuid(),
  }),
  z.object({
    kind: z.literal("traverse"),
    from: z.string().min(1),
    edgeCatalogKey: z.string().min(1),
    direction: z.enum(["out", "in"]).default("out"),
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
]);

export type PageAction = z.infer<typeof pageActionSchema>;

export const pageContextDefSchema = z.object({
  initiativeId: z.string().optional(),
});

/**
 * Validate that every element's `binding`/`action` prop references a defined
 * binding/action. Shared by the page-record (Notion tree) and the legacy
 * runtime-definition schemas.
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
    projectId: z.string().uuid(),
    accountId: z.string().uuid().nullable().optional(),
    title: z.string().min(1),
    icon: z.string().nullable().optional(),
    slug: z.string().nullable().optional(),
    parentId: z.string().uuid().nullable().optional(),
    position: z.number().int().nonnegative(),
    subjectNodeId: z.string().uuid().nullable().optional(),
    spec: jsonRenderSpecSchema,
    bindings: z.record(bindingDefSchema).default({}),
    actions: z.record(pageActionSchema).default({}),
  })
  .superRefine(refineSpecReferences);

export type Page = z.infer<typeof pageSchema>;

export const pageRuntimeDefinitionSchema = z
  .object({
    routeKey: z.string().min(1),
    scope: z.enum(["project", "evergreen", "initiative"]),
    spec: jsonRenderSpecSchema,
    bindings: z.record(bindingDefSchema).default({}),
    actions: z.record(pageActionSchema).default({}),
    context: pageContextDefSchema.optional(),
  })
  .superRefine((value, ctx) => {
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
  });

export type PageRuntimeDefinition = z.infer<typeof pageRuntimeDefinitionSchema>;
