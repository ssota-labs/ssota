import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { gotoProject } from "../helpers/console";

test.describe("Connectors page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "connectors");
    await expect(page.getByRole("heading", { name: "Connectors" })).toBeVisible();
  });

  test("scroll reaches Storage, CRM, Design, and Support sections", async ({
    page,
  }) => {
    const scroll = page.locator(".overflow-y-auto").first();
    await expect(scroll).toBeVisible();

    for (const theme of ["Storage", "CRM & Sales", "Design", "Support", "Social"]) {
      await scroll.evaluate((el, label) => {
        const heading = [...el.querySelectorAll("h2")].find(
          (node) => node.textContent?.trim() === label,
        );
        heading?.scrollIntoView({ block: "start" });
      }, theme);
      await expect(
        page.getByRole("heading", { name: theme, exact: true }),
      ).toBeVisible();
    }

    await expect(page.getByTestId("connector-airtable")).toBeVisible();
    await expect(page.getByTestId("connector-zendesk")).toBeVisible();
    await expect(page.getByTestId("connector-intercom")).toBeVisible();
  });
});
