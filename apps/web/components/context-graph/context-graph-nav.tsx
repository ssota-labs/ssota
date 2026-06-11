"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/context-graph", label: "Overview" },
  { href: "/context-graph/verticals/homepage-agent", label: "Homepage Agent" },
  { href: "/context-graph/nodes", label: "Nodes" },
  { href: "/context-graph/edges", label: "Edges" },
  { href: "/context-graph/actions", label: "Actions" },
  { href: "/context-graph/instructions", label: "Instructions" },
];

export function ContextGraphNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 rounded-lg border bg-card p-2 text-sm">
      {links.map((link) => {
        const active =
          link.href === "/context-graph"
            ? pathname === link.href
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
