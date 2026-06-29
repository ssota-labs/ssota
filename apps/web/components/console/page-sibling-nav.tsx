import Link from "next/link";
import { cn } from "@ssota/ui/lib/utils";
import type { PageSiblingNavData } from "@/lib/console/page-sibling-nav";

type PageSiblingNavProps = PageSiblingNavData;

function NavRow({
  items,
  activeId,
  size = "md",
}: {
  items: PageSiblingNavData["primary"];
  activeId: string | null;
  size?: "md" | "sm";
}) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label={size === "md" ? "Page sections" : "Page tabs"}
      className="flex flex-wrap items-center gap-x-6 gap-y-2"
    >
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "whitespace-nowrap transition-colors hover:text-foreground",
              size === "md" ? "text-sm" : "text-xs",
              isActive
                ? "font-semibold text-foreground"
                : "font-normal text-muted-foreground",
            )}
          >
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}

export function PageSiblingNav({
  primary,
  activePrimaryId,
  secondary,
  activeSecondaryId,
}: PageSiblingNavProps) {
  return (
    <div
      className="shrink-0 space-y-3 border-b bg-background px-4 py-3 md:px-6"
      data-testid="page-sibling-nav"
    >
      <NavRow items={primary} activeId={activePrimaryId} size="md" />
      <NavRow items={secondary} activeId={activeSecondaryId} size="sm" />
    </div>
  );
}
