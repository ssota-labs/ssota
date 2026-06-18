import { z } from "zod";

export const uiComponentTierSchema = z.enum(["primitive", "composite"]);
export type UiComponentTier = z.infer<typeof uiComponentTierSchema>;

export const projectComponentRefSchema = z.object({
  type: z.literal("project"),
  nodeId: z.string().uuid(),
  slug: z.string().min(1),
});
export type ProjectComponentRef = z.infer<typeof projectComponentRefSchema>;

export type TextNode = {
  kind: "text";
  id: string;
  text: string;
};

export type FragmentNode = {
  kind: "fragment";
  id: string;
  children: StudioNode[];
};

export type ElementNode = {
  kind: "element";
  id: string;
  tag: string;
  className?: string;
  attributes?: Record<string, string>;
  children: StudioNode[];
};

export type ComponentNode = {
  kind: "component";
  id: string;
  ref: ProjectComponentRef;
  className?: string;
  props?: Record<string, unknown>;
  children: StudioNode[];
};

export type StudioNode =
  | ElementNode
  | ComponentNode
  | TextNode
  | FragmentNode;

export const studioNodeSchema: z.ZodType<StudioNode> = z.lazy(() =>
  z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("text"),
      id: z.string().min(1),
      text: z.string(),
    }),
    z.object({
      kind: z.literal("fragment"),
      id: z.string().min(1),
      children: z.array(studioNodeSchema),
    }),
    z.object({
      kind: z.literal("element"),
      id: z.string().min(1),
      tag: z.string().min(1),
      className: z.string().optional(),
      attributes: z.record(z.string()).optional(),
      children: z.array(studioNodeSchema),
    }),
    z.object({
      kind: z.literal("component"),
      id: z.string().min(1),
      ref: projectComponentRefSchema,
      className: z.string().optional(),
      props: z.record(z.unknown()).optional(),
      children: z.array(studioNodeSchema),
    }),
  ]),
);

export const uiComponentRepresentationSchema = z.enum(["source", "tree"]);
export type UiComponentRepresentation = z.infer<
  typeof uiComponentRepresentationSchema
>;

export const uiComponentDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  root: studioNodeSchema,
});
export type UiComponentDocument = z.infer<typeof uiComponentDocumentSchema>;

export type UiComponentLayerIndexNode = {
  id: string;
  label: string;
  children?: UiComponentLayerIndexNode[];
};

export const uiComponentLayerIndexSchema: z.ZodType<UiComponentLayerIndexNode> =
  z.lazy(() =>
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      children: z.array(uiComponentLayerIndexSchema).optional(),
    }),
  );

export const uiComponentContentSchemaV2 = z.object({
  schemaVersion: z.literal(2),
  files: z.record(z.string().min(1)),
  layerIndex: uiComponentLayerIndexSchema.optional(),
});
export type UiComponentContentV2 = z.infer<typeof uiComponentContentSchemaV2>;

export const uiComponentContentSchema = z.discriminatedUnion("schemaVersion", [
  uiComponentDocumentSchema,
  uiComponentContentSchemaV2,
]);
export type UiComponentContent = z.infer<typeof uiComponentContentSchema>;

export function parseUiComponentDocument(content: string): UiComponentDocument {
  return uiComponentDocumentSchema.parse(JSON.parse(content));
}

export function parseUiComponentDocumentSafe(
  content: string,
): UiComponentDocument | null {
  try {
    return parseUiComponentDocument(content);
  } catch {
    return null;
  }
}

export function parseUiComponentContent(
  content: string | null,
  representation: UiComponentRepresentation = "source",
): UiComponentContent {
  if (content === null || content.trim() === "") {
    throw new Error("UI component content is required");
  }
  const parsed = uiComponentContentSchema.parse(JSON.parse(content));
  if (representation === "source" && parsed.schemaVersion !== 2) {
    throw new Error(
      "UI component with representation=source requires content schemaVersion 2",
    );
  }
  if (representation === "tree") {
    throw new Error("UI component tree representation is no longer supported");
  }
  return parsed;
}
