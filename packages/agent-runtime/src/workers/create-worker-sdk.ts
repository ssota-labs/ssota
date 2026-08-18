import type { WorkerPermissions } from "@ssota/contracts";
import type { WorkerSdkHost } from "./worker-sdk-host.js";

type NodeRefLike = { id: string } | { ref: string };

export type WorkerSdk = {
  dryRun: boolean;
  log: (...args: unknown[]) => void;
  graph: {
    read: {
      queryNodes: (input: unknown) => Promise<unknown>;
      getNode: (input: unknown) => Promise<unknown>;
      traverseEdges: (input: unknown) => Promise<unknown>;
    };
    // [ACTION-03] 워커는 커밋하지 않는다 — graph.write.* 없음. 편집은 GraphEdits로 반환.
  };
  /** GraphEdits 빌더 (순수 — 호스트 호출 없음). return { edits: [...] }에 쓴다. */
  edits: {
    createNode: (catalogKey: string, title: string, properties?: Record<string, unknown>, ref?: string) => Record<string, unknown>;
    updateProperties: (node: NodeRefLike, properties: Record<string, unknown>, title?: string) => Record<string, unknown>;
    createEdge: (catalogKey: string, from: NodeRefLike, to: NodeRefLike, properties?: Record<string, unknown>, ref?: string) => Record<string, unknown>;
    deleteEdge: (edgeId: string) => Record<string, unknown>;
    setStatus: (node: NodeRefLike, to: string, from?: string[], field?: string) => Record<string, unknown>;
    assert: (node: NodeRefLike, field: string, cond: { in?: unknown[]; notIn?: unknown[]; ifMissing?: "fail" | "pass" }) => Record<string, unknown>;
    assertCount: (node: NodeRefLike, edgeCatalogKey: string, cond: { equals?: number; min?: number; max?: number }, direction?: "out" | "in") => Record<string, unknown>;
  };
  tasks: {
    query: (input: unknown) => Promise<unknown>;
    update: (input: unknown) => Promise<unknown>;
  };
  connectors: {
    call: (input: unknown) => Promise<unknown>;
  };
};

function wrapHostCall(
  host: WorkerSdkHost,
  method: string,
  params: unknown,
  dryRun: boolean,
  allowed: boolean,
  permissionLabel: string,
): Promise<unknown> {
  if (dryRun) return Promise.resolve({ dryRun: true });
  if (!allowed) {
    return Promise.reject(
      new Error(`Worker permission denied: ${permissionLabel}`),
    );
  }
  return host.invoke(method, params);
}

export function createWorkerSdk(
  host: WorkerSdkHost,
  permissions: WorkerPermissions,
  dryRun: boolean,
): WorkerSdk {
  const canRead = permissions.graphRead;
  const canTasks = permissions.canMutate;
  const connectorScopes = new Set(permissions.connectorScopes);

  return {
    dryRun,
    log: (...args: unknown[]) => {
      console.error("[ssota-worker]", ...args);
    },
    graph: {
      read: {
        queryNodes: (input) =>
          wrapHostCall(host, "graph.queryNodes", input, dryRun, canRead, "graphRead"),
        getNode: (input) =>
          wrapHostCall(host, "graph.getNode", input, dryRun, canRead, "graphRead"),
        traverseEdges: (input) =>
          wrapHostCall(
            host,
            "graph.traverseEdges",
            input,
            dryRun,
            canRead,
            "graphRead",
          ),
      },
    },
    edits: {
      createNode: (catalogKey, title, properties, ref) => ({ op: "create_node", catalogKey, title, properties: properties ?? {}, ...(ref ? { ref } : {}) }),
      updateProperties: (node, properties, title) => ({ op: "update_properties", node, properties, ...(title ? { title } : {}) }),
      createEdge: (catalogKey, from, to, properties, ref) => ({ op: "create_edge", catalogKey, from, to, properties: properties ?? {}, ...(ref ? { ref } : {}) }),
      deleteEdge: (edgeId) => ({ op: "delete_edge", edgeId }),
      setStatus: (node, to, from, field) => ({ op: "set_status", node, to, ...(from ? { from } : {}), ...(field ? { field } : {}) }),
      assert: (node, field, cond) => ({ op: "assert", node, field, ...cond }),
      assertCount: (node, edgeCatalogKey, cond, direction) => ({ op: "assert_count", node, edgeCatalogKey, ...cond, ...(direction ? { direction } : {}) }),
    },
    tasks: {
      query: (input) =>
        wrapHostCall(host, "tasks.query", input, dryRun, canRead, "graphRead"),
      update: (input) =>
        wrapHostCall(host, "tasks.update", input, dryRun, canTasks, "canMutate"),
    },
    connectors: {
      call: (input) => {
        if (dryRun) return Promise.resolve({ dryRun: true });
        const toolkit =
          input && typeof input === "object" && "toolkit" in input
            ? String((input as { toolkit: unknown }).toolkit)
            : "";
        if (connectorScopes.size > 0 && !connectorScopes.has(toolkit)) {
          return Promise.reject(
            new Error(`Worker permission denied: connector scope '${toolkit}'`),
          );
        }
        return host.invoke("connectors.call", input);
      },
    },
  };
}
