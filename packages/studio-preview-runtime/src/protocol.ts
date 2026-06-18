import { z } from "zod";
import {
  studioNodeSchema,
  uiComponentDocumentSchema,
} from "@ssota/contracts/catalog";

export const studioRenderModeSchema = z.enum(["draft", "published"]);
export type StudioRenderMode = z.infer<typeof studioRenderModeSchema>;

export const studioInteractionModeSchema = z.enum(["inspect", "preview"]);
export type StudioInteractionMode = z.infer<typeof studioInteractionModeSchema>;

export const studioSourceRefSchema = z.object({
  file: z.string().min(1),
  loc: z.string().optional(),
});
export type StudioSourceRef = z.infer<typeof studioSourceRefSchema>;

/** Absolute http(s) URL or same-origin path (e.g. /api/studio/bundle). */
const studioBundleAssetUrlSchema = z
  .string()
  .min(1)
  .refine(
    (value) => value.startsWith("/") || /^https?:\/\//.test(value),
    { message: "Bundle URL must be absolute or a path" },
  );

const studioPatchSchema = z.object({
  className: z.string().optional(),
  tag: z.string().optional(),
  text: z.string().optional(),
  attributes: z.record(z.string()).optional(),
  props: z.record(z.unknown()).optional(),
});

export const studioLayerTreeNodeSchema: z.ZodType<StudioLayerTreeNode> = z.lazy(
  () =>
    z.object({
      id: z.string(),
      label: z.string(),
      sourceRef: studioSourceRefSchema.optional(),
      children: z.array(studioLayerTreeNodeSchema).optional(),
    }),
);

export type StudioLayerTreeNode = {
  id: string;
  label: string;
  sourceRef?: StudioSourceRef;
  children?: StudioLayerTreeNode[];
};

export const studioMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("STUDIO_READY") }),
  z.object({
    type: z.literal("STUDIO_SET_TREE"),
    tree: studioNodeSchema,
    mode: studioRenderModeSchema,
  }),
  z.object({
    type: z.literal("STUDIO_SET_RESOLVED_COMPONENTS"),
    resolvedComponents: z.record(z.string(), uiComponentDocumentSchema.nullable()),
  }),
  z.object({
    type: z.literal("STUDIO_SET_INTERACTION_MODE"),
    mode: studioInteractionModeSchema,
  }),
  z.object({
    type: z.literal("STUDIO_SET_THEME"),
    cssText: z.string(),
  }),
  z.object({
    type: z.literal("STUDIO_SET_UTILITY_CSS"),
    cssText: z.string(),
  }),
  z.object({
    type: z.literal("STUDIO_LOAD_BUNDLE"),
    jsUrl: studioBundleAssetUrlSchema,
    cssUrl: studioBundleAssetUrlSchema.optional(),
    buildId: z.string().min(1),
  }),
  z.object({
    type: z.literal("STUDIO_SELECT"),
    nodeId: z.string(),
    sourceRef: studioSourceRefSchema.optional(),
  }),
  z.object({
    type: z.literal("STUDIO_PATCH_NODE"),
    nodeId: z.string(),
    patch: studioPatchSchema,
    sourceRef: studioSourceRefSchema.optional(),
  }),
  z.object({
    type: z.literal("STUDIO_PATCH"),
    nodeId: z.string(),
    patch: studioPatchSchema,
    sourceRef: studioSourceRefSchema.optional(),
  }),
  z.object({
    type: z.literal("STUDIO_HIGHLIGHT"),
    nodeId: z.string(),
  }),
  z.object({
    type: z.literal("STUDIO_HOVER"),
    nodeId: z.string().nullable(),
  }),
  z.object({
    type: z.literal("STUDIO_LAYER_TREE"),
    nodes: z.array(studioLayerTreeNodeSchema),
  }),
]);

export type StudioMessage = z.infer<typeof studioMessageSchema>;
export type StudioPatch = z.infer<typeof studioPatchSchema>;

export function parseStudioMessage(data: unknown): StudioMessage | null {
  const result = studioMessageSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function isStudioMessageFromOrigin(
  event: MessageEvent,
  expectedOrigin: string,
): boolean {
  return event.origin === expectedOrigin;
}
