import { z } from "zod";
import { propertiesWithKnownKeys } from "./common.js";

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

export const uiComponentFilesSchema = z.record(z.string().min(1));

export const uiComponentPropertiesSchema = propertiesWithKnownKeys({
  slug: z.string().min(1),
  tier: uiComponentTierSchema,
  representation: z.enum(["source", "tree"]).optional(),
  contentSchemaVersion: z.union([z.literal(1), z.literal(2)]).optional(),
  entry: z.string().min(1).optional(),
  files: uiComponentFilesSchema.optional(),
  layerIndex: uiComponentLayerIndexSchema.optional(),
  dependencies: z.record(z.string()).optional(),
  fileKeys: z.array(z.string()).optional(),
  buildHash: z.string().optional(),
  previewArtifactPath: z.string().optional(),
  builtAt: z.string().datetime().optional(),
  draft: z.string().optional(),
}).superRefine((properties, ctx) => {
  const representation = properties.representation ?? "source";
  if (representation !== "source") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Only source representation is supported",
      path: ["representation"],
    });
  }
  if (!properties.entry) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "entry is required for ui_component",
      path: ["entry"],
    });
  }
});

export type UiComponentProperties = z.infer<typeof uiComponentPropertiesSchema>;

function parseLegacyContentValue(
  content: unknown,
): { files?: Record<string, string>; layerIndex?: UiComponentLayerIndexNode } | null {
  if (content === null || content === undefined) {
    return null;
  }

  let parsed: unknown = content;
  if (typeof content === "string") {
    const trimmed = content.trim();
    if (!trimmed) return null;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  const record = parsed as Record<string, unknown>;
  if (record.schemaVersion === 2 && record.files && typeof record.files === "object") {
    const files = record.files as Record<string, unknown>;
    const normalized: Record<string, string> = {};
    for (const [path, source] of Object.entries(files)) {
      if (typeof source === "string") {
        normalized[path] = source;
      }
    }
    if (Object.keys(normalized).length === 0) {
      return null;
    }
    return {
      files: normalized,
      layerIndex:
        record.layerIndex !== undefined
          ? uiComponentLayerIndexSchema.parse(record.layerIndex)
          : undefined,
    };
  }

  return null;
}

/** Read source files from properties.files with legacy properties.content fallback. */
export function extractUiComponentFiles(
  properties: Record<string, unknown>,
): Record<string, string> | null {
  const direct = properties.files;
  if (direct && typeof direct === "object" && !Array.isArray(direct)) {
    const normalized: Record<string, string> = {};
    for (const [path, source] of Object.entries(direct as Record<string, unknown>)) {
      if (typeof source === "string") {
        normalized[path] = source;
      }
    }
    if (Object.keys(normalized).length > 0) {
      return normalized;
    }
  }

  return parseLegacyContentValue(properties.content)?.files ?? null;
}

export function parseUiComponentFromProperties(
  properties: Record<string, unknown>,
  representation: UiComponentRepresentation = "source",
): UiComponentContentV2 {
  if (representation !== "source") {
    throw new Error("UI component tree representation is no longer supported");
  }

  const files = extractUiComponentFiles(properties);
  if (!files || Object.keys(files).length === 0) {
    throw new Error("UI component files are required");
  }

  const layerIndex =
    properties.layerIndex !== undefined
      ? uiComponentLayerIndexSchema.parse(properties.layerIndex)
      : parseLegacyContentValue(properties.content)?.layerIndex;

  return uiComponentContentSchemaV2.parse({
    schemaVersion: 2,
    files,
    ...(layerIndex ? { layerIndex } : {}),
  });
}

export function buildUiComponentPropertiesForSave(input: {
  slug: string;
  tier: UiComponentTier;
  entry: string;
  files: Record<string, string>;
  layerIndex?: UiComponentLayerIndexNode;
  representation?: UiComponentRepresentation;
  dependencies?: Record<string, string>;
  buildHash?: string;
  previewArtifactPath?: string;
  builtAt?: string;
}): Record<string, unknown> {
  return {
    slug: input.slug,
    tier: input.tier,
    representation: input.representation ?? "source",
    contentSchemaVersion: 2,
    entry: input.entry,
    fileKeys: Object.keys(input.files),
    files: input.files,
    ...(input.layerIndex ? { layerIndex: input.layerIndex } : {}),
    ...(input.dependencies ? { dependencies: input.dependencies } : {}),
    ...(input.buildHash ? { buildHash: input.buildHash } : {}),
    ...(input.previewArtifactPath
      ? { previewArtifactPath: input.previewArtifactPath }
      : {}),
    ...(input.builtAt ? { builtAt: input.builtAt } : {}),
  };
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
