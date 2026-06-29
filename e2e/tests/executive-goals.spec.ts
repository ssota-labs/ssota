import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

test.describe("Executive goals", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "executive/goals");
  });

  test("shows compact header and objectives table", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Goals", level: 1 })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("heading", { name: "Objectives" }),
    ).toBeVisible();
    await expect(page.getByTestId("expandable-table")).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "Demo: First Release completion loop" }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "Demo: Onboarding excellence" }),
    ).toBeVisible();
  });

  test("shows period select in section header", async ({ page }) => {
    const periodSelect = page.getByTestId("period-select");
    await expect(periodSelect).toBeVisible({ timeout: 15_000 });
    await expect(periodSelect.getByText("Period", { exact: true })).toBeVisible();
  });

  test("shows goal health badges with readable labels", async ({ page }) => {
    await expect(page.getByText("On track", { exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("At risk", { exact: true }).first()).toBeVisible();
  });

  test("expands objective row to reveal key results", async ({ page }) => {
    const objectiveRow = page.getByRole("row", {
      name: /Demo: First Release completion loop/,
    });
    await expect(objectiveRow).toBeVisible({ timeout: 15_000 });

    await objectiveRow.getByRole("button", { name: "Expand" }).click();

    await expect(
      page.getByRole("heading", { name: "Key results" }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", {
        name: "Pilot workspaces complete first Release with retrospective",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", {
        name: "Onboarding completion rate improvement",
        exact: true,
      }),
    ).toBeVisible();
  });

  test("filters objectives when period preset changes", async ({ page }) => {
    await expect(page.getByTestId("period-select")).toBeVisible({
      timeout: 15_000,
    });

    await page.getByTestId("period-select").getByRole("combobox").click();
    await page.getByRole("option", { name: "All periods" }).click();

    await expect(
      page.getByRole("cell", { name: "Demo: First Release completion loop" }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "Demo: Onboarding excellence" }),
    ).toBeVisible();

    await page.getByTestId("period-select").getByRole("combobox").click();
    await page.getByRole("option", { name: "Q2 2026" }).click();

    await expect(
      page.getByRole("cell", { name: "Demo: First Release completion loop" }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "Demo: Onboarding excellence" }),
    ).toHaveCount(0);

    await page.getByTestId("period-select").getByRole("combobox").click();
    await page.getByRole("option", { name: "Q3 2026" }).click();

    await expect(
      page.getByRole("cell", { name: "Demo: Onboarding excellence" }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "Demo: First Release completion loop" }),
    ).toHaveCount(0);
  });

  test("shows KPI line charts with titles", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "KPI pulse" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Workspace creation rate", { exact: true })).toBeVisible();
    await expect(page.getByText("Time to first value", { exact: true })).toBeVisible();
    await expect(page.getByTestId("chart-line").first()).toBeVisible();
  });

  test("period filter slices KPI chart snapshots", async ({ page }) => {
    const charts = page.getByTestId("chart-line");
    await expect(charts.first()).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("period-select").getByRole("combobox").click();
    await page.getByRole("option", { name: "All periods" }).click();

    await expect(page.getByTestId("chart-line-empty")).toHaveCount(0);

    await page.getByTestId("period-select").getByRole("combobox").click();
    await page.getByRole("option", { name: "Q2 2026" }).click();

    await expect(charts).toHaveCount(2);
    await expect(page.getByTestId("chart-line-empty")).toHaveCount(1);

    await page.getByTestId("period-select").getByRole("combobox").click();
    await page.getByRole("option", { name: "Q3 2026" }).click();

    await expect(page.getByTestId("chart-line-empty")).toHaveCount(1);
  });

  test("sibling nav links Roadmap and Goals under Executive", async ({ page }) => {
    const siblingNav = page.getByTestId("page-sibling-nav");
    await expect(siblingNav).toBeVisible({ timeout: 15_000 });

    const tabs = siblingNav.getByRole("navigation", { name: "Page tabs" });
    await expect(tabs.getByRole("link", { name: "Roadmap", exact: true })).toBeVisible();
    await expect(tabs.getByRole("link", { name: "Goals", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
