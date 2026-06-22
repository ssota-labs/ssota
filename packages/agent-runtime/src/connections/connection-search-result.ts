import { z } from "zod";

export const connectionSearchToolHitSchema = z.object({
  qualifiedName: z.string(),
  connection: z.string(),
  tool: z.string(),
  description: z.string(),
  installationId: z.string().nullable(),
  installationName: z.string().nullable(),
});

export const connectionSearchConnectionSchema = z.object({
  connection: z.string(),
  description: z.string(),
  connected: z.boolean(),
  installationId: z.string().nullable(),
  installationName: z.string().nullable(),
  connectorUid: z.string().nullable(),
});

export const connectionSearchResultSchema = z.object({
  connections: z.array(connectionSearchConnectionSchema),
  tools: z.array(connectionSearchToolHitSchema),
  /** MCP listTools failures — connected but tools could not be discovered. */
  errors: z
    .array(
      z.object({
        connection: z.string(),
        installationId: z.string().nullable(),
        message: z.string(),
      }),
    )
    .optional(),
});

export type ConnectionSearchResult = z.infer<typeof connectionSearchResultSchema>;
export type ConnectionSearchToolHit = z.infer<typeof connectionSearchToolHitSchema>;
