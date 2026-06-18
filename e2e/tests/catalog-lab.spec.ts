import { test, expect } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";
import { DEFAULT_CONSOLE_BASE, gotoProject } from "../helpers/console";

test.describe("catalog lab", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSmoke(page);
  });

  test("lab routes redirect when CATALOG_LAB_ENABLED is off", async ({ page }) => {
    await gotoProject(page, "lab");
    await expect(page).not.toHaveURL(/\/lab$/);
  });

  test("lab validate API rejects invalid page JSON when enabled", async ({
    page,
    request,
  }) => {
    test.skip(process.env.CATALOG_LAB_ENABLED !== "true", "lab env off");

    await gotoProject(page, "lab/pages");
    await expect(page.getByRole("heading", { name: /L3/ })).toBeVisible();

    const res = await request.post(`${DEFAULT_CONSOLE_BASE}/lab/api/validate`, {
      data: {
        mode: "pages",
        json: '{"routeKey":""}',
        projectId: "00000000-0000-4000-8000-000000000001",
      },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});
