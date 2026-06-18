"use client";

import { useState } from "react";
import { JsonEditorPanel } from "@/components/lab-sandbox/json-editor-panel";
import { useLabSandbox } from "@/lib/lab-sandbox/lab-sandbox-context";

export default function LabCatalogPage() {
  const { state, setState } = useLabSandbox();
  const [nodeJson, setNodeJson] = useState(() =>
    JSON.stringify(state.nodeCatalog, null, 2),
  );
  const [edgeJson, setEdgeJson] = useState(() =>
    JSON.stringify(state.edgeCatalog, null, 2),
  );

  function applyNodes() {
    try {
      const nodeCatalog = JSON.parse(nodeJson) as typeof state.nodeCatalog;
      setState({ ...state, nodeCatalog });
    } catch {
      // validate button surfaces errors
    }
  }

  function applyEdges() {
    try {
      const edgeCatalog = JSON.parse(edgeJson) as typeof state.edgeCatalog;
      setState({ ...state, edgeCatalog });
    } catch {
      // validate button surfaces errors
    }
  }

  return (
    <div className="divide-y">
      <JsonEditorPanel
        title="L1 — Node catalog"
        description="Mock node_catalog rows (id, key, label, propertySchema)."
        value={nodeJson}
        onChange={setNodeJson}
        validateMode="node-catalog"
        onApply={applyNodes}
      />
      <JsonEditorPanel
        title="L1 — Edge catalog"
        description="Mock edge_catalog rows with domain/range catalog ids."
        value={edgeJson}
        onChange={setEdgeJson}
        validateMode="edge-catalog"
        onApply={applyEdges}
      />
    </div>
  );
}
