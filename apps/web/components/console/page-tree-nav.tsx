"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CaretRightIcon } from "@phosphor-icons/react";
import { cn } from "@ssota/ui/lib/utils";
import { NavItemIcon } from "@/lib/console/nav-icons";

/** Minimal serializable page for the sidebar tree (no spec/bindings). */
export type SidebarPage = {
  id: string;
  title: string;
  parentId: string | null;
  position: number;
  /** NAV_ICONS key (matches the static nav icons), or null. */
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

/** Ids of nodes that are ancestors of the active page, for initial expansion. */
function expandedForActive(roots: TreeNode[], activeId: string | null): Set<string> {
  const open = new Set<string>();
  const walk = (node: TreeNode): boolean => {
    const childHit = node.children.map(walk).some(Boolean);
    const self = node.id === activeId;
    if (childHit) open.add(node.id);
    return childHit || self;
  };
  roots.forEach(walk);
  return open;
}

function PageTreeItem({
  node,
  basePath,
  depth,
  expanded,
  toggle,
}: {
  node: TreeNode;
  basePath: string;
  depth: number;
  expanded: Set<string>;
  toggle: (id: string) => void;
}) {
  const pathname = usePathname();
  const href = `${basePath}/p/${node.id}`;
  const isActive = pathname === href;
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const pad = { paddingLeft: `${depth * 12 + 8}px` } as const;

  if (hasChildren) {
    // Expandable item — toggle button with a right-side caret (matches the
    // static console nav groups).
    return (
      <div className="space-y-0.5">
        <button
          type="button"
          onClick={() => toggle(node.id)}
          style={pad}
          className="flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-sm hover:bg-sidebar-accent"
        >
          <NavItemIcon
            iconKey={node.icon ?? ""}
            className="size-4 shrink-0 text-muted-foreground"
          />
          <span className="min-w-0 flex-1 truncate text-left">{node.title}</span>
          <CaretRightIcon
            className={cn(
              "size-3.5 shrink-0 transition-transform",
              isOpen && "rotate-90",
            )}
          />
        </button>
        {isOpen ? (
          <div className="space-y-0.5">
            {node.children.map((child) => (
              <PageTreeItem
                key={child.id}
                node={child}
                basePath={basePath}
                depth={depth + 1}
                expanded={expanded}
                toggle={toggle}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  // Leaf — link styled exactly like the static nav links (tasks/overview).
  return (
    <Link
      href={href}
      style={pad}
      className={cn(
        "flex items-center gap-2 rounded-md py-1.5 pr-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isActive &&
          "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
      )}
    >
      <NavItemIcon
        iconKey={node.icon ?? ""}
        className="size-4 shrink-0 text-muted-foreground"
      />
      <span className="min-w-0 flex-1 truncate">{node.title}</span>
    </Link>
  );
}

/**
 * Recursive Notion-style page tree for the sidebar. Fed by the `pages` table
 * (flat list → tree via `parentId`); links to the flat `/p/[id]` route. Styling
 * matches the static console nav (NavItemIcon + right-side caret).
 */
export function PageTreeNav({
  pages,
  basePath,
  heading = "Workflow",
}: {
  pages: SidebarPage[];
  basePath: string;
  /** Section label above the tree; null to render the tree with no heading. */
  heading?: string | null;
}) {
  const pathname = usePathname();
  const roots = buildTree(pages);
  const activeId =
    pages.find((p) => pathname === `${basePath}/p/${p.id}`)?.id ?? null;
  const [expanded, setExpanded] = useState<Set<string>>(() =>
    expandedForActive(roots, activeId),
  );
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (pages.length === 0) return null;
  return (
    <div className="space-y-0.5 pt-2 first:pt-0">
      {heading ? (
        <div className="px-2 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {heading}
        </div>
      ) : null}
      {roots.map((node) => (
        <PageTreeItem
          key={node.id}
          node={node}
          basePath={basePath}
          depth={0}
          expanded={expanded}
          toggle={toggle}
        />
      ))}
    </div>
  );
}
