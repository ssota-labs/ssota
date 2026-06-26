/** Context injected into every REST tool execute call at runtime. */
export interface RestCallContext {
  /** OAuth 2.0 access token for the provider. */
  token: string;
  /**
   * Provider-scoped user id for REST path params (e.g. X numeric user id).
   * May be absent for legacy rows — REST handlers should resolve via the token.
   */
  userId?: string;
  /** Connect subject user id (SSOTA profile id) used when minting the token. */
  connectSubjectUserId: string;
}

/** A single tool exposed by a REST connection, described in JSON Schema. */
export interface RestToolListing {
  name: string;
  description: string;
  /** JSON Schema for the tool arguments (used in connection_search argsSchema). */
  inputSchema: Record<string, unknown>;
}

/**
 * A connection backed by direct REST API calls instead of a hosted MCP server.
 * REST connections participate in connection_search and connection_call just like
 * MCP connections, but their tool listings are static (not fetched from a server)
 * and their execute() is handled locally.
 */
export interface RestConnectionDef {
  id: string;
  description: string;
  /** Provider key used to resolve the API connector uid via resolveApiConnectorUid(). */
  provider: string;
  tools: RestToolListing[];
  execute(toolName: string, args: unknown, ctx: RestCallContext): Promise<unknown>;
}
