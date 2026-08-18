import { test, expect } from "@playwright/test";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";
import { applySmokeSession } from "../helpers/session";

// Company Workspace는 기본 숨김 (NEXT_PUBLIC_COMPANY_WORKSPACE_ENABLED=1로 켬).
// 꺼져 있으면 (company) 라우트가 404라 이 스펙은 skip — 켤 때 그대로 되살아난다.
test.skip(
  !/^(1|true)$/i.test(process.env.NEXT_PUBLIC_COMPANY_WORKSPACE_ENABLED ?? ""),
  "Company Workspace disabled (NEXT_PUBLIC_COMPANY_WORKSPACE_ENABLED)",
);
test.describe("Company Workspace", () => {
  test.describe.configure({ timeout: 300_000 });
  test.beforeEach(async ({ page }) => {
    page.setDefaultNavigationTimeout(180_000);
    await applySmokeSession(page);
  });

  test("customer shell: Home and IA nav", async ({ page }) => {
    await gotoProject(page, "home", {
      waitUntil: "domcontentloaded",
      timeout: 180_000,
    });

    const workspace = page.getByTestId("company-workspace");
    await expect(workspace).toHaveAttribute("data-persona", "customer");
    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();

    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav.getByRole("link", { name: "Requests" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Engagements" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Reports" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Documents" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Company Data" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Chat", exact: true })).toHaveCount(0);

    await nav.getByRole("link", { name: "Requests" }).click();
    await expect(page).toHaveURL(new RegExp(`${DEFAULT_CONSOLE_BASE}/requests$`), {
      timeout: 15_000,
    });
    await expect(page.getByRole("heading", { name: "Requests" })).toBeVisible();
    await expect(page.getByText("When work is requested, it will be listed here.")).toBeVisible();
  });

  test("expert shell: portfolio and review queue", async ({ page }) => {
    await gotoProject(page, "expert/portfolio", {
      waitUntil: "domcontentloaded",
      timeout: 180_000,
    });

    const workspace = page.getByTestId("company-workspace");
    await expect(workspace).toHaveAttribute("data-persona", "expert");
    await expect(page.getByRole("heading", { name: "Client Portfolio" })).toBeVisible();

    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav.getByRole("link", { name: "Review Queue" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Engagement Workspace" })).toBeVisible();

    await nav.getByRole("link", { name: "Review Queue" }).click();
    await expect(page).toHaveURL(
      new RegExp(`${DEFAULT_CONSOLE_BASE}/expert/review-queue$`),
      { timeout: 15_000 },
    );
    await expect(page.getByRole("heading", { name: "Review Queue" })).toBeVisible();
  });
});
