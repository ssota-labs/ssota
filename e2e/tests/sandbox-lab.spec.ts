import { test, expect } from "@playwright/test";

test.describe("sandbox lab", () => {
  test("top-level /lab loads without project context", async ({ page }) => {
    await page.goto("/lab");
    await expect(page.getByRole("heading", { name: "Developer Lab" })).toBeVisible();
  });

  test("preview renders mock NodeList from bindings", async ({ page }) => {
    await page.goto("/lab/preview");
    await expect(page.getByTestId("dynamic-page-renderer")).toBeVisible();
    await expect(page.getByText("B2B SaaS TAM")).toBeVisible();
  });

  test("fixture editors validate page JSON", async ({ page }) => {
    await page.goto("/lab/pages");
    await page.getByRole("button", { name: "Validate" }).click();
    await expect(page.getByText("Valid JSON")).toBeVisible();
  });
});
