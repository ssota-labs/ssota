"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { Input } from "@ssota/ui/components/ui/input";
import { ScrollArea } from "@ssota/ui/components/ui/scroll-area";
import { cn } from "@ssota/ui/lib/utils";
import { graphPath } from "@/lib/console/paths";
import { useProjectContext } from "./project-context";
import { useGraphCatalog } from "./graph-catalog-context";

export function ConsoleGraphCatalogSidebar() {
  const ctx = useProjectContext();
  const catalog = useGraphCatalog();
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!catalog) return { nodes: [], edges: [], actions: [] };
    const q = query.trim().toLowerCase();
    const match = (item: { label: string; slug: string }) =>
      !q || item.label.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q);
    return {
      nodes: catalog.nodeTypes.filter(match),
      edges: catalog.edgeTypes.filter(match),
      actions: catalog.actionTypes.filter(match),
    };
  }, [catalog, query]);

  if (!catalog) return null;

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-background">
      <div className="border-b p-3">
        <p className="mb-2 text-xs font-medium text-foreground">Graph</p>
        <Input
          placeholder="Search..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-8"
        />
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-2">
          <CatalogGroup
            title="Nodes"
            items={filtered.nodes}
            pathname={pathname}
            hrefFor={(slug) => graphPath(ctx, "nodes", slug)}
          />
          <CatalogGroup
            title="Edges"
            items={filtered.edges}
            pathname={pathname}
            hrefFor={(slug) => graphPath(ctx, "edges", slug)}
          />
          <CatalogGroup
            title="Actions"
            items={filtered.actions}
            pathname={pathname}
            hrefFor={(slug) => graphPath(ctx, "actions", slug)}
            listHref={graphPath(ctx, "actions")}
          />
        </div>
      </ScrollArea>
    </aside>
  );
}

function CatalogGroup({
  title,
  items,
  pathname,
  hrefFor,
  listHref,
}: {
  title: string;
  items: { slug: string; label: string }[];
  pathname: string;
  hrefFor: (slug: string) => string;
  listHref?: string;
}) {
  const registryActive =
    listHref != null &&
    (pathname === listHref || pathname.startsWith(`${listHref}/`));

  if (items.length === 0 && !listHref) return null;

  return (
    <div>
      <p className="px-2 py-1 text-xs text-muted-foreground">{title}</p>
      <ul className="space-y-0.5">
        {listHref ? (
          <li>
            <Link
              href={listHref}
              className={cn(
                "block truncate rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-muted",
                registryActive && pathname === listHref && "bg-muted font-medium text-foreground",
              )}
            >
              All {title.toLowerCase()}
            </Link>
          </li>
        ) : null}
        {items.map((item) => {
          const href = hrefFor(item.slug);
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={item.slug}>
              <Link
                href={href}
                className={cn(
                  "block truncate rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-muted",
                  active && "bg-muted font-medium text-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
