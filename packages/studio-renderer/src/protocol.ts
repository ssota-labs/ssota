import { z } from "zod";
import { studioNodeSchema } from "@ssota/contracts/catalog";

export const studioRenderModeSchema = z.enum(["draft", "published"]);
export type StudioRenderMode = z.infer<typeof studioRenderModeSchema>;

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
    type: z.literal("STUDIO_SET_THEME"),
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
