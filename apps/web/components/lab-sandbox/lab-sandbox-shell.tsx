"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@ssota/ui/components/ui/button";
import { cn } from "@/lib/utils";
import { useLabSandbox } from "@/lib/lab-sandbox/lab-sandbox-context";

const NAV = [
  { href: "/lab", label: "Home" },
  { href: "/lab/preview", label: "Preview" },
  { href: "/lab/data", label: "Fixtures" },
  { href: "/lab/catalog", label: "L1 Catalog" },
  { href: "/lab/pages", label: "L3 Pages" },
  { href: "/lab/nav", label: "L4 Nav" },
  { href: "/lab/ui-catalog", label: "L2 UI" },
] as const;

export function LabSandboxShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { reset } = useLabSandbox();

  return (
    <div className="bg-background flex min-h-screen">
      <aside className="border-border w-56 shrink-0 border-r p-4">
        <div className="mb-6">
          <Link href="/lab" className="text-lg font-semibold">
            SSOTA Lab
          </Link>
          <p className="text-muted-foreground mt-1 text-xs">
            Frontend sandbox — mock JSON only
          </p>
        </div>
        <nav className="space-y-1">
          {NAV.map((item) => {
            const active =
              item.href === "/lab"
                ? pathname === "/lab"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-md px-2 py-1.5 text-sm",
                  active
                    ? "bg-accent font-medium"
                    : "text-muted-foreground hover:bg-accent/60",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-8">
          <Button type="button" variant="outline" size="sm" onClick={reset}>
            Reset fixtures
          </Button>
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
