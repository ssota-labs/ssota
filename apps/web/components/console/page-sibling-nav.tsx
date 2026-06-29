import Link from "next/link";
import { cn } from "@ssota/ui/lib/utils";
import type { PageSiblingNavData } from "@/lib/console/page-sibling-nav";

export function PageSiblingNav({ items, activeId }: PageSiblingNavData) {
  return (
    <div
      className="shrink-0 bg-background px-4 py-3 md:px-6 md:py-4"
      data-testid="page-sibling-nav"
    >
      <nav
        aria-label="Page tabs"
        className="flex flex-wrap items-center gap-x-5 gap-y-2 md:gap-x-6"
      >
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "whitespace-nowrap text-lg transition-colors hover:text-foreground md:text-xl",
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
    </div>
  );
}
