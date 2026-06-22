import { test, expect } from "@playwright/test";

const LAYOUT_SHELL_URL = "/labs/page-runtime?demo=layout-shell";

test.describe("Page Runtime Lab", () => {
  test("labs home links to page runtime preview", async ({ page }) => {
    await page.goto("/labs");
    await expect(page.getByRole("heading", { name: "Labs" })).toBeVisible();
    await page.getByRole("link", { name: /Page Runtime Lab/i }).click();
    await expect(page).toHaveURL(/\/labs\/page-runtime/);
    await expect(
      page.getByRole("heading", { name: "Page Runtime Lab" }),
    ).toBeVisible();
  });

  test("catalog coverage lists all component types", async ({ page }) => {
    await page.goto("/labs/page-runtime");
    await expect(page.getByText(/components have a lab demo/)).toBeVisible();
    await expect(page.getByText(/Not yet demoed:/)).toHaveCount(0);
  });

  test("layout shell demo renders Section Toolbar and Tabs", async ({ page }) => {
    await page.goto(LAYOUT_SHELL_URL);
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
    await page.goto(LAYOUT_SHELL_URL);
    await page.getByRole("button", { name: "New initiative" }).click();
    await expect(page.getByText(/Last action: createInitiative/)).toBeVisible();
  });

  test("tabs switch panel content", async ({ page }) => {
    await page.goto(LAYOUT_SHELL_URL);
    await page.getByRole("tab", { name: "Build" }).click();
    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
    await expect(page.getByText("Console v2.7 graph UI")).toBeVisible();
  });

  test("sidebar navigates to data and document demos", async ({ page }) => {
    await page.goto("/labs/page-runtime");
    await page.getByRole("button", { name: "NodeTable" }).click();
    await expect(page).toHaveURL(/demo=data-table/);
    await expect(page.getByRole("heading", { name: "Initiatives" })).toBeVisible();

    await page.getByRole("button", { name: "DocumentView" }).click();
    await expect(page).toHaveURL(/demo=document-view/);
    await expect(page.getByRole("heading", { name: "PRD" })).toBeVisible();
  });

  test("roadmap document sheet opens BlockNote on row click", async ({ page }) => {
    await page.goto("/labs/page-runtime?demo=roadmap-document-sheet");
    await expect(page.getByTestId("document-sheet-list")).toBeVisible();
    await expect(page.getByText("2026 연간 로드맵")).toBeVisible();

    await page.getByRole("button", { name: /2026 Q1 분기 로드맵/ }).click();
    await expect(page.getByTestId("document-sheet-panel")).toBeVisible();
    await expect(page.getByRole("heading", { name: "2026 Q1 분기 로드맵" })).toBeVisible();
    await expect(page.getByTestId("document-sheet-editor")).toBeVisible();
    await expect(page.getByTestId("blocknote-editor-shell")).toBeVisible();
    await expect(page.getByText("DocumentSheetList catalog component")).toBeVisible();
  });
});
