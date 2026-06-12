import { useState } from "react";

import { ExportPanel } from "./ExportPanel";
import { ThemeInspector } from "./ThemeInspector";
import { TokenInspector } from "./TokenInspector";

type Tab = "tokens" | "theme" | "export";

export function InspectorPanel() {
  const [tab, setTab] = useState<Tab>("tokens");

  const tabs: { id: Tab; label: string }[] = [
    { id: "tokens", label: "Tokens" },
    { id: "theme", label: "Theme" },
    { id: "export", label: "Export" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-border bg-card">
      <div className="flex border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              tab === t.id
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tab === "tokens" && <TokenInspector />}
        {tab === "theme" && <ThemeInspector />}
        {tab === "export" && <ExportPanel />}
      </div>
    </div>
  );
}
