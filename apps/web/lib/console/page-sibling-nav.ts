import type { Page } from "@ssota/contracts";
import type { PagePort } from "@ssota/core";
import { isHubPage } from "@/lib/page-runtime/hub-redirect";

export type PageNavItem = {
  id: string;
  title: string;
  href: string;
};

export type PageSiblingNavData = {
  /** Sibling pages under the same sidebar parent. */
  items: PageNavItem[];
  activeId: string;
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
