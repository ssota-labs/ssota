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
    // [ACTION-03] 워커는 커밋하지 않는다 — graph.write.* 없음.
    // 편집은 GraphEdits로 서술해 반환한다: return { edits: [...] } 또는 sdk.edits.*로 조립.
  },
  /** GraphEdits 빌더 — 반환용. 커밋은 runAction이 한 트랜잭션에서 한다. */
  edits: {
    createNode: (catalogKey, title, properties, ref) => ({ op: "create_node", catalogKey, title, properties: properties ?? {}, ...(ref ? { ref } : {}) }),
    updateProperties: (node, properties, title) => ({ op: "update_properties", node, properties, ...(title ? { title } : {}) }),
    createEdge: (catalogKey, from, to, properties, ref) => ({ op: "create_edge", catalogKey, from, to, properties: properties ?? {}, ...(ref ? { ref } : {}) }),
    deleteEdge: (edgeId) => ({ op: "delete_edge", edgeId }),
    setStatus: (node, to, from, field) => ({ op: "set_status", node, to, ...(from ? { from } : {}), ...(field ? { field } : {}) }),
    /** 낙관적 가드 — "내가 본 상태"를 커밋 시 재검증시킨다 (B 모델). */
    assert: (node, field, cond) => ({ op: "assert", node, field, ...cond }),
    assertCount: (node, edgeCatalogKey, cond, direction) => ({ op: "assert_count", node, edgeCatalogKey, ...cond, ...(direction ? { direction } : {}) }),
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
