import { expect, test } from "@playwright/test";
import { loginAsSmoke } from "../helpers/auth";

test.describe("billing settings", () => {
  test("owner can open billing settings in self-host mode", async ({ page }) => {
    await loginAsSmoke(page);
    await page.goto("/ssota-labs/settings/billing");
    await expect(page.getByRole("heading", { name: /billing|구독/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText("This deployment uses self-host billing (BILLING=none)."),
    ).toBeVisible();
  });
});
