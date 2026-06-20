"use client";

import { useState } from "react";
import { JsonEditorPanel } from "@/components/lab-sandbox/json-editor-panel";
import { useLabSandbox } from "@/lib/lab-sandbox/lab-sandbox-context";

export default function LabNavPage() {
  const { state, setState } = useLabSandbox();
  const [json, setJson] = useState(() =>
    JSON.stringify(state.workspace, null, 2),
  );

  function apply() {
    try {
      const workspace = JSON.parse(json) as typeof state.workspace;
      setState({ ...state, workspace });
    } catch {
      // validation via button
    }
  }

  return (
    <JsonEditorPanel
      title="L4 — Workspace nav (seed)"
      description="Nav entries use pageKey; preview resolves them to page node ids."
      value={json}
      onChange={setJson}
      validateMode="workspace"
      onApply={apply}
    />
  );
}
