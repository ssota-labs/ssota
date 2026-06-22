import type { ConnectAuthBinding } from "./connect-credential.js";

export type McpTransportType = "http" | "sse";

export interface McpConnectionToolFilter {
  allow?: string[];
  block?: string[];
}

export interface McpConnectionDef {
  /** Runtime id from filename, e.g. `linear`. */
  id: string;
  url: string;
  transport: McpTransportType;
  description: string;
  auth: ConnectAuthBinding;
  tools?: McpConnectionToolFilter;
}

export interface DefineMcpClientConnectionConfig {
  url: string;
  description: string;
  auth: ConnectAuthBinding;
  transport?: McpTransportType;
  tools?: McpConnectionToolFilter;
}

/**
 * Eve `defineMcpClientConnection` mirror — call from `connections/<id>.ts`.
 * Pass `id` explicitly (filename) because SSOTA is not the Eve bundler.
 */
export function defineMcpClientConnection(
  id: string,
  config: DefineMcpClientConnectionConfig,
): McpConnectionDef {
  const transport =
    config.transport ??
    (config.url.includes("/sse") ? "sse" : "http");
  return {
    id,
    url: config.url,
    transport,
    description: config.description,
    auth: config.auth,
    ...(config.tools ? { tools: config.tools } : {}),
  };
}
