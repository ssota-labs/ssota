"use client";

import { toRouteSlug } from "@loopos/core";

type ConsolePreviewProps = {
  workspaceName: string;
  projectName?: string;
};

export function ConsolePreview({ workspaceName, projectName }: ConsolePreviewProps) {
  const orgSlug = workspaceName.trim() ? toRouteSlug(workspaceName) : "your-workspace";
  const projectSlug = projectName?.trim()
    ? toRouteSlug(projectName)
    : "your-project";
  const orgLabel = workspaceName.trim() || "Your Workspace";
  const projectLabel = projectName?.trim() || "Your Project";

  return (
    <div className="flex min-h-[34rem] flex-col overflow-hidden rounded-xl border bg-background shadow-lg">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-5 text-sm">
        <span className="font-semibold">LoopOS</span>
        <span className="text-muted-foreground">|</span>
        <span className="rounded-md border px-2 py-0.5">{orgLabel}</span>
        <span className="text-muted-foreground">/</span>
        <span className="rounded-md border px-2 py-0.5">{projectLabel}</span>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-52 shrink-0 border-r bg-sidebar p-5 text-sm sm:block">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Project
          </p>
          <ul className="space-y-2 text-muted-foreground">
            <li className="rounded-md bg-sidebar-accent px-2 py-1 text-sidebar-accent-foreground">
              Project Home
            </li>
            <li className="px-2 py-1">Graph</li>
            <li className="px-2 py-1">Instruction</li>
            <li className="px-2 py-1">Settings</li>
          </ul>
        </aside>

        <main className="flex-1 p-8">
          <p className="text-xs text-muted-foreground">
            loopos.dev/{orgSlug}/{projectSlug}
          </p>
          <h2 className="mt-2 text-3xl font-semibold">{projectLabel}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Context graph runtime for agent decision harness.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {["Node tables", "Edge tables", "Actions", "Workflows"].map((label) => (
              <div
                key={label}
                className="rounded-lg border bg-card p-4 text-sm text-muted-foreground"
              >
                {label}
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
