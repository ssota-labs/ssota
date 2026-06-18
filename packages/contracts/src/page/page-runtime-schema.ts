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

export const pageContextDefSchema = z.object({
  initiativeId: z.string().optional(),
});

export const pageRuntimeDefinitionSchema = z
  .object({
    routeKey: z.string().min(1),
    scope: z.enum(["project", "evergreen", "initiative"]),
    spec: jsonRenderSpecSchema,
    bindings: z.record(bindingDefSchema).default({}),
    context: pageContextDefSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const bindingKeys = new Set(Object.keys(value.bindings));
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
    }
  });

export type PageRuntimeDefinition = z.infer<typeof pageRuntimeDefinitionSchema>;
