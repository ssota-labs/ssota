import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";
import { getSmokeInitiativeId } from "../helpers/graph-seed";

test.describe("initiative wireframes", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmoke(page);
  });

  test("wireframes page uses WireframeCanvas explorer and linked DataTable", async ({
    page,
  }) => {
    const initiativeId = await getSmokeInitiativeId();
    await gotoProject(page, `n/${initiativeId}`);

    const initiativeNav = page.locator(".sidebar-nav-slider-track > div").nth(1);
    await initiativeNav.getByRole("button", { name: "Design" }).click();
    await initiativeNav.getByRole("link", { name: "Wireframes" }).click();

    await expect(page).toHaveURL(/\/n\/[0-9a-f-]+\/p\/[0-9a-f-]+/, {
      timeout: 15_000,
    });
    await expect(page.getByTestId("wireframe-canvas-shell")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByPlaceholder("Search wireframes..."),
    ).toBeVisible();
    await expect(page.getByTestId("wireframe-canvas")).toBeVisible();
    await expect(page.getByText("Linked UI components")).toBeVisible();
  });
});
