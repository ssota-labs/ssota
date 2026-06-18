"use client";

import { useState } from "react";
import { JsonEditorPanel } from "@/components/lab-sandbox/json-editor-panel";
import { useLabSandbox } from "@/lib/lab-sandbox/lab-sandbox-context";

export default function LabPagesPage() {
  const { state, setState } = useLabSandbox();
  const [json, setJson] = useState(() => JSON.stringify(state.pages, null, 2));

  function apply() {
    try {
      const pages = JSON.parse(json) as typeof state.pages;
      setState({ ...state, pages });
    } catch {
      // validation via button
    }
  }

  return (
    <JsonEditorPanel
      title="L3 — Page definitions"
      description="Array of { id, pageKey, title, definition: PageRuntimeDefinition }."
      value={json}
      onChange={setJson}
      validateMode="pages"
      onApply={apply}
    />
  );
}
