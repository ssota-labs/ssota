import type { WorkerPermissions } from "@ssota/contracts";
import type { WorkerSdkHost } from "./worker-sdk-host.js";

export type WorkerSdk = {
  dryRun: boolean;
  log: (...args: unknown[]) => void;
  graph: {
    read: {
      queryNodes: (input: unknown) => Promise<unknown>;
      getNode: (input: unknown) => Promise<unknown>;
      traverseEdges: (input: unknown) => Promise<unknown>;
    };
    write: {
      createNode: (input: unknown) => Promise<unknown>;
      updateNode: (input: unknown) => Promise<unknown>;
      createEdge: (input: unknown) => Promise<unknown>;
    };
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
  const canWrite = permissions.graphWrite && permissions.canMutate;
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
      write: {
        createNode: (input) =>
          wrapHostCall(host, "graph.createNode", input, dryRun, canWrite, "graphWrite"),
        updateNode: (input) =>
          wrapHostCall(host, "graph.updateNode", input, dryRun, canWrite, "graphWrite"),
        createEdge: (input) =>
          wrapHostCall(host, "graph.createEdge", input, dryRun, canWrite, "graphWrite"),
      },
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
