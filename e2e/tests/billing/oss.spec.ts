import { expect, test } from "@playwright/test";
import { loginAsSmoke } from "../../helpers/auth";
import { gotoProject } from "../../helpers/console";

// @billing-scenario I4
test.describe("billing @billing @oss", () => {
  // @billing-scenario A1
  // @billing-scenario H2-2
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

  // @billing-scenario A2
  test("console overview is accessible without cloud entitlement gate", async ({
    page,
  }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "overview");
    await expect(page).toHaveURL(/\/ssota-labs\/overview/);
    await expect(
      page.getByRole("button", { name: "Open Workflow Map" }),
    ).toBeVisible();
  });

  // @billing-scenario A3
  test("webhook route returns 404 when BILLING=none", async ({ request }) => {
    const response = await request.post("/api/webhooks/stripe", {
      data: "{}",
      headers: { "stripe-signature": "invalid" },
    });
    expect(response.status()).toBe(404);
  });

  // @billing-scenario H2-1
  test("settings L1 nav includes Billing link", async ({ page }) => {
    await loginAsSmoke(page);
    await gotoProject(page, "settings/general");

    const primaryNav = page.getByRole("navigation", { name: "Primary" });
    await expect(
      primaryNav.getByRole("link", { name: /billing|구독/i }),
    ).toBeVisible();
  });
});
