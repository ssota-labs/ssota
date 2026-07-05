import Link from "next/link";
import { cn } from "@ssota/ui/lib/utils";
import type { PageSiblingNavData } from "@/lib/console/page-sibling-nav";

const siblingNavShellClassName =
  "shrink-0 bg-background px-4 py-3 md:px-6 md:py-4";
const siblingNavListClassName =
  "flex flex-wrap items-center gap-x-5 gap-y-2 md:gap-x-6";
const siblingNavItemClassName =
  "whitespace-nowrap text-lg transition-colors hover:text-foreground md:text-xl";

function SiblingNavLabel({
  title,
  isActive,
}: {
  title: string;
  isActive: boolean;
}) {
  return (
    <span className="inline-grid">
      <span
        aria-hidden
        className="invisible col-start-1 row-start-1 font-semibold"
      >
        {title}
      </span>
      <span
        className={cn(
          "col-start-1 row-start-1",
          isActive
            ? "font-semibold text-foreground"
            : "font-normal text-muted-foreground",
        )}
      >
        {title}
      </span>
    </span>
  );
}

export type ClientSiblingNavItem = {
  id: string;
  title: string;
  testId?: string;
};

/** Client-side section tabs — same chrome as {@link PageSiblingNav}. */
export function ClientSiblingNav({
  items,
  activeId,
  onSelect,
  testId = "page-sibling-nav",
  ariaLabel = "Section tabs",
}: {
  items: ClientSiblingNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  testId?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={siblingNavShellClassName} data-testid={testId}>
      <nav aria-label={ariaLabel} className={siblingNavListClassName}>
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={isActive ? "page" : undefined}
              data-testid={item.testId}
              className={siblingNavItemClassName}
            >
              <SiblingNavLabel title={item.title} isActive={isActive} />
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export function PageSiblingNav({ items, activeId }: PageSiblingNavData) {
  return (
    <div className={siblingNavShellClassName} data-testid="page-sibling-nav">
      <nav aria-label="Page tabs" className={siblingNavListClassName}>
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={siblingNavItemClassName}
            >
              <SiblingNavLabel title={item.title} isActive={isActive} />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
