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

export async function clickIconNav(page: Page, label: string) {
  await page.getByRole("link", { name: label, exact: true }).click();
}

export async function clickPrimaryNav(page: Page, label: string) {
  await clickIconNav(page, label);
}
