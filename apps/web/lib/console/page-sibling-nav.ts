import type { Page } from "@ssota/contracts";
import type { PagePort } from "@ssota/core";
import { isHubPage } from "@/lib/page-runtime/hub-redirect";

export type PageNavItem = {
  id: string;
  title: string;
  href: string;
};

export type PageSiblingNavData = {
  /** Parent section row — siblings of the current page's parent. */
  primary: PageNavItem[];
  activePrimaryId: string | null;
  /** Current section row — siblings of the active page. */
  secondary: PageNavItem[];
  activeSecondaryId: string;
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

/**
 * Builds two-tier sibling navigation for dynamic pages:
 * - primary: siblings of the page's parent (section row)
 * - secondary: siblings of the current page (tab row)
 */
export async function loadPageSiblingNav(
  pagePort: PagePort,
  page: Page,
  buildHref: (pageId: string) => string,
): Promise<PageSiblingNavData | null> {
  if (!page.parentId) return null;

  const parent = await pagePort.getPage(page.parentId);
  if (!parent) return null;

  const [secondaryPages, primaryPages] = await Promise.all([
    pagePort.listChildren(page.parentId),
    pagePort.listChildren(parent.parentId ?? null),
  ]);

  const secondary = await toNavItems(
    pagePort,
    secondaryPages,
    page,
    buildHref,
  );
  const primary = await toNavItems(
    pagePort,
    primaryPages,
    page,
    buildHref,
  );

  const showPrimary = primary.length > 1;
  const showSecondary = secondary.length > 1;
  if (!showPrimary && !showSecondary) return null;

  return {
    primary: showPrimary ? primary : [],
    activePrimaryId: showPrimary ? parent.id : null,
    secondary: showSecondary ? secondary : [],
    activeSecondaryId: page.id,
  };
}
