"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@ssota/ui/components/ui/badge";
import { DynamicPageRenderer } from "@/lib/page-runtime";
import {
  PAGE_RUNTIME_DEMOS,
  type PageRuntimeDemo,
} from "@/lib/lab/page-runtime-demos";

function DemoPreview({ demo }: { demo: PageRuntimeDemo }) {
  const [lastAction, setLastAction] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{demo.id}</Badge>
        {lastAction ? (
          <span className="text-muted-foreground text-xs">
            Last action: <code className="font-mono">{lastAction}</code>
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">
            Toolbar buttons log actions here (lab only).
          </span>
        )}
      </div>
      <div className="border-border bg-background rounded-lg border p-4">
        <DynamicPageRenderer
          spec={demo.spec}
          bindingData={demo.bindingData ?? {}}
          onAction={async (actionKey, input) => {
            setLastAction(`${actionKey}(${JSON.stringify(input)})`);
          }}
        />
      </div>
    </div>
  );
}

export function PageRuntimeLabClient() {
  const [activeId, setActiveId] = useState(PAGE_RUNTIME_DEMOS[0]?.id ?? "layout");
  const activeDemo = useMemo(
    () => PAGE_RUNTIME_DEMOS.find((demo) => demo.id === activeId) ?? PAGE_RUNTIME_DEMOS[0],
    [activeId],
  );

  if (!activeDemo) return null;

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
      <nav className="space-y-1" aria-label="Page runtime demos">
        {PAGE_RUNTIME_DEMOS.map((demo) => (
          <button
            key={demo.id}
            type="button"
            onClick={() => setActiveId(demo.id)}
            className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
              demo.id === activeId
                ? "bg-muted font-medium"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            {demo.title}
          </button>
        ))}
      </nav>
      <div className="min-w-0 space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">{activeDemo.title}</h2>
          <p className="text-muted-foreground text-sm">{activeDemo.description}</p>
        </div>
        <DemoPreview demo={activeDemo} />
        <details className="text-sm">
          <summary className="text-muted-foreground cursor-pointer">
            View JSON spec
          </summary>
          <pre className="bg-muted/40 mt-2 max-h-96 overflow-auto rounded-md p-3 text-xs">
            {JSON.stringify(activeDemo.spec, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}

export function LabsHomeLinks() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      <li>
        <Link
          href="/labs/page-runtime"
          className="border-border hover:bg-muted/40 block rounded-lg border p-4 transition-colors"
        >
          <h2 className="font-medium">Page Runtime Lab</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            JSON-render catalog — Section, Toolbar, Tabs, and more.
          </p>
        </Link>
      </li>
      <li>
        <Link
          href="/editor-lab"
          className="border-border hover:bg-muted/40 block rounded-lg border p-4 transition-colors"
        >
          <h2 className="font-medium">Editor Lab</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            BlockNote / Tiptap rich-text editor experiments.
          </p>
        </Link>
      </li>
    </ul>
  );
}
