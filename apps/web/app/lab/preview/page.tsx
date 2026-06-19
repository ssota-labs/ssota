"use client";

import { useMemo } from "react";
import { resolveSandboxBindings } from "@/lib/lab-sandbox/binding-resolver";
import { DynamicPageRenderer } from "@/lib/lab-sandbox/dynamic-page-renderer";
import { useLabSandbox } from "@/lib/lab-sandbox/lab-sandbox-context";
import {
  findPageById,
  resolveWorkspaceNav,
} from "@/lib/lab-sandbox/workspace-resolver";
import { cn } from "@/lib/utils";

export default function LabPreviewPage() {
  const { state, selectedPageId, setSelectedPageId } = useLabSandbox();

  const workspace = useMemo(
    () => resolveWorkspaceNav(state.workspace, state.pages),
    [state.workspace, state.pages],
  );

  const selectedPage = selectedPageId
    ? findPageById(state, selectedPageId)
    : state.pages[0] ?? null;

  const bindingData = useMemo(() => {
    if (!selectedPage) return {};
    return resolveSandboxBindings(state, selectedPage.definition.bindings ?? {});
  }, [state, selectedPage]);

  const links = useMemo(() => {
    const items: Array<{
      key: string;
      label: string;
      pageNodeId: string;
      section: string | null;
    }> = [];
    for (const entry of workspace.nav) {
      if (entry.type === "section") {
        for (const child of entry.children) {
          if (child.type !== "link") continue;
          items.push({
            key: child.key,
            label: child.label,
            pageNodeId: child.pageNodeId,
            section: entry.label,
          });
        }
      } else if (entry.type === "link") {
        items.push({
          key: entry.key,
          label: entry.label,
          pageNodeId: entry.pageNodeId,
          section: null,
        });
      }
    }
    return items;
  }, [workspace.nav]);

  return (
    <div className="flex min-h-full">
      <div className="border-border w-64 shrink-0 border-r p-4">
        <h2 className="mb-3 text-sm font-medium">Workspace nav (mock)</h2>
        <ul className="space-y-1">
          {links.map((link) => (
            <li key={link.key}>
              <button
                type="button"
                onClick={() => setSelectedPageId(link.pageNodeId)}
                className={cn(
                  "w-full rounded-md px-2 py-1.5 text-left text-sm",
                  selectedPageId === link.pageNodeId
                    ? "bg-accent font-medium"
                    : "text-muted-foreground hover:bg-accent/60",
                )}
              >
                {link.section ? (
                  <span className="text-muted-foreground block text-xs">
                    {link.section}
                  </span>
                ) : null}
                {link.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="min-w-0 flex-1 p-8">
        {selectedPage ? (
          <>
            <p className="text-muted-foreground mb-4 text-xs">
              {selectedPage.pageKey} · scope {selectedPage.definition.scope}
            </p>
            <DynamicPageRenderer
              spec={selectedPage.definition.spec}
              bindingData={bindingData}
            />
          </>
        ) : (
          <p className="text-muted-foreground text-sm">Select a page</p>
        )}
      </div>
    </div>
  );
}
