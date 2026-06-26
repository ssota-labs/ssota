"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Toaster } from "@ssota/ui/components/ui/sonner";
import { DynamicPageRenderer, UI_CATALOG_COMPONENTS } from "@/lib/page-runtime";
import {
  PAGE_RUNTIME_DEMO_CATEGORIES,
  PAGE_RUNTIME_DEMOS,
  coveredCatalogComponents,
  type PageRuntimeDemo,
} from "@/lib/lab/page-runtime-demos";

function DemoPreview({ demo }: { demo: PageRuntimeDemo }) {
  const [lastAction, setLastAction] = useState<string | null>(null);
  const fillsViewport =
    demo.components.includes("DocumentSheetList") ||
    demo.id === "wireframe-canvas";

  return (
    <div
      className={fillsViewport ? "flex min-h-0 flex-1 flex-col space-y-4" : "space-y-4"}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{demo.id}</Badge>
        {demo.components.map((key) => (
          <Badge key={key} variant="secondary" className="font-mono text-[10px]">
            {key}
          </Badge>
        ))}
      </div>
      {lastAction ? (
        <p className="text-muted-foreground text-xs">
          Last action: <code className="font-mono">{lastAction}</code>
        </p>
      ) : (
        <p className="text-muted-foreground text-xs">
          Interactive elements log actions here (Toolbar, Button, Input, editors).
        </p>
      )}
      <div
        className={
          fillsViewport
            ? "border-border bg-background relative min-h-0 flex-1 overflow-hidden rounded-lg border p-4"
            : "border-border bg-background relative min-h-[32rem] overflow-hidden rounded-lg border p-4"
        }
      >
        <DynamicPageRenderer
          spec={demo.spec}
          bindingData={demo.bindingData ?? {}}
          fillHeight={fillsViewport}
          onAction={async (actionKey, input) => {
            setLastAction(`${actionKey}(${JSON.stringify(input)})`);
          }}
          onBuildWidget={async (nodeId) => {
            setLastAction(`buildWidget(${JSON.stringify({ nodeId })})`);
          }}
        />
      </div>
    </div>
  );
}

export function PageRuntimeLabClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const demoFromUrl = searchParams.get("demo");
  const initialId =
    (demoFromUrl && PAGE_RUNTIME_DEMOS.some((d) => d.id === demoFromUrl)
      ? demoFromUrl
      : PAGE_RUNTIME_DEMOS.find((d) => d.id === "layout-shell")?.id) ??
    PAGE_RUNTIME_DEMOS[0]?.id ??
    "layout-shell";

  const [activeId, setActiveId] = useState(initialId);

  useEffect(() => {
    if (
      demoFromUrl &&
      demoFromUrl !== activeId &&
      PAGE_RUNTIME_DEMOS.some((d) => d.id === demoFromUrl)
    ) {
      setActiveId(demoFromUrl);
    }
  }, [demoFromUrl, activeId]);

  const activeDemo = useMemo(
    () => PAGE_RUNTIME_DEMOS.find((demo) => demo.id === activeId) ?? PAGE_RUNTIME_DEMOS[0],
    [activeId],
  );

  const covered = useMemo(() => coveredCatalogComponents(), []);
  const missing = UI_CATALOG_COMPONENTS.filter((key) => !covered.includes(key));

  function selectDemo(id: string) {
    setActiveId(id);
    router.replace(`/labs/page-runtime?demo=${id}`, { scroll: false });
  }

  if (!activeDemo) return null;

  return (
    <div className="space-y-6">
      <Toaster position="bottom-right" />
      <div className="border-border bg-muted/30 rounded-lg border p-4 text-sm">
        <p className="font-medium">Catalog coverage</p>
        <p className="text-muted-foreground mt-1">
          {covered.length} / {UI_CATALOG_COMPONENTS.length} components have a lab demo.
        </p>
        {missing.length > 0 ? (
          <p className="text-muted-foreground mt-2 font-mono text-xs">
            Not yet demoed: {missing.join(", ")}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(12rem,1fr)_minmax(0,4fr)] lg:gap-8">
        <nav
          className="space-y-5 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto lg:pr-2"
          aria-label="Page runtime demos"
        >
          {PAGE_RUNTIME_DEMO_CATEGORIES.map((category) => {
            const demos = PAGE_RUNTIME_DEMOS.filter(
              (demo) => demo.category === category.id,
            );
            if (demos.length === 0) return null;
            return (
              <div key={category.id}>
                <p className="text-muted-foreground mb-2 px-3 text-xs font-medium tracking-wide uppercase">
                  {category.label}
                </p>
                <ul className="space-y-1">
                  {demos.map((demo) => (
                    <li key={demo.id}>
                      <button
                        type="button"
                        onClick={() => selectDemo(demo.id)}
                        className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                          demo.id === activeId
                            ? "bg-muted font-medium"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        }`}
                      >
                        {demo.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="flex min-h-[calc(100svh-10rem)] min-w-0 flex-col space-y-4">
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
            JSON-render catalog — all {UI_CATALOG_COMPONENTS.length} component types with live demos.
          </p>
        </Link>
      </li>
      <li>
        <Link
          href="/labs/page-runtime?demo=wireframe-canvas"
          className="border-border hover:bg-muted/40 block rounded-lg border p-4 transition-colors"
        >
          <h2 className="font-medium">Wireframe Canvas Lab</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            JSX Preview wireframes with navigateTo hotspots and device viewport toggles.
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
      <li>
        <Link
          href="/labs/tasks-board"
          className="border-border hover:bg-muted/40 block rounded-lg border p-4 transition-colors"
        >
          <h2 className="font-medium">Tasks Board Lab</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            kibo-ui kanban board for the tasks workspace, with mock data.
          </p>
        </Link>
      </li>
    </ul>
  );
}
