"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const studioLinks = [
  { href: "/studio", label: "Overview", exact: true },
  { href: "/studio/node-types", label: "Node Types" },
  { href: "/studio/edge-types", label: "Edge Types" },
  { href: "/studio/properties", label: "Properties" },
  { href: "/studio/actions", label: "Actions" },
  { href: "/studio/instructions", label: "Instructions" },
  { href: "/studio/archetypes", label: "Archetypes" },
];

export function StudioNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2">
      {studioLinks.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
