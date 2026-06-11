import { HttpClient, type FetchLike } from "./http.js";
import { createActionsApi } from "./namespaces/actions.js";
import { createCatalogApi } from "./namespaces/catalog.js";
import { createEdgesApi } from "./namespaces/edges.js";
import { createGatesApi } from "./namespaces/gates.js";
import { createInstructionsApi } from "./namespaces/instructions.js";
import { createLogApi } from "./namespaces/log.js";
import { createNodesApi } from "./namespaces/nodes.js";

export interface LooposClientOptions {
  /** LoopOS HTTP API base URL including `/api/v1` (e.g. `http://localhost:3001/api/v1`). */
  url: string;
  auth: {
    accessToken: string | (() => string | Promise<string>);
  };
  fetch?: FetchLike;
}

export interface LooposClient {
  catalog: ReturnType<typeof createCatalogApi>;
  nodes: ReturnType<typeof createNodesApi>;
  edges: ReturnType<typeof createEdgesApi>;
  instructions: ReturnType<typeof createInstructionsApi>;
  actions: ReturnType<typeof createActionsApi>;
  gates: ReturnType<typeof createGatesApi>;
  log: ReturnType<typeof createLogApi>;
}

export function createClient(options: LooposClientOptions): LooposClient {
  const getAccessToken =
    typeof options.auth.accessToken === "function"
      ? options.auth.accessToken
      : () => options.auth.accessToken as string;

  const http = new HttpClient({
    baseUrl: options.url,
    getAccessToken,
    fetch: options.fetch,
  });

  return {
    catalog: createCatalogApi(http),
    nodes: createNodesApi(http),
    edges: createEdgesApi(http),
    instructions: createInstructionsApi(http),
    actions: createActionsApi(http),
    gates: createGatesApi(http),
    log: createLogApi(http),
  };
}
