import { z } from "zod";
import {
  studioNodeSchema,
  uiComponentDocumentSchema,
} from "@ssota/contracts/catalog";

export const studioRenderModeSchema = z.enum(["draft", "published"]);
export type StudioRenderMode = z.infer<typeof studioRenderModeSchema>;

export const studioInteractionModeSchema = z.enum(["inspect", "preview"]);
export type StudioInteractionMode = z.infer<typeof studioInteractionModeSchema>;

const studioPatchSchema = z.object({
  className: z.string().optional(),
  tag: z.string().optional(),
  text: z.string().optional(),
  attributes: z.record(z.string()).optional(),
  props: z.record(z.unknown()).optional(),
});

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
    type: z.literal("STUDIO_SELECT"),
    nodeId: z.string(),
  }),
  z.object({
    type: z.literal("STUDIO_PATCH_NODE"),
    nodeId: z.string(),
    patch: studioPatchSchema,
  }),
  z.object({
    type: z.literal("STUDIO_HIGHLIGHT"),
    nodeId: z.string(),
  }),
  z.object({
    type: z.literal("STUDIO_HOVER"),
    nodeId: z.string().nullable(),
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
