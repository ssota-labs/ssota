import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import {
  DEFAULT_ORG_SLUG,
  DEFAULT_PROJECT_SLUG,
} from "@ssota/adapter-supabase";

export const DEFAULT_CONSOLE_BASE = `/${DEFAULT_ORG_SLUG}/${DEFAULT_PROJECT_SLUG}`;

export async function gotoProject(page: Page, path = "") {
  const suffix = path.startsWith("/") ? path : path ? `/${path}` : "";
  await page.goto(`${DEFAULT_CONSOLE_BASE}${suffix}`);
}

export async function gotoGraphNodes(page: Page, nodeTypeSlug = "document") {
  await gotoProject(page, `graph/nodes/${nodeTypeSlug}`);
}

/** React Flow canvas node (replaces legacy catalog sidebar link assertions). */
export async function expectCanvasNode(page: Page, label: string) {
  await expect(
    page.locator(".react-flow__node").filter({ hasText: label }).first(),
  ).toBeVisible();
}

export function toCatalogSlug(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase();
}

export async function clickIconNav(page: Page, label: string) {
  await page.getByRole("link", { name: label, exact: true }).click();
}

export async function clickPrimaryNav(page: Page, label: string) {
  await clickIconNav(page, label);
}
