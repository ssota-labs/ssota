import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import {
  DEFAULT_ORG_SLUG,
  DEFAULT_PROJECT_SLUG,
} from "@ssota/adapter-supabase";

export const DEFAULT_CONSOLE_BASE = `/${DEFAULT_ORG_SLUG}/${DEFAULT_PROJECT_SLUG}`;

export const DEFAULT_APP_BASE = `/app/${DEFAULT_ORG_SLUG}/${DEFAULT_PROJECT_SLUG}`;

export async function gotoApp(page: Page, path = "") {
  const suffix = path.startsWith("/") ? path : path ? `/${path}` : "";
  await page.goto(`${DEFAULT_APP_BASE}${suffix}`);
}

export async function gotoProject(page: Page, path = "") {
  const suffix = path.startsWith("/") ? path : path ? `/${path}` : "";
  await page.goto(`${DEFAULT_CONSOLE_BASE}${suffix}`);
}

export async function gotoGraphNodes(page: Page, nodeTypeSlug = "document") {
  await gotoProject(page, `graph/nodes?table=${encodeURIComponent(nodeTypeSlug)}`);
}

export function toCatalogSlug(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase();
}

export async function openNodeTable(page: Page, nodeTypeOrSlug: string) {
  const slug = nodeTypeOrSlug.includes("_")
    ? nodeTypeOrSlug.toLowerCase()
    : toCatalogSlug(nodeTypeOrSlug);
  await page.getByTestId(`catalog-table-${slug}`).click();
}

export async function clickIconNav(page: Page, label: string) {
  await page.getByRole("link", { name: label, exact: true }).click();
}

export async function clickPrimaryNav(page: Page, label: string) {
  await clickIconNav(page, label);
}
