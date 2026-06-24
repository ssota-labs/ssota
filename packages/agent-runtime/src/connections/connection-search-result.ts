import { z } from "zod";

export const connectionSearchArgsSchema = z.object({
  required: z.array(z.string()).optional(),
  properties: z.record(z.string()),
});

/** Matched tool hit — includes compact arg hints so connection_call uses correct names. */
export const connectionSearchMatchSchema = z.object({
  qualifiedName: z.string(),
  connection: z.string(),
  tool: z.string(),
  argsSchema: connectionSearchArgsSchema.optional(),
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
  /** Tools that matched the query — call via `connection_call`. */
  matched: z.array(connectionSearchMatchSchema),
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
export type ConnectionSearchMatch = z.infer<typeof connectionSearchMatchSchema>;

/** @deprecated Use ConnectionSearchMatch — kept for internal install scope recording. */
export type ConnectionSearchToolHit = ConnectionSearchMatch & {
  installationId: string | null;
  installationName: string | null;
};
