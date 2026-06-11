import { HttpClient, type FetchLike } from "./http.js";
import { createActionsApi } from "./namespaces/actions.js";
import { createCatalogApi } from "./namespaces/catalog.js";
import { createEdgesApi } from "./namespaces/edges.js";
import { createGatesApi } from "./namespaces/gates.js";
import { createGraphApi } from "./namespaces/graph.js";
import { createInstructionsApi } from "./namespaces/instructions.js";
import { createLogApi } from "./namespaces/log.js";
import { createNodesApi } from "./namespaces/nodes.js";

export interface SsotaClientOptions {
  /** SSOTA HTTP API base URL including `/api/v1` (e.g. `http://localhost:3001/api/v1`). */
  url: string;
  auth: {
    accessToken: string | (() => string | Promise<string>);
  };
  /**
   * Tenant scope for embedder apps — maps to the end-user id.
   * Sent as `X-SSOTA-Subject-Id`; server injects `subjectId` on scoped reads/writes.
   */
  subjectId?: string | (() => string | undefined | Promise<string | undefined>);
  fetch?: FetchLike;
}

export interface SsotaClient {
  catalog: ReturnType<typeof createCatalogApi>;
  nodes: ReturnType<typeof createNodesApi>;
  edges: ReturnType<typeof createEdgesApi>;
  graph: ReturnType<typeof createGraphApi>;
  instructions: ReturnType<typeof createInstructionsApi>;
  actions: ReturnType<typeof createActionsApi>;
  gates: ReturnType<typeof createGatesApi>;
  log: ReturnType<typeof createLogApi>;
}

export function createClient(options: SsotaClientOptions): SsotaClient {
  const getAccessToken =
    typeof options.auth.accessToken === "function"
      ? options.auth.accessToken
      : () => options.auth.accessToken as string;

  const getSubjectId = options.subjectId
    ? typeof options.subjectId === "function"
      ? options.subjectId
      : () => options.subjectId as string
    : undefined;

  const http = new HttpClient({
    baseUrl: options.url,
    getAccessToken,
    getSubjectId,
    fetch: options.fetch,
  });

  return {
    catalog: createCatalogApi(http),
    nodes: createNodesApi(http),
    edges: createEdgesApi(http),
    graph: createGraphApi(http),
    instructions: createInstructionsApi(http),
    actions: createActionsApi(http),
    gates: createGatesApi(http),
    log: createLogApi(http),
  };
}
