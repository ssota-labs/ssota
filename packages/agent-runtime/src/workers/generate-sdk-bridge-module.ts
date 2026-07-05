/** Generates an ESM module that proxies SDK calls to the host HTTP bridge. */
export function generateSdkBridgeModule(dryRun: boolean): string {
  return `
async function call(method, params) {
  const baseUrl = process.env.SSOTA_WORKER_SDK_URL;
  const token = process.env.SSOTA_WORKER_SDK_TOKEN;
  if (!baseUrl || !token) {
    throw new Error("Worker SDK bridge is not configured");
  }
  const res = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({ method, params }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error("SDK " + method + " failed: " + text);
  }
  return res.json();
}

const dryRun = ${dryRun ? "true" : "false"};

export const sdk = {
  dryRun,
  log: (...args) => {
    console.error("[ssota-worker]", ...args);
  },
  graph: {
    read: {
      queryNodes: (input) => (dryRun ? { dryRun: true } : call("graph.queryNodes", input)),
      getNode: (input) => (dryRun ? { dryRun: true } : call("graph.getNode", input)),
      traverseEdges: (input) =>
        dryRun ? { dryRun: true } : call("graph.traverseEdges", input),
    },
    write: {
      createNode: (input) => (dryRun ? { dryRun: true } : call("graph.createNode", input)),
      updateNode: (input) => (dryRun ? { dryRun: true } : call("graph.updateNode", input)),
      createEdge: (input) => (dryRun ? { dryRun: true } : call("graph.createEdge", input)),
    },
  },
  tasks: {
    query: (input) => (dryRun ? { dryRun: true } : call("tasks.query", input)),
    update: (input) => (dryRun ? { dryRun: true } : call("tasks.update", input)),
  },
  connectors: {
    call: (input) => (dryRun ? { dryRun: true } : call("connectors.call", input)),
  },
};
`.trim();
}
