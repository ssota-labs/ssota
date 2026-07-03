import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";

test.describe("Console v2.7 navigation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "tasks");
  });

  test("sidebar: L0 shows flat runtime nav with page tree groups", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Primary" });
    const expectedL0Links = ["Chat", "Tasks", "Agents", "Graph"] as const;

    for (const label of expectedL0Links) {
      await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
    }

    await expect(nav.getByText("Agent Runtime", { exact: true })).toHaveCount(0);
    await expect(nav.getByText("Agent Setting", { exact: true })).toHaveCount(0);
    await expect(nav.getByText("Context Setting", { exact: true })).toHaveCount(0);

    const linkLabels = await nav.getByRole("link").allTextContents();
    const l0Labels = linkLabels
      .map((text) => text.trim())
      .filter((text) => expectedL0Links.includes(text as (typeof expectedL0Links)[number]));
    expect(l0Labels).toEqual([...expectedL0Links]);

    await expect(nav.getByRole("link", { name: "Home", exact: true })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Workflow Map", exact: true })).toHaveCount(0);
    await expect(nav.getByRole("button", { name: "Executive", exact: true })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Research", exact: true })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Manager", exact: true })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Development", exact: true })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Design", exact: true })).toBeVisible();
  });

  test("sidebar: Agents L0 link opens L1 with agent settings links", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Primary" });
    await nav.getByRole("link", { name: "Agents", exact: true }).click();

    const expectedAgentsLinks = [
      "Agents",
      "Skills",
      "Tools",
      "Sandbox",
      "Channels",
      "Connections",
      "Subagents",
      "Schedules",
    ] as const;

    for (const label of expectedAgentsLinks) {
      await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
    }

    await expect(nav.getByRole("link", { name: "Home", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Chat", exact: true })).toHaveCount(0);
  });

  test("sidebar: page tree research group expands and navigates", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Primary" });
    await nav.getByRole("button", { name: "Research", exact: true }).click();
    await expect(nav.getByRole("link", { name: "Market research", exact: true })).toBeVisible();
    await nav.getByRole("link", { name: "Market research", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}/p/[^/]+$`));
    await expect(nav.getByRole("link", { name: "Tasks", exact: true })).toBeVisible();
  });

  test("sidebar: page tree executive group expands to roadmap link", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Primary" });
    await nav.getByRole("button", { name: "Executive", exact: true }).click();
    await expect(nav.getByRole("link", { name: "Roadmap", exact: true })).toBeVisible();
    await nav.getByRole("link", { name: "Roadmap", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}/p/[^/]+$`));
  });

  test("dynamic page: sibling nav shows large tab row for page siblings", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Primary" });
    await nav.getByRole("button", { name: "Executive", exact: true }).click();
    await nav.getByRole("link", { name: "Roadmap", exact: true }).click();

    const siblingNav = page.getByTestId("page-sibling-nav");
    await expect(siblingNav).toBeVisible({ timeout: 15_000 });

    const tabs = siblingNav.getByRole("navigation", { name: "Page tabs" });
    await expect(tabs.getByRole("link", { name: "Executive", exact: true })).toHaveCount(0);
    await expect(tabs.getByRole("link", { name: "Roadmap", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(tabs.getByRole("link", { name: "Goals", exact: true })).toBeVisible();

    await tabs.getByRole("link", { name: "Goals", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}/p/[^/]+$`));
    await expect(tabs.getByRole("link", { name: "Goals", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("sidebar footer: settings link only (agents in L0 nav)", async ({ page }) => {
    const sidebar = page.locator("aside");
    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav.getByRole("link", { name: "Agents", exact: true })).toBeVisible();

    const footer = sidebar.locator("div.border-t");
    await expect(footer.getByRole("link", { name: "Agents", exact: true })).toHaveCount(0);
    await expect(footer.getByRole("link", { name: "Settings", exact: true })).toBeVisible();
  });

  test("footer profile menu: appearance and sign out", async ({ page }) => {
    const sidebar = page.locator("aside");
    await sidebar.getByRole("button", { name: "Signed in as" }).click();
    await expect(page.getByText("Theme", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  test("organization switcher opens opaque popover with options", async ({ page }) => {
    const sidebar = page.locator("aside");
    const orgTrigger = sidebar.getByRole("button", { name: "Organization", exact: true });
    await expect(orgTrigger.locator('[data-slot="avatar"]')).toBeVisible();
    await orgTrigger.click();

    const popover = page.locator('[data-slot="popover-content"]');
    await expect(popover).toBeVisible();
    await expect(popover).toHaveClass(/cn-popover-menu-solid/);
    await expect(popover).not.toHaveClass(/cn-menu-translucent/);
    await expect(popover.getByText("Organization", { exact: true })).toBeVisible();
    await expect(popover.getByRole("link", { name: /SSOTA Labs/ })).toBeVisible();
  });

  test("sidebar: teamspace nav lists org teamspaces (no top-bar switcher)", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Teamspace", exact: true })).toHaveCount(0);

    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav.getByRole("button", { name: "SSOTA Dev", exact: true })).toBeVisible();
    await expect(nav.getByRole("button", { name: "App Disabled (E2E)", exact: true })).toBeVisible();
  });

  test("profile menu opens opaque popover", async ({ page }) => {
    const sidebar = page.locator("aside");
    await sidebar.getByRole("button", { name: "Signed in as" }).click();

    const popover = page.locator('[data-slot="popover-content"]');
    await expect(popover).toBeVisible();
    await expect(popover).toHaveClass(/cn-popover-menu-solid/);
    await expect(popover).not.toHaveClass(/cn-menu-translucent/);
  });
});
