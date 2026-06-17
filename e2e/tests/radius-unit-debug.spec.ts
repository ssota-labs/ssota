import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

async function selectButtonRoot(page: import("@playwright/test").Page) {
  await page.getByRole("tab", { name: "Layers" }).click();
  await page.getByText("<button>", { exact: true }).click();
  await expect(
    page.getByRole("spinbutton", { name: "All corners radius" }),
  ).toBeVisible({ timeout: 10_000 });
}

test.describe("radius unit", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "design/ui-components");
    await expect(page.getByTestId("design-studio-shell")).toBeVisible({
      timeout: 15_000,
    });
    await selectButtonRoot(page);
  });

  test("switches unit label from px to %", async ({ page }) => {
    const radiusInput = page.getByRole("spinbutton", {
      name: "All corners radius",
    });
    const unitBtn = page.getByRole("button", { name: "All corners radius unit" });

    await radiusInput.fill("40");
    await radiusInput.blur();
    await expect(unitBtn).toContainText("px");

    await unitBtn.click();
    await page.getByRole("button", { name: "%", exact: true }).click();

    await expect(unitBtn).toContainText("%");
  });

  test("recalculates value when width is set before unit change", async ({
    page,
  }) => {
    const widthInput = page
      .locator("section")
      .filter({ hasText: "Size" })
      .getByRole("spinbutton", { name: "Width" });
    await widthInput.fill("200");
    await widthInput.blur();

    const radiusInput = page.getByRole("spinbutton", {
      name: "All corners radius",
    });
    await radiusInput.fill("40");
    await radiusInput.blur();

    const unitBtn = page.getByRole("button", { name: "All corners radius unit" });
    await unitBtn.click();
    await page.getByRole("button", { name: "%", exact: true }).click();

    await expect(unitBtn).toContainText("%");
    await expect(radiusInput).toHaveValue("20");
  });
});
