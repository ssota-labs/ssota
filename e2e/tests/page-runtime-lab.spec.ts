import { test, expect } from "@playwright/test";

test.describe("Page Runtime Lab", () => {
  test("labs home links to page runtime preview", async ({ page }) => {
    await page.goto("/labs");
    await expect(page.getByRole("heading", { name: "Labs" })).toBeVisible();
    await page.getByRole("link", { name: /Page Runtime Lab/i }).click();
    await expect(page).toHaveURL(/\/labs\/page-runtime$/);
    await expect(
      page.getByRole("heading", { name: "Page Runtime Lab" }),
    ).toBeVisible();
  });

  test("layout demo renders Section Toolbar and Tabs", async ({ page }) => {
    await page.goto("/labs/page-runtime");
    await expect(page.getByTestId("dynamic-page-renderer")).toBeVisible();
    await expect(page.getByTestId("catalog-toolbar")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Initiative workspace" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Overview" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Planning" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Build" })).toBeVisible();
    await expect(
      page.getByTestId("dynamic-page-renderer").getByText(
        "Initiative summary and KPIs would render here",
      ),
    ).toBeVisible();
  });

  test("toolbar action fires in lab preview", async ({ page }) => {
    await page.goto("/labs/page-runtime");
    await page.getByRole("button", { name: "New initiative" }).click();
    await expect(page.getByText(/Last action: createInitiative/)).toBeVisible();
  });

  test("tabs switch panel content", async ({ page }) => {
    await page.goto("/labs/page-runtime");
    await page.getByRole("tab", { name: "Build" }).click();
    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
    await expect(page.getByText("Console v2.7 graph UI")).toBeVisible();
  });
});
