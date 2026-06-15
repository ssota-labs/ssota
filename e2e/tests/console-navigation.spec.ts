import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";
import { getSmokeInitiativeId } from "../helpers/graph-seed";
import { listAllConsoleRoutePaths } from "../../apps/web/lib/console/route-node-map";

test.describe("Console v2.7 navigation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "tasks");
  });

  test("sidebar: L0 shows execution and domain drill-downs", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav.getByRole("link", { name: "Tasks", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Overview", exact: true })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Research", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Workflow Map", exact: true })).toBeVisible();
  });

  test("sidebar: drill into research L1 and back", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Primary" });
    await nav.getByRole("button", { name: "Research", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}/research/market$`));
    await expect(nav.getByRole("link", { name: "Market research", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Hypotheses", exact: true })).toBeVisible();
    await expect(nav.getByRole("button", { name: /Research/i }).first()).toBeVisible();

    await nav.locator("[data-sidebar-back]").click();
    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}/overview$`));
    await expect(nav.getByRole("link", { name: "Tasks", exact: true })).toBeVisible();
  });

  test("sidebar: executive drill navigates to default child", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Primary" });
    await nav.getByRole("button", { name: "Executive", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}/executive/roadmap$`));
    await expect(nav.getByRole("link", { name: "Roadmap", exact: true })).toBeVisible();
  });

  test("sidebar: product L1 expands development group", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Primary" });
    await nav.getByRole("button", { name: "Product", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}/product/initiatives$`));
    await nav.getByRole("button", { name: "Development", exact: true }).click();
    await expect(nav.getByRole("link", { name: "Data model", exact: true })).toBeVisible();
    await nav.getByRole("link", { name: "Data model", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}/product/dev/data-model$`));
    await expect(page.getByRole("textbox", { name: "Content" })).toBeVisible();
  });

  test("sidebar: L2 initiative drill-down and switcher", async ({ page }) => {
    const initiativeId = await getSmokeInitiativeId();
    await gotoProject(page, `product/initiatives/${initiativeId}/planning/prd`);

    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav.getByRole("link", { name: "PRD", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Smoke initiative" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "breadcrumb" })).toContainText(
      "Smoke initiative",
    );

    await nav.getByRole("button", { name: /Initiatives/ }).first().click();
    await expect(page).toHaveURL(
      new RegExp(`${DEFAULT_CONSOLE_BASE}/product/initiatives$`),
    );
  });

  test("top bar: centered breadcrumb on research route", async ({ page }) => {
    await gotoProject(page, "research/market");
    await expect(page.getByRole("navigation", { name: "breadcrumb" })).toContainText(
      "Research",
    );
    await expect(page.getByRole("navigation", { name: "breadcrumb" })).toContainText(
      "Market research",
    );
  });

  test("footer links: developer setup and settings", async ({ page }) => {
    const sidebar = page.locator("aside");
    await expect(sidebar.getByRole("link", { name: "Developer setup", exact: true })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Settings", exact: true })).toBeVisible();
  });
});

test.describe("Console v2.7 routes", () => {
  test("all 35 scaffold routes return OK", async ({ page }) => {
    test.setTimeout(120_000);
    await loginAsSmoke(page);
    const initiativeId = await getSmokeInitiativeId();
    const routes = listAllConsoleRoutePaths(initiativeId);

    expect(routes).toHaveLength(35);

    for (const route of routes) {
      const response = await page.goto(`${DEFAULT_CONSOLE_BASE}/${route}`);
      expect(response?.ok(), `expected 200 for /${route}`).toBeTruthy();
    }
  });
});
