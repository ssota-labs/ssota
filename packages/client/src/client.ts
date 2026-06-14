import { HttpClient, type FetchLike } from "./http.js";
import { createActionsApi } from "./namespaces/actions.js";
import { createCatalogApi } from "./namespaces/catalog.js";
import { createEdgesApi } from "./namespaces/edges.js";
import { createGatesApi } from "./namespaces/gates.js";
import { createGraphApi } from "./namespaces/graph.js";
import { createWorkflowsApi } from "./namespaces/workflows.js";
import { createLogApi } from "./namespaces/log.js";
import { createNodesApi } from "./namespaces/nodes.js";

export interface SsotaClientOptions {
  /** SSOTA HTTP API base URL including `/api/v1` (e.g. `http://localhost:3001/api/v1`). */
  url: string;
  auth: {
    accessToken: string | (() => string | Promise<string>);
  };
  /**
   * Project scope — one catalog/graph space per agent domain.
   * Sent as `X-SSOTA-Project-Id`; required on all API requests.
   */
  projectId?: string | (() => string | undefined | Promise<string | undefined>);
  fetch?: FetchLike;
}

export interface SsotaClient {
  catalog: ReturnType<typeof createCatalogApi>;
  nodes: ReturnType<typeof createNodesApi>;
  edges: ReturnType<typeof createEdgesApi>;
  graph: ReturnType<typeof createGraphApi>;
  workflows: ReturnType<typeof createWorkflowsApi>;
  actions: ReturnType<typeof createActionsApi>;
  gates: ReturnType<typeof createGatesApi>;
  log: ReturnType<typeof createLogApi>;
}

export function createClient(options: SsotaClientOptions): SsotaClient {
  const getAccessToken =
    typeof options.auth.accessToken === "function"
      ? options.auth.accessToken
      : () => options.auth.accessToken as string;

  const getProjectId = options.projectId
    ? typeof options.projectId === "function"
      ? options.projectId
      : () => options.projectId as string
    : undefined;

  const http = new HttpClient({
    baseUrl: options.url,
    getAccessToken,
    getProjectId,
    fetch: options.fetch,
  });

  return {
    catalog: createCatalogApi(http),
    nodes: createNodesApi(http),
    edges: createEdgesApi(http),
    graph: createGraphApi(http),
    workflows: createWorkflowsApi(http),
    actions: createActionsApi(http),
    gates: createGatesApi(http),
    log: createLogApi(http),
  };
}
