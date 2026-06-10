import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import {
  DEFAULT_ORG_SLUG,
  DEFAULT_PROJECT_SLUG,
} from "@loopos/adapter-supabase";

export const DEFAULT_CONSOLE_BASE = `/${DEFAULT_ORG_SLUG}/${DEFAULT_PROJECT_SLUG}`;

export async function gotoProject(page: Page, path = "") {
  const suffix = path.startsWith("/") ? path : path ? `/${path}` : "";
  await page.goto(`${DEFAULT_CONSOLE_BASE}${suffix}`);
}

export async function gotoGraphNodes(page: Page, nodeTypeSlug = "document") {
  await gotoProject(page, `graph/nodes/${nodeTypeSlug}`);
}

function sidebarLocator(page: Page) {
  return page.locator('[data-sidebar="sidebar"]');
}

/** Collapsed sidebar(offcanvas)일 때 Toggle 후 primary nav를 노출한다. */
export async function openPrimarySidebar(page: Page) {
  const sidebar = sidebarLocator(page);
  if (await sidebar.isVisible().catch(() => false)) return;
  await page.getByRole("button", { name: "Toggle Sidebar" }).click();
  await expect(sidebar).toBeVisible({ timeout: 5_000 });
}

export async function clickPrimaryNav(page: Page, label: string) {
  await openPrimarySidebar(page);
  await sidebarLocator(page).getByText(label, { exact: true }).click();
}
