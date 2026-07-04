import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@ssota/ui/lib/utils";
import type { PageSiblingNavData } from "@/lib/console/page-sibling-nav";

function NavLink({
  href,
  active,
  children,
  testId,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      aria-current={active ? "page" : undefined}
      className="whitespace-nowrap text-lg transition-colors hover:text-foreground md:text-xl"
    >
      <span className="inline-grid">
        <span
          aria-hidden
          className="invisible col-start-1 row-start-1 font-semibold"
        >
          {children}
        </span>
        <span
          className={cn(
            "col-start-1 row-start-1",
            active
              ? "font-semibold text-foreground"
              : "font-normal text-muted-foreground",
          )}
        >
          {children}
        </span>
      </span>
    </Link>
  );
}

export function PageSiblingNav({
  items,
  activeId,
  subTabs,
  activeSubTab,
  pageHref,
}: PageSiblingNavData) {
  if (items.length === 0 && !subTabs?.length) return null;

  return (
    <div
      className="shrink-0 bg-background px-4 py-3 md:px-6 md:py-4"
      data-testid="page-sibling-nav"
    >
      <nav
        aria-label="Page tabs"
        className="flex flex-wrap items-center gap-x-5 gap-y-2 md:gap-x-6"
      >
        {items.map((item) => (
          <NavLink
            key={item.id}
            href={item.href}
            active={item.id === activeId}
            testId={`page-sibling-nav-item-${item.id}`}
          >
            {item.title}
          </NavLink>
        ))}
        {subTabs?.length && pageHref ? (
          <>
            {items.length > 0 ? (
              <span
                aria-hidden
                className="hidden h-5 w-px shrink-0 bg-border md:block"
              />
            ) : null}
            {subTabs.map((tab) => (
              <NavLink
                key={tab.value}
                href={`${pageHref}?tab=${encodeURIComponent(tab.value)}`}
                active={tab.value === activeSubTab}
                testId={`page-subtab-${tab.value}`}
              >
                {tab.label}
              </NavLink>
            ))}
          </>
        ) : null}
      </nav>
    </div>
  );
}
