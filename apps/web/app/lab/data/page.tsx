"use client";

import { useMemo, useState } from "react";
import { JsonEditorPanel } from "@/components/lab-sandbox/json-editor-panel";
import { useLabSandbox } from "@/lib/lab-sandbox/lab-sandbox-context";
import { parseLabState } from "@/lib/lab-sandbox/validate";

export default function LabDataPage() {
  const { state, setState } = useLabSandbox();
  const initial = useMemo(() => JSON.stringify(state, null, 2), [state]);
  const [json, setJson] = useState(initial);
  const [bundleError, setBundleError] = useState<string | null>(null);

  function applyBundle() {
    setBundleError(null);
    const parsed = parseLabState(json);
    if (typeof parsed === "string") {
      setBundleError(parsed);
      return;
    }
    setState(parsed);
  }

  return (
    <div>
      <JsonEditorPanel
        title="Fixture bundle"
        description="Full in-memory dataset: nodeCatalog, edgeCatalog, nodes, edges, pages, workspace."
        value={json}
        onChange={setJson}
        onApply={applyBundle}
        applyLabel="Apply to sandbox"
      />
      {bundleError ? (
        <p className="text-destructive px-8 pb-8 text-sm">{bundleError}</p>
      ) : null}
    </div>
  );
}
