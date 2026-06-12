import { useState } from "react";

import { useDesignLab } from "../context/design-lab-context";

export function ExportPanel() {
  const { exportCss, resetOverrides } = useDesignLab();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(exportCss);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        토큰 →{" "}
        <code className="text-foreground">style-ssota.css</code>
        <br />
        테마 →{" "}
        <code className="text-foreground">globals.css</code>
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/80"
        >
          {copied ? "Copied!" : "Copy CSS"}
        </button>
        <button
          type="button"
          onClick={resetOverrides}
          className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
        >
          Reset all
        </button>
      </div>
      <textarea
        readOnly
        value={exportCss}
        className="min-h-[200px] flex-1 resize-none rounded-md border border-input bg-muted/20 p-2 font-mono text-[0.625rem] text-foreground"
      />
    </div>
  );
}
