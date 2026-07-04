import type { JsonRenderSpec, Page } from "@ssota/contracts";
import type { PagePort } from "@ssota/core";
import { isHubPage } from "@/lib/page-runtime/hub-redirect";
import {
  extractHoistedPageTabs,
  resolveHoistedTabValue,
} from "@/lib/page-runtime/spec-utils";

export type PageNavItem = {
  id: string;
  title: string;
  href: string;
};

export type PageSubTabItem = {
  value: string;
  label: string;
};

export type PageSiblingNavData = {
  /** Sibling pages under the same sidebar parent. */
  items: PageNavItem[];
  activeId: string;
  /** In-page tabs hoisted into the page header row (`?tab=`). */
  subTabs?: PageSubTabItem[];
  activeSubTab?: string;
  /** Current page href — required when `subTabs` is set. */
  pageHref?: string;
};

function sameNavScope(a: Page, b: Page): boolean {
  return (a.appliesToNodeType ?? null) === (b.appliesToNodeType ?? null);
}

async function resolvePageHref(
  pagePort: PagePort,
  targetPage: Page,
  buildHref: (pageId: string) => string,
): Promise<string> {
  if (isHubPage(targetPage.spec)) {
    const children = await pagePort.listChildren(targetPage.id);
    const first = children.find((child) => sameNavScope(child, targetPage));
    if (first) return buildHref(first.id);
  }
  return buildHref(targetPage.id);
}

async function toNavItems(
  pagePort: PagePort,
  pages: Page[],
  scopePage: Page,
  buildHref: (pageId: string) => string,
): Promise<PageNavItem[]> {
  const scoped = pages.filter((p) => sameNavScope(p, scopePage));
  return Promise.all(
    scoped.map(async (p) => ({
      id: p.id,
      title: p.title,
      href: await resolvePageHref(pagePort, p, buildHref),
    })),
  );
}

/** Sibling pages of the current page (same parent in the page tree). */
export async function loadPageSiblingNav(
  pagePort: PagePort,
  page: Page,
  buildHref: (pageId: string) => string,
): Promise<PageSiblingNavData | null> {
  if (!page.parentId) return null;

  const siblingPages = await pagePort.listChildren(page.parentId);
  const items = await toNavItems(pagePort, siblingPages, page, buildHref);
  if (items.length <= 1) return null;

  return { items, activeId: page.id };
}

/** Merge sibling page nav with hoisted in-page tabs for the header row. */
export function buildPageSiblingNavBar(
  siblingNav: PageSiblingNavData | null,
  options: {
    page: Page;
    spec: JsonRenderSpec;
    pageHref: string;
    tabParam?: string;
  },
): PageSiblingNavData | null {
  const hoisted = extractHoistedPageTabs(options.spec);
  if (!siblingNav && !hoisted) return null;

  return {
    items: siblingNav?.items ?? [],
    activeId: siblingNav?.activeId ?? options.page.id,
    subTabs: hoisted?.items.map(({ value, label }) => ({ value, label })),
    activeSubTab: hoisted
      ? resolveHoistedTabValue(hoisted, options.tabParam)
      : undefined,
    pageHref: hoisted ? options.pageHref : undefined,
  };
}
