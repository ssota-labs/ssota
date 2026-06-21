"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@ssota/ui/lib/utils";

/** Minimal serializable page for the sidebar tree (no spec/bindings). */
export type SidebarPage = {
  id: string;
  title: string;
  parentId: string | null;
  position: number;
  icon?: string | null;
};

type TreeNode = SidebarPage & { children: TreeNode[] };

function buildTree(pages: SidebarPage[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  for (const p of pages) byId.set(p.id, { ...p, children: [] });
  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.position - b.position);
    for (const n of nodes) sort(n.children);
  };
  sort(roots);
  return roots;
}

function PageTreeItem({
  node,
  basePath,
  depth,
}: {
  node: TreeNode;
  basePath: string;
  depth: number;
}) {
  const pathname = usePathname();
  const href = `${basePath}/pages/${node.id}`;
  const isActive = pathname === href;
  const hasChildren = node.children.length > 0;
  const [open, setOpen] = useState(true);

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md px-2 py-1 text-sm",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "hover:bg-sidebar-accent/50",
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-label={open ? "Collapse" : "Expand"}
            onClick={() => setOpen((v) => !v)}
            className="text-muted-foreground w-3 shrink-0 text-xs"
          >
            {open ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <Link href={href} className="min-w-0 flex-1 truncate">
          {node.icon ? <span className="mr-1">{node.icon}</span> : null}
          {node.title}
        </Link>
      </div>
      {hasChildren && open ? (
        <div>
          {node.children.map((child) => (
            <PageTreeItem
              key={child.id}
              node={child}
              basePath={basePath}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Recursive Notion-style page tree for the sidebar. Fed by the `pages` table
 * (flat list → tree via `parentId`); links to the flat `/pages/[id]` route.
 */
export function PageTreeNav({
  pages,
  basePath,
}: {
  pages: SidebarPage[];
  basePath: string;
}) {
  if (pages.length === 0) return null;
  const roots = buildTree(pages);
  return (
    <div className="mt-2 space-y-0.5">
      <div className="text-muted-foreground px-2 py-1 text-xs font-medium uppercase tracking-wide">
        Workflow
      </div>
      {roots.map((node) => (
        <PageTreeItem key={node.id} node={node} basePath={basePath} depth={0} />
      ))}
    </div>
  );
}
